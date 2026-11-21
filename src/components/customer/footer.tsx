import { safeLink } from "@/lib/safe-urls";
import Link from "next/link";
import { NAV_LINKS } from "@/config/site";
import { Phone, Mail, MapPin, Facebook, Instagram, Youtube } from "lucide-react";

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
