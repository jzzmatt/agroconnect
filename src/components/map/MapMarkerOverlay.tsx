"use client";

import React, { useMemo } from "react";
import type { geoMercator } from "d3-geo";
import type { MapMarkerItem } from "@/components/location/LocationMap";
import { projectGeoToScreen, type MapTransform } from "@/lib/geographic/map-screen-coordinates";
import { AgroConnectMapMarkerPin } from "./AgroConnectMapMarkerPin";
import { MapMarkerPopup } from "./MapMarkerPopup";

interface MapMarkerOverlayProps {
  markers: MapMarkerItem[];
  projection: ReturnType<typeof geoMercator>;
  transform: MapTransform;
  containerSize: { width: number; height: number };
  selectedMarkerId?: string | null;
  onSelectMarker?: (marker: MapMarkerItem | null) => void;
  showDesktopPopup?: boolean;
  labels: {
    closePopup: string;
    viewDetails: string;
    markerAria: (title: string) => string;
    categoryLabel: (category: MapMarkerItem["category"]) => string;
  };
}

export function MapMarkerOverlay({
  markers,
  projection,
  transform,
  containerSize,
  selectedMarkerId,
  onSelectMarker,
  showDesktopPopup = true,
  labels,
}: MapMarkerOverlayProps) {
  const positioned = useMemo(() => {
    return markers
      .map((marker) => {
        const screen = projectGeoToScreen(
          { latitude: marker.latitude, longitude: marker.longitude },
          projection,
          transform
        );
        if (!screen) return null;
        return { marker, screen };
      })
      .filter(Boolean) as { marker: MapMarkerItem; screen: { x: number; y: number } }[];
  }, [markers, projection, transform]);

  const selected = positioned.find((p) => p.marker.id === selectedMarkerId);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden={false}>
      {positioned.map(({ marker, screen }) => (
        <div
          key={marker.id}
          className="absolute left-0 top-0"
          style={{ transform: `translate(${screen.x}px, ${screen.y}px)` }}
        >
          <AgroConnectMapMarkerPin
            marker={marker}
            selected={marker.id === selectedMarkerId}
            ariaLabel={labels.markerAria(marker.title)}
            onClick={() =>
              onSelectMarker?.(marker.id === selectedMarkerId ? null : marker)
            }
          />
        </div>
      ))}

      {showDesktopPopup && selected ? (
        <MapMarkerPopup
          marker={selected.marker}
          anchor={selected.screen}
          containerSize={containerSize}
          categoryLabel={labels.categoryLabel(selected.marker.category)}
          closeLabel={labels.closePopup}
          viewDetailsFallback={labels.viewDetails}
          onClose={() => onSelectMarker?.(null)}
        />
      ) : null}
    </div>
  );
}
