"use client";

import React, { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Navbar, MobileBottomNav } from "@/components/navigation";
import { Footer } from "@/components/layout";
import { SectionHeader, ExpertCard, SearchBar, EmptyState } from "@/components/ui";
import { LocationSelector } from "@/components/location";
import { MarketplaceDiscovery } from "@/components/marketplace";
import { useI18n } from "@/i18n/provider";
import { MOCK_EXPERTS } from "@/config/mock-data";
import { Users } from "lucide-react";

type AgriExpertView = "especialistas" | "servicos";

function AgriExpertContent() {
  const { dict } = useI18n();
  const searchParams = useSearchParams();
  const initialView: AgriExpertView =
    searchParams.get("view") === "servicos" ? "servicos" : "especialistas";
  const highlightedExpert = searchParams.get("expert");

  const [view, setView] = useState<AgriExpertView>(initialView);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProvince, setSelectedProvince] = useState("");

  const filteredExperts = useMemo(() => {
    const list = MOCK_EXPERTS.filter((exp) => {
      const matchesSearch =
        exp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        exp.specialty.toLowerCase().includes(searchQuery.toLowerCase()) ||
        exp.title.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesProvince = selectedProvince
        ? exp.provinceName.toLowerCase() === selectedProvince.toLowerCase()
        : true;

      return matchesSearch && matchesProvince;
    });

    if (!highlightedExpert) return list;
    return [...list].sort((a, b) => {
      const aMatch = (a.profileSlug || a.id) === highlightedExpert ? 0 : 1;
      const bMatch = (b.profileSlug || b.id) === highlightedExpert ? 0 : 1;
      return aMatch - bMatch;
    });
  }, [searchQuery, selectedProvince, highlightedExpert]);

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground transition-colors">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 w-full">
        <SectionHeader
          badgeText="AgriExpert • Marketplace"
          title={dict.pillars.agriExpert.name}
          subtitle={dict.pillars.agriExpert.headline}
        />

        <div className="flex items-center gap-1 bg-surface-card p-1 rounded-2xl border border-border w-fit mb-8">
          <button
            type="button"
            onClick={() => setView("especialistas")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
              view === "especialistas"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-foreground hover:bg-muted"
            }`}
          >
            Especialistas
          </button>
          <button
            type="button"
            onClick={() => setView("servicos")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
              view === "servicos"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-foreground hover:bg-muted"
            }`}
          >
            Serviços
          </button>
        </div>

        {view === "especialistas" ? (
          <>
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

            {filteredExperts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
          </>
        ) : (
          <MarketplaceDiscovery />
        )}
      </main>

      <Footer />
      <MobileBottomNav variant="marketing" />
    </div>
  );
}

export default function AgriExpertPage() {
  return (
    <Suspense fallback={null}>
      <AgriExpertContent />
    </Suspense>
  );
}
