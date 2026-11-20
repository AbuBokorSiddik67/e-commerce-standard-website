import Link from "next/link";
import { requireCustomer } from "@/lib/auth-guard";
import { getAccountContext, listCustomerOrders, listCustomerAddresses, listWishlist } from "@/server/services/account.service";
import { ProfileForm } from "@/components/customer/profile-form";
import { Card, CardContent } from "@/components/ui/card";
import { AppError } from "@/components/shared/app-error";
import { attempt } from "@/lib/errors";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AccountOverviewPage() {
  const session = await requireCustomer();
  const [contextResult, ordersResult, addressesResult, wishlistResult] = await Promise.all([
    attempt("account.context", () => getAccountContext(session.user.id)),
    attempt("account.orders", () => listCustomerOrders(session.user.id)),
    attempt("account.addresses", () => listCustomerAddresses(session.user.id)),
    attempt("account.wishlist", () => listWishlist(session.user.id)),
  ]);

  if (!contextResult.ok || !ordersResult.ok || !addressesResult.ok || !wishlistResult.ok) {
    return (
      <AppError
        title="We couldn't load your account"
        description="Your account is safe, but we couldn't fetch its details right now. Please try again in a moment."
      />
    );
  }

  const context = contextResult.value;
  const orders = ordersResult.value;
  const addresses = addressesResult.value;
  const wishlist = wishlistResult.value;

  const totalSpent = orders
    .filter((o) => o.status !== "CANCELLED" && o.status !== "RETURNED")
    .reduce((sum, o) => sum + Number(o.total), 0);

  const stats = [
    { label: "Orders", value: orders.length, href: "/account/orders" },
    { label: "Saved addresses", value: addresses.length, href: "/account/addresses" },
    { label: "Wishlist items", value: wishlist.length, href: "/account/wishlist" },
    { label: "Total spent", value: formatCurrency(totalSpent), href: "/account/orders" },
  ];

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href}>
            <Card className="transition-shadow hover:shadow-md">
              <CardContent className="p-5">
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="mt-1 text-2xl font-semibold">{stat.value}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold">Profile</h2>
        <ProfileForm
          initialName={context?.customer?.fullName ?? context?.name ?? ""}
          initialPhone={context?.customer?.phone ?? ""}
          email={context?.email ?? session.user.email ?? ""}
        />
      </div>
    </div>
  );
}
