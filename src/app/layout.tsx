import "./globals.css";
import type { Metadata } from "next";

import { Inter } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { GlobalErrorListener } from "@/components/shared/global-error-listener";
import { getStoreSettings } from "@/server/repositories/settings.repo";
import { DEFAULT_STORE_SETTINGS } from "@/config/site";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

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
      <head>
        <style
          dangerouslySetInnerHTML={{
            __html: `
              :root {
                --primary: ${settings.primaryHsl};
                --accent: ${settings.accentHsl};
                --ring: ${settings.primaryHsl};
                --brand-primary: ${settings.primaryColor};
                --brand-accent: ${settings.accentColor};
                --brand-button: ${settings.buttonColor};
                --brand-text: ${settings.textColor};
                --brand-background: ${settings.backgroundColor};
              }
            `,
          }}
        />
      </head>
      <body
        className={`${inter.variable} font-sans antialiased`}
        style={{ fontFamily: `"${fontFamily}", var(--font-inter), ui-sans-serif, system-ui, sans-serif` }}
      >
        {children}
        <GlobalErrorListener />
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
