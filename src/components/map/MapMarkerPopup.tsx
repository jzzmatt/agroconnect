"use client";

import React, { useLayoutEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";
import type { MapMarkerItem } from "@/components/location/LocationMap";
import { MARKER_CATEGORY_CONFIG } from "./map-marker-config";

interface MapMarkerPopupProps {
  marker: MapMarkerItem;
  anchor: { x: number; y: number };
  containerSize: { width: number; height: number };
  categoryLabel: string;
  closeLabel: string;
  viewDetailsFallback: string;
  onClose: () => void;
  className?: string;
}

const POPUP_WIDTH = 260;
const POPUP_ESTIMATED_HEIGHT = 220;
const GAP = 12;

export function MapMarkerPopup({
  marker,
  anchor,
  containerSize,
  categoryLabel,
  closeLabel,
  viewDetailsFallback,
  onClose,
  className,
}: MapMarkerPopupProps) {
  const reduceMotion = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(POPUP_ESTIMATED_HEIGHT);

  useLayoutEffect(() => {
    if (ref.current) setHeight(ref.current.offsetHeight);
  }, [marker.id, marker.description, marker.thumbnailUrl]);

  let left = anchor.x - POPUP_WIDTH / 2;
  let top = anchor.y - height - GAP - 40;
  let placement: "above" | "below" = "above";

  if (top < 8) {
    top = anchor.y + GAP;
    placement = "below";
  }

  left = Math.max(8, Math.min(left, containerSize.width - POPUP_WIDTH - 8));
  top = Math.max(8, Math.min(top, containerSize.height - height - 8));

  const config = MARKER_CATEGORY_CONFIG[marker.category];

  return (
    <motion.div
      ref={ref}
      role="dialog"
      aria-labelledby={`map-marker-popup-${marker.id}`}
      className={cn(
        "absolute z-40 w-[260px] rounded-2xl border border-border bg-surface shadow-xl overflow-hidden pointer-events-auto",
        className
      )}
      style={{ left, top }}
      initial={reduceMotion ? false : { opacity: 0, scale: 0.96, y: placement === "above" ? 4 : -4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.22 }}
    >
      <div className="flex items-start justify-between gap-2 p-3 border-b border-border">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{categoryLabel}</p>
          <h3 id={`map-marker-popup-${marker.id}`} className="text-sm font-bold text-foreground leading-snug pr-2">
            {marker.title}
          </h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={closeLabel}
          className="shrink-0 min-w-11 min-h-11 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {marker.thumbnailUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={marker.thumbnailUrl} alt="" className="w-full h-24 object-cover" />
      ) : null}

      <div className="p-3 space-y-2">
        <p className="text-xs font-semibold text-primary">
          {marker.municipalityName ? `${marker.municipalityName}, ` : ""}
          {marker.provinceName}
        </p>
        {marker.description ? (
          <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">{marker.description}</p>
        ) : null}
        {marker.href ? (
          <a
            href={marker.href}
            className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-[#F97316] text-sm font-semibold text-white hover:bg-[#ea580c] transition-colors"
            style={{ boxShadow: `0 0 0 1px ${config.color}33` }}
          >
            {marker.ctaLabel ?? viewDetailsFallback}
          </a>
        ) : null}
      </div>
    </motion.div>
  );
}
