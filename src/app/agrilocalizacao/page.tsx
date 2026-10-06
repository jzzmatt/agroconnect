"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Navbar, MobileBottomNav } from "@/components/navigation";
import { Footer } from "@/components/layout";
import { SectionHeader } from "@/components/ui";
import { LocationSelector, LocationSearch, type MapMarkerItem } from "@/components/location";
import { AngolaAtlasMap, MapBottomSheet, MapLegend } from "@/components/map";
import { useI18n } from "@/i18n/provider";
import { MOCK_MAP_MARKERS } from "@/config/mock-data";
import { ANGOLA_PROVINCES } from "@/config/locations";
import { listPublishedCourseMapMarkersAction } from "@/lib/services/course-actions";
import { provinceMatchesFilter, resolveProvince } from "@/lib/geographic/province-normalization";
import { Compass, List, Map as MapIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/hooks/use-media-query";

type MapListMode = "map" | "list";
type CategoryFilter = "all" | MapMarkerItem["category"];

export default function AgriLocalizacaoPage() {
  const { dict } = useI18n();
  const [selectedProvinceCode, setSelectedProvinceCode] = useState<string | null>(null);
  const [selectedMunicipality, setSelectedMunicipality] = useState<string>("");
  const [selectedRadius, setSelectedRadius] = useState<number>(50);
  const [selectedMarker, setSelectedMarker] = useState<MapMarkerItem | null>(null);
  const [courseMarkers, setCourseMarkers] = useState<MapMarkerItem[]>([]);
  const [viewMode, setViewMode] = useState<MapListMode>("map");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const isMobileMap = useMediaQuery("(max-width: 767px)");

  useEffect(() => {
    let cancelled = false;
    void listPublishedCourseMapMarkersAction().then((markers) => {
      if (cancelled) return;
      setCourseMarkers(
        markers.map((marker) => ({
          ...marker,
          ctaLabel: dict.agrilocalization.mapViewCourse,
        }))
      );
    });
    return () => {
      cancelled = true;
    };
  }, [dict.agrilocalization.mapViewCourse]);

  const selectedProvince = useMemo(
    () => (selectedProvinceCode ? ANGOLA_PROVINCES.find((p) => p.code === selectedProvinceCode) : undefined),
    [selectedProvinceCode]
  );

  const baseMarkers = useMemo(() => {
    const withoutMockAcademy = MOCK_MAP_MARKERS.filter((m) => m.category !== "academy");
    return [...withoutMockAcademy, ...courseMarkers];
  }, [courseMarkers]);

  const filteredMarkers = useMemo(() => {
    return baseMarkers.filter((m) => {
      if (categoryFilter !== "all" && m.category !== categoryFilter) return false;
      return provinceMatchesFilter(m.provinceName, selectedProvince);
    });
  }, [baseMarkers, categoryFilter, selectedProvince]);

  const selectedProvinceName = selectedProvince?.name ?? "";

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground transition-colors">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 w-full space-y-8">
        <div>
          <SectionHeader
            badgeText="Capacidade Transversal"
            title={dict.pillars.agriLocalizacao.name}
            subtitle={dict.pillars.agriLocalizacao.headline}
          />
          <p className="text-xs text-muted-foreground -mt-6">{dict.agrilocalization.heroDescription}</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
          <div className="flex rounded-xl border border-border p-1 bg-muted/40 w-fit">
            <button
              type="button"
              className={cn(
                "inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium min-h-11",
                viewMode === "map" ? "bg-surface shadow-sm" : "text-muted-foreground"
              )}
              onClick={() => setViewMode("map")}
            >
              <MapIcon className="w-4 h-4" />
              {dict.agrilocalization.viewMap}
            </button>
            <button
              type="button"
              className={cn(
                "inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium min-h-11",
                viewMode === "list" ? "bg-surface shadow-sm" : "text-muted-foreground"
              )}
              onClick={() => setViewMode("list")}
            >
              <List className="w-4 h-4" />
              {dict.agrilocalization.viewList}
            </button>
          </div>
          <MapLegend />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-1">
            <LocationSearch
              onSelectLocation={(res) => {
                const prov = res.provinceName ? resolveProvince(res.provinceName) : undefined;
                if (prov) setSelectedProvinceCode(prov.code);
                if (res.municipalityName) setSelectedMunicipality(res.municipalityName);
              }}
            />
          </div>
          <div className="lg:col-span-2">
            <LocationSelector
              selectedProvince={selectedProvinceName}
              selectedMunicipality={selectedMunicipality}
              selectedRadius={selectedRadius}
              onProvinceChange={(name) => {
                const prov = name ? resolveProvince(name) : undefined;
                setSelectedProvinceCode(prov?.code ?? null);
              }}
              onMunicipalityChange={setSelectedMunicipality}
              onRadiusChange={setSelectedRadius}
              className="p-3"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {(["all", "shopping", "expert", "farm", "service", "business", "academy"] as const).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-semibold border min-h-11 sm:min-h-0",
                categoryFilter === cat
                  ? "bg-[#F97316] text-white border-[#F97316]"
                  : "bg-surface border-border text-foreground"
              )}
            >
              {cat === "all" ? dict.agrilocalization.filterAll : cat}
            </button>
          ))}
        </div>

        {viewMode === "map" ? (
          <div className="space-y-3">
            <AngolaAtlasMap
              selectedProvinceCode={selectedProvinceCode}
              onProvinceSelect={setSelectedProvinceCode}
              markers={filteredMarkers}
              selectedMarkerId={selectedMarker?.id}
              onSelectMarker={setSelectedMarker}
              loadingLabel={dict.agrilocalization.atlasLoading}
              errorTitle={dict.agrilocalization.atlasLoadError}
              errorHint={dict.agrilocalization.atlasLoadErrorHint}
            />
            <MapBottomSheet
              province={selectedProvince}
              marker={isMobileMap ? selectedMarker : null}
              emptyMessage={
                selectedProvince && filteredMarkers.length === 0
                  ? dict.agrilocalization.emptyProvince
                  : undefined
              }
            />
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {filteredMarkers.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  className="w-full text-left rounded-2xl border border-border p-4 hover:border-[#F97316]/50 transition-colors min-h-11"
                  onClick={() => {
                    setSelectedMarker(m);
                    const prov = resolveProvince(m.provinceName);
                    if (prov) setSelectedProvinceCode(prov.code);
                    setViewMode("map");
                  }}
                >
                  <p className="text-xs uppercase text-muted-foreground">{m.category}</p>
                  <p className="font-semibold text-foreground">{m.title}</p>
                  <p className="text-sm text-muted-foreground">{m.provinceName}</p>
                </button>
              </li>
            ))}
            {filteredMarkers.length === 0 ? (
              <li className="text-sm text-muted-foreground col-span-full">{dict.agrilocalization.emptyProvince}</li>
            ) : null}
          </ul>
        )}

        <div className="pt-8 space-y-4">
          <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Compass className="w-5 h-5 text-primary" />
            <span>{dict.agrilocalization.provincesGridTitle}</span>
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {ANGOLA_PROVINCES.map((p) => {
              const isSelected = selectedProvinceCode === p.code;
              return (
                <button
                  key={p.code}
                  type="button"
                  onClick={() => {
                    setSelectedProvinceCode(isSelected ? null : p.code);
                    setSelectedMarker(null);
                  }}
                  className={`p-3 rounded-2xl border text-left transition-all min-h-11 ${
                    isSelected
                      ? "bg-primary text-primary-foreground border-primary shadow-md scale-102"
                      : "bg-surface border-border hover:bg-muted text-foreground"
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-bold leading-tight">{p.name}</span>
                    <span
                      className={`text-[10px] uppercase font-semibold shrink-0 ${isSelected ? "text-primary-foreground/80" : "text-primary"}`}
                    >
                      {p.code}
                    </span>
                  </div>
                  <span
                    className={`text-[11px] block mt-1 truncate ${isSelected ? "text-primary-foreground/80" : "text-muted-foreground"}`}
                  >
                    Cap: {p.capital}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </main>

      <Footer />
      <MobileBottomNav variant="marketing" />
    </div>
  );
}
