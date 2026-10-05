"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { geoMercator, geoPath } from "d3-geo";
import type { Feature } from "geojson";
import { Baloo_2 } from "next/font/google";
import { Loader2, AlertCircle } from "lucide-react";
import { ANGOLA_KEY_MUNICIPALITIES, ANGOLA_PROVINCES } from "@/config/locations";
import {
  AGRICULTURAL_MARKER_COLORS,
  ANGOLA_MAP_BACKGROUND,
  PROVINCE_INTERACTION_COLORS,
  PROVINCE_LABEL_STYLE,
  atlasProvinceFill,
} from "@/lib/geographic/angola-map-theme";
import { useAngolaProvinceGeoJson } from "@/lib/geographic/use-angola-province-geojson";
import { ANGOLA_MAP_FRAME } from "@/lib/geographic/angola-province-geojson-data";
import { cn } from "@/lib/utils";
import type { MapMarkerItem } from "@/components/location/LocationMap";
import { MapControls } from "./MapControls";

const baloo = Baloo_2({ subsets: ["latin"], weight: ["600", "700"] });

const MARKER_COLORS: Record<MapMarkerItem["category"], string> = {
  shopping: AGRICULTURAL_MARKER_COLORS.marketplace,
  expert: AGRICULTURAL_MARKER_COLORS.expert,
  farm: AGRICULTURAL_MARKER_COLORS.farms,
  service: AGRICULTURAL_MARKER_COLORS.services,
  business: AGRICULTURAL_MARKER_COLORS.business,
  academy: AGRICULTURAL_MARKER_COLORS.academy,
};

interface AngolaAtlasMapProps {
  selectedProvinceCode?: string | null;
  onProvinceSelect?: (code: string | null) => void;
  markers?: MapMarkerItem[];
  selectedMarkerId?: string | null;
  onSelectMarker?: (marker: MapMarkerItem | null) => void;
  className?: string;
  heightClassName?: string;
  loadingLabel?: string;
  errorTitle?: string;
  errorHint?: string;
}

