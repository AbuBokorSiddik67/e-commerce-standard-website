"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/account", label: "Overview" },
  { href: "/account/orders", label: "Orders" },
  { href: "/account/addresses", label: "Addresses" },
  { href: "/account/wishlist", label: "Wishlist" },
];

export function AccountNav({ email }: { email?: string | null }) {
  const pathname = usePathname();

  return (
    <div className="surface mb-6 flex flex-col gap-4 p-4 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <p className="eyebrow mb-1 text-primary">Customer workspace</p><h1 className="page-title">My account</h1>
        {email && <p className="break-all text-sm text-muted-foreground">{email}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <nav aria-label="Account" className="flex flex-wrap gap-1">
          {TABS.map((tab) => {
            const active = pathname === tab.href || (tab.href !== "/account" && pathname.startsWith(`${tab.href}/`));
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent",
                )}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
        <Button
          variant="outline"
          size="sm"
          onClick={() => signOut({ callbackUrl: "/" })}
        >
          Sign out
        </Button>
      </div>
    </div>
  );
}
