"use client";

import React from "react";
import { Navigation, Loader2, MapPin, AlertCircle } from "lucide-react";
import { useGeolocation } from "@/lib/location/use-geolocation";
import type { GeoCoordinate } from "@/types/domain";
import { cn } from "@/lib/utils";

export interface CurrentLocationButtonProps {
  onLocationFound: (coords: GeoCoordinate) => void;
  className?: string;
  variant?: "button" | "compact";
  label?: string;
}

/**
 * Accessible Portuguese browser GPS button with natural user consent UX
 */
export function CurrentLocationButton({
  onLocationFound,
  className,
  variant = "button",
  label = "Usar a minha localização",
}: CurrentLocationButtonProps) {
  const { requestLocation, isLoading, isDenied, errorMessage } = useGeolocation();

  const handleClick = async () => {
    const coords = await requestLocation();
    if (coords) {
      onLocationFound(coords);
    }
  };

  if (variant === "compact") {
    return (
      <div className="inline-flex items-center gap-1.5">
        <button
          type="button"
          onClick={handleClick}
          disabled={isLoading}
          className={cn(
            "text-xs font-semibold text-primary hover:text-primary-hover flex items-center gap-1 transition-colors disabled:opacity-50",
            className
          )}
          title="Detectar localização atual"
        >
          {isLoading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Navigation className="w-3.5 h-3.5" />
          )}
          <span>{isLoading ? "A localizar..." : "GPS"}</span>
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={isLoading}
        className={cn(
          "inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold border border-border bg-surface text-foreground hover:bg-muted active:bg-muted/80 transition-all shadow-2xs disabled:opacity-50",
          className
        )}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 text-primary animate-spin" />
        ) : (
          <Navigation className="w-4 h-4 text-primary" />
        )}
        <span>{isLoading ? "A detetar coordenadas..." : label}</span>
      </button>

      {isDenied && errorMessage && (
        <p className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1 pt-0.5">
          <AlertCircle className="w-3 h-3 shrink-0" />
          <span>{errorMessage}</span>
        </p>
      )}
    </div>
  );
}
