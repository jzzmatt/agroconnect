"use client";

import React from "react";
import Link from "next/link";
import {
  MapPin,
  Star,
  ShieldCheck,
  ArrowRight,
  Heart,
  Navigation,
  Sparkles,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { ServiceListItem } from "@/types/domain";

interface ServiceCardProps {
  service: ServiceListItem;
  onSelect?: (service: ServiceListItem) => void;
  onToggleFavorite?: (serviceId: string) => void;
  isFavorited?: boolean;
  isSelected?: boolean;
  className?: string;
}

export function ServiceCard({
  service,
  onSelect,
  onToggleFavorite,
  isFavorited = false,
  isSelected = false,
  className,
}: ServiceCardProps) {
  const formatPrice = (price: number, type: string, currency = "Kz") => {
    const formatted = new Intl.NumberFormat("pt-AO").format(price);
    switch (type) {
      case "starting_from":
        return `A partir de ${formatted} ${currency}`;
      case "hourly":
        return `${formatted} ${currency} / hora`;
      case "daily":
        return `${formatted} ${currency} / dia`;
      case "quotation":
        return "Preço sob consulta";
      case "free":
        return "Gratuito";
      case "fixed":
      default:
        return `${formatted} ${currency}`;
    }
  };

  return (
    <div
      onClick={() => onSelect && onSelect(service)}
      className={cn(
        "bg-surface-card rounded-3xl border border-border p-5 shadow-xs hover:shadow-lg transition-all duration-300 flex flex-col justify-between group relative select-none",
        isSelected && "ring-2 ring-primary border-primary shadow-md",
        className
      )}
    >
      {/* Top badges & Favorite */}
      <div>
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {service.is_featured && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500 text-white shadow-2xs">
                <Sparkles className="w-3 h-3" />
                Destaque
              </span>
            )}
            <Badge variant="pillarExpert" className="text-[10px] font-bold">
              {service.category_name || "Serviço Agrícola"}
            </Badge>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (onToggleFavorite) onToggleFavorite(service.id);
            }}
            className={cn(
              "p-2 rounded-full border transition-all cursor-pointer",
              isFavorited
                ? "bg-rose-50 dark:bg-rose-950 text-rose-600 border-rose-200 dark:border-rose-900"
                : "bg-surface hover:bg-muted text-muted-foreground border-border"
            )}
            aria-label="Guardar nos favoritos"
          >
            <Heart className={cn("w-4 h-4", isFavorited && "fill-rose-500 text-rose-500")} />
          </button>
        </div>

        {/* Service Title */}
        <Link
          href={`/services/${service.slug}`}
          onClick={(e) => e.stopPropagation()}
          className="block group-hover:text-primary transition-colors"
        >
          <h3 className="text-base font-bold text-foreground leading-snug line-clamp-2">
            {service.title}
          </h3>
        </Link>

        {/* Short Description */}
        {service.short_description && (
          <p className="text-xs text-muted-foreground mt-2 line-clamp-2 leading-relaxed">
            {service.short_description}
          </p>
        )}

        {/* Provider info pill */}
        <div className="mt-4 pt-3 border-t border-border flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 truncate">
            <div className="w-7 h-7 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center font-bold text-xs shrink-0">
              {service.provider_name.charAt(0)}
            </div>
            <div className="truncate">
              <div className="flex items-center gap-1">
                <span className="text-xs font-semibold text-foreground truncate">
                  {service.provider_name}
                </span>
                {service.provider_verified && (
                  <ShieldCheck className="w-3.5 h-3.5 text-primary shrink-0" />
                )}
              </div>
            </div>
          </div>

          {service.provider_rating && (
            <div className="flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400 shrink-0">
              <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
              <span>{service.provider_rating.toFixed(1)}</span>
            </div>
          )}
        </div>

        {/* Location & Distance */}
        <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground font-medium">
          <div className="flex items-center gap-1 text-primary font-semibold">
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            <span>
              {service.municipality_name ? `${service.municipality_name}, ` : ""}
              {service.province_name || "Angola"}
            </span>
          </div>

          {service.distance_km !== null && service.distance_km !== undefined && (
            <div className="flex items-center gap-1 bg-secondary text-secondary-foreground px-2 py-0.5 rounded-md font-bold text-[10px]">
              <Navigation className="w-3 h-3 text-primary" />
              <span>{service.distance_km} km</span>
            </div>
          )}

          {service.service_radius_km && (
            <span className="text-[10px] text-muted-foreground">
              (Raio: {service.service_radius_km}km)
            </span>
          )}
        </div>
      </div>

      {/* Pricing & CTA */}
      <div className="mt-5 pt-3 border-t border-border flex items-center justify-between gap-2">
        <div>
          <span className="text-[10px] uppercase font-bold text-muted-foreground block">
            Preço do Serviço
          </span>
          <span className="text-sm font-black text-foreground">
            {formatPrice(service.price, service.pricing_type, service.currency)}
          </span>
        </div>

        <Link
          href={`/services/${service.slug}`}
          onClick={(e) => e.stopPropagation()}
          className="shrink-0"
        >
          <Button variant="primary" size="sm" className="gap-1.5 font-bold text-xs h-9 px-3">
            <span>Ver detalhes</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
