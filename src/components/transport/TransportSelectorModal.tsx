"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Loader2, Search, Truck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { TransportSelectionCard } from "@/components/transport/TransportSelectionCard";
import { useI18n } from "@/i18n/provider";
import {
  createOrderTransportRequestAction,
  searchPublishedTransportsAction,
} from "@/lib/transport/transport-actions";
import {
  formatTransportDisplayPrice,
  matchesPublishedTransportQuery,
  preferredTransportPrice,
  resolveOrderDestinationLabel,
} from "@/lib/transport/order-expedition";
import type { OrderDescriptor, OrderSellerGroupDescriptor } from "@/types/commerce";
import type { TransportListItem } from "@/types/transport";

type Step = "select" | "confirm";

export interface TransportSelectorModalProps {
  open: boolean;
  order: OrderDescriptor;
  sellerGroup: OrderSellerGroupDescriptor;
  onClose: () => void;
  onSubmitted: () => void;
}

function errorMessageForCode(
  copy: {
    activeTransportRequest: string;
    errorUnpublished: string;
    errorNotEligible: string;
    errorUnauthorized: string;
    errorGeneric: string;
  },
  code?: string,
  fallback?: string
): string {
  if (code === "ACTIVE_TRANSPORT_REQUEST") return copy.activeTransportRequest;
  if (code === "TRANSPORT_NOT_PUBLISHED") return copy.errorUnpublished;
  if (code === "ORDER_NOT_ELIGIBLE") return copy.errorNotEligible;
  if (code === "UNAUTHORIZED" || code === "UNAUTHENTICATED") return copy.errorUnauthorized;
  return fallback || copy.errorGeneric;
}

