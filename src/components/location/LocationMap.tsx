"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  MapPin,
  Navigation,
  Compass,
  RotateCcw,
  Loader2,
} from "lucide-react";
import type { GeoCoordinate } from "@/types/domain";
import { cn } from "@/lib/utils";
import { useGeolocation } from "@/lib/location/use-geolocation";
import { DEFAULT_ANGOLA_CENTER } from "@/lib/location/map-lifecycle";
import { useI18n } from "@/i18n/provider";
import { GeoJsonVectorMap } from "@/components/map/GeoJsonVectorMap";

export interface MapMarkerItem {
  id: string;
  title: string;
  category: "expert" | "academy" | "shopping" | "business" | "service" | "farm";
  latitude: number;
  longitude: number;
  provinceName: string;
  municipalityName?: string;
  description?: string;
  thumbnailUrl?: string;
  href?: string;
  ctaLabel?: string;
}

interface LocationMapProps {
  markers?: MapMarkerItem[];
  center?: GeoCoordinate;
  zoom?: number;
  selectedMarkerId?: string | null;
  selectedLocation?: string | null;
  onSelectMarker?: (marker: MapMarkerItem | null) => void;
  onLocationSelect?: (marker: MapMarkerItem | null) => void;
  onMapClick?: (coordinates: GeoCoordinate) => void;
  className?: string;
  height?: string;
  showControls?: boolean;
}

const CATEGORY_CONFIG: Record<
  MapMarkerItem["category"],
  { badge: string; label: string; hex: string }
> = {
  expert: {
    badge: "bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 border-emerald-300 dark:border-emerald-800",
    label: "AgriExpert",
    hex: "#0E6B38",
  },
  academy: {
    badge: "bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-200 border-blue-300 dark:border-blue-800",
    label: "AgriAcademy",
    hex: "#1D4ED8",
  },
  shopping: {
    badge: "bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-800",
    label: "AgriShopping",
    hex: "#D97706",
  },
  business: {
    badge: "bg-yellow-100 dark:bg-yellow-950 text-yellow-800 dark:text-yellow-200 border-yellow-300 dark:border-yellow-800",
    label: "AgriBusiness",
    hex: "#D4A72C",
  },
  service: {
    badge: "bg-orange-100 dark:bg-orange-950 text-orange-800 dark:text-orange-200 border-orange-300 dark:border-orange-800",
    label: "AgriService",
    hex: "#E87557",
  },
  farm: {
    badge: "bg-lime-100 dark:bg-lime-950 text-lime-800 dark:text-lime-200 border-lime-300 dark:border-lime-800",
    label: "Fazenda",
    hex: "#65A30D",
  },
};

/**
 * AgriLocalization map — GeoJSON vector atlas (PostGIS WGS84 coordinates).
 */
