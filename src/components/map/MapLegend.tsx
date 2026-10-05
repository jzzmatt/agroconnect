"use client";

import { AGRICULTURAL_MARKER_COLORS } from "@/lib/geographic/angola-map-theme";

const ITEMS = [
  { key: "products", label: "Produtos", color: AGRICULTURAL_MARKER_COLORS.products },
  { key: "farmers", label: "Agricultores", color: AGRICULTURAL_MARKER_COLORS.farmers },
  { key: "farms", label: "Explorações", color: AGRICULTURAL_MARKER_COLORS.farms },
  { key: "services", label: "Serviços", color: AGRICULTURAL_MARKER_COLORS.services },
  { key: "marketplace", label: "Marketplace", color: AGRICULTURAL_MARKER_COLORS.marketplace },
  { key: "academy", label: "Academy", color: AGRICULTURAL_MARKER_COLORS.academy },
] as const;

export function MapLegend() {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-foreground/90">
      {ITEMS.map((item) => (
        <span key={item.key} className="inline-flex items-center gap-1.5">
          <span
            className="w-2.5 h-2.5 rounded-full border border-white/80 shadow-sm"
            style={{ backgroundColor: item.color }}
            aria-hidden
          />
          {item.label}
        </span>
      ))}
    </div>
  );
}
