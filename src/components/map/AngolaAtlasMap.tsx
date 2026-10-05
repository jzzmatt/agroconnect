"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { geoMercator, geoPath } from "d3-geo";
import type { Feature, FeatureCollection } from "geojson";
import { Loader2, AlertCircle } from "lucide-react";
import { ANGOLA_PROVINCES } from "@/config/locations";
import {
  ANGOLA_MAP_BACKGROUND,
  PROVINCE_INTERACTION_COLORS,
  PROVINCE_LABEL_STYLE,
  referenceProvinceFill,
} from "@/lib/geographic/angola-map-theme";
import { useAngolaProvinceGeoJson } from "@/lib/geographic/use-angola-province-geojson";
import { cn } from "@/lib/utils";
import type { MapMarkerItem } from "@/components/location/LocationMap";
import { MapControls } from "./MapControls";

const MARKER_COLORS: Record<MapMarkerItem["category"], string> = {
  shopping: "#F97316",
  expert: "#3E7130",
  farm: "#718333",
  service: "#E87557",
  business: "#D4A72C",
  academy: "#8B4513",
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
  heightClassName = "h-[min(72vh,640px)]",
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
        data as FeatureCollection
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
    backgroundColor: ANGOLA_MAP_BACKGROUND.light.ocean,
  };

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
        <Loader2 className="w-8 h-8 animate-spin text-slate-600" aria-hidden />
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
        <p className="font-semibold text-foreground">{errorTitle}</p>
        <p className="text-sm text-muted-foreground max-w-md">{errorHint}</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative rounded-3xl border border-slate-200 overflow-hidden touch-none",
        heightClassName,
        className
      )}
      style={backgroundStyle}
      onWheel={handleWheel}
      role="application"
      aria-label="Mapa agrícola interactivo de Angola"
    >
      <svg width={size.width} height={size.height} className="block select-none">
        <rect width={size.width} height={size.height} fill={ANGOLA_MAP_BACKGROUND.light.neighbor} />
        <g transform={`translate(${transform.x} ${transform.y}) scale(${transform.k})`}>
          <path
            d={
              pathGenerator({
                type: "Feature",
                properties: {},
                geometry: {
                  type: "Polygon",
                  coordinates: [
                    [
                      [8.2, -19.4],
                      [13.15, -19.4],
                      [13.15, -4.6],
                      [8.2, -4.6],
                      [8.2, -19.4],
                    ],
                  ],
                },
              }) ?? ""
            }
            fill={ANGOLA_MAP_BACKGROUND.light.ocean}
          />

          {data.features.map((feature, idx) => {
            const code = String(feature.properties?.code ?? "");
            const d = pathGenerator(feature as Feature) ?? "";
            const isSelected = selectedProvinceCode === code;
            const isHover = hoverCode === code;
            const fill = referenceProvinceFill(code);

            return (
              <path
                key={`${code}-${idx}`}
                d={d}
                fill={fill}
                stroke="#FFFFFF"
                strokeWidth={(isSelected ? 2.6 : isHover ? 1.8 : 1.15) / transform.k}
                className="cursor-pointer"
                style={
                  isSelected
                    ? { filter: `drop-shadow(0 0 6px ${PROVINCE_INTERACTION_COLORS.selectedGlow})` }
                    : isHover
                      ? { filter: "brightness(1.06)" }
                      : undefined
                }
                onMouseEnter={() => setHoverCode(code)}
                onMouseLeave={() => setHoverCode(null)}
                onClick={() => handleProvinceClick(code)}
              >
                <title>{provinceByCode.get(code)?.name ?? code}</title>
              </path>
            );
          })}

          <ContextLabel k={transform.k} x={10.4} y={-12.2} projection={projection} rotate={-90} text="ATLANTIC OCEAN" />
          <ContextLabel k={transform.k} x={19.2} y={-6.15} projection={projection} text="DEMOCRATIC REPUBLIC OF CONGO" />
          <ContextLabel k={transform.k} x={23.4} y={-13.4} projection={projection} text="ZAMBIA" />
          <ContextLabel k={transform.k} x={15.2} y={-18.55} projection={projection} text="NAMIBIA" />
          <ContextLabel k={transform.k} x={22.6} y={-19.15} projection={projection} text="BOTSWANA" />

          {ANGOLA_PROVINCES.map((p) => {
            const pt = projection([p.labelLongitude, p.labelLatitude]);
            const capital = projection([p.longitude, p.latitude]);
            if (!pt) return null;
            const isSelected = selectedProvinceCode === p.code;
            const compact = p.name.length > 12;
            return (
              <g key={p.code} className="pointer-events-none">
                <text
                  x={pt[0]}
                  y={pt[1]}
                  textAnchor="middle"
                  fill={PROVINCE_LABEL_STYLE.name}
                  fontSize={(compact ? 8.5 : 11) / transform.k}
                  fontWeight={800}
                  letterSpacing={0.4}
                  stroke="#FFFFFF"
                  strokeWidth={2.2 / transform.k}
                  paintOrder="stroke"
                  style={{ fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif" }}
                >
                  {p.name.toUpperCase()}
                </text>
                {capital ? (
                  <g transform={`translate(${capital[0]}, ${capital[1] + 10 / transform.k})`}>
                    <circle r={2.2 / transform.k} fill="#1F2937" />
                    <text
                      x={6 / transform.k}
                      y={1 / transform.k}
                      dominantBaseline="middle"
                      fill={isSelected ? "#111827" : PROVINCE_LABEL_STYLE.capital}
                      fontSize={8 / transform.k}
                      fontWeight={600}
                      stroke="#FFFFFF"
                      strokeWidth={1.6 / transform.k}
                      paintOrder="stroke"
                      style={{ fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif" }}
                    >
                      {p.capital}
                    </text>
                  </g>
                ) : null}
              </g>
            );
          })}

          {markers.map((marker) => {
            const pt = projection([marker.longitude, marker.latitude]);
            if (!pt) return null;
            const r = selectedMarkerId === marker.id ? 7 : 5.5;
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
                  r={r}
                  fill={MARKER_COLORS[marker.category]}
                  stroke="#FFFFFF"
                  strokeWidth={1.5}
                />
              </g>
            );
          })}
        </g>
      </svg>

      <div className="pointer-events-none absolute top-3 right-3 z-10 flex items-center gap-2 rounded-xl bg-white px-3 py-2 shadow-md border border-slate-200">
        <span className="flex h-7 w-10 overflow-hidden rounded-sm border border-slate-200" aria-hidden>
          <span className="w-1/2 bg-red-600" />
          <span className="w-1/2 bg-black" />
        </span>
        <span className="leading-tight">
          <span className="block text-sm font-black tracking-wide text-slate-800">ANGOLA</span>
          <span className="block text-[10px] font-semibold text-slate-500">Provinces Map</span>
        </span>
      </div>

      <div className="pointer-events-none absolute bottom-3 left-3 z-10 text-[10px] font-bold tracking-widest text-slate-500">
        <div className="mb-1 flex items-center gap-1">
          <span className="inline-block h-3 w-px bg-slate-500" />
          <span>N</span>
        </div>
        <div className="h-1 w-24 border-x border-b border-slate-500" />
        <div className="mt-0.5 flex justify-between w-24">
          <span>0</span>
          <span>400 km</span>
        </div>
      </div>

      <MapControls
        onZoomIn={() => zoomBy(0.25)}
        onZoomOut={() => zoomBy(-0.25)}
        onReset={resetView}
        className="absolute bottom-4 right-4"
      />
    </div>
  );
}

function ContextLabel({
  x,
  y,
  k,
  projection,
  text,
  rotate,
}: {
  x: number;
  y: number;
  k: number;
  projection: (coords: [number, number]) => [number, number] | null;
  text: string;
  rotate?: number;
}) {
  const pt = projection([x, y]);
  if (!pt) return null;
  return (
    <text
      x={pt[0]}
      y={pt[1]}
      textAnchor="middle"
      fill="#9AA3AD"
      fontSize={11 / k}
      fontWeight={700}
      letterSpacing={1.4 / k}
      transform={rotate ? `rotate(${rotate} ${pt[0]} ${pt[1]})` : undefined}
      style={{ fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif" }}
    >
      {text}
    </text>
  );
}
