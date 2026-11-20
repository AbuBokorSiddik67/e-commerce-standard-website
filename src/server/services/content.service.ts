import { PublicError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import type { BannerInput, CouponInput } from "@/lib/validations/admin";
import { audit, writeAuditLog } from "@/lib/audit";

export async function listBanners() {
  return prisma.banner.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }] });
}

export async function getActiveBanners(position?: string) {
  const now = new Date();
  return prisma.banner.findMany({
    where: {
      isActive: true,
      OR: [
        { startDate: null, endDate: null },
        { startDate: { lte: now }, endDate: null },
        { startDate: null, endDate: { gte: now } },
        { startDate: { lte: now }, endDate: { gte: now } },
      ],
      ...(position ? { position } : {}),
    },
    orderBy: { sortOrder: "asc" },
  });
}

export async function createBanner(input: BannerInput, adminId: string) {
  const banner = await prisma.banner.create({
    data: {
      title: input.title || null,
      subtitle: input.subtitle || null,
      ctaText: input.ctaText || null,
      ctaLink: input.ctaLink || null,
      image: input.image,
      position: input.position,
      sortOrder: input.sortOrder,
      isActive: input.isActive,
      startDate: input.startDate ? new Date(input.startDate) : null,
      endDate: input.endDate ? new Date(input.endDate) : null,
    },
  });
  await writeAuditLog({ userId: adminId, action: "BANNER_CREATE", entity: "Banner", entityId: banner.id });
  return banner;
}

export async function updateBanner(id: string, input: BannerInput, adminId: string) {
  const banner = await prisma.banner.update({
    where: { id },
    data: {
      title: input.title || null,
      subtitle: input.subtitle || null,
      ctaText: input.ctaText || null,
      ctaLink: input.ctaLink || null,
      image: input.image,
      position: input.position,
      sortOrder: input.sortOrder,
      isActive: input.isActive,
      startDate: input.startDate ? new Date(input.startDate) : null,
      endDate: input.endDate ? new Date(input.endDate) : null,
    },
  });
  await writeAuditLog({ userId: adminId, action: "BANNER_UPDATE", entity: "Banner", entityId: id });
  return banner;
}

export async function deleteBanner(id: string, adminId: string) {
  const banner = await prisma.banner.delete({ where: { id } });
  await writeAuditLog({ userId: adminId, action: "BANNER_DELETE", entity: "Banner", entityId: id });
  return banner;
}

// ---------- Coupons ----------
export async function listCoupons() {
  return prisma.coupon.findMany({ orderBy: { createdAt: "desc" } });
}

function couponData(input: CouponInput) {
  return {
    code: input.code,
    type: input.type,
    value: input.value,
    minOrderAmount: typeof input.minOrderAmount === "number" ? input.minOrderAmount : null,
    usageLimit: typeof input.usageLimit === "number" ? input.usageLimit : null,
    // A displayed expiry date includes that full day in Bangladesh (UTC+06:00).
    expiresAt: input.expiresAt ? new Date(Date.parse(`${input.expiresAt}T00:00:00+06:00`) + 86_400_000) : null,
    isActive: input.isActive,
    productIds: [...new Set(input.productIds)],
    categoryIds: [...new Set(input.categoryIds)],
  };
}

async function saveCoupon(id: string | null, input: CouponInput, adminId: string) {
  const data = couponData(input);
  return prisma.$transaction(async (tx) => {
    const [products, categories] = await Promise.all([
      tx.product.count({ where: { id: { in: data.productIds } } }),
      tx.category.count({ where: { id: { in: data.categoryIds } } }),
    ]);
    if (products !== data.productIds.length || categories !== data.categoryIds.length) throw new PublicError("Select existing coupon products and categories");
    const coupon = await (id ? tx.coupon.update({ where: { id }, data }) : tx.coupon.create({ data }));
    await audit(tx, { userId: adminId, action: id ? "COUPON_UPDATE" : "COUPON_CREATE", entity: "Coupon", entityId: coupon.id,
      detail: { active: coupon.isActive, usageLimit: coupon.usageLimit, productCount: data.productIds.length, categoryCount: data.categoryIds.length } });
    return coupon;
  });
}

export async function createCoupon(input: CouponInput, adminId: string) {
  return saveCoupon(null, input, adminId);
}

export async function updateCoupon(id: string, input: CouponInput, adminId: string) {
  return saveCoupon(id, input, adminId);
}

export async function deleteCoupon(id: string, adminId: string) {
  return prisma.$transaction(async (tx) => {
    const coupon = await tx.coupon.update({ where: { id }, data: { isActive: false } });
    await audit(tx, { userId: adminId, action: "COUPON_ARCHIVE", entity: "Coupon", entityId: id });
    return coupon;
  });
}
