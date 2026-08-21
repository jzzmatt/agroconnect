"use client";

import React, { useState, useEffect, useRef } from "react";
import { MapPin, Navigation, Compass, Layers, Sparkles } from "lucide-react";
import type { GeoCoordinate } from "@/types/domain";
import { cn } from "@/lib/utils";
import { MapLibreOpenFreeMapProvider } from "@/lib/location/providers/maplibre-openfreemap";
import type { IMapProvider } from "@/lib/location/providers/types";

export interface MapMarkerItem {
  id: string;
  title: string;
  category: "expert" | "academy" | "shopping" | "business" | "service" | "farm";
  latitude: number;
  longitude: number;
  provinceName: string;
  municipalityName?: string;
  description?: string;
}

interface LocationMapProps {
  markers?: MapMarkerItem[];
  center?: GeoCoordinate;
  zoom?: number;
  selectedMarkerId?: string | null;
  onSelectMarker?: (marker: MapMarkerItem | null) => void;
  className?: string;
  height?: string;
  showControls?: boolean;
  mapProvider?: IMapProvider;
  useVectorTiles?: boolean;
}

const CATEGORY_COLORS: Record<MapMarkerItem["category"], { bg: string; text: string; badge: string; label: string; hex: string }> = {
  expert: { bg: "bg-emerald-600", text: "text-emerald-700", badge: "bg-emerald-100 text-emerald-800", label: "AgriExpert", hex: "#059669" },
  academy: { bg: "bg-blue-600", text: "text-blue-700", badge: "bg-blue-100 text-blue-800", label: "AgriAcademy", hex: "#2563EB" },
  shopping: { bg: "bg-amber-600", text: "text-amber-700", badge: "bg-amber-100 text-amber-800", label: "AgriShopping", hex: "#D97706" },
  business: { bg: "bg-purple-600", text: "text-purple-700", badge: "bg-purple-100 text-purple-800", label: "Empresa", hex: "#9333EA" },
  service: { bg: "bg-teal-600", text: "text-teal-700", badge: "bg-teal-100 text-teal-800", label: "Serviço", hex: "#0D9488" },
  farm: { bg: "bg-lime-600", text: "text-lime-700", badge: "bg-lime-100 text-lime-800", label: "Fazenda", hex: "#65A30D" },
};

/**
 * Provider-agnostic LocationMap Component.
 * Supports vector tile rendering via MapLibre GL + OpenFreeMap, with graceful automatic
 * fallback to an interactive styled geospatial canvas for offline / mock testing environments.
 */
