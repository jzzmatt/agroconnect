import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "leaflet/dist/leaflet.css";
import "./globals.css";
import { I18nProvider } from "@/i18n/provider";
import { LocaleHydrator } from "@/components/i18n/LocaleHydrator";
import { ThemeProvider, ThemeScript } from "@/lib/theme";
import { CartProvider } from "@/components/commerce/CartProvider";

export const metadata: Metadata = {
  title: "AGROCONNECT — Ecossistema Digital para Agricultura",
  description:
    "Plataforma digital integrada para o setor agrícola em Angola: AgriExpert, AgriAcademy, AgriShopping e AgriLocalização.",
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
              <CartProvider>{children}</CartProvider>
            </I18nProvider>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
