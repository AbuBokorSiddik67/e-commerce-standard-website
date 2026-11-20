import { getStoreSettings } from "@/server/repositories/settings.repo";
import { Header, Footer } from "@/components/customer/header-footer";
import { onHex, readableOnLight } from "@/lib/storefront-colors";
import type { CSSProperties } from "react";
import { StoreSettingsProvider } from "@/components/customer/store-settings-provider";

export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const settings = await getStoreSettings();
  const settingsPlain = {
    storeName: settings.storeName,
    logoUrl: settings.logoUrl,
    currencySymbol: settings.currencySymbol,
    contactPhone: settings.contactPhone,
    contactEmail: settings.contactEmail,
    storeAddress: settings.storeAddress,
    facebookUrl: settings.facebookUrl,
    instagramUrl: settings.instagramUrl,
    youtubeUrl: settings.youtubeUrl,
    footerText: settings.footerText,
    codEnabled: settings.codEnabled,
  };

  const style = {
    "--store-ink": settings.primaryColor,
    "--brand-accent": settings.accentColor,
    "--brand-secondary": settings.secondaryColor,
    "--brand-button": settings.buttonColor,
    "--brand-text": settings.textColor,
    "--brand-background": settings.backgroundColor,
    "--primary": readableOnLight(settings.accentColor),
    "--ring": readableOnLight(settings.accentColor),
    "--foreground": readableOnLight(settings.textColor),
    "--card-foreground": readableOnLight(settings.textColor),
    "--button": settings.buttonHsl,
    "--button-foreground": onHex(settings.buttonColor),
    "--shop-canvas": settings.backgroundColor === "#FFFFFF" ? "hsl(var(--background))" : `color-mix(in srgb, ${settings.backgroundColor} 10%, #f8fafd)`,
    "--store-ink-text": `hsl(${onHex(settings.primaryColor)})`,
  } as CSSProperties;

  return (
    <StoreSettingsProvider settings={settingsPlain}>
      <div className="storefront flex min-h-screen min-w-0 flex-col" style={style}>
        <Header settings={settingsPlain} />
        <main id="main-content" tabIndex={-1} className="min-w-0 flex-1">{children}</main>
        <Footer settings={settingsPlain as unknown as Record<string, unknown>} />
      </div>
    </StoreSettingsProvider>
  );
}
