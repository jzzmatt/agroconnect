"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { geoMercator, geoPath } from "d3-geo";
import type { Feature, FeatureCollection } from "geojson";
import type { GeoCoordinate } from "@/types/domain";
import { ANGOLA_MAP_FRAME, getAngolaProvinceGeoJson } from "@/lib/geographic/angola-province-geojson-data";
import { ANGOLA_MAP_BACKGROUND, atlasProvinceFill } from "@/lib/geographic/angola-map-theme";
import { cn } from "@/lib/utils";
import type { MapMarkerItem } from "@/components/location/LocationMap";

const MARKER_HEX: Record<MapMarkerItem["category"], string> = {
  expert: "#3E7130",
  academy: "#8B4513",
  shopping: "#D4A72C",
  business: "#B95E45",
  service: "#E87557",
  farm: "#718333",
};

function zoomToScale(zoom: number): number {
  return Math.min(8, Math.max(0.75, Math.pow(1.38, zoom - 6)));
}

export interface GeoJsonVectorMapProps {
  markers?: MapMarkerItem[];
  center?: GeoCoordinate;
  zoom?: number;
  selectedMarkerId?: string | null;
  onMarkerClick?: (marker: MapMarkerItem) => void;
  onMapClick?: (coordinates: GeoCoordinate) => void;
  userLocation?: GeoCoordinate | null;
  showProvinces?: boolean;
  className?: string;
}

export function GeoJsonVectorMap({
  markers = [],
  center = { latitude: -12.5, longitude: 17.5 },
  zoom = 6,
  selectedMarkerId,
  onMarkerClick,
  onMapClick,
  userLocation,
  showProvinces = true,
  className,
}: GeoJsonVectorMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 640, height: 400 });
  const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 });
  const data = useMemo(() => getAngolaProvinceGeoJson() as FeatureCollection, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      setSize({
        width: Math.max(280, entry.contentRect.width),
        height: Math.max(240, entry.contentRect.height),
      });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const projection = useMemo(() => {
    const margin = 20;
    const width = Math.max(size.width, 280);
    const height = Math.max(size.height, 240);
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

  const pathGenerator = useMemo(() => geoPath(projection), [projection]);

  useEffect(() => {
    if (!projection) return;
    const pt = projection([center.longitude, center.latitude]);
    if (!pt) return;
    const k = zoomToScale(zoom);
    setTransform({
      k,
      x: size.width / 2 - k * pt[0],
      y: size.height / 2 - k * pt[1],
    });
  }, [center.latitude, center.longitude, projection, size.height, size.width, zoom]);

  const handleBackgroundClick = useCallback(
    (event: React.MouseEvent<SVGRectElement>) => {
      if (!onMapClick || !projection) return;
      const svg = event.currentTarget.ownerSVGElement;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const mapX = (x - transform.x) / transform.k;
      const mapY = (y - transform.y) / transform.k;
      const inverted = projection.invert?.([mapX, mapY]);
      if (!inverted) return;
      onMapClick({ latitude: inverted[1], longitude: inverted[0] });
    },
    [onMapClick, projection, transform.k, transform.x, transform.y]
  );

  const backgroundStyle = {
    background: `linear-gradient(180deg, ${ANGOLA_MAP_BACKGROUND.dark.top} 0%, ${ANGOLA_MAP_BACKGROUND.dark.center} 48%, ${ANGOLA_MAP_BACKGROUND.dark.bottom} 100%)`,
  };

  return (
    <div
      ref={containerRef}
      className={cn("absolute inset-0 w-full h-full", className)}
      style={backgroundStyle}
    >
      <svg width={size.width} height={size.height} className="block w-full h-full">
        <rect width={size.width} height={size.height} fill="transparent" onClick={handleBackgroundClick} />
        <g transform={`translate(${transform.x} ${transform.y}) scale(${transform.k})`}>
          {showProvinces
            ? data.features.map((feature, idx) => {
                const code = String(feature.properties?.code ?? "");
                const d = pathGenerator(feature as Feature) ?? "";
                return (
                  <path
                    key={`${code}-${idx}`}
                    d={d}
                fill={atlasProvinceFill(code)}
                stroke="#F3E2A8"
                strokeWidth={1.2 / transform.k}
                    className="pointer-events-none"
                  />
                );
              })
            : null}

          {userLocation ? (
            <UserLocationDot projection={projection} location={userLocation} k={transform.k} />
          ) : null}

          {markers.map((marker) => {
            const pt = projection([marker.longitude, marker.latitude]);
            if (!pt) return null;
            const selected = marker.id === selectedMarkerId;
            return (
              <g
                key={marker.id}
                transform={`translate(${pt[0]}, ${pt[1]})`}
                className="cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  onMarkerClick?.(marker);
                }}
              >
                <circle
                  r={selected ? 8 : 6}
                  fill={MARKER_HEX[marker.category]}
                  stroke="#FFFFFF"
                  strokeWidth={2}
                  style={
                    selected
                      ? { filter: "drop-shadow(0 0 6px rgba(17,24,39,0.35))" }
                      : undefined
                  }
                />
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}

function UserLocationDot({
  projection,
  location,
  k,
}: {
  projection: ReturnType<typeof geoMercator>;
  location: GeoCoordinate;
  k: number;
}) {
  const pt = projection([location.longitude, location.latitude]);
  if (!pt) return null;
  return (
    <g transform={`translate(${pt[0]}, ${pt[1]})`}>
      <circle r={10 / k} fill="#3B82F6" opacity={0.25} />
      <circle r={5 / k} fill="#2563EB" stroke="#fff" strokeWidth={1.5 / k} />
    </g>
  );
}
