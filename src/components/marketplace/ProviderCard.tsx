"use client";

import React from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Star,
  MapPin,
  Briefcase,
  Phone,
  Mail,
  Globe,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { ProviderPublicProfile } from "@/types/domain";

interface ProviderCardProps {
  provider: ProviderPublicProfile;
  className?: string;
}

export function ProviderCard({ provider, className }: ProviderCardProps) {
  const getProviderTypeLabel = (type: string) => {
    switch (type) {
      case "veterinarian":
        return "Médico Veterinário";
      case "agronomist":
        return "Engenheiro Agrónomo";
      case "agricultural_consultant":
        return "Consultor Agrícola";
      case "technician":
        return "Técnico Agropecuário";
      case "company":
        return "Empresa / Agro-indústria";
      case "cooperative":
        return "Cooperativa Agrícola";
      default:
        return "Prestador Especializado";
    }
  };

  return (
    <div
      className={cn(
        "bg-surface-card rounded-3xl border border-border p-6 shadow-xs hover:shadow-lg transition-all duration-300 flex flex-col justify-between group",
        className
      )}
    >
      <div>
        {/* Header with Avatar & Name */}
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-secondary text-secondary-foreground flex items-center justify-center font-black text-xl shrink-0 border border-border shadow-xs">
            {provider.business_name.charAt(0)}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <Link
                href={`/providers/${provider.slug}`}
                className="font-bold text-base text-foreground group-hover:text-primary transition-colors truncate"
              >
                {provider.business_name}
              </Link>
              {provider.verification_status === "verified" && (
                <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
              )}
            </div>
            <p className="text-xs font-semibold text-primary mt-0.5">
              {getProviderTypeLabel(provider.provider_type)}
            </p>
          </div>
        </div>

        {/* Headline */}
        {provider.headline && (
          <p className="text-xs font-medium text-foreground mt-3 line-clamp-1">
            {provider.headline}
          </p>
        )}

        {/* Description */}
        {provider.description && (
          <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed">
            {provider.description}
          </p>
        )}

        {/* Ratings & Metrics */}
        <div className="mt-4 pt-3 border-t border-border flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400">
            <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
            <span>{provider.rating.toFixed(1)}</span>
            <span className="text-[10px] text-muted-foreground font-normal">
              ({provider.reviews_count} avaliações)
            </span>
          </div>

          {provider.services_count !== undefined && (
            <div className="flex items-center gap-1 text-xs font-semibold text-muted-foreground">
              <Briefcase className="w-3.5 h-3.5 text-primary" />
              <span>{provider.services_count} serviços</span>
            </div>
          )}
        </div>

        {/* Location & Coverage */}
        <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
          <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
          <span>
            {provider.municipality_name ? `${provider.municipality_name}, ` : ""}
            {provider.province_name || "Angola"}
          </span>
          <span className="text-[10px] text-muted-foreground/80">
            • Cobertura {provider.service_radius_km} km
          </span>
        </div>
      </div>

      {/* Action Footer */}
      <div className="mt-6 pt-3 border-t border-border flex items-center justify-end">
        <Link href={`/providers/${provider.slug}`} className="w-full">
          <Button variant="outline" className="w-full justify-between font-bold text-xs h-9">
            <span>Ver perfil e serviços</span>
            <ArrowRight className="w-3.5 h-3.5 text-primary" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
