import type { Metadata } from "next";
import "./globals.css";
import { I18nProvider } from "@/i18n/provider";

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
    <html lang="pt">
      <body className="min-h-screen antialiased bg-background text-foreground">
        <I18nProvider initialLocale="pt">{children}</I18nProvider>
      </body>
    </html>
  );
}
