"use client";

import React from "react";
import { Search, Filter, MapPin, DollarSign, X } from "lucide-react";
import { LocationSelector } from "@/components/location/LocationSelector";
import { ANGOLA_PROVINCES } from "@/config/locations";
import type { PricingType } from "@/types/database";

interface ServiceFiltersProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedCategory: string;
  onCategoryChange: (cat: string) => void;
  selectedProvince: string;
  onProvinceChange: (prov: string) => void;
  selectedMunicipality: string;
  onMunicipalityChange: (mun: string) => void;
  selectedRadius: number;
  onRadiusChange: (rad: number) => void;
  selectedPricingType: PricingType | "";
  onPricingTypeChange: (type: PricingType | "") => void;
  sortBy: string;
  onSortByChange: (sort: string) => void;
  onClearFilters: () => void;
  totalResults: number;
}

const CATEGORY_OPTIONS = [
  { slug: "", name: "Todas as Categorias" },
  { slug: "agricultura-e-solos", name: "Agricultura & Solos" },
  { slug: "veterinaria-e-pecuaria", name: "Medicina Veterinária & Pecuária" },
  { slug: "maquinas-e-irrigacao", name: "Máquinas & Irrigação" },
  { slug: "servicos-de-campo", name: "Serviços no Campo & Colheita" },
];

export function ServiceFilters({
  searchQuery,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  selectedProvince,
  onProvinceChange,
  selectedMunicipality,
  onMunicipalityChange,
  selectedRadius,
  onRadiusChange,
  selectedPricingType,
  onPricingTypeChange,
  sortBy,
  onSortByChange,
  onClearFilters,
  totalResults,
}: ServiceFiltersProps) {
  const hasActiveFilters =
    Boolean(searchQuery) ||
    Boolean(selectedCategory) ||
    Boolean(selectedProvince) ||
    Boolean(selectedMunicipality) ||
    Boolean(selectedPricingType);

  return (
    <div className="bg-surface-card rounded-3xl border border-border p-5 shadow-xs space-y-4">
      {/* Top Search & Results Counter */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Pesquisar por serviço, agrónomo, veterinário ou especialidade..."
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-surface border border-input-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Sort selector */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-semibold text-muted-foreground">Ordenar:</span>
          <select
            value={sortBy}
            onChange={(e) => onSortByChange(e.target.value)}
            className="px-3 py-2 rounded-xl bg-surface border border-input-border text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
          >
            <option value="relevance">Relevância</option>
            <option value="distance">Mais Próximos</option>
            <option value="rating">Melhor Avaliados</option>
            <option value="price_asc">Preço: Mais Baixo</option>
            <option value="price_desc">Preço: Mais Alto</option>
            <option value="newest">Mais Recentes</option>
          </select>
        </div>
      </div>

      {/* Filter Row: Category + Pricing Type + Clear */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
        {/* Category selector */}
        <div>
          <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
            Categoria
          </label>
          <select
            value={selectedCategory}
            onChange={(e) => onCategoryChange(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-surface border border-input-border text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
          >
            {CATEGORY_OPTIONS.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Pricing Type */}
        <div>
          <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
            Tipo de Preço
          </label>
          <select
            value={selectedPricingType}
            onChange={(e) => onPricingTypeChange(e.target.value as any)}
            className="w-full px-3 py-2 rounded-xl bg-surface border border-input-border text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
          >
            <option value="">Todos os tipos</option>
            <option value="fixed">Preço Fixo</option>
            <option value="hourly">Por Hora</option>
            <option value="daily">Por Dia</option>
            <option value="starting_from">A partir de</option>
            <option value="quotation">Sob Consulta</option>
          </select>
        </div>

        {/* Location Dropdown selector */}
        <div>
          <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
            Província
          </label>
          <select
            value={selectedProvince}
            onChange={(e) => {
              onProvinceChange(e.target.value);
              onMunicipalityChange("");
            }}
            className="w-full px-3 py-2 rounded-xl bg-surface border border-input-border text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
          >
            <option value="">Todas as 18 Províncias</option>
            {ANGOLA_PROVINCES.map((p) => (
              <option key={p.code} value={p.name}>
                {p.name} ({p.code})
              </option>
            ))}
          </select>
        </div>

        {/* Clear Filters Action */}
        <div className="flex items-end">
          {hasActiveFilters ? (
            <button
              type="button"
              onClick={onClearFilters}
              className="w-full h-9 flex items-center justify-center gap-1.5 px-3 rounded-xl bg-destructive/10 text-destructive text-xs font-bold hover:bg-destructive/20 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Limpar Filtros</span>
            </button>
          ) : (
            <div className="w-full h-9 flex items-center justify-center px-3 rounded-xl bg-surface text-muted-foreground text-xs font-semibold">
              <span>{totalResults} serviços disponíveis</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
