import "./globals.css";
import type { Metadata } from "next";

import localFont from "next/font/local";
import { Toaster } from "@/components/ui/sonner";
import { GlobalErrorListener } from "@/components/shared/global-error-listener";
import { getStoreSettings } from "@/server/repositories/settings.repo";
import { siteOrigin } from "@/lib/seo";

const inter = localFont({ src: "./fonts/inter-latin.woff2", weight: "100 900", display: "swap", variable: "--font-inter" });

const bengali = localFont({ src: "./fonts/noto-sans-bengali.woff2", weight: "100 900", display: "swap", variable: "--font-bengali", preload: false });

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getStoreSettings();
  return {
    metadataBase: siteOrigin(),
    title: { default: settings.storeName, template: `%s | ${settings.storeName}` },
    icons: settings.faviconUrl ? [{ url: settings.faviconUrl }] : undefined,
  };
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
