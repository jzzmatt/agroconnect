import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import { I18nProvider } from "@/i18n/provider";
import { LocaleHydrator } from "@/components/i18n/LocaleHydrator";
import { ThemeProvider, ThemeScript } from "@/lib/theme";
import { CartProvider } from "@/components/commerce/CartProvider";
import { InstallAppButton } from "@/components/pwa/InstallAppButton";

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
    icon: "/icons/agroconnect.svg",
    apple: "/icons/agroconnect.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#166534",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
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
                {children}
                <InstallAppButton />
              </CartProvider>
            </I18nProvider>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
