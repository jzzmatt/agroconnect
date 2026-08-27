"use client";

import Link from "next/link";
import { Truck, MapPin, ArrowRight, ShieldCheck } from "lucide-react";
import { LocationBadge } from "@/components/location";
import { Button } from "@/components/ui/Button";
import type { TransportListItem } from "@/types/transport";
import { cn } from "@/lib/utils";

function formatTransportPrice(amount: number, currency = "AOA"): string {
  return `${amount.toLocaleString("pt-AO")} ${currency === "AOA" ? "Kz" : currency}`;
}

export interface TransportCardProps {
  transport: TransportListItem;
  className?: string;
}

export function TransportCard({ transport, className }: TransportCardProps) {
  const routeLabel = [transport.origin_label, transport.destination_label]
    .filter(Boolean)
    .join(" → ");

  return (
    <div
      className={cn(
        "bg-surface-card rounded-3xl border border-border p-5 sm:p-6 shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between group hover:border-primary/40",
        className
      )}
    >
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Truck className="w-4 h-4 text-primary shrink-0" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Transporte
              </span>
            </div>
            <h3 className="font-bold text-base sm:text-lg text-foreground group-hover:text-primary transition-colors line-clamp-2">
              {transport.title}
            </h3>
            <p className="text-xs text-muted-foreground mt-1">{transport.provider_name}</p>
          </div>
          {transport.provider_verified ? (
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : null}
        </div>

        {routeLabel ? (
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <MapPin className="w-4 h-4 text-primary shrink-0" />
            <span className="line-clamp-1">{routeLabel}</span>
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="rounded-2xl bg-surface border border-border p-3">
            <span className="text-[10px] uppercase font-bold text-muted-foreground block">Por viagem</span>
            <span className="font-black text-foreground">
              {formatTransportPrice(transport.price_per_trip, transport.currency)}
            </span>
          </div>
          <div className="rounded-2xl bg-surface border border-border p-3">
            <span className="text-[10px] uppercase font-bold text-muted-foreground block">Por carga</span>
            <span className="font-black text-foreground">
              {formatTransportPrice(transport.price_per_load, transport.currency)}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="font-semibold">{transport.vehicle_name}</span>
          {transport.capacity_load ? <span>• {transport.capacity_load}</span> : null}
        </div>

        {transport.base_province_name ? (
          <LocationBadge
            provinceName={transport.base_province_name}
            municipalityName={transport.base_municipality_name || undefined}
            size="sm"
          />
        ) : null}
      </div>

      <div className="mt-5 pt-4 border-t border-border flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground line-clamp-2 flex-1">
          {transport.short_description}
        </p>
        <Link href={`/transport/${transport.slug}`} className="shrink-0">
          <Button variant="primary" size="sm" className="gap-1.5 text-xs font-bold">
            <span>Ver</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
