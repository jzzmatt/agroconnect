import type { Metadata } from "next";
import "./globals.css";

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
        {children}
      </body>
    </html>
  );
}
