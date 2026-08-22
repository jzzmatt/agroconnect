"use client";

import React from "react";
import { Search, MapPin, X, Package } from "lucide-react";
import { ANGOLA_PROVINCES } from "@/config/locations";
import type { ProductAvailabilityStatus } from "@/types/database";

interface ShoppingProductFiltersProps {
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
  selectedAvailability: ProductAvailabilityStatus | "";
  onAvailabilityChange: (st: ProductAvailabilityStatus | "") => void;
  minPrice: string;
  onMinPriceChange: (p: string) => void;
  maxPrice: string;
  onMaxPriceChange: (p: string) => void;
  sortBy: string;
  onSortByChange: (sort: string) => void;
  onClearFilters: () => void;
  totalResults: number;
}

const CATEGORY_OPTIONS = [
  { slug: "", name: "Todas as Categorias" },
  { slug: "sementes-e-fertilizantes", name: "Sementes & Fertilizantes" },
  { slug: "maquinas-e-irrigacao", name: "Máquinas & Irrigação" },
  { slug: "produtos-agricolas", name: "Produtos Agrícolas & Colheitas" },
  { slug: "alimentacao-animal", name: "Alimentação & Saúde Animal" },
];

export function ShoppingProductFilters({
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
  selectedAvailability,
  onAvailabilityChange,
  minPrice,
  onMinPriceChange,
  maxPrice,
  onMaxPriceChange,
  sortBy,
  onSortByChange,
  onClearFilters,
  totalResults,
}: ShoppingProductFiltersProps) {
  const hasActiveFilters =
    Boolean(searchQuery) ||
    Boolean(selectedCategory) ||
    Boolean(selectedProvince) ||
    Boolean(selectedMunicipality) ||
    Boolean(selectedAvailability) ||
    Boolean(minPrice) ||
    Boolean(maxPrice);

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
            placeholder="Pesquisar sementes de milho, bombas solares, adubo NPK, alfaias..."
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-surface border border-input-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 cursor-pointer"
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
            <option value="price_asc">Preço: Mais Baixo</option>
            <option value="price_desc">Preço: Mais Alto</option>
            <option value="newest">Mais Recentes</option>
          </select>
        </div>
      </div>

      {/* Filter Row: Category + Availability + Province + Price */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-1">
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

        {/* Availability */}
        <div>
          <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
            Disponibilidade
          </label>
          <select
            value={selectedAvailability}
            onChange={(e) => onAvailabilityChange(e.target.value as any)}
            className="w-full px-3 py-2 rounded-xl bg-surface border border-input-border text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
          >
            <option value="">Todas</option>
            <option value="in_stock">Em Stock</option>
            <option value="limited">Stock Limitado</option>
            <option value="pre_order">Sob Encomenda</option>
            <option value="out_of_stock">Sem Stock</option>
          </select>
        </div>

        {/* Province */}
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

        {/* Price Range */}
        <div>
          <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
            Preço Máximo (Kz)
          </label>
          <input
            type="number"
            value={maxPrice}
            onChange={(e) => onMaxPriceChange(e.target.value)}
            placeholder="Ex: 100000"
            className="w-full px-3 py-2 rounded-xl bg-surface border border-input-border text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
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
              <span>{totalResults} produtos listados</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
