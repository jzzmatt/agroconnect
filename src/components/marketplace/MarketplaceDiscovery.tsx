"use client";

import React, { useState, useEffect, useCallback, useTransition } from "react";
import { EmptyState } from "@/components/ui";
import { LocationMap, type MapMarkerItem } from "@/components/location";
import { ServiceCard, ServiceFilters } from "@/components/marketplace";
import { toggleFavoriteAction } from "@/lib/services/marketplace-actions";
import { MarketplaceService, INITIAL_SERVICES } from "@/lib/services/marketplace-service";
import type { ServiceListItem } from "@/types/domain";
import type { PricingType } from "@/types/database";
import { MapPin, SlidersHorizontal, Map as MapIcon, List } from "lucide-react";
import { useGeolocation } from "@/lib/location/use-geolocation";

export function MarketplaceDiscovery() {
  const [services, setServices] = useState<ServiceListItem[]>(INITIAL_SERVICES);
  const [totalCount, setTotalCount] = useState<number>(INITIAL_SERVICES.length);
  const [selectedService, setSelectedService] = useState<ServiceListItem | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedProvince, setSelectedProvince] = useState("");
  const [selectedMunicipality, setSelectedMunicipality] = useState("");
  const [selectedRadius, setSelectedRadius] = useState<number>(50);
  const [selectedPricingType, setSelectedPricingType] = useState<PricingType | "">("");
  const [sortBy, setSortBy] = useState("relevance");
  const [viewMode, setViewMode] = useState<"split" | "list" | "map">("split");

  const [isPending, startTransition] = useTransition();
  const { coordinates: userCoords } = useGeolocation();
  const userLatitude = userCoords?.latitude ?? null;
  const userLongitude = userCoords?.longitude ?? null;

  const loadServices = useCallback(async () => {
    const res = await MarketplaceService.searchServices({
      query: searchQuery,
      categorySlug: selectedCategory || undefined,
      provinceName: selectedProvince || undefined,
      municipalityName: selectedMunicipality || undefined,
      pricingType: (selectedPricingType as PricingType) || undefined,
      latitude: userLatitude ?? undefined,
      longitude: userLongitude ?? undefined,
      radiusKm: selectedRadius,
      sortBy: sortBy as "relevance" | "distance" | "price_asc" | "price_desc" | "newest" | "rating",
    });

    setServices(res.services);
    setTotalCount(res.total);
  }, [
    searchQuery,
    selectedCategory,
    selectedProvince,
    selectedMunicipality,
    selectedPricingType,
    selectedRadius,
    sortBy,
    userLatitude,
    userLongitude,
  ]);

  useEffect(() => {
    startTransition(() => {
      void loadServices();
    });
  }, [loadServices]);

  const handleToggleFavorite = async (serviceId: string) => {
    try {
      const res = await toggleFavoriteAction(serviceId);
      setFavorites((prev) => {
        const next = new Set(prev);
        if (res.isFavorited) next.add(serviceId);
        else next.delete(serviceId);
        return next;
      });
    } catch {
      setFavorites((prev) => {
        const next = new Set(prev);
        if (next.has(serviceId)) next.delete(serviceId);
        else next.add(serviceId);
        return next;
      });
    }
  };

  const handleClearFilters = () => {
    setSearchQuery("");
    setSelectedCategory("");
    setSelectedProvince("");
    setSelectedMunicipality("");
    setSelectedPricingType("");
    setSortBy("relevance");
  };

  const handleSelectMarker = useCallback(
    (marker: MapMarkerItem | null) => {
      if (!marker) {
        setSelectedService(null);
        return;
      }
      setSelectedService((current) => {
        if (current?.id === marker.id) return current;
        return services.find((s) => s.id === marker.id) || null;
      });
    },
    [services]
  );

  const mapMarkers: MapMarkerItem[] = services
    .filter((s) => s.latitude && s.longitude)
    .map((s) => ({
      id: s.id,
      title: s.title,
      category: "service" as const,
      latitude: s.latitude!,
      longitude: s.longitude!,
      provinceName: s.province_name || "Angola",
      municipalityName: s.municipality_name || undefined,
      description: s.short_description || undefined,
    }));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-1 bg-surface-card p-1 rounded-2xl border border-border shrink-0 self-start">
        <button
          type="button"
          onClick={() => setViewMode("split")}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 ${
            viewMode === "split"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-foreground hover:bg-muted"
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Dividido</span>
        </button>
        <button
          type="button"
          onClick={() => setViewMode("list")}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 ${
            viewMode === "list"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-foreground hover:bg-muted"
          }`}
        >
          <List className="w-3.5 h-3.5" />
          <span>Lista</span>
        </button>
        <button
          type="button"
          onClick={() => setViewMode("map")}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 ${
            viewMode === "map"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-foreground hover:bg-muted"
          }`}
        >
          <MapIcon className="w-3.5 h-3.5" />
          <span>Mapa</span>
        </button>
        {isPending && <span className="text-[11px] text-muted-foreground px-2">A atualizar…</span>}
      </div>

      <ServiceFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        selectedProvince={selectedProvince}
        onProvinceChange={setSelectedProvince}
        selectedMunicipality={selectedMunicipality}
        onMunicipalityChange={setSelectedMunicipality}
        selectedRadius={selectedRadius}
        onRadiusChange={setSelectedRadius}
        selectedPricingType={selectedPricingType}
        onPricingTypeChange={setSelectedPricingType}
        sortBy={sortBy}
        onSortByChange={setSortBy}
        onClearFilters={handleClearFilters}
        totalResults={totalCount}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {(viewMode === "split" || viewMode === "list") && (
          <div className={`space-y-4 ${viewMode === "split" ? "lg:col-span-7" : "lg:col-span-12"}`}>
            {services.length > 0 ? (
              <div
                className={`grid gap-4 ${
                  viewMode === "list"
                    ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
                    : "grid-cols-1 sm:grid-cols-2"
                }`}
              >
                {services.map((service) => (
                  <ServiceCard
                    key={service.id}
                    service={service}
                    isSelected={selectedService?.id === service.id}
                    isFavorited={favorites.has(service.id)}
                    onSelect={(s) => setSelectedService(s)}
                    onToggleFavorite={handleToggleFavorite}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={MapPin}
                title="Nenhum serviço encontrado"
                description="Tente alterar os termos de pesquisa, categoria ou raio geográfico."
                actionLabel="Limpar Filtros"
                onAction={handleClearFilters}
              />
            )}
          </div>
        )}

        {(viewMode === "split" || viewMode === "map") && (
          <div className={`sticky top-20 ${viewMode === "split" ? "lg:col-span-5" : "lg:col-span-12"}`}>
            <div className="bg-surface-card rounded-3xl p-2 border border-border shadow-md">
              <LocationMap
                markers={mapMarkers}
                height={viewMode === "map" ? "h-[640px]" : "h-[540px]"}
                selectedMarkerId={selectedService?.id}
                onSelectMarker={handleSelectMarker}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
