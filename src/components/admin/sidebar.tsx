"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ADMIN_NAV } from "@/config/site";
import { LayoutDashboard, Package, FolderTree, ShoppingBag, Users, Image as ImageIcon, Ticket, LayoutTemplate, Settings, BarChart3, LogOut, Store, Menu, ArrowUpRight, Star } from "lucide-react";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

const icons = { LayoutDashboard, Package, FolderTree, ShoppingBag, Users, ImageIcon, Ticket, LayoutTemplate, Settings, BarChart3, Star };
const groups = [
  { title: "Workspace", routes: ["dashboard", "orders", "customers", "reports"] },
  { title: "Merchandising", routes: ["products", "categories", "coupons", "reviews"] },
  { title: "Storefront", routes: ["homepage", "banners", "settings"] },
];
const matches = (path: string, href: string) => path === href || path.startsWith(`${href}/`);

export function AdminSidebar({ storeName }: { storeName: string }) {
  const pathname = usePathname();
  const current = ADMIN_NAV.find(item => matches(pathname, item.href));
  const brand = <Link href="/admin/dashboard" className="flex min-w-0 items-center gap-3 py-1"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#2c62e9] text-white"><ShoppingBag className="size-[1.1rem]" aria-hidden="true" /></span><span className="truncate"><strong className="block truncate text-base leading-tight tracking-tight">{storeName}</strong><span className="text-[0.68rem] font-medium">Admin workspace</span></span></Link>;
  const navigation = (mobile: boolean) => <nav aria-label="Administration" className="min-h-0 flex-1 space-y-6 overflow-y-auto px-3 py-4">
    {groups.map(group => <div key={group.title}><p className="eyebrow mb-2 px-3 text-[#a9b8d2]">{group.title}</p>
      <ul className="space-y-1">{group.routes.map(route => {
        const item = ADMIN_NAV.find(entry => entry.href === `/admin/${route}`);
        if (!item) return null;
        const Icon = icons[item.icon as keyof typeof icons];
        const link = <Link href={item.href} aria-current={matches(pathname,item.href) ? "page" : undefined} className="flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm font-semibold text-[#d9e4f9] hover:bg-white/10 aria-[current=page]:bg-[#2b55c3] aria-[current=page]:text-white">{Icon && <Icon className="size-4" aria-hidden="true" />}{item.label}</Link>;
        return <li key={item.href}>{mobile ? <SheetClose asChild>{link}</SheetClose> : link}</li>;
      })}</ul>
    </div>)}
  </nav>;
  const signout = <Button type="button" variant="ghost" onClick={() => signOut({ callbackUrl: "/admin/login" })} className="w-full justify-start text-[#d9e4f9] hover:bg-white/10 hover:text-white"><LogOut className="size-4" aria-hidden="true" /> Sign out</Button>;
  return <>
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-56 flex-col bg-[#121e36] text-white lg:flex xl:w-60">
      <div className="border-b border-white/10 px-5 py-4">{brand}</div>{navigation(false)}<div className="border-t border-white/10 p-3">{signout}</div>
    </aside>
    <header className="sticky top-0 z-30 border-b bg-card/95 backdrop-blur lg:ml-56 xl:ml-60">
      <div className="mx-auto flex min-h-[4rem] max-w-[100rem] items-center gap-2 px-4 sm:px-6 lg:px-8">
        <Sheet><SheetTrigger asChild><Button variant="outline" size="icon" className="lg:hidden" aria-label="Open admin menu"><Menu className="size-5" /></Button></SheetTrigger>
          <SheetContent side="left" className="flex h-dvh w-[min(22rem,90vw)] flex-col gap-0 border-none bg-[#121e36] p-0 text-white [&>button]:p-2"><div className="border-b border-white/10 px-5 py-4"><SheetTitle className="text-white">{storeName} Admin</SheetTitle><SheetDescription className="text-[#a9b8d2]">Store administration</SheetDescription></div>{navigation(true)}<div className="border-t border-white/10 p-3">{signout}</div></SheetContent>
        </Sheet>
        <div className="min-w-0"><p className="truncate text-[0.68rem] font-semibold text-muted-foreground">Administration</p><p className="truncate text-sm font-bold">{current?.label ?? "Workspace"}</p></div>
        <Button asChild variant="outline" size="sm" className="ml-auto"><Link href="/"><Store className="size-4" aria-hidden="true" /> View store <ArrowUpRight className="hidden size-3.5 sm:block" aria-hidden="true" /></Link></Button>
        <Button asChild variant="ghost" size="icon" className="hidden lg:inline-flex" aria-label="Admin settings"><Link href="/admin/settings"><Settings className="size-5" aria-hidden="true" /></Link></Button>
      </div>
    </header>
  </>;
}
