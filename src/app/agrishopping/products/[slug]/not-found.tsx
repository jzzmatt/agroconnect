import React from "react";
import Link from "next/link";
import { Package } from "lucide-react";
import { Navbar } from "@/components/navigation";
import { Footer } from "@/components/layout";

export default function ProductNotFound() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Navbar />
      <main className="flex-1 max-w-7xl mx-auto px-4 py-20 text-center space-y-4">
        <Package className="w-12 h-12 text-muted-foreground mx-auto" />
        <h2 className="text-2xl font-bold">Produto não encontrado</h2>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Este produto já não está disponível ou foi removido.
        </p>
        <Link
          href="/agrishopping"
          className="inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline"
        >
          Voltar ao AgriShopping
        </Link>
      </main>
      <Footer />
    </div>
  );
}
