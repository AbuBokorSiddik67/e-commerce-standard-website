import { requireAdmin } from "@/lib/auth-guard";
import { getHomepageSections } from "@/server/services/homepage.service";
import { listCategories } from "@/server/services/category.service";
import { listBanners } from "@/server/services/content.service";
import { prisma } from "@/lib/prisma";
import { HomepageEditor } from "@/components/admin/homepage-editor";
import { AppError } from "@/components/shared/app-error";
import { attempt } from "@/lib/errors";

export default async function AdminHomepagePage() {
  await requireAdmin();
  const homepageData = await attempt("admin.homepage", () =>
    Promise.all([
      getHomepageSections(),
      listCategories(),
      prisma.product.findMany({
        where: { isActive: true },
        select: { id: true, name: true },
        orderBy: { createdAt: "desc" },
      }),
      listBanners(),
      prisma.review.findMany({
        where: { isApproved: true },
        select: { id: true, customerName: true, body: true, rating: true },
        orderBy: { createdAt: "desc" },
      }),
    ]),
  );

  if (!homepageData.ok) {
    return (
      <AppError
        variant="admin"
        title="Homepage editor could not be loaded"
        description="We couldn't reach the content database. No changes were made — please retry in a moment."
      />
    );
  }

  const [sections, categories, products, banners, reviews] = homepageData.value;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Homepage Sections</h1>
        <p className="text-sm text-muted-foreground">
          Reorder, show/hide, and edit the sections on your storefront homepage
        </p>
      </div>
      <HomepageEditor
        sections={sections}
        products={products}
        categories={categories.map((c) => ({ id: c.id, name: c.name }))}
        banners={banners.map((b) => ({
          id: b.id,
          title: b.title,
          subtitle: b.subtitle,
          ctaText: b.ctaText,
          ctaLink: b.ctaLink,
          image: b.image,
          position: b.position,
          sortOrder: b.sortOrder,
          isActive: b.isActive,
        }))}
        reviews={reviews}
      />
    </div>
  );
}
