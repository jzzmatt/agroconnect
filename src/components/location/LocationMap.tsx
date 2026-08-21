"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  MapPin,
  Navigation,
  Compass,
  Box,
  RotateCcw,
  Loader2,
  AlertCircle,
} from "lucide-react";
import type { GeoCoordinate } from "@/types/domain";
import { cn } from "@/lib/utils";
import {
  MapLibreOpenFreeMapProvider,
  getThemeMapStyle,
} from "@/lib/location/providers/maplibre-openfreemap";
import type { IMapProvider, MapViewMode } from "@/lib/location/providers/types";
import { useTheme } from "@/lib/theme";
import { useGeolocation } from "@/lib/location/use-geolocation";

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
  initialViewMode?: MapViewMode;
}

const CATEGORY_CONFIG: Record<
  MapMarkerItem["category"],
  { bg: string; text: string; badge: string; label: string; hex: string }
> = {
  expert: {
    bg: "bg-emerald-700",
    text: "text-emerald-700 dark:text-emerald-300",
    badge: "bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 border-emerald-300 dark:border-emerald-800",
    label: "AgriExpert",
    hex: "#0E6B38",
  },
  academy: {
    bg: "bg-blue-600",
    text: "text-blue-700 dark:text-blue-300",
    badge: "bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-200 border-blue-300 dark:border-blue-800",
    label: "AgriAcademy",
    hex: "#1D4ED8",
  },
  shopping: {
    bg: "bg-amber-600",
    text: "text-amber-700 dark:text-amber-300",
    badge: "bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-800",
    label: "AgriShopping",
    hex: "#D97706",
  },
  business: {
    bg: "bg-purple-600",
    text: "text-purple-700 dark:text-purple-300",
    badge: "bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-200 border-purple-300 dark:border-purple-800",
    label: "Empresa",
    hex: "#9333EA",
  },
  service: {
    bg: "bg-teal-600",
    text: "text-teal-700 dark:text-teal-300",
    badge: "bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-200 border-teal-300 dark:border-teal-800",
    label: "Serviço",
    hex: "#0D9488",
  },
  farm: {
    bg: "bg-lime-600",
    text: "text-lime-700 dark:text-lime-300",
    badge: "bg-lime-100 dark:bg-lime-950 text-lime-800 dark:text-lime-200 border-lime-300 dark:border-lime-800",
    label: "Fazenda",
    hex: "#65A30D",
  },
};

/**
 * Production-ready LocationMap Component with MapLibre GL + OpenFreeMap.
 * Renders live OpenStreetMap/OpenMapTiles basemap (roads, streets, labels, cities, 3D buildings)
 * with 2D/3D camera toggling, GPS centering, marker popups, and theme support.
 */
