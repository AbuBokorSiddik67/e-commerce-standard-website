import "./globals.css";
import type { Metadata } from "next";

import localFont from "next/font/local";
import { Toaster } from "@/components/ui/sonner";
import { GlobalErrorListener } from "@/components/shared/global-error-listener";
import { getStoreSettings } from "@/server/repositories/settings.repo";
import { DEFAULT_STORE_SETTINGS } from "@/config/site";

const inter = localFont({ src: "./fonts/inter-latin.woff2", weight: "100 900", display: "swap", variable: "--font-inter" });

const bengali = localFont({ src: "./fonts/noto-sans-bengali.woff2", weight: "100 900", display: "swap", variable: "--font-bengali", preload: false });

export async function generateMetadata(): Promise<Metadata> {
  try {
    const settings = await getStoreSettings();
    return {
      title: {
        default: settings.storeName,
        template: `%s | ${settings.storeName}`,
      },
      description: settings.footerText ?? "Online store in Bangladesh",
      icons: settings.faviconUrl ? [{ url: settings.faviconUrl }] : undefined,
      openGraph: {
        title: settings.storeName,
        description: settings.footerText ?? undefined,
        images: settings.socialShareImage ? [{ url: settings.socialShareImage }] : undefined,
      },
    };
  } catch {
    return {
      title: {
        default: DEFAULT_STORE_SETTINGS.storeName,
        template: `%s | ${DEFAULT_STORE_SETTINGS.storeName}`,
      },
      description: "Online store in Bangladesh",
    };
  }
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const settings = await getStoreSettings();
  const fontFamily = settings.fontFamily || "Inter";

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${bengali.variable} font-sans antialiased`}
        style={{ fontFamily: fontFamily === "Inter" ? "var(--font-inter), var(--font-bengali), system-ui, sans-serif" : `"${fontFamily}", var(--font-inter), var(--font-bengali), system-ui, sans-serif` }}
      >
        <a href="#main-content" className="skip-link">Skip to content</a>
        {children}
        <GlobalErrorListener />
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