export function AngolaAtlasMap({
  selectedProvinceCode,
  onProvinceSelect,
  markers = [],
  selectedMarkerId,
  onSelectMarker,
  className,
  heightClassName = "h-[min(78vh,820px)]",
  loadingLabel = "A carregar o atlas…",
  errorTitle = "Não foi possível carregar o mapa agrícola.",
  errorHint = "Verifique a ligação à internet e tente novamente.",
}: AngolaAtlasMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 800, height: 520 });
  const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 });
  const [hoverCode, setHoverCode] = useState<string | null>(null);
  const { data, error, loading } = useAngolaProvinceGeoJson();

  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      setSize({
        width: Math.max(320, entry.contentRect.width),
        height: Math.max(280, entry.contentRect.height),
      });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const provinceByCode = useMemo(() => {
    const map = new Map<string, (typeof ANGOLA_PROVINCES)[number]>();
    for (const p of ANGOLA_PROVINCES) map.set(p.code, p);
    return map;
  }, []);

  const projection = useMemo(() => {
    if (!data) return null;
    const margin = 24;
    const width = Math.max(size.width, 320);
    const height = Math.max(size.height, 280);
    if (width <= margin * 2 + 1 || height <= margin * 2 + 1) {
      return geoMercator().center([17.5, -12.5]).scale(720);
    }
    try {
      return geoMercator().fitExtent(
        [
          [margin, margin],
          [width - margin, height - margin],
        ],
        ANGOLA_MAP_FRAME
      );
    } catch {
      return geoMercator().center([17.5, -12.5]).scale(720);
    }
  }, [data, size.height, size.width]);

  const pathGenerator = useMemo(() => {
    if (!projection) return null;
    return geoPath(projection);
  }, [projection]);

  const resetView = useCallback(() => {
    setTransform({ x: 0, y: 0, k: 1 });
    onProvinceSelect?.(null);
    onSelectMarker?.(null);
  }, [onProvinceSelect, onSelectMarker]);

  const zoomBy = useCallback((delta: number) => {
    setTransform((t) => ({
      ...t,
      k: Math.min(6, Math.max(0.85, t.k + delta)),
    }));
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.12 : 0.12;
    zoomBy(delta);
  }, [zoomBy]);

  const focusProvince = useCallback(
    (code: string) => {
      if (!data || !projection) return;
      const feature = data.features.find(
        (f) => String(f.properties?.code) === code
      ) as Feature | undefined;
      if (!feature) return;
      const bounds = geoPath(projection).bounds(feature);
      const dx = bounds[1][0] - bounds[0][0];
      const dy = bounds[1][1] - bounds[0][1];
      const x = (bounds[0][0] + bounds[1][0]) / 2;
      const y = (bounds[0][1] + bounds[1][1]) / 2;
      const scale = Math.min(4, 0.9 / Math.max(dx / size.width, dy / size.height));
      setTransform({
        k: scale,
        x: size.width / 2 - scale * x,
        y: size.height / 2 - scale * y,
      });
    },
    [data, projection, size.height, size.width]
  );

  const handleProvinceClick = useCallback(
    (code: string) => {
      const next = selectedProvinceCode === code ? null : code;
      onProvinceSelect?.(next);
      if (next) focusProvince(next);
      else resetView();
    },
    [focusProvince, onProvinceSelect, resetView, selectedProvinceCode]
  );

  useEffect(() => {
    if (selectedProvinceCode) focusProvince(selectedProvinceCode);
  }, [selectedProvinceCode, focusProvince]);

  const backgroundStyle = {
    background: `linear-gradient(180deg, ${ANGOLA_MAP_BACKGROUND.dark.top} 0%, ${ANGOLA_MAP_BACKGROUND.dark.center} 48%, ${ANGOLA_MAP_BACKGROUND.dark.bottom} 100%)`,
  };
  const showContentMarkers = transform.k >= 1.45 || Boolean(selectedProvinceCode);
  const municipalities = selectedProvinceCode
    ? ANGOLA_KEY_MUNICIPALITIES.filter((m) => m.provinceCode === selectedProvinceCode)
    : [];

  if (loading) {
    return (
      <div
        className={cn(
          "rounded-3xl border border-border flex items-center justify-center",
          heightClassName,
          className
        )}
        style={backgroundStyle}
      >
        <Loader2 className="w-8 h-8 animate-spin text-[#F5D98A]" aria-hidden />
        <span className="sr-only">{loadingLabel}</span>
      </div>
    );
  }

  if (error || !data || !pathGenerator || !projection) {
    return (
      <div
        className={cn(
          "rounded-3xl border border-border p-6 flex flex-col items-center justify-center text-center gap-2",
          heightClassName,
          className
        )}
        style={backgroundStyle}
      >
        <AlertCircle className="w-8 h-8 text-[#F97316]" />
        <p className="font-semibold text-[#F5D98A]">{errorTitle}</p>
        <p className="text-sm text-[#F5D98A]/80 max-w-md">{errorHint}</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative rounded-3xl border border-[#C9A84B]/35 overflow-hidden touch-none",
        heightClassName,
        className
      )}
      style={backgroundStyle}
      onWheel={handleWheel}
      role="application"
      aria-label="Mapa agrícola interactivo de Angola"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 20%, transparent 0, transparent 40%, rgba(245,217,138,0.15) 41%, transparent 42%), url(\"data:image/svg+xml,%3Csvg viewBox='0 0 160 160' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />

      <svg width={size.width} height={size.height} className="block select-none">
        <g transform={`translate(${transform.x} ${transform.y}) scale(${transform.k})`}>
          {data.features.map((feature, idx) => {
            const code = String(feature.properties?.code ?? "");
            const d = pathGenerator(feature as Feature) ?? "";
            const isSelected = selectedProvinceCode === code;
            const isHover = hoverCode === code && !isSelected;
            const fill = isSelected
              ? PROVINCE_INTERACTION_COLORS.selected
              : isHover
                ? PROVINCE_INTERACTION_COLORS.hover
                : atlasProvinceFill(code);
            const name = provinceByCode.get(code)?.name ?? code;

            return (
              <path
                key={`${code}-${idx}`}
                d={d}
                fill={fill}
                stroke={isSelected ? "#FFF7E0" : PROVINCE_INTERACTION_COLORS.boundary}
                strokeWidth={(isSelected ? 2.4 : 1.35) / transform.k}
                className="cursor-pointer"
                style={
                  isSelected
                    ? { filter: `drop-shadow(0 0 12px ${PROVINCE_INTERACTION_COLORS.selectedGlow})` }
                    : undefined
                }
                onMouseEnter={() => setHoverCode(code)}
                onMouseLeave={() => setHoverCode(null)}
                onClick={() => handleProvinceClick(code)}
              >
                <title>{name}</title>
              </path>
            );
          })}

          {municipalities.map((muni) => {
            const pt = projection([muni.longitude, muni.latitude]);
            if (!pt) return null;
            return (
              <g key={muni.code} transform={`translate(${pt[0]}, ${pt[1]})`} className="pointer-events-none">
                <circle r={3.2 / transform.k} fill="#F5D98A" stroke="#4B4A20" strokeWidth={0.8 / transform.k} />
                <text
                  y={-8 / transform.k}
                  textAnchor="middle"
                  fill="#F8F3E8"
                  fontSize={9 / transform.k}
                  fontWeight={600}
                  style={{ fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif" }}
                >
                  {muni.name}
                </text>
              </g>
            );
          })}

          {showContentMarkers
            ? markers.map((marker) => {
                const pt = projection([marker.longitude, marker.latitude]);
                if (!pt) return null;
                const selected = selectedMarkerId === marker.id;
                return (
                  <g
                    key={marker.id}
                    transform={`translate(${pt[0]}, ${pt[1]})`}
                    className="cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectMarker?.(marker);
                    }}
                  >
                    <circle
                      r={(selected ? 8 : 6) / transform.k}
                      fill={selected ? AGRICULTURAL_MARKER_COLORS.selected : MARKER_COLORS[marker.category]}
                      stroke="#F8F3E8"
                      strokeWidth={1.6 / transform.k}
                    />
                  </g>
                );
              })
            : null}
        </g>

        {ANGOLA_PROVINCES.map((p) => {
          const geo = projection([p.labelLongitude, p.labelLatitude]);
          if (!geo) return null;
          const x = transform.x + transform.k * geo[0];
          const y = transform.y + transform.k * geo[1];
          const isSelected = selectedProvinceCode === p.code;
          const label = p.name;
          const width = Math.max(64, label.length * (isSelected ? 8.2 : 7.2) + 16);
          const height = isSelected ? 26 : 22;
          return (
            <g key={p.code} transform={`translate(${x}, ${y})`} className="pointer-events-none">
              <rect
                x={-width / 2}
                y={-height / 2}
                width={width}
                height={height}
                rx={10}
                fill={PROVINCE_LABEL_STYLE.background}
                stroke={isSelected ? "#F97316" : PROVINCE_LABEL_STYLE.border}
                strokeWidth={isSelected ? 2 : 1}
                style={{ filter: `drop-shadow(${PROVINCE_LABEL_STYLE.shadow})` }}
              />
              <text
                textAnchor="middle"
                dominantBaseline="middle"
                fill={PROVINCE_LABEL_STYLE.text}
                fontSize={isSelected ? 13 : 11}
                fontWeight={700}
                className={baloo.className}
              >
                {label}
              </text>
            </g>
          );
        })}
      </svg>

      <MapControls
        onZoomIn={() => zoomBy(0.25)}
        onZoomOut={() => zoomBy(-0.25)}
        onReset={resetView}
        className="absolute bottom-4 right-4"
      />
    </div>
  );
}
