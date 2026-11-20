"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ADMIN_NAV } from "@/config/site";
import {
  LayoutDashboard, Package, FolderTree, ShoppingBag, Users, Image as ImageIcon,
  Ticket, LayoutTemplate, Settings, BarChart3, LogOut, Store,
} from "lucide-react";
import { signOut } from "next-auth/react";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard, Package, FolderTree, ShoppingBag, Users, ImageIcon,
  Ticket, LayoutTemplate, Settings, BarChart3,
};

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
}

export function AdminSidebar({ storeName }: { storeName: string }) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile top navbar */}
      <header className="sticky top-0 z-40 flex items-center gap-2 border-b bg-card px-4 py-3 lg:hidden">
        <Store className="h-5 w-5 text-primary" />
        <span className="truncate font-semibold">{storeName} Admin</span>
      </header>

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r bg-card lg:flex">
        <div className="flex items-center gap-2 border-b p-4">
          <Store className="h-5 w-5 text-primary" />
          <span className="truncate font-semibold">{storeName} Admin</span>
        </div>
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
          {ADMIN_NAV.map((item) => {
            const Icon = ICONS[item.icon];
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                  active
                    ? "bg-primary text-primary-foreground font-medium"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                {Icon && <Icon className="h-4 w-4" />}
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t p-3">
          <button
            onClick={() => signOut({ callbackUrl: "/admin/login" })}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile bottom navigation */}
      <nav className="fixed inset-x-0 bottom-0 z-50 border-t bg-card pb-[env(safe-area-inset-bottom)] lg:hidden">
        <div className="flex items-center gap-1 overflow-x-auto px-2 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {ADMIN_NAV.map((item) => {
            const Icon = ICONS[item.icon];
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex min-w-[4.5rem] flex-col items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] transition-colors ${
                  active
                    ? "bg-primary text-primary-foreground font-medium"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                {Icon && <Icon className="h-5 w-5" />}
                <span className="whitespace-nowrap">{item.label}</span>
              </Link>
            );
          })}
          <button
            onClick={() => signOut({ callbackUrl: "/admin/login" })}
            className="flex min-w-[4.5rem] flex-col items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <LogOut className="h-5 w-5" />
            <span>Sign out</span>
          </button>
        </div>
      </nav>
    </>
  );
}
