"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Navbar, MobileBottomNav } from "@/components/navigation";
import { Footer } from "@/components/layout";
import { SectionHeader } from "@/components/ui";
import { LocationMap, LocationSelector, LocationSearch, type MapMarkerItem } from "@/components/location";
import { useI18n } from "@/i18n/provider";
import { MOCK_MAP_MARKERS } from "@/config/mock-data";
import { ANGOLA_PROVINCES } from "@/config/locations";
import { getProviderByIdAction } from "@/lib/services/marketplace-actions";
import { Compass, MapPin, Loader2 } from "lucide-react";
import type { ProviderPublicProfile } from "@/types/domain";

export function AgriLocalizacaoClient() {
  const { dict } = useI18n();
  const searchParams = useSearchParams();
  const vendorId = searchParams.get("vendorId");

  const [selectedProvince, setSelectedProvince] = useState<string>("");
  const [selectedMunicipality, setSelectedMunicipality] = useState<string>("");
  const [selectedRadius, setSelectedRadius] = useState<number>(50);
  const [selectedMarker, setSelectedMarker] = useState<MapMarkerItem | null>(null);
  const [vendor, setVendor] = useState<ProviderPublicProfile | null>(null);
  const [vendorLoading, setVendorLoading] = useState(Boolean(vendorId));

  useEffect(() => {
    if (!vendorId) {
      setVendor(null);
      setVendorLoading(false);
      return;
    }

    setVendorLoading(true);
    getProviderByIdAction(vendorId)
      .then((res) => {
        setVendor(res);
        if (res?.province_name) {
          setSelectedProvince(res.province_name);
        }
        if (res?.latitude && res?.longitude) {
          setSelectedMarker({
            id: res.id,
            title: res.business_name,
            category: "shopping",
            latitude: res.latitude,
            longitude: res.longitude,
            provinceName: res.province_name || "Angola",
            municipalityName: res.municipality_name || undefined,
            description: res.headline || undefined,
          });
        }
      })
      .finally(() => setVendorLoading(false));
  }, [vendorId]);

  const baseMarkers = selectedProvince
    ? MOCK_MAP_MARKERS.filter(
        (m) => m.provinceName.toLowerCase() === selectedProvince.toLowerCase()
      )
    : MOCK_MAP_MARKERS;

  const mapMarkers = useMemo(() => {
    if (!vendor?.latitude || !vendor?.longitude) return baseMarkers;

    const vendorMarker: MapMarkerItem = {
      id: vendor.id,
      title: vendor.business_name,
      category: "shopping",
      latitude: vendor.latitude,
      longitude: vendor.longitude,
      provinceName: vendor.province_name || "Angola",
      municipalityName: vendor.municipality_name || undefined,
      description: vendor.headline || dict.agrilocalization.vendorPin,
    };

    const withoutDuplicate = baseMarkers.filter((m) => m.id !== vendor.id);
    return [vendorMarker, ...withoutDuplicate];
  }, [baseMarkers, vendor, dict.agrilocalization.vendorPin]);

  const mapCenter = vendor?.latitude && vendor?.longitude
    ? { latitude: vendor.latitude, longitude: vendor.longitude }
    : undefined;

  const mapZoom = vendor ? 13 : 6;

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
        </div>

        {vendorId && (
          <div className="bg-surface-card rounded-2xl border border-border p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {vendorLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{dict.agrilocalization.loadingVendor}</span>
              </div>
            ) : vendor ? (
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950 flex items-center justify-center shrink-0">
                  <MapPin className="w-5 h-5 text-amber-700" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-primary uppercase">{dict.agrilocalization.vendorPin}</p>
                  <h2 className="text-sm font-black text-foreground truncate">{vendor.business_name}</h2>
                  <p className="text-xs text-muted-foreground truncate">
                    {vendor.municipality_name ? `${vendor.municipality_name}, ` : ""}
                    {vendor.province_name || "Angola"}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{dict.products.productNotFound}</p>
            )}

            {vendor && (
              <Link
                href={`/sellers/${vendor.slug}`}
                className="text-xs font-bold text-primary hover:underline shrink-0"
              >
                {dict.agrilocalization.viewProfile} →
              </Link>
            )}
          </div>
        )}

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

        <LocationMap
          markers={mapMarkers}
          height="h-[520px]"
          center={mapCenter}
          zoom={mapZoom}
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
