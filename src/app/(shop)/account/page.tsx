import { ChangePasswordForm } from "@/components/shared/change-password-form";
import Link from "next/link";
import { requireCustomer } from "@/lib/auth-guard";
import { getAccountContext, getCustomerSummary } from "@/server/services/account.service";
import { ProfileForm } from "@/components/customer/profile-form";
import { Card, CardContent } from "@/components/ui/card";
import { AppError } from "@/components/shared/app-error";
import { attempt } from "@/lib/errors";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AccountOverviewPage() {
  const session = await requireCustomer();
  const [contextResult, summaryResult] = await Promise.all([
    attempt('account.context', () => getAccountContext(session.user.id)),
    attempt('account.summary', () => getCustomerSummary(session.user.id)),
  ]);
  if (!contextResult.ok || !summaryResult.ok) {
    return (
      <AppError
        title="We couldn't load your account"
        description="Your account is safe, but we couldn't fetch its details right now. Please try again in a moment."
      />
    );
  }

  const context = contextResult.value;
  const summary = summaryResult.value;
  const stats = [
    { label: 'Orders', value: summary.orders, href: '/account/orders' },
    { label: 'Saved addresses', value: summary.addresses, href: '/account/addresses' },
    { label: 'Wishlist items', value: summary.wishlist, href: '/account/wishlist' },
    { label: 'Order value', value: formatCurrency(summary.value), href: '/account/orders' },
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
      <ChangePasswordForm />
    </div>
  );
}
