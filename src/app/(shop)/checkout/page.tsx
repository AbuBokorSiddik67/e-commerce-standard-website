import { getDeliveryZones, getStoreSettings } from "@/server/repositories/settings.repo";
import CheckoutClient from "@/components/customer/checkout-client";
import { AppError } from "@/components/shared/app-error";
import { attempt } from "@/lib/errors";

export default async function CheckoutPage() {
  const [zonesResult, settings] = await Promise.all([
    attempt("checkout.zones", getDeliveryZones),
    getStoreSettings(),
  ]);

  if (!zonesResult.ok) {
    return (
      <AppError
        title="Checkout is temporarily unavailable"
        description="We couldn't load the delivery options right now. Your cart is saved — please try again in a moment."
      />
    );
  }

  const zones = zonesResult.value;
  const safeZones = zones.map((z) => ({
    id: z.id,
    name: z.name,
    charge: z.charge.toString(),
    estimatedDays: z.estimatedDays,
    isActive: z.isActive,
  }));
  const minOrder = settings.minOrderValue ? Number(settings.minOrderValue) : null;

  return <CheckoutClient zones={safeZones} minOrderValue={minOrder} />;
}
