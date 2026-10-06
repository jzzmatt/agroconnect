"use client";

import { cn } from "@/lib/utils";
import type { MapMarkerItem } from "@/components/location/LocationMap";
import { MARKER_CATEGORY_CONFIG, MARKER_SIZE } from "./map-marker-config";

interface AgroConnectMapMarkerPinProps {
  marker: MapMarkerItem;
  selected?: boolean;
  onClick?: () => void;
  className?: string;
  ariaLabel: string;
}

export function AgroConnectMapMarkerPin({
  marker,
  selected = false,
  onClick,
  className,
  ariaLabel,
}: AgroConnectMapMarkerPinProps) {
  const config = MARKER_CATEGORY_CONFIG[marker.category];
  const size = selected ? MARKER_SIZE.selected : MARKER_SIZE.normal;
  const Icon = config.Icon;

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      aria-pressed={selected}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      className={cn(
        "absolute -translate-x-1/2 -translate-y-full flex flex-col items-center pointer-events-auto",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F97316]",
        selected ? "z-30" : "z-20",
        className
      )}
      style={{ width: size, height: size + 10 }}
    >
      <span
        className={cn(
          "relative flex items-center justify-center rounded-full border-2 border-[#F8F3E8] shadow-lg transition-transform duration-200",
          selected && "ring-2 ring-[#F97316] ring-offset-2 ring-offset-transparent scale-110"
        )}
        style={{
          width: size,
          height: size,
          backgroundColor: selected ? "#F97316" : config.color,
        }}
      >
        <Icon className="text-white" size={selected ? 20 : 14} strokeWidth={2.25} aria-hidden />
      </span>
      <span
        className="block w-0 h-0 border-l-[7px] border-r-[7px] border-t-[9px] border-l-transparent border-r-transparent"
        style={{ borderTopColor: selected ? "#F97316" : config.color }}
        aria-hidden
      />
    </button>
  );
}