export function TransportSelectorModal({
  open,
  order,
  sellerGroup,
  onClose,
  onSubmitted,
}: TransportSelectorModalProps) {
  const { dict } = useI18n();
  const copy = dict.dashboardOrders;
  const [step, setStep] = useState<Step>("select");
  const [query, setQuery] = useState("");
  const [transports, setTransports] = useState<TransportListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setStep("select");
    setQuery("");
    setSelectedId(null);
    setNotes("");
    setError(null);
    setSubmitting(false);
    setLoading(true);
    searchPublishedTransportsAction({ limit: 80 })
      .then((result) => {
        setTransports(Array.isArray(result.transports) ? result.transports : []);
      })
      .catch(() => {
        setTransports([]);
        setError(copy.errorGeneric);
      })
      .finally(() => setLoading(false));
  }, [open, copy.errorGeneric]);

  const filtered = useMemo(
    () => transports.filter((transport) => matchesPublishedTransportQuery(transport, query)),
    [transports, query]
  );
  const selected = transports.find((transport) => transport.id === selectedId) || null;
  const items = sellerGroup.items.length > 0 ? sellerGroup.items : order.items;
  const destination = resolveOrderDestinationLabel(order);

  if (!open) return null;

  const handleConfirmSelection = () => {
    if (!selected) return;
    setError(null);
    setStep("confirm");
  };

  const handleSubmit = async () => {
    if (!selected || submitting) return;
    setSubmitting(true);
    setError(null);
    const result = await createOrderTransportRequestAction({
      orderNumber: order.order_number,
      transportServiceId: selected.id,
      sellerGroupId: sellerGroup.id,
      notes: notes.trim() || undefined,
    });
    setSubmitting(false);
    if (!result.success) {
      setError(errorMessageForCode(copy, result.code, result.message));
      return;
    }
    onSubmitted();
    onClose();
  };

  const selectedPrice = selected ? preferredTransportPrice(selected) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50" onClick={submitting ? undefined : onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="transport-selector-title"
        className="relative w-full sm:max-w-xl max-h-[92vh] overflow-y-auto bg-surface-card border border-border rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 space-y-4 shadow-2xl"
      >
        <div>
          <h3 id="transport-selector-title" className="text-lg font-black text-foreground">
            {step === "confirm" ? copy.confirmTransport : copy.chooseTransport}
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            {step === "confirm" ? `${copy.order} #${order.order_number}` : copy.chooseTransportSubtitle}
          </p>
        </div>

        {step === "select" ? (
          <>
            <label className="relative block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="w-full rounded-2xl border border-border bg-background pl-9 pr-3 py-2 text-sm"
                placeholder={copy.searchTransport}
              />
            </label>

            {loading ? (
              <div className="py-10 text-center space-y-2">
                <Loader2 className="w-6 h-6 text-primary mx-auto animate-spin" />
                <p className="text-sm text-muted-foreground">{copy.loadingTransports}</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-8 text-center space-y-2">
                <Truck className="w-8 h-8 text-muted-foreground mx-auto" />
                <h4 className="text-sm font-bold text-foreground">{copy.noPublishedTransports}</h4>
                <p className="text-xs text-muted-foreground">{copy.noPublishedTransportsBody}</p>
                <p className="text-xs text-muted-foreground">{copy.noPublishedTransportsHint}</p>
                <Link href="/dashboard/transport" className="inline-block pt-2">
                  <Button variant="outline" size="sm">
                    {copy.viewTransports}
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-2 max-h-[46vh] overflow-y-auto pr-1">
                {filtered.map((transport) => (
                  <TransportSelectionCard
                    key={transport.id}
                    transport={transport}
                    selected={selectedId === transport.id}
                    disabled={submitting}
                    onSelect={() => setSelectedId(transport.id)}
                  />
                ))}
              </div>
            )}
          </>
        ) : selected && selectedPrice ? (
          <div className="space-y-3">
            <div className="rounded-2xl border border-border bg-surface p-4 space-y-2 text-xs">
              <ConfirmRow label={copy.order} value={`#${order.order_number}`} />
              <ConfirmRow
                label={copy.products}
                value={items.map((item) => `${item.quantity} × ${item.product_title}`).join(", ")}
              />
              <ConfirmRow label={copy.transport} value={selected.title} />
              <ConfirmRow label={copy.transporter} value={selected.provider_name} />
              <ConfirmRow
                label={copy.route}
                value={[selected.origin_label, selected.destination_label].filter(Boolean).join(" → ") || "—"}
              />
              {destination ? <ConfirmRow label={copy.destination} value={destination} /> : null}
              <ConfirmRow
                label={copy.estimatedValue}
                value={`${formatTransportDisplayPrice(selectedPrice.amount, selected.currency)} / ${
                  selectedPrice.unit === "trip" ? copy.perTrip : copy.perLoad
                }`}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground">{copy.notesLabel}</label>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={3}
                disabled={submitting}
                className="mt-1 w-full rounded-2xl border border-border bg-background px-3 py-2 text-sm"
                placeholder={copy.notesPlaceholder}
              />
            </div>
          </div>
        ) : null}

        {error ? <p className="text-xs font-semibold text-destructive">{error}</p> : null}

        <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
          {step === "confirm" ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setStep("select")}
              disabled={submitting}
            >
              {dict.common.back}
            </Button>
          ) : (
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={submitting}>
              {dict.common.cancel}
            </Button>
          )}
          {step === "select" ? (
            <Button
              type="button"
              variant="primary"
              size="sm"
              disabled={!selected || loading || submitting || filtered.length === 0}
              onClick={handleConfirmSelection}
            >
              {copy.confirmTransport}
            </Button>
          ) : (
            <Button
              type="button"
              variant="primary"
              size="sm"
              disabled={!selected || submitting}
              onClick={handleSubmit}
              className="gap-1.5"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  {copy.sendingTransportRequest}
                </>
              ) : (
                copy.sendTransportRequest
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function ConfirmRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-muted-foreground font-semibold shrink-0">{label}</span>
      <span className="text-foreground font-bold text-right">{value}</span>
    </div>
  );
}
