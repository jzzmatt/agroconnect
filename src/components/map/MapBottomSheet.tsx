"use client";

import { cn } from "@/lib/utils";
import type { AngolaProvince } from "@/config/locations";
import type { MapMarkerItem } from "@/components/location/LocationMap";

interface MapBottomSheetProps {
  province?: AngolaProvince | null;
  marker?: MapMarkerItem | null;
  expanded?: boolean;
  onExplore?: () => void;
  emptyMessage?: string;
  className?: string;
}

export function MapBottomSheet({
  province,
  marker,
  expanded = false,
  onExplore,
  emptyMessage,
  className,
}: MapBottomSheetProps) {
  if (marker) {
    return (
      <div
        className={cn(
          "rounded-t-3xl border border-border bg-surface shadow-xl p-4 sm:p-5",
          expanded ? "min-h-[220px]" : "min-h-[120px]",
          className
        )}
      >
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{marker.category}</p>
        <h3 className="text-lg font-bold text-foreground mt-1">{marker.title}</h3>
        <p className="text-sm text-muted-foreground mt-1">
          {marker.municipalityName ? `${marker.municipalityName}, ` : ""}
          {marker.provinceName}
        </p>
        {marker.description ? (
          <p className="text-sm text-foreground/80 mt-2 line-clamp-3">{marker.description}</p>
        ) : null}
        {marker.href ? (
          <a
            href={marker.href}
            className="inline-flex mt-4 min-h-11 items-center justify-center rounded-xl bg-[#F97316] px-4 text-sm font-semibold text-white"
          >
            {marker.ctaLabel ?? "Ver detalhes"}
          </a>
        ) : null}
      </div>
    );
  }

  if (province) {
    return (
      <div className={cn("rounded-t-3xl border border-border bg-surface shadow-xl p-4 sm:p-5", className)}>
        <h3 className="text-lg font-bold text-foreground">{province.name}</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Capital: {province.capital} • {province.agriculturalFocus.slice(0, 2).join(", ")}
        </p>
        <button
          type="button"
          onClick={onExplore}
          className="mt-4 min-h-11 w-full rounded-xl bg-[#F97316] text-sm font-semibold text-white"
        >
          Explorar agricultura
        </button>
      </div>
    );
  }

  if (emptyMessage) {
    return (
      <div className={cn("rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground", className)}>
        {emptyMessage}
      </div>
    );
  }

  return null;
}
