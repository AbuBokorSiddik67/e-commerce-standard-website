import { ChangePasswordForm } from "@/components/shared/change-password-form";
import { requireAdmin } from "@/lib/auth-guard";
import { getStoreSettings, getAllDeliveryZones } from "@/server/repositories/settings.repo";
import { SettingsForm } from "@/components/admin/settings-form";
import { AppError } from "@/components/shared/app-error";
import { attempt } from "@/lib/errors";

export default async function AdminSettingsPage() {
  await requireAdmin();
  const [settings, zonesResult] = await Promise.all([
    getStoreSettings(),
    attempt("admin.deliveryZones", getAllDeliveryZones),
  ]);

  if (!zonesResult.ok) {
    return (
      <AppError
        variant="admin"
        title="Settings could not be loaded"
        description="We couldn't reach the settings database. No changes were made — please retry in a moment."
      />
    );
  }

  const zones = zonesResult.value;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Store Settings</h1>
        <p className="text-sm text-muted-foreground">
          Branding, contact info, policies, and delivery charges — applied across the storefront
        </p>
      </div>
      <SettingsForm
        settings={{
          ...settings,
          logoUrl: settings.logoUrl ?? "",
          faviconUrl: settings.faviconUrl ?? "",
          contactPhone: settings.contactPhone ?? "",
          contactEmail: settings.contactEmail ?? "",
          storeAddress: settings.storeAddress ?? "",
          facebookUrl: settings.facebookUrl ?? "",
          instagramUrl: settings.instagramUrl ?? "",
          youtubeUrl: settings.youtubeUrl ?? "",
          tiktokUrl: settings.tiktokUrl ?? "",
          whatsappUrl: settings.whatsappUrl ?? "",
          footerText: settings.footerText ?? "",
          returnPolicy: settings.returnPolicy ?? "",
          privacyPolicy: settings.privacyPolicy ?? "",
          termsConditions: settings.termsConditions ?? "",
          shippingPolicy: settings.shippingPolicy ?? "",
          minOrderValue: settings.minOrderValue ?? "",
          socialShareImage: settings.socialShareImage ?? "",
        }}
        zones={zones.map((z) => ({
          id: z.id,
          name: z.name,
          districts: z.districts,
          charge: z.charge.toString(),
          estimatedDays: z.estimatedDays,
          isActive: z.isActive,
        }))}
      />
      <ChangePasswordForm admin />
    </div>
  );
}
