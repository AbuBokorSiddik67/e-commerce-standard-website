import { requireCustomer } from "@/lib/auth-guard";
import { listCustomerAddresses } from "@/server/services/account.service";
import { AddressManager } from "@/components/customer/address-manager";
import { AppError } from "@/components/shared/app-error";
import { attempt } from "@/lib/errors";

export const dynamic = "force-dynamic";

export default async function AccountAddressesPage() {
  const session = await requireCustomer();
  const addressesResult = await attempt("account.addresses", () =>
    listCustomerAddresses(session.user.id),
  );

  if (!addressesResult.ok) {
    return (
      <AppError
        title="We couldn't load your addresses"
        description="Your saved addresses are safe. Please try again in a moment."
      />
    );
  }

  const addresses = addressesResult.value;

  return (
    <AddressManager
      addresses={addresses.map((a) => ({
        id: a.id,
        fullName: a.fullName,
        phone: a.phone,
        address: a.address,
        district: a.district,
        city: a.city,
        postalCode: a.postalCode,
        isDefault: a.isDefault,
      }))}
    />
  );
}
