import { requireAdmin } from "@/lib/auth-guard";
import { getStoreSettings } from "@/server/repositories/settings.repo";
import { AdminSidebar } from "@/components/admin/sidebar";

export const dynamic = "force-dynamic";

export default async function AdminProtectedLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  const settings = await getStoreSettings();

  return (
    <div className="admin-shell min-h-screen min-w-0 bg-background">
      <AdminSidebar storeName={settings.storeName} />
      <div className="min-w-0 lg:pl-56 xl:pl-60">
        <main id="main-content" tabIndex={-1} className="admin-content mx-auto min-w-0 max-w-[100rem] p-4 pb-10 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
