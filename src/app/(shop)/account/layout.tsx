import { requireCustomer } from "@/lib/auth-guard";
import { AccountNav } from "@/components/customer/account-nav";

export const dynamic = "force-dynamic";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const session = await requireCustomer();

  return (
    <div className="container-page py-8">
      <AccountNav email={session.user.email} />
      {children}
    </div>
  );
}
