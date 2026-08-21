import React from "react";
import { MapPin, Navigation } from "lucide-react";
import { formatDistance } from "@/lib/location/location-service";
import { cn } from "@/lib/utils";

export interface DistanceBadgeProps {
  distanceKm: number;
  className?: string;
  size?: "sm" | "md";
  showIcon?: boolean;
}

export function DistanceBadge({
  distanceKm,
  className,
  size = "md",
  showIcon = true,
}: DistanceBadgeProps) {
  const isNear = distanceKm <= 10;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-bold rounded-md transition-colors",
        isNear
          ? "bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
          : "bg-surface border border-border text-foreground/80",
        size === "sm" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-xs",
        className
      )}
    >
      {showIcon && <Navigation className={cn("text-primary", size === "sm" ? "w-2.5 h-2.5" : "w-3 h-3")} />}
      <span>{formatDistance(distanceKm)}</span>
    </span>
  );
}

export interface LocationBreadcrumbProps {
  provinceName: string;
  municipalityName?: string | null;
  communeName?: string | null;
  className?: string;
}

export function LocationBreadcrumb({
  provinceName,
  municipalityName,
  communeName,
  className,
}: LocationBreadcrumbProps) {
  return (
    <nav className={cn("flex items-center gap-1.5 text-xs text-muted-foreground font-medium", className)}>
      <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
      <span>Angola</span>
      <span>›</span>
      <span className="text-foreground font-semibold">{provinceName}</span>
      {municipalityName && (
        <>
          <span>›</span>
          <span className="text-foreground">{municipalityName}</span>
        </>
      )}
      {communeName && (
        <>
          <span>›</span>
          <span className="text-muted-foreground">{communeName}</span>
        </>
      )}
    </nav>
  );
}
