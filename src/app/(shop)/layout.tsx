import { getStoreSettings } from "@/server/repositories/settings.repo";
import { Header, Footer } from "@/components/customer/header-footer";
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

  return (
    <StoreSettingsProvider settings={settingsPlain}>
      <div className="flex min-h-screen flex-col">
        <Header settings={settingsPlain as unknown as Record<string, unknown>} />
        <main className="flex-1 pb-16 lg:pb-0">{children}</main>
        <Footer settings={settingsPlain as unknown as Record<string, unknown>} />
      </div>
    </StoreSettingsProvider>
  );
}
