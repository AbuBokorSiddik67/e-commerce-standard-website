"use client";

import { safeLink } from "@/lib/safe-urls";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCartCount } from "@/hooks/use-cart";
import { NAV_LINKS } from "@/config/site";
import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Search, ShoppingBag, Menu, User, Home, Phone, Mail, MapPin, Facebook, Instagram, Youtube, Heart, LayoutGrid, ArrowUpRight, Truck } from "lucide-react";

export function Header({ settings }: { settings: { storeName: string; logoUrl: string | null } }) {
  const cartCount = useCartCount();
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
          {links.map(({href,label,icon: Icon}) => <Link key={href} href={href} aria-label={href === "/cart" ? `Cart, ${cartCount} items` : label} className={`relative grid size-10 place-items-center rounded-lg hover:bg-secondary hover:text-primary ${href === "/account" ? "hidden sm:grid" : ""}`}>
            <Icon className="size-[1.17rem]" aria-hidden="true" />
            {href === "/cart" && cartCount > 0 && <span aria-hidden="true" className="absolute right-0.5 top-0.5 grid min-w-4 place-items-center rounded-full bg-primary px-1 text-[0.62rem] font-bold text-primary-foreground">{cartCount}</span>}
          </Link>)}
          <Sheet><SheetTrigger asChild><Button size="icon" variant="ghost" className="lg:hidden" aria-label="Open menu"><Menu className="size-5" /></Button></SheetTrigger>
            <SheetContent className="w-[min(22rem,90vw)] overflow-auto"><SheetTitle>{settings.storeName}</SheetTitle><SheetDescription>Shop and manage your orders.</SheetDescription>
              <nav aria-label="Menu" className="mt-5 grid gap-1">{[...NAV_LINKS, ...links].map(link => <SheetClose asChild key={link.href}><Link aria-current={isActive(link.href) ? "page" : undefined} href={link.href} className="rounded-lg px-3 py-3 text-sm font-semibold hover:bg-secondary aria-[current=page]:bg-secondary aria-[current=page]:text-primary">{link.label}</Link></SheetClose>)}</nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
    <nav aria-label="Mobile shortcuts" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
      {[{href:"/",label:"Home",icon:Home},{href:"/products",label:"Shop",icon:LayoutGrid},...links.slice(1).reverse()].map(({href,label,icon:Icon}) => <Link key={href} href={href} aria-current={isActive(href) ? "page" : undefined} className="flex min-h-12 flex-col items-center justify-center gap-1 text-[0.67rem] font-semibold text-muted-foreground aria-[current=page]:text-primary"><Icon className="size-[1.05rem]" aria-hidden="true" />{label}</Link>)}
    </nav>
  </>;
}

export function Footer({ settings }: { settings: Record<string, unknown> }) {
  const storeName = settings.storeName as string;
  const footerText = (settings.footerText as string) ?? "";
  const phone = settings.contactPhone as string | null;
  const email = settings.contactEmail as string | null;
  const address = settings.storeAddress as string | null;
  const fb = safeLink(settings.facebookUrl, false);
  const ig = safeLink(settings.instagramUrl, false);
  const yt = safeLink(settings.youtubeUrl, false);

  return (
    <footer className="border-t border-white/10 bg-[color:var(--store-ink)] text-[color:var(--store-ink-text)] [&_.text-muted-foreground]:text-[color:var(--store-ink-text)] [&_a:hover]:underline">
      <div className="container-page py-10 pb-24 lg:pb-10">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-3">
            <h3 className="text-2xl font-bold tracking-tight">{storeName}</h3>
            <p className="text-sm text-muted-foreground">{footerText}</p>
            {(fb || ig || yt) && (
              <div className="flex gap-3">
                {fb && <a href={fb} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground" aria-label="Facebook"><Facebook className="h-5 w-5" /></a>}
                {ig && <a href={ig} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground" aria-label="Instagram"><Instagram className="h-5 w-5" /></a>}
                {yt && <a href={yt} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground" aria-label="YouTube"><Youtube className="h-5 w-5" /></a>}
              </div>
            )}
          </div>

          <div>
            <h4 className="mb-3 text-sm font-semibold">Quick Links</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {NAV_LINKS.map((l) => (
                <li key={l.href}><Link href={l.href} className="hover:text-foreground">{l.label}</Link></li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-semibold">Policies</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/policies/return-policy" className="hover:text-foreground">Return Policy</Link></li>
              <li><Link href="/policies/privacy-policy" className="hover:text-foreground">Privacy Policy</Link></li>
              <li><Link href="/policies/terms-conditions" className="hover:text-foreground">Terms & Conditions</Link></li>
              <li><Link href="/policies/shipping-policy" className="hover:text-foreground">Shipping Policy</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-semibold">Contact</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {phone && <li className="flex items-center gap-2"><Phone className="h-4 w-4" /> {phone}</li>}
              {email && <li className="flex items-center gap-2"><Mail className="h-4 w-4" /> {email}</li>}
              {address && <li className="flex items-center gap-2"><MapPin className="h-4 w-4" /> {address}</li>}
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-white/15 pt-6 text-sm text-muted-foreground">
          © {new Date().getFullYear()} {storeName}. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
