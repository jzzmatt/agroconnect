"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Navbar, MobileBottomNav } from "@/components/navigation";
import { Footer } from "@/components/layout";
import { SectionHeader, ExpertCard, SearchBar, EmptyState } from "@/components/ui";
import { LocationSelector } from "@/components/location";
import { MarketplaceDiscovery } from "@/components/marketplace";
import { TransportDiscovery } from "@/components/transport";
import { useI18n } from "@/i18n/provider";
import { searchPublishedExpertsAction } from "@/lib/agriservice/actions";
import type { PublishedExpertListItem } from "@/types/transport";
import { Users } from "lucide-react";

type AgriServiceView = "especialistas" | "servicos" | "transporte";

function AgriServiceContent() {
  const { dict } = useI18n();
  const searchParams = useSearchParams();
  const initialView: AgriServiceView =
    searchParams.get("view") === "servicos"
      ? "servicos"
      : searchParams.get("view") === "transporte"
        ? "transporte"
        : "especialistas";

  const [view, setView] = useState<AgriServiceView>(initialView);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProvince, setSelectedProvince] = useState("");
  const [experts, setExperts] = useState<PublishedExpertListItem[]>([]);
  const [loadingExperts, setLoadingExperts] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoadingExperts(true);
    searchPublishedExpertsAction({
      query: searchQuery || undefined,
      provinceName: selectedProvince || undefined,
    }).then((result) => {
      if (cancelled) return;
      setExperts(result.experts);
      setLoadingExperts(false);
    });
    return () => {
      cancelled = true;
    };
  }, [searchQuery, selectedProvince]);

  const pillar = dict.pillars.agriService || dict.pillars.agriExpert;

  const tabClass = (active: boolean) =>
    `px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
      active ? "bg-primary text-primary-foreground shadow-xs" : "text-foreground hover:bg-muted"
    }`;

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground transition-colors">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 w-full">
        <SectionHeader
          badgeText="AgriService • Descoberta"
          title={pillar.name}
          subtitle={pillar.headline}
        />

        <div className="flex flex-wrap items-center gap-1 bg-surface-card p-1 rounded-2xl border border-border w-fit mb-8">
          <button type="button" onClick={() => setView("especialistas")} className={tabClass(view === "especialistas")}>
            Especialistas
          </button>
          <button type="button" onClick={() => setView("servicos")} className={tabClass(view === "servicos")}>
            Serviços
          </button>
          <button type="button" onClick={() => setView("transporte")} className={tabClass(view === "transporte")}>
            Transporte
          </button>
        </div>

        {view === "especialistas" ? (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
              <div className="lg:col-span-1">
                <SearchBar
                  value={searchQuery}
                  onChange={setSearchQuery}
                  placeholder="Pesquisar por nome, especialidade ou categoria..."
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

            {loadingExperts ? (
              <div className="text-center py-16 text-sm text-muted-foreground">
                A carregar especialistas...
              </div>
            ) : experts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {experts.map((expert) => (
                  <ExpertCard
                    key={expert.id}
                    id={expert.id}
                    name={expert.name}
                    title={expert.title}
                    specialty={expert.specialty}
                    provinceName={expert.provinceName}
                    municipalityName={expert.municipalityName}
                    rating={expert.rating}
                    consultationsCount={expert.consultationsCount}
                    avatarUrl={expert.avatarUrl}
                    verified={expert.verified}
                    hourlyRate={expert.hourlyRate || "Sob consulta"}
                    profileSlug={expert.slug}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Users}
                title="Nenhum especialista encontrado"
                description="Não encontramos especialistas publicados que correspondam aos filtros selecionados."
                actionLabel="Limpar Filtros"
                onAction={() => {
                  setSearchQuery("");
                  setSelectedProvince("");
                }}
              />
            )}
          </>
        ) : view === "servicos" ? (
          <MarketplaceDiscovery />
        ) : (
          <TransportDiscovery />
        )}
      </main>

      <Footer />
      <MobileBottomNav variant="marketing" />
    </div>
  );
}

export default function AgriServicePage() {
  return (
    <Suspense fallback={null}>
      <AgriServiceContent />
    </Suspense>
  );
}
