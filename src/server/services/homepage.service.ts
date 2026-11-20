import { PublicError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { isPlainObject, logError } from "@/lib/errors";
import { toPositiveInt } from "@/lib/utils";
import type { HomepageSectionInput } from "@/lib/validations/admin";
import { writeAuditLog } from "@/lib/audit";
import { HOMEPAGE_SECTIONS } from "@/lib/constants";
import type { HomepageSectionKey } from "@prisma/client";
import { getHomeCategories } from "./category.service";
import {
  getFeaturedProducts,
  getNewArrivals,
  getBestSellers,
  getProductsByIds,
} from "@/server/repositories/product.repo";
import { getActiveBanners } from "./content.service";
import type { SafeHomepageSection } from "@/types/domain";

export async function getHomepageSections(): Promise<SafeHomepageSection[]> {
  const sections = await prisma.homepageSection.findMany({
    orderBy: { sortOrder: "asc" },
  });
  return sections.map((s) => ({
    id: s.id,
    sectionKey: s.sectionKey,
    title: s.title,
    subtitle: s.subtitle,
    isActive: s.isActive,
    sortOrder: s.sortOrder,
    settings: isPlainObject(s.settings) ? s.settings : null,
    productIds: Array.isArray(s.productIds) ? s.productIds : [],
    categoryIds: Array.isArray(s.categoryIds) ? s.categoryIds : [],
    startDate: s.startDate?.toISOString() ?? null,
    endDate: s.endDate?.toISOString() ?? null,
  }));
}

export async function upsertHomepageSection(input: HomepageSectionInput, adminId: string) {
  const existing = await prisma.homepageSection.findFirst({
    where: { sectionKey: input.sectionKey },
  });
  const data = {
    sectionKey: input.sectionKey,
    title: input.title || null,
    subtitle: input.subtitle || null,
    isActive: input.isActive,
    sortOrder: input.sortOrder ?? existing?.sortOrder ?? 0,
    settings: (input.settings as any) ?? undefined,
    productIds: input.productIds,
    categoryIds: input.categoryIds,
    startDate: input.startDate ? new Date(input.startDate) : null,
    endDate: input.endDate ? new Date(input.endDate) : null,
  };
  const section = existing
    ? await prisma.homepageSection.update({ where: { id: existing.id }, data })
    : await prisma.homepageSection.create({ data });
  await writeAuditLog({
    userId: adminId,
    action: "HOMEPAGE_SECTION_UPDATE",
    entity: "HomepageSection",
    entityId: section.id,
    detail: { sectionKey: input.sectionKey },
  });
  return section;
}

export async function createHomepageSection(sectionKey: HomepageSectionKey, adminId: string) {
  const existing = await prisma.homepageSection.findFirst({ where: { sectionKey } });
  if (existing) throw new PublicError("This section already exists on the homepage");

  const meta = HOMEPAGE_SECTIONS.find((s) => s.key === sectionKey);
  const last = await prisma.homepageSection.findFirst({ orderBy: { sortOrder: "desc" } });

  const section = await prisma.homepageSection.create({
    data: {
      sectionKey,
      title: meta?.label ?? null,
      subtitle: null,
      isActive: true,
      sortOrder: (last?.sortOrder ?? 0) + 1,
      settings: {},
      productIds: [],
      categoryIds: [],
    },
  });
  await writeAuditLog({
    userId: adminId,
    action: "HOMEPAGE_SECTION_CREATE",
    entity: "HomepageSection",
    entityId: section.id,
    detail: { sectionKey },
  });
  return section;
}

export async function deleteHomepageSection(id: string, adminId: string) {
  const section = await prisma.homepageSection.delete({ where: { id } });
  await writeAuditLog({
    userId: adminId,
    action: "HOMEPAGE_SECTION_DELETE",
    entity: "HomepageSection",
    entityId: id,
    detail: { sectionKey: section.sectionKey },
  });
  return section;
}

export async function reorderHomepageSections(sections: { id: string; sortOrder: number }[], adminId: string) {
  await prisma.$transaction(
    sections.map((s) => prisma.homepageSection.update({ where: { id: s.id }, data: { sortOrder: s.sortOrder } })),
  );
  await writeAuditLog({ userId: adminId, action: "HOMEPAGE_REORDER", entity: "HomepageSection" });
}

export async function getHomepageData() {
  const sections = await getHomepageSections().then((s) => s.filter((x) => x.isActive));

  const data: Record<string, unknown> = {};
  for (const section of sections) {
    // A single broken section must never take down the entire homepage.
    try {
      const settings = section.settings ?? {};
      const limit = toPositiveInt(settings.limit, 8, 48);
      const productIds = section.productIds;
      const categoryIds = section.categoryIds;

      switch (section.sectionKey) {
        case "SHOP_BY_CATEGORY": {
          const cats = categoryIds.length
            ? await prisma.category.findMany({
                where: { id: { in: categoryIds }, isActive: true },
                include: { _count: { select: { products: true } } },
              }).then((r) => r.sort((a, b) => categoryIds.indexOf(a.id) - categoryIds.indexOf(b.id)))
            : await getHomeCategories(limit);
          data[section.sectionKey] = cats;
          break;
        }
        case "NEW_ARRIVALS":
          data[section.sectionKey] = productIds.length
            ? await getProductsByIds(productIds)
            : await getNewArrivals(limit);
          break;
        case "BEST_SELLERS":
          data[section.sectionKey] = productIds.length
            ? await getProductsByIds(productIds)
            : await getBestSellers(limit);
          break;
        case "FEATURED_COLLECTION":
          data[section.sectionKey] = productIds.length
            ? await getProductsByIds(productIds)
            : await getFeaturedProducts(limit);
          break;
        case "HERO": {
          const [slides, side] = await Promise.all([
            getActiveBanners("home_hero"),
            getActiveBanners("home_side"),
          ]);
          data[section.sectionKey] = {
            slides,
            side: side.slice(0, 2),
          };
          break;
        }
        case "OFFER_BANNER":
          data[section.sectionKey] = await getActiveBanners("home_mid");
          break;
        case "REVIEWS": {
          const reviewIds = Array.isArray(settings.reviewIds)
            ? settings.reviewIds.filter((id): id is string => typeof id === "string")
            : [];
          const reviews = reviewIds.length
            ? await prisma.review
                .findMany({
                  where: { id: { in: reviewIds }, isApproved: true },
                  include: { product: { include: { images: { orderBy: { sortOrder: "asc" } } } } },
                })
                .then((r) => r.sort((a, b) => reviewIds.indexOf(a.id) - reviewIds.indexOf(b.id)))
            : await prisma.review.findMany({
                where: { isApproved: true, isFeatured: true },
                include: { product: { include: { images: { orderBy: { sortOrder: "asc" } } } } },
                orderBy: { createdAt: "desc" },
                take: limit,
              });
          data[section.sectionKey] = reviews;
          break;
        }
        default:
          break;
      }
    } catch (error) {
      logError("homepage.section", error);
      data[section.sectionKey] = [];
    }
  }
  return { sections, data };
}
