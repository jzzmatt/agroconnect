"use client";

import React, { useState } from "react";
import { Navbar, MobileBottomNav } from "@/components/navigation";
import { Footer } from "@/components/layout";
import { SectionHeader, SearchBar, Badge } from "@/components/ui";
import { LocationMap, LocationSelector, type MapMarkerItem } from "@/components/location";
import { useI18n } from "@/i18n/provider";
import { MOCK_MAP_MARKERS } from "@/config/mock-data";
import { ANGOLA_PROVINCES } from "@/config/locations";
import { MapPin, Compass, Layers, ShieldCheck } from "lucide-react";

export default function AgriLocalizacaoPage() {
  const { dict } = useI18n();
  const [selectedProvince, setSelectedProvince] = useState<string>("");
  const [selectedMunicipality, setSelectedMunicipality] = useState<string>("");
  const [selectedRadius, setSelectedRadius] = useState<number>(50);
  const [selectedMarker, setSelectedMarker] = useState<MapMarkerItem | null>(null);

  const filteredMarkers = selectedProvince
    ? MOCK_MAP_MARKERS.filter(
        (m) => m.provinceName.toLowerCase() === selectedProvince.toLowerCase()
      )
    : MOCK_MAP_MARKERS;

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 w-full space-y-8">
        <div>
          <SectionHeader
            badgeText="Capacidade Transversal"
            title={dict.pillars.agriLocalizacao.name}
            subtitle={dict.pillars.agriLocalizacao.headline}
          />
          <p className="text-xs text-muted-foreground -mt-6">
            A AgriLocalização é o motor geográfico que alimenta o AgriExpert, AgriAcademy, AgriShopping e serviços agropecuários em todas as 18 províncias de Angola.
          </p>
        </div>

        {/* Location selector toolbar */}
        <LocationSelector
          selectedProvince={selectedProvince}
          selectedMunicipality={selectedMunicipality}
          selectedRadius={selectedRadius}
          onProvinceChange={setSelectedProvince}
          onMunicipalityChange={setSelectedMunicipality}
          onRadiusChange={setSelectedRadius}
        />

        {/* Map canvas */}
        <LocationMap
          markers={filteredMarkers}
          height="h-[520px]"
          selectedMarkerId={selectedMarker?.id}
          onSelectMarker={setSelectedMarker}
        />

        {/* Provinces Coverage Grid */}
        <div className="pt-8 space-y-4">
          <h3 className="text-lg font-bold text-emerald-950 flex items-center gap-2">
            <Compass className="w-5 h-5 text-emerald-700" />
            <span>Cobertura das 18 Províncias de Angola</span>
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {ANGOLA_PROVINCES.map((p) => {
              const isSelected = selectedProvince.toLowerCase() === p.name.toLowerCase();
              return (
                <button
                  key={p.code}
                  type="button"
                  onClick={() => setSelectedProvince(isSelected ? "" : p.name)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    isSelected
                      ? "bg-emerald-800 text-white border-emerald-900 shadow-md scale-102"
                      : "bg-emerald-50/50 hover:bg-emerald-100/60 border-emerald-100 text-emerald-950"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold">{p.name}</span>
                    <span className={`text-[10px] uppercase font-semibold ${isSelected ? "text-emerald-200" : "text-emerald-600"}`}>
                      {p.code}
                    </span>
                  </div>
                  <span className={`text-[11px] block mt-1 truncate ${isSelected ? "text-emerald-100" : "text-muted-foreground"}`}>
                    Cap: {p.capital}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </main>

      <Footer />
      <MobileBottomNav />
    </div>
  );
}
