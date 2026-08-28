"use client";

import { CheckCircle2, MapPin, Truck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n/provider";
import { preferredTransportPrice, formatTransportDisplayPrice } from "@/lib/transport/order-expedition";
import type { TransportListItem } from "@/types/transport";

export interface TransportSelectionCardProps {
  transport: TransportListItem;
  selected: boolean;
  onSelect: () => void;
  disabled?: boolean;
}

export function TransportSelectionCard({
  transport,
  selected,
  onSelect,
  disabled = false,
}: TransportSelectionCardProps) {
  const { dict } = useI18n();
  const copy = dict.dashboardOrders;
  const routeLabel = [transport.origin_label, transport.destination_label]
    .filter(Boolean)
    .join(" → ");
  const price = preferredTransportPrice(transport);
  const priceLabel = `${formatTransportDisplayPrice(price.amount, transport.currency)} / ${
    price.unit === "trip" ? copy.perTrip : copy.perLoad
  }`;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "w-full text-left rounded-2xl border p-4 transition-all duration-200",
        "bg-surface-card hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        selected ? "border-primary ring-2 ring-primary/30 bg-primary/5" : "border-border",
        disabled && "opacity-60 pointer-events-none"
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
            selected ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40"
          )}
          aria-hidden
        >
          {selected ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}
        </span>
        <div className="min-w-0 flex-1 space-y-2">
          <div>
            <h3 className="text-sm font-bold text-foreground line-clamp-2">{transport.title}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{transport.provider_name}</p>
          </div>
          {routeLabel ? (
            <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
              <span className="line-clamp-1">{routeLabel}</span>
            </div>
          ) : null}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Truck className="w-3.5 h-3.5 text-primary" />
              {transport.vehicle_name}
            </span>
            {transport.capacity_load ? <span>{transport.capacity_load}</span> : null}
            <span className="font-bold text-foreground">{priceLabel}</span>
          </div>
        </div>
      </div>
    </button>
  );
}