export function LocationMap({
  markers = [],
  center = DEFAULT_ANGOLA_CENTER,
  zoom = 6,
  selectedMarkerId,
  selectedLocation,
  onSelectMarker,
  onLocationSelect,
  onMapClick,
  className,
  height = "h-[480px]",
  showControls = true,
}: LocationMapProps) {
  const { dict } = useI18n();
  const { requestLocation, isLoading: isGpsLoading } = useGeolocation();
  const resolvedSelectedId = selectedLocation ?? selectedMarkerId ?? null;
  const handleSelect = onLocationSelect ?? onSelectMarker;

  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [activeMarker, setActiveMarker] = useState<MapMarkerItem | null>(
    markers.find((m) => m.id === resolvedSelectedId) || null
  );
  const [viewCenter, setViewCenter] = useState(center);
  const [viewZoom, setViewZoom] = useState(zoom);
  const [userLocation, setUserLocation] = useState<GeoCoordinate | null>(null);

  useEffect(() => {
    setViewCenter(center);
    setViewZoom(zoom);
  }, [center.latitude, center.longitude, zoom]);

  const filteredMarkers = useMemo(
    () => markers.filter((m) => (activeCategory === "all" ? true : m.category === activeCategory)),
    [markers, activeCategory]
  );

  const handleMarkerClick = useCallback(
    (marker: MapMarkerItem) => {
      setActiveMarker(marker);
      handleSelect?.(marker);
      setViewCenter({ latitude: marker.latitude, longitude: marker.longitude });
      setViewZoom(Math.max(viewZoom, 10));
    },
    [handleSelect, viewZoom]
  );

  useEffect(() => {
    if (!resolvedSelectedId) return;
    const match = markers.find((m) => m.id === resolvedSelectedId);
    if (match && match.id !== activeMarker?.id) {
      handleMarkerClick(match);
    }
  }, [resolvedSelectedId, markers, handleMarkerClick, activeMarker?.id]);

  const handleCenterOnUser = async () => {
    const coords = await requestLocation();
    if (coords) {
      setUserLocation(coords);
      setViewCenter(coords);
      setViewZoom(12);
    }
  };

  const handleResetAngola = () => {
    setViewCenter(DEFAULT_ANGOLA_CENTER);
    setViewZoom(6);
    setActiveMarker(null);
    handleSelect?.(null);
  };

  const handleMapClick = (coordinates: GeoCoordinate) => {
    onMapClick?.(coordinates);
    setViewCenter(coordinates);
  };

  return (
    <div
      className={cn(
        "relative w-full rounded-3xl overflow-hidden border border-border bg-surface shadow-md select-none flex flex-col",
        height,
        className
      )}
    >
      {showControls && (
        <div className="absolute top-3 left-3 right-3 z-20 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
          <div className="flex flex-wrap gap-1 p-1 bg-surface-elevated/95 backdrop-blur-md rounded-2xl shadow-md border border-border pointer-events-auto">
            <button
              type="button"
              onClick={() => setActiveCategory("all")}
              className={cn(
                "px-3 py-1.5 text-xs font-semibold rounded-xl transition-all",
                activeCategory === "all"
                  ? "bg-primary text-primary-foreground shadow-xs font-bold"
                  : "text-foreground hover:bg-muted"
              )}
            >
              Todos ({markers.length})
            </button>
            {(["expert", "academy", "shopping"] as const).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={cn(
                  "px-2.5 py-1.5 text-xs font-medium rounded-xl transition-all",
                  activeCategory === cat ? "font-bold text-white" : "text-foreground hover:bg-muted"
                )}
                style={
                  activeCategory === cat
                    ? { backgroundColor: CATEGORY_CONFIG[cat].hex }
                    : undefined
                }
              >
                {CATEGORY_CONFIG[cat].label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 p-1 bg-surface-elevated/95 backdrop-blur-md rounded-2xl shadow-md border border-border pointer-events-auto">
            <button
              type="button"
              onClick={handleCenterOnUser}
              disabled={isGpsLoading}
              className="p-1.5 rounded-xl text-primary hover:bg-muted transition-colors disabled:opacity-50 min-w-11 min-h-11 flex items-center justify-center"
              title="Centrar na minha localização"
              aria-label="Minha localização"
            >
              {isGpsLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Navigation className="w-4 h-4" />
              )}
            </button>
            <button
              type="button"
              onClick={handleResetAngola}
              className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors min-w-11 min-h-11 flex items-center justify-center"
              title="Vista nacional de Angola"
              aria-label="Ver Angola"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <div className="relative flex-1 w-full h-full min-h-[400px]">
        <GeoJsonVectorMap
          markers={filteredMarkers}
          center={viewCenter}
          zoom={viewZoom}
          selectedMarkerId={resolvedSelectedId}
          onMarkerClick={handleMarkerClick}
          onMapClick={onMapClick ? handleMapClick : undefined}
          userLocation={userLocation}
        />

        {activeMarker && (
          <div className="absolute bottom-4 right-4 max-w-xs sm:max-w-sm w-full bg-surface-elevated/95 backdrop-blur-md rounded-2xl p-4 shadow-xl border border-border z-30">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span
                  className={cn(
                    "inline-block px-2 py-0.5 text-[10px] font-bold rounded-md mb-1 border",
                    CATEGORY_CONFIG[activeMarker.category]?.badge
                  )}
                >
                  {CATEGORY_CONFIG[activeMarker.category]?.label}
                </span>
                <h4 className="text-sm font-bold text-foreground leading-tight">{activeMarker.title}</h4>
                <p className="text-xs text-primary flex items-center gap-1 mt-1 font-semibold">
                  <MapPin className="w-3.5 h-3.5" />
                  {activeMarker.municipalityName
                    ? `${activeMarker.municipalityName}, ${activeMarker.provinceName}`
                    : activeMarker.provinceName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveMarker(null)}
                className="text-muted-foreground hover:text-foreground text-xs font-bold p-1 rounded-lg hover:bg-muted"
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>
            {activeMarker.description ? (
              <p className="text-xs text-muted-foreground mt-2 line-clamp-2 leading-relaxed">
                {activeMarker.description}
              </p>
            ) : null}
            {activeMarker.href ? (
              <a
                href={activeMarker.href}
                className="inline-block mt-3 text-xs font-bold text-primary hover:underline"
              >
                {activeMarker.ctaLabel ?? dict.common.details}
              </a>
            ) : null}
          </div>
        )}
      </div>

      <div className="px-4 py-2 bg-surface border-t border-border flex items-center justify-between text-[11px] text-muted-foreground">
        <div className="flex items-center gap-1.5 font-medium">
          <Compass className="w-3.5 h-3.5 text-primary" />
          <span>Angola • PostGIS WGS84 (EPSG:4326)</span>
        </div>
        <span>{dict.agrilocalization.mapProviderLabel}</span>
      </div>
    </div>
  );
}

export { LocationMap as GeoMap };
