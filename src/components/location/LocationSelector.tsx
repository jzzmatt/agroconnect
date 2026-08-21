"use client";

import React, { useState } from "react";
import { MapPin, Navigation } from "lucide-react";
import { ANGOLA_PROVINCES, ANGOLA_KEY_MUNICIPALITIES } from "@/config/locations";
import { getUserLocation } from "@/lib/location";
import { cn } from "@/lib/utils";

interface LocationSelectorProps {
  selectedProvince?: string;
  selectedMunicipality?: string;
  selectedRadius?: number;
  onProvinceChange?: (province: string) => void;
  onMunicipalityChange?: (municipality: string) => void;
  onRadiusChange?: (radius: number) => void;
  onCoordinatesFound?: (coords: { latitude: number; longitude: number }) => void;
  className?: string;
  showRadius?: boolean;
}

export function LocationSelector({
  selectedProvince = "",
  selectedMunicipality = "",
  selectedRadius = 50,
  onProvinceChange,
  onMunicipalityChange,
  onRadiusChange,
  onCoordinatesFound,
  className,
  showRadius = true,
}: LocationSelectorProps) {
  const [isLocating, setIsLocating] = useState(false);

  const availableMunicipalities = selectedProvince
    ? ANGOLA_KEY_MUNICIPALITIES.filter(
        (m) =>
          m.provinceName.toLowerCase() === selectedProvince.toLowerCase() ||
          m.provinceCode.toLowerCase() === selectedProvince.toLowerCase()
      )
    : ANGOLA_KEY_MUNICIPALITIES;

  const handleUseLocation = async () => {
    setIsLocating(true);
    try {
      const coords = await getUserLocation();
      if (coords && onCoordinatesFound) {
        onCoordinatesFound(coords);
      }
    } finally {
      setIsLocating(false);
    }
  };

  return (
    <div className={cn("p-4 bg-surface-card rounded-2xl border border-border shadow-xs space-y-3", className)}>
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
          <MapPin className="w-4 h-4 text-primary" />
          Filtro AgriLocalização (Angola)
        </label>
        <button
          type="button"
          onClick={handleUseLocation}
          disabled={isLocating}
          className="text-xs font-semibold text-primary hover:text-primary-hover flex items-center gap-1 transition-colors disabled:opacity-50"
        >
          <Navigation className={cn("w-3.5 h-3.5", isLocating && "animate-spin")} />
          <span>{isLocating ? "A localizar..." : "Usar GPS"}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {/* Province Select */}
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">
            Província
          </label>
          <select
            value={selectedProvince}
            onChange={(e) => {
              if (onProvinceChange) onProvinceChange(e.target.value);
              if (onMunicipalityChange) onMunicipalityChange("");
            }}
            className="w-full text-xs bg-surface border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-ring font-medium"
          >
            <option value="">Todas as 18 Províncias</option>
            {ANGOLA_PROVINCES.map((p) => (
              <option key={p.code} value={p.name}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* Municipality Select */}
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">
            Município
          </label>
          <select
            value={selectedMunicipality}
            onChange={(e) => onMunicipalityChange && onMunicipalityChange(e.target.value)}
            className="w-full text-xs bg-surface border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-ring font-medium"
          >
            <option value="">Todos os Municípios</option>
            {availableMunicipalities.map((m) => (
              <option key={m.code} value={m.name}>
                {m.name} ({m.provinceName})
              </option>
            ))}
          </select>
        </div>

        {/* Radius Selector */}
        {showRadius && (
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-medium text-muted-foreground">
                Raio de Busca
              </label>
              <span className="text-xs font-bold text-primary">{selectedRadius} km</span>
            </div>
            <input
              type="range"
              min="5"
              max="200"
              step="5"
              value={selectedRadius}
              onChange={(e) => onRadiusChange && onRadiusChange(Number(e.target.value))}
              className="w-full accent-primary cursor-pointer h-1.5 bg-muted rounded-lg"
            />
          </div>
        )}
      </div>
    </div>
  );
}

interface LocationBadgeProps {
  provinceName: string;
  municipalityName?: string | null;
  className?: string;
  size?: "sm" | "md";
}

export function LocationBadge({
  provinceName,
  municipalityName,
  className,
  size = "md",
}: LocationBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-medium rounded-md bg-secondary text-secondary-foreground border border-border-subtle",
        size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs",
        className
      )}
    >
      <MapPin className={cn("text-primary", size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5")} />
      <span>
        {municipalityName ? `${municipalityName}, ${provinceName}` : provinceName}
      </span>
    </span>
  );
}
