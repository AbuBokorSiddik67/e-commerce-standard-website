import { requireAdmin } from "@/lib/auth-guard";
import { getStoreSettings } from "@/server/repositories/settings.repo";
import { AdminSidebar } from "@/components/admin/sidebar";

export const dynamic = "force-dynamic";

export default async function AdminProtectedLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  const settings = await getStoreSettings();

  return (
    <div className="min-h-screen bg-background">
      <AdminSidebar storeName={settings.storeName} />
      <div className="lg:pl-64">
        <main className="p-4 pb-24 sm:p-6 sm:pb-24 lg:p-8 lg:pb-8">{children}</main>
      </div>
    </div>
  );
}