export function LocationMap({
  markers = [],
  center = { latitude: -12.5, longitude: 17.5 }, // Default Angola center
  zoom = 6,
  selectedMarkerId,
  onSelectMarker,
  className,
  height = "h-[480px]",
  showControls = true,
  mapProvider,
  initialViewMode = "2d",
}: LocationMapProps) {
  const { theme } = useTheme();
  const { requestLocation, isLoading: isGpsLoading } = useGeolocation();

  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [viewMode, setViewMode] = useState<MapViewMode>(initialViewMode);
  const [activeMarker, setActiveMarker] = useState<MapMarkerItem | null>(
    markers.find((m) => m.id === selectedMarkerId) || null
  );
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const providerRef = useRef<IMapProvider | null>(null);
  const isInitializedRef = useRef(false);

  const filteredMarkers = markers.filter((m) =>
    activeCategory === "all" ? true : m.category === activeCategory
  );

  const handleMarkerClick = useCallback(
    (marker: MapMarkerItem) => {
      setActiveMarker(marker);
      if (onSelectMarker) onSelectMarker(marker);
      if (providerRef.current) {
        providerRef.current.setCenter(
          { latitude: marker.latitude, longitude: marker.longitude },
          Math.max(providerRef.current.getZoom(), 12),
          800
        );
      }
    },
    [onSelectMarker]
  );

  // Initialize MapLibre GL instance
  const initMapInstance = useCallback(() => {
    if (typeof window === "undefined" || !mapContainerRef.current) return;

    setMapError(null);
    setMapLoaded(false);

    const styleUrl = getThemeMapStyle(theme);
    const provider = mapProvider || new MapLibreOpenFreeMapProvider(styleUrl);
    providerRef.current = provider;

    provider.initialize({
      container: mapContainerRef.current,
      center,
      zoom,
      pitch: viewMode === "3d" ? 60 : 0,
      bearing: viewMode === "3d" ? -20 : 0,
      styleUrl,
      onLoad: () => {
        setMapLoaded(true);
        setMapError(null);
      },
      onError: (err) => {
        console.error("[LocationMap] Error event:", err);
        // Do not block UI with error if map has already loaded tiles
        setMapLoaded((prev) => {
          if (!prev) {
            setMapError("Não foi possível carregar o mapa. Verifique a ligação à internet.");
          }
          return prev;
        });
      },
    });

    // Fallback timer: if style takes more than 1.5s or load event fired silently, reveal map
    const fallbackTimer = setTimeout(() => {
      setMapLoaded(true);
      if (providerRef.current) {
        providerRef.current.resize();
      }
    }, 1500);

    return () => clearTimeout(fallbackTimer);
  }, [center, zoom, viewMode, theme, mapProvider]);

  useEffect(() => {
    if (isInitializedRef.current) return;
    isInitializedRef.current = true;

    const cleanupTimer = initMapInstance();

    let observer: ResizeObserver | null = null;
    if (mapContainerRef.current && typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(() => {
        if (providerRef.current) {
          providerRef.current.resize();
        }
      });
      observer.observe(mapContainerRef.current);
    }

    return () => {
      if (cleanupTimer) cleanupTimer();
      if (observer) observer.disconnect();
      if (providerRef.current) {
        providerRef.current.destroy();
        providerRef.current = null;
      }
      isInitializedRef.current = false;
    };
  }, [initMapInstance]);

  // Sync style URL when theme changes
  useEffect(() => {
    if (providerRef.current && mapLoaded) {
      const newStyle = getThemeMapStyle(theme);
      providerRef.current.setStyle(newStyle);
    }
  }, [theme, mapLoaded]);

  // Sync markers whenever markers list or active category changes
  useEffect(() => {
    if (!providerRef.current) return;
    const provider = providerRef.current;
    provider.clearMarkers();

    filteredMarkers.forEach((marker) => {
      const config = CATEGORY_CONFIG[marker.category] || CATEGORY_CONFIG.expert;

      const el = document.createElement("div");
      el.className =
        "w-8 h-8 rounded-full shadow-xl flex items-center justify-center text-white font-bold ring-2 ring-white dark:ring-slate-900 cursor-pointer transition-transform hover:scale-115";
      el.style.backgroundColor = config.hex;
      el.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>`;

      provider.addMarker({
        id: marker.id,
        coordinates: { latitude: marker.latitude, longitude: marker.longitude },
        title: marker.title,
        color: config.hex,
        element: el,
        onClick: () => handleMarkerClick(marker),
        popupHtml: `
          <div style="padding:4px; font-family:sans-serif;">
            <span style="display:inline-block; padding:2px 6px; border-radius:4px; font-size:10px; font-weight:bold; background:${config.hex}; color:#fff; margin-bottom:4px;">
              ${config.label}
            </span>
            <div style="font-size:12px; font-weight:bold; color:${theme === "dark" ? "#fff" : "#0F261B"};">
              ${marker.title}
            </div>
            <div style="font-size:11px; color:${theme === "dark" ? "#A7F3D0" : "#0E6B38"}; margin-top:2px;">
              📍 ${marker.municipalityName ? `${marker.municipalityName}, ` : ""}${marker.provinceName}
            </div>
          </div>
        `,
      });
    });
  }, [filteredMarkers, handleMarkerClick, theme]);

  // Center camera when selectedMarkerId changes externally
  useEffect(() => {
    if (selectedMarkerId) {
      const match = markers.find((m) => m.id === selectedMarkerId);
      if (match) {
        handleMarkerClick(match);
      }
    }
  }, [selectedMarkerId, markers, handleMarkerClick]);

  // Toggle 2D / 3D mode
  const handleToggleViewMode = () => {
    if (!providerRef.current) return;
    if (viewMode === "2d") {
      providerRef.current.set3DView(60, -20);
      setViewMode("3d");
    } else {
      providerRef.current.set2DView();
      setViewMode("2d");
    }
  };

  // Center on user GPS position
  const handleCenterOnUser = async () => {
    const coords = await requestLocation();
    if (coords && providerRef.current) {
      providerRef.current.setCenter(coords, 14, 1200);
      providerRef.current.addUserLocationMarker(coords);
    }
  };

  // Reset to default Angola overview
  const handleResetAngola = () => {
    if (providerRef.current) {
      providerRef.current.setCenter({ latitude: -12.5, longitude: 17.5 }, 6, 1000);
      providerRef.current.set2DView();
      setViewMode("2d");
      setActiveMarker(null);
    }
  };

  return (
    <div
      className={cn(
        "relative w-full rounded-3xl overflow-hidden border border-border bg-surface shadow-md select-none flex flex-col",
        height,
        className
      )}
    >
      {/* Top Map Controls Bar */}
      {showControls && (
        <div className="absolute top-3 left-3 right-3 z-20 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
          {/* Category Filter Buttons */}
          <div className="flex flex-wrap gap-1 p-1 bg-surface-elevated/95 backdrop-blur-md rounded-2xl shadow-md border border-border pointer-events-auto">
            <button
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
            <button
              onClick={() => setActiveCategory("expert")}
              className={cn(
                "px-2.5 py-1.5 text-xs font-medium rounded-xl transition-all flex items-center gap-1.5",
                activeCategory === "expert"
                  ? "bg-emerald-700 text-white font-bold"
                  : "text-foreground hover:bg-muted"
              )}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              AgriExpert
            </button>
            <button
              onClick={() => setActiveCategory("academy")}
              className={cn(
                "px-2.5 py-1.5 text-xs font-medium rounded-xl transition-all flex items-center gap-1.5",
                activeCategory === "academy"
                  ? "bg-blue-600 text-white font-bold"
                  : "text-foreground hover:bg-muted"
              )}
            >
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              AgriAcademy
            </button>
            <button
              onClick={() => setActiveCategory("shopping")}
              className={cn(
                "px-2.5 py-1.5 text-xs font-medium rounded-xl transition-all flex items-center gap-1.5",
                activeCategory === "shopping"
                  ? "bg-amber-600 text-white font-bold"
                  : "text-foreground hover:bg-muted"
              )}
            >
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              AgriShopping
            </button>
          </div>

          {/* Quick Tools (2D/3D Toggle + GPS + Reset) */}
          <div className="flex items-center gap-1.5 p-1 bg-surface-elevated/95 backdrop-blur-md rounded-2xl shadow-md border border-border pointer-events-auto">
            {/* 2D / 3D Toggle */}
            <button
              type="button"
              onClick={handleToggleViewMode}
              className={cn(
                "flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-xl transition-colors",
                viewMode === "3d"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-foreground hover:bg-muted"
              )}
              title={viewMode === "3d" ? "Mudar para vista 2D" : "Mudar para vista 3D com inclinação"}
            >
              <Box className="w-3.5 h-3.5" />
              <span>{viewMode === "3d" ? "3D" : "2D"}</span>
            </button>

            {/* GPS Button */}
            <button
              type="button"
              onClick={handleCenterOnUser}
              disabled={isGpsLoading}
              className="p-1.5 rounded-xl text-primary hover:bg-muted transition-colors disabled:opacity-50"
              title="Centrar na minha localização GPS"
              aria-label="Minha localização"
            >
              {isGpsLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Navigation className="w-4 h-4" />
              )}
            </button>

            {/* Reset Angola View */}
            <button
              type="button"
              onClick={handleResetAngola}
              className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Voltar à vista geral de Angola"
              aria-label="Ver Angola"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main Map Canvas Mount Point */}
      <div className="relative flex-1 w-full h-full min-h-[400px]">
        {/* MapLibre WebGL vector tile container */}
        <div
          ref={mapContainerRef}
          className="absolute inset-0 w-full h-full z-0"
          style={{ width: "100%", height: "100%" }}
        />

        {/* Loading State Overlay with Smooth Fade */}
        {!mapLoaded && !mapError && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-surface/60 backdrop-blur-xs text-foreground space-y-2 pointer-events-none transition-opacity duration-300">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-xs font-bold text-muted-foreground">
              Carregando mapa OpenFreeMap...
            </p>
          </div>
        )}

        {/* Error State Overlay */}
        {mapError && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-6 bg-surface/95 backdrop-blur-md text-foreground text-center space-y-3">
            <AlertCircle className="w-8 h-8 text-destructive" />
            <div>
              <h4 className="text-sm font-bold text-foreground">{mapError}</h4>
              <p className="text-xs text-muted-foreground mt-1">
                Verifique a sua ligação à internet ou tente carregar novamente.
              </p>
            </div>
            <button
              type="button"
              onClick={initMapInstance}
              className="px-4 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-xl shadow-xs hover:bg-primary-hover transition-colors"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {/* Selected Marker Details Flyout Card */}
        {activeMarker && (
          <div className="absolute bottom-4 right-4 max-w-xs sm:max-w-sm w-full bg-surface-elevated/95 backdrop-blur-md rounded-2xl p-4 shadow-xl border border-border z-30 animate-in fade-in slide-in-from-bottom-2">
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
                <h4 className="text-sm font-bold text-foreground leading-tight">
                  {activeMarker.title}
                </h4>
                <p className="text-xs text-primary flex items-center gap-1 mt-1 font-semibold">
                  <MapPin className="w-3.5 h-3.5" />
                  {activeMarker.municipalityName
                    ? `${activeMarker.municipalityName}, ${activeMarker.provinceName}`
                    : activeMarker.provinceName}
                </p>
              </div>
              <button
                onClick={() => setActiveMarker(null)}
                className="text-muted-foreground hover:text-foreground text-xs font-bold p-1 rounded-lg hover:bg-muted"
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>
            {activeMarker.description && (
              <p className="text-xs text-muted-foreground mt-2 line-clamp-2 leading-relaxed">
                {activeMarker.description}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Bottom Info Bar */}
      <div className="px-4 py-2 bg-surface border-t border-border flex items-center justify-between text-[11px] text-muted-foreground">
        <div className="flex items-center gap-1.5 font-medium">
          <Compass className="w-3.5 h-3.5 text-primary" />
          <span>Angola • PostGIS WGS84 (EPSG:4326)</span>
        </div>
        <div className="flex items-center gap-2">
          <span>Vista: <strong className="text-foreground uppercase">{viewMode}</strong></span>
          <span>•</span>
          <span>OpenFreeMap • MapLibre GL</span>
        </div>
      </div>
    </div>
  );
}
