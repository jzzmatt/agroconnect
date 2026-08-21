"use client";

import React, { useState } from "react";
import { Navbar, MobileBottomNav } from "@/components/navigation";
import { Footer } from "@/components/layout";
import { SectionHeader, ExpertCard, SearchBar, EmptyState } from "@/components/ui";
import { LocationSelector } from "@/components/location";
import { useI18n } from "@/i18n/provider";
import { MOCK_EXPERTS } from "@/config/mock-data";
import { Users, Filter } from "lucide-react";

export default function AgriExpertPage() {
  const { dict } = useI18n();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProvince, setSelectedProvince] = useState("");
  const [selectedSpecialty, setSelectedSpecialty] = useState("all");

  const filteredExperts = MOCK_EXPERTS.filter((exp) => {
    const matchesSearch =
      exp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      exp.specialty.toLowerCase().includes(searchQuery.toLowerCase()) ||
      exp.title.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesProvince = selectedProvince
      ? exp.provinceName.toLowerCase() === selectedProvince.toLowerCase()
      : true;

    return matchesSearch && matchesProvince;
  });

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground transition-colors">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 w-full">
        <SectionHeader
          badgeText="AgriExpert • Marketplace"
          title={dict.pillars.agriExpert.name}
          subtitle={dict.pillars.agriExpert.headline}
        />

        {/* Filters and search toolbar */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
          <div className="lg:col-span-1">
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Pesquisar por nome, especialidade ou veterinário..."
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

        {/* Results grid */}
        {filteredExperts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredExperts.map((expert) => (
              <ExpertCard key={expert.id} {...expert} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Users}
            title="Nenhum especialista encontrado"
            description="Não encontramos especialistas que correspondam aos filtros selecionados. Experimente limpar a pesquisa."
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
