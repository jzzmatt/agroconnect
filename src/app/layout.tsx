import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import { I18nProvider } from "@/i18n/provider";
import { LocaleHydrator } from "@/components/i18n/LocaleHydrator";
import { ThemeProvider, ThemeScript } from "@/lib/theme";
import { CartProvider } from "@/components/commerce/CartProvider";
import { OfflineNotice } from "@/components/pwa/OfflineNotice";
import { ServiceWorkerRegistrar } from "@/components/pwa/ServiceWorkerRegistrar";

export const metadata: Metadata = {
  title: "AGROCONNECT — Ecossistema Digital para Agricultura",
  description:
    "Plataforma digital integrada para o setor agrícola em Angola: AgriExpert, AgriAcademy, AgriShopping e AgriLocalização.",
  applicationName: "Agroconnect",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "Agroconnect",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { url: "/icons/agroconnect.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0E6B38",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider afterSignOutUrl="/">
      <html lang="pt" suppressHydrationWarning>
        <head>
          <ThemeScript />
        </head>
        <body className="min-h-screen antialiased bg-background text-foreground transition-colors duration-200 overflow-x-hidden">
          <ThemeProvider defaultTheme="light">
            <I18nProvider initialLocale="pt">
              <LocaleHydrator />
              <CartProvider>
                <ServiceWorkerRegistrar />
                <OfflineNotice />
                {children}
              </CartProvider>
            </I18nProvider>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
