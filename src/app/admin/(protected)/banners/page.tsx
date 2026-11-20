import { requireAdmin } from "@/lib/auth-guard";
import { listBanners } from "@/server/services/content.service";
import { BannerManager } from "@/components/admin/banner-manager";
import { AppError } from "@/components/shared/app-error";
import { attempt } from "@/lib/errors";

export default async function AdminBannersPage() {
  await requireAdmin();
  const bannersResult = await attempt("admin.banners", listBanners);

  if (!bannersResult.ok) {
    return (
      <AppError
        variant="admin"
        title="Banners could not be loaded"
        description="We couldn't reach the banner database. Please retry in a moment."
      />
    );
  }

  const banners = bannersResult.value;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Banners</h1>
        <p className="text-sm text-muted-foreground">Promotional banners shown on the storefront</p>
      </div>
      <BannerManager banners={banners.map((b) => ({
        id: b.id,
        title: b.title,
        subtitle: b.subtitle,
        ctaText: b.ctaText,
        ctaLink: b.ctaLink,
        image: b.image,
        position: b.position,
        sortOrder: b.sortOrder,
        isActive: b.isActive,
        startDate: b.startDate?.toISOString() ?? null,
        endDate: b.endDate?.toISOString() ?? null,
      }))} />
    </div>
  );
}