export function LocationMap({
  markers = [],
  center = { latitude: -12.5, longitude: 17.5 },
  zoom = 6,
  selectedMarkerId,
  onSelectMarker,
  className,
  height = "h-[450px]",
  showControls = true,
  mapProvider,
  useVectorTiles = true,
}: LocationMapProps) {
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [activeMarker, setActiveMarker] = useState<MapMarkerItem | null>(
    markers.find((m) => m.id === selectedMarkerId) || null
  );
  const [vectorMapReady, setVectorMapReady] = useState(false);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const providerRef = useRef<IMapProvider | null>(null);

  const filteredMarkers = markers.filter((m) =>
    activeCategory === "all" ? true : m.category === activeCategory
  );

  const handleMarkerClick = (marker: MapMarkerItem) => {
    setActiveMarker(marker);
    if (onSelectMarker) onSelectMarker(marker);
  };

  // Initialize MapLibre GL provider when container mounts
  useEffect(() => {
    if (!useVectorTiles || typeof window === "undefined" || !mapContainerRef.current) {
      return;
    }

    let isMounted = true;
    const provider = mapProvider || new MapLibreOpenFreeMapProvider("liberty");
    providerRef.current = provider;

    async function initMap() {
      try {
        if (mapContainerRef.current) {
          await provider.initialize({
            container: mapContainerRef.current,
            center,
            zoom,
          });
          if (isMounted) {
            setVectorMapReady(true);
          }
        }
      } catch {
        // Fall back gracefully to interactive stylized geospatial canvas
        if (isMounted) setVectorMapReady(false);
      }
    }

    initMap();

    return () => {
      isMounted = false;
      provider.destroy();
    };
  }, [useVectorTiles, mapProvider]);

  // Sync markers onto vector map when ready
  useEffect(() => {
    if (!vectorMapReady || !providerRef.current) return;

    const provider = providerRef.current;
    provider.clearMarkers();

    filteredMarkers.forEach((marker) => {
      const config = CATEGORY_COLORS[marker.category] || CATEGORY_COLORS.expert;
      provider.addMarker({
        id: marker.id,
        coordinates: { latitude: marker.latitude, longitude: marker.longitude },
        title: marker.title,
        color: config.hex,
        onClick: () => handleMarkerClick(marker),
        popupHtml: `<div class="p-1"><strong style="color:#063A1D;font-size:12px;">${marker.title}</strong><p style="color:#4A6355;font-size:10px;margin:2px 0 0 0;">${marker.provinceName}</p></div>`,
      });
    });
  }, [vectorMapReady, filteredMarkers]);

  // Sync center changes
  useEffect(() => {
    if (vectorMapReady && providerRef.current) {
      providerRef.current.setCenter(center);
    }
  }, [vectorMapReady, center]);

  return (
    <div
      className={cn(
        "relative w-full rounded-2xl overflow-hidden border border-emerald-900/10 bg-emerald-950/5 shadow-inner flex flex-col",
        height,
        className
      )}
    >
      {/* Map Header / Category Filters Bar */}
      {showControls && (
        <div className="absolute top-4 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
          <div className="flex flex-wrap gap-1.5 p-1.5 bg-white/90 backdrop-blur-md rounded-xl shadow-md border border-emerald-100 pointer-events-auto">
            <button
              onClick={() => setActiveCategory("all")}
              className={cn(
                "px-3 py-1 text-xs font-semibold rounded-lg transition-colors",
                activeCategory === "all"
                  ? "bg-emerald-800 text-white shadow-sm"
                  : "text-emerald-900 hover:bg-emerald-50"
              )}
            >
              Todos ({markers.length})
            </button>
            <button
              onClick={() => setActiveCategory("expert")}
              className={cn(
                "px-2.5 py-1 text-xs font-medium rounded-lg transition-colors flex items-center gap-1",
                activeCategory === "expert"
                  ? "bg-emerald-600 text-white"
                  : "text-emerald-800 hover:bg-emerald-50"
              )}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              AgriExpert
            </button>
            <button
              onClick={() => setActiveCategory("academy")}
              className={cn(
                "px-2.5 py-1 text-xs font-medium rounded-lg transition-colors flex items-center gap-1",
                activeCategory === "academy"
                  ? "bg-blue-600 text-white"
                  : "text-blue-800 hover:bg-blue-50"
              )}
            >
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              AgriAcademy
            </button>
            <button
              onClick={() => setActiveCategory("shopping")}
              className={cn(
                "px-2.5 py-1 text-xs font-medium rounded-lg transition-colors flex items-center gap-1",
                activeCategory === "shopping"
                  ? "bg-amber-600 text-white"
                  : "text-amber-800 hover:bg-amber-50"
              )}
            >
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              AgriShopping
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-white/90 backdrop-blur-md rounded-xl shadow-md border border-emerald-100 pointer-events-auto text-xs font-medium text-emerald-950">
            <Compass className="w-4 h-4 text-emerald-700 animate-spin-slow" />
            <span>OpenFreeMap • MapLibre GL (Angola)</span>
          </div>
        </div>
      )}

      {/* Map Container View */}
      <div className="relative flex-1 w-full h-full bg-[radial-gradient(#0E6B38_1px,transparent_1px)] [background-size:24px_24px] bg-emerald-50/60 flex items-center justify-center select-none overflow-hidden">
        {/* MapLibre WebGL vector tile container mount point */}
        <div
          ref={mapContainerRef}
          className={cn(
            "absolute inset-0 w-full h-full z-0",
            vectorMapReady ? "opacity-100" : "opacity-0 pointer-events-none"
          )}
        />

        {/* Fallback & Visual Canvas */}
        {!vectorMapReady && (
          <>
            <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
              <Layers className="w-96 h-96 text-emerald-900" />
            </div>

            <div className="absolute bottom-4 left-4 text-xs font-medium text-emerald-800/60 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              <span>Foco: Lat {center.latitude.toFixed(2)}, Lon {center.longitude.toFixed(2)}</span>
            </div>

            <div className="relative w-full max-w-2xl h-64 sm:h-80">
              {filteredMarkers.map((marker) => {
                const config = CATEGORY_COLORS[marker.category] || CATEGORY_COLORS.expert;
                const isSelected = activeMarker?.id === marker.id;

                const topPct = Math.min(Math.max(((marker.latitude - (-5)) / (-18 - -5)) * 80 + 10, 10), 90);
                const leftPct = Math.min(Math.max(((marker.longitude - 11) / (24 - 11)) * 80 + 10, 10), 90);

                return (
                  <div
                    key={marker.id}
                    style={{ top: `${topPct}%`, left: `${leftPct}%` }}
                    onClick={() => handleMarkerClick(marker)}
                    className={cn(
                      "absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all duration-300 group z-10",
                      isSelected ? "scale-125 z-30" : "hover:scale-110"
                    )}
                    title={`${marker.title} (${marker.provinceName})`}
                  >
                    <div
                      className={cn(
                        "w-8 h-8 rounded-full shadow-lg flex items-center justify-center text-white font-bold ring-2 ring-white transition-shadow",
                        config.bg,
                        isSelected ? "ring-4 ring-emerald-400 shadow-xl" : "shadow-md"
                      )}
                    >
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 pointer-events-none absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap bg-emerald-950 text-white text-[10px] font-medium px-2 py-0.5 rounded shadow transition-opacity">
                      {marker.title}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Selected Marker Details Flyout Card */}
        {activeMarker && (
          <div className="absolute bottom-4 right-4 max-w-xs sm:max-w-sm w-full bg-white/95 backdrop-blur-md rounded-xl p-4 shadow-xl border border-emerald-100 z-30 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span
                  className={cn(
                    "inline-block px-2 py-0.5 text-[10px] font-bold rounded-md mb-1",
                    CATEGORY_COLORS[activeMarker.category]?.badge
                  )}
                >
                  {CATEGORY_COLORS[activeMarker.category]?.label}
                </span>
                <h4 className="text-sm font-bold text-emerald-950 leading-tight">
                  {activeMarker.title}
                </h4>
                <p className="text-xs text-emerald-700 flex items-center gap-1 mt-1 font-medium">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                  {activeMarker.municipalityName
                    ? `${activeMarker.municipalityName}, ${activeMarker.provinceName}`
                    : activeMarker.provinceName}
                </p>
              </div>
              <button
                onClick={() => setActiveMarker(null)}
                className="text-emerald-500 hover:text-emerald-900 text-xs font-bold p-1"
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>
            {activeMarker.description && (
              <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                {activeMarker.description}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
