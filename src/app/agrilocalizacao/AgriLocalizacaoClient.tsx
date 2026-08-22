"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Navbar, MobileBottomNav } from "@/components/navigation";
import { Footer } from "@/components/layout";
import { SectionHeader } from "@/components/ui";
import { LocationMap, LocationSelector, LocationSearch, type MapMarkerItem } from "@/components/location";
import { useI18n } from "@/i18n/provider";
import { MOCK_MAP_MARKERS } from "@/config/mock-data";
import { ANGOLA_PROVINCES } from "@/config/locations";
import { getVendorLocationAction } from "@/lib/services/marketplace-actions";
import { VENDOR_MAP_ZOOM, type VendorLocation } from "@/lib/services/vendor-location";
import { Compass } from "lucide-react";

export function AgriLocalizacaoClient() {
  const { dict } = useI18n();
  const searchParams = useSearchParams();
  const vendorId = searchParams?.get("vendorId") || "";

  const [selectedProvince, setSelectedProvince] = useState<string>("");
  const [selectedMunicipality, setSelectedMunicipality] = useState<string>("");
  const [selectedRadius, setSelectedRadius] = useState<number>(50);
  const [selectedMarker, setSelectedMarker] = useState<MapMarkerItem | null>(null);
  const [vendor, setVendor] = useState<VendorLocation | null>(null);
  const [vendorMissing, setVendorMissing] = useState(false);

  useEffect(() => {
    if (!vendorId) {
      setVendor(null);
      setVendorMissing(false);
      return;
    }
    let active = true;
    getVendorLocationAction(vendorId)
      .then((result) => {
        if (!active) return;
        setVendor(result);
        setVendorMissing(!result);
      })
      .catch(() => active && setVendorMissing(true));
    return () => {
      active = false;
    };
  }, [vendorId]);

  const vendorMarker = useMemo<MapMarkerItem | null>(() => {
    if (!vendor) return null;
    return {
      id: vendor.id,
      title: vendor.business_name,
      category: "shopping",
      latitude: vendor.latitude,
      longitude: vendor.longitude,
      provinceName: vendor.province_name || "Angola",
      municipalityName: vendor.municipality_name || undefined,
      description: dict.location.vendorMarkerDescription,
      profileUrl: `/sellers/${vendor.slug}`,
      profileLabel: dict.location.viewVendorProfile,
    };
  }, [vendor, dict]);

  const filteredMarkers = useMemo(() => {
    if (vendorMarker) return [vendorMarker];
    return selectedProvince
      ? MOCK_MAP_MARKERS.filter(
          (m) => m.provinceName.toLowerCase() === selectedProvince.toLowerCase()
        )
      : MOCK_MAP_MARKERS;
  }, [vendorMarker, selectedProvince]);

  useEffect(() => {
    if (vendorMarker) setSelectedMarker(vendorMarker);
  }, [vendorMarker]);

  const mapCenter = vendor
    ? { latitude: vendor.latitude, longitude: vendor.longitude }
    : undefined;

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
          <p className="text-xs text-muted-foreground -mt-6">
            A AgriLocalização é o motor geográfico que alimenta o AgriExpert, AgriAcademy, AgriShopping e serviços agropecuários em todas as 18 províncias de Angola.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-1">
            <LocationSearch
              onSelectLocation={(res) => {
                if (res.provinceName) setSelectedProvince(res.provinceName);
                if (res.municipalityName) setSelectedMunicipality(res.municipalityName);
              }}
            />
          </div>
          <div className="lg:col-span-2">
            <LocationSelector
              selectedProvince={selectedProvince}
              selectedMunicipality={selectedMunicipality}
              selectedRadius={selectedRadius}
              onProvinceChange={setSelectedProvince}
              onMunicipalityChange={setSelectedMunicipality}
              onRadiusChange={setSelectedRadius}
              className="p-3"
            />
          </div>
        </div>

        {vendorId && vendorMissing && (
          <div className="p-3 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold text-center">
            {dict.location.vendorNotFound}
          </div>
        )}

        <LocationMap
          markers={filteredMarkers}
          center={mapCenter}
          zoom={vendor ? VENDOR_MAP_ZOOM : undefined}
          height="h-[520px]"
          selectedMarkerId={selectedMarker?.id}
          onSelectMarker={setSelectedMarker}
        />

        <div className="pt-8 space-y-4">
          <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Compass className="w-5 h-5 text-primary" />
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
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    isSelected
                      ? "bg-primary text-primary-foreground border-primary shadow-md scale-102"
                      : "bg-surface border-border hover:bg-muted text-foreground"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold">{p.name}</span>
                    <span className={`text-[10px] uppercase font-semibold ${isSelected ? "text-primary-foreground/80" : "text-primary"}`}>
                      {p.code}
                    </span>
                  </div>
                  <span className={`text-[11px] block mt-1 truncate ${isSelected ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
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
