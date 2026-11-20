"use client";

import { safeLink } from "@/lib/safe-urls";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useCartCount, useCartStore } from "@/hooks/use-cart";
import { NAV_LINKS } from "@/config/site";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  Search, ShoppingCart, Menu, User, Home, FolderTree, Phone, Mail,
  MapPin, Facebook, Instagram, Youtube, X, Heart, LayoutGrid,
} from "lucide-react";
import { useStoreSettings } from "@/hooks/use-store-settings";

export function Header({ settings }: { settings: Record<string, unknown> }) {
  const cartCount = useCartCount();
  const pathname = usePathname();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const storeName = settings.storeName as string;
  const logoUrl = settings.logoUrl as string | null;

  function doSearch(e: React.FormEvent) {
    e.preventDefault();
    if (searchValue.trim()) {
      window.location.href = `/products?search=${encodeURIComponent(searchValue.trim())}`;
    }
  }

  return (
    <>
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
      <div className="container-page flex h-16 items-center gap-3">
        {/* Logo */}
        <Link href="/" className="flex shrink-0 items-center gap-2">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={storeName} className="h-8 w-auto object-contain" />
          ) : (
            <span className="text-lg font-bold tracking-tight">{storeName}</span>
          )}
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-0.5 lg:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                pathname === link.href ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Desktop search */}
        <form onSubmit={doSearch} className="ml-auto hidden max-w-xs flex-1 items-center gap-2 lg:flex xl:max-w-sm">
          <div className="relative w-full">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button type="submit" size="icon" variant="ghost" aria-label="Search">
            <Search className="h-4 w-4" />
          </Button>
        </form>

        {/* Actions */}
        <div className="ml-auto flex items-center gap-1.5 lg:ml-0 lg:gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 rounded-full bg-muted/50 lg:hidden"
            onClick={() => setSearchOpen(!searchOpen)}
            aria-label="Search"
            aria-expanded={searchOpen}
          >
            <Search className="h-4 w-4" />
          </Button>
          {searchOpen && (
            <form
              onSubmit={doSearch}
              className="absolute left-1/2 top-[4.5rem] z-50 w-[calc(100%-1.5rem)] max-w-md -translate-x-1/2 rounded-xl border bg-background p-2 shadow-lg lg:hidden"
            >
              <div className="flex items-center gap-1.5">
                <Input
                  autoFocus
                  placeholder="Search products..."
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  className="h-10"
                />
                <Button type="submit" size="icon" className="h-10 w-10 shrink-0">
                  <Search className="h-4 w-4" />
                </Button>
                <Button type="button" size="icon" variant="ghost" className="h-10 w-10 shrink-0" onClick={() => setSearchOpen(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </form>
          )}
          <Link href="/account/wishlist" aria-label="Wishlist">
            <Button variant="ghost" size="icon">
              <Heart className="h-5 w-5" />
            </Button>
          </Link>
          <Link href="/account" aria-label="Account">
            <Button variant="ghost" size="icon">
              <User className="h-5 w-5" />
            </Button>
          </Link>
          <Link href="/cart" className="relative" aria-label="Cart">
            <Button variant="ghost" size="icon">
              <ShoppingCart className="h-5 w-5" />
              {cartCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-xs font-semibold text-primary-foreground">
                  {cartCount}
                </span>
              )}
            </Button>
          </Link>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetTitle className="sr-only">Mobile navigation menu</SheetTitle>
              <nav className="mt-6 flex flex-col gap-2">
                {NAV_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`rounded-md px-3 py-2 text-sm font-medium ${
                      pathname === link.href ? "bg-primary text-primary-foreground" : "hover:bg-accent"
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
                <Link href="/account" className="rounded-md px-3 py-2 text-sm font-medium hover:bg-accent">
                  My Account
                </Link>
                <Link href="/account/wishlist" className="rounded-md px-3 py-2 text-sm font-medium hover:bg-accent">
                  Wishlist
                </Link>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>

    </header>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        <div className="grid grid-cols-4">
          {[
            { href: "/", label: "Home", icon: Home },
            { href: "/products", label: "Shop", icon: LayoutGrid },
            { href: "/cart", label: "Cart", icon: ShoppingCart },
            { href: "/account", label: "Account", icon: User },
          ].map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex flex-col items-center gap-1 py-2 text-[11px] font-medium ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <Icon className="h-5 w-5" />
                {item.label}
                {item.href === "/cart" && cartCount > 0 && (
                  <span className="absolute right-[28%] top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                    {cartCount}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
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
    <footer className="border-t bg-muted/30">
      <div className="container-page py-10 pb-24 lg:pb-10">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-3">
            <h3 className="font-semibold">{storeName}</h3>
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

        <div className="mt-8 border-t pt-6 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} {storeName}. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
