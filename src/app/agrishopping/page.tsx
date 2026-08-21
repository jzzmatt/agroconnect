"use client";

import React, { useState } from "react";
import { Navbar, MobileBottomNav } from "@/components/navigation";
import { Footer } from "@/components/layout";
import { SectionHeader, ProductCard, SearchBar, EmptyState } from "@/components/ui";
import { LocationSelector } from "@/components/location";
import { useI18n } from "@/i18n/provider";
import { MOCK_PRODUCTS } from "@/config/mock-data";
import { ShoppingBag } from "lucide-react";

export default function AgriShoppingPage() {
  const { dict } = useI18n();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProvince, setSelectedProvince] = useState("");

  const filteredProducts = MOCK_PRODUCTS.filter((prd) => {
    const matchesSearch =
      prd.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prd.sellerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prd.category.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesProvince = selectedProvince
      ? prd.provinceName.toLowerCase() === selectedProvince.toLowerCase()
      : true;

    return matchesSearch && matchesProvince;
  });

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground transition-colors">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 w-full">
        <SectionHeader
          badgeText="AgriShopping • Marketplace"
          title={dict.pillars.agriShopping.name}
          subtitle={dict.pillars.agriShopping.headline}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
          <div className="lg:col-span-1">
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Pesquisar sementes, adubos, bombas, alfaias..."
            />
          </div>
          <div className="lg:col-span-2">
            <LocationSelector
              selectedProvince={selectedProvince}
              onProvinceChange={setSelectedProvince}
              showRadius={false}
              className="p-3"
            />
          </div>
        </div>

        {filteredProducts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} {...product} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={ShoppingBag}
            title="Nenhum produto encontrado"
            description="Não encontramos produtos correspondentes. Tente ajustar os filtros ou a província."
            actionLabel="Limpar Filtros"
            onAction={() => {
              setSearchQuery("");
              setSelectedProvince("");
            }}
          />
        )}
      </main>

      <Footer />
      <MobileBottomNav variant="marketing" />
    </div>
  );
}
