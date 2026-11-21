"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HeaderCartLink } from "./header-cart-link";
import { NAV_LINKS } from "@/config/site";
import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Search, ShoppingBag, Menu, User, Home, Heart, LayoutGrid, ArrowUpRight, Truck } from "lucide-react";

export function Header({ settings }: { settings: { storeName: string; logoUrl: string | null } }) {
  const pathname = usePathname();
  const links = [{ href: "/account/wishlist", label: "Wishlist", icon: Heart }, { href: "/account", label: "Account", icon: User }, { href: "/cart", label: "Cart", icon: ShoppingBag }];
  const isActive = (href: string) => pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));

  return <>
    <div className="bg-[color:var(--store-ink)] text-[color:var(--store-ink-text)]">
      <div className="container-page flex min-h-9 items-center justify-center gap-4 text-[0.71rem] font-medium sm:justify-between">
        <span className="flex items-center gap-2"><Truck className="size-3.5" aria-hidden="true" /> Shopping in Bangladesh · Delivery information</span>
        <Link href="/policies/shipping-policy" className="flex shrink-0 items-center gap-1 hover:underline"><span className="hidden sm:inline">Shipping policy</span><span className="sr-only sm:hidden">Shipping policy</span><ArrowUpRight className="size-3" aria-hidden="true" /></Link>
      </div>
    </div>
    <header className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur">
      <div className="container-page flex flex-wrap items-center gap-x-3 gap-y-2 py-2.5 lg:h-[4.6rem] lg:flex-nowrap lg:gap-7 lg:py-0">
        <Link href="/" className="group flex min-w-0 items-center gap-2.5 py-1" aria-label={`${settings.storeName} home`}>
          {settings.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={settings.logoUrl} alt={settings.storeName} className="h-9 max-w-[9rem] object-contain" />
          ) : <><span className="grid size-9 shrink-0 place-items-center rounded-[0.7rem] bg-primary text-primary-foreground"><ShoppingBag className="size-[1.12rem]" aria-hidden="true" /></span><span className="truncate text-[1.32rem] font-extrabold tracking-[-.075em]">{settings.storeName}<span className="text-primary">.</span></span></>}
        </Link>
        <nav aria-label="Primary" className="hidden shrink-0 items-center gap-4 lg:flex xl:gap-6">
          {NAV_LINKS.map(link => <Link key={link.href} href={link.href} aria-current={isActive(link.href) ? "page" : undefined} className={`py-2 text-[0.82rem] font-semibold hover:text-primary ${isActive(link.href) ? "text-primary" : "text-muted-foreground"}`}>{link.label}</Link>)}
        </nav>
        <form role="search" action="/products" className="relative order-last w-full lg:order-none lg:ml-auto lg:max-w-[17rem]">
          <input name="search" type="search" aria-label="Search products" maxLength={120} placeholder="Search products…" className="h-10 w-full rounded-lg border bg-muted/30 px-3 pr-11 text-sm placeholder:text-muted-foreground" />
          <button type="submit" aria-label="Submit product search" className="absolute inset-y-0 right-0 grid w-10 place-items-center rounded-lg text-muted-foreground hover:text-primary"><Search className="size-[1.05rem]" aria-hidden="true" /></button>
        </form>
        <div className="ml-auto flex items-center gap-0.5 lg:ml-0">
          {links.filter(link => link.href !== '/cart').map(({href,label,icon: Icon}) => <Link prefetch={false} key={href} href={href} aria-label={label} className={`relative grid size-10 place-items-center rounded-lg hover:bg-secondary hover:text-primary ${href === "/account" ? "hidden sm:grid" : ""}`}><Icon className="size-[1.17rem]" aria-hidden="true" /></Link>)}
          <HeaderCartLink />
          <Sheet><SheetTrigger asChild><Button size="icon" variant="ghost" className="lg:hidden" aria-label="Open menu"><Menu className="size-5" /></Button></SheetTrigger>
            <SheetContent className="w-[min(22rem,90vw)] overflow-auto"><SheetTitle>{settings.storeName}</SheetTitle><SheetDescription>Shop and manage your orders.</SheetDescription>
              <nav aria-label="Menu" className="mt-5 grid gap-1">{[...NAV_LINKS, ...links].map(link => <SheetClose asChild key={link.href}><Link aria-current={isActive(link.href) ? "page" : undefined} href={link.href} className="rounded-lg px-3 py-3 text-sm font-semibold hover:bg-secondary aria-[current=page]:bg-secondary aria-[current=page]:text-primary">{link.label}</Link></SheetClose>)}</nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
    <nav aria-label="Mobile shortcuts" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
      {[{href:"/",label:"Home",icon:Home},{href:"/products",label:"Shop",icon:LayoutGrid},...links.slice(1).reverse()].map(({href,label,icon:Icon}) => <Link prefetch={false} key={href} href={href} aria-current={isActive(href) ? "page" : undefined} className="flex min-h-12 flex-col items-center justify-center gap-1 text-[0.67rem] font-semibold text-muted-foreground aria-[current=page]:text-primary"><Icon className="size-[1.05rem]" aria-hidden="true" />{label}</Link>)}
    </nav>
  </>;
}
