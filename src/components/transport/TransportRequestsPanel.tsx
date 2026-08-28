"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Calendar,
  CheckCircle2,
  Clock,
  Inbox,
  MapPin,
  Truck,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  getCustomerTransportRequestsAction,
  getTransportRequestsForProviderAction,
  updateTransportRequestStatusAction,
} from "@/lib/transport/transport-actions";
import { transportRequestDisplayStatus, isVisibleOnSendingRequests } from "@/lib/transport/transport-request-lifecycle";
import { useI18n } from "@/i18n/provider";
import type { TransportRequestItem, TransportRequestStatus } from "@/types/transport";

type RequestView = "receiving" | "sending";
type StatusFilter = "all" | "pending" | "confirmed" | "rejected" | "completed" | "cancelled";

function formatPrice(amount: number, currency = "AOA") {
  return `${amount.toLocaleString("pt-AO")} ${currency === "AOA" ? "Kz" : currency}`;
}

function formatDateTime(value?: string | null, locale = "pt-AO") {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(locale, { dateStyle: "short", timeStyle: "short" });
}

export function TransportRequestsPanel({ view }: { view: RequestView }) {
  const { dict, locale } = useI18n();
  const copy = dict.transportRequests;
  const [requests, setRequests] = useState<TransportRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [pendingAction, setPendingAction] = useState<{
    requestId: string;
    status: TransportRequestStatus;
  } | null>(null);
  const [acting, setActing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const rows =
      view === "receiving"
        ? await getTransportRequestsForProviderAction()
        : await getCustomerTransportRequestsAction();
    setRequests(rows);
    setLoading(false);
  }, [view]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const visible =
      view === "sending" ? requests.filter((req) => isVisibleOnSendingRequests(req.status)) : requests;
    if (filter === "all") return visible;
    return visible.filter((req) => transportRequestDisplayStatus(req.status) === filter);
  }, [filter, requests, view]);

  const confirmCopy = pendingAction
    ? pendingAction.status === "accepted"
      ? { title: copy.acceptConfirmTitle, message: copy.acceptConfirmMessage, confirm: copy.accept }
      : pendingAction.status === "rejected"
        ? { title: copy.rejectConfirmTitle, message: copy.rejectConfirmMessage, confirm: copy.reject }
        : pendingAction.status === "completed"
          ? { title: copy.completeConfirmTitle, message: copy.completeConfirmMessage, confirm: copy.complete }
          : { title: copy.cancelConfirmTitle, message: copy.cancelConfirmMessage, confirm: copy.cancelRequest }
    : null;

  const runStatusUpdate = async () => {
    if (!pendingAction || acting) return;
    setActing(true);
    setActionError(null);
    const result = await updateTransportRequestStatusAction(pendingAction);
    setActing(false);
    if (!result.success) {
      setActionError(result.message || copy.actionError);
      return;
    }
    const cancelledId = pendingAction.status === "cancelled" ? pendingAction.requestId : null;
    setPendingAction(null);
    if (cancelledId) {
      setRequests((prev) => prev.filter((req) => req.id !== cancelledId));
    }
    await load();
  };

  const filters: StatusFilter[] =
    view === "sending"
      ? ["all", "pending", "confirmed", "rejected", "completed"]
      : ["all", "pending", "confirmed", "rejected", "completed", "cancelled"];

  return (
    <div className="space-y-6">
      <div className="bg-surface-card p-6 sm:p-8 rounded-3xl border border-border shadow-xs">
        <span className="text-xs font-bold text-primary uppercase tracking-wider">
          {dict.navDash.transportServiceRequests}
        </span>
        <h1 className="text-2xl sm:text-3xl font-black text-foreground mt-1">
          {view === "receiving" ? copy.receivingTitle : copy.sendingTitle}
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          {view === "receiving" ? copy.receivingSubtitle : copy.sendingSubtitle}
        </p>

        <div className="flex flex-wrap items-center gap-2 mt-6 pt-4 border-t border-border">
          {filters.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setFilter(item)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filter === item
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-surface text-foreground hover:bg-muted"
              }`}
            >
              {copy[item]}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">{copy.loading}</p>
      ) : filtered.length === 0 ? (
        <div className="bg-surface-card rounded-3xl p-12 text-center border border-border space-y-3">
          <Inbox className="w-8 h-8 text-muted-foreground mx-auto" />
          <h4 className="text-base font-bold text-foreground">
            {view === "receiving" ? copy.receivingEmpty : copy.sendingEmpty}
          </h4>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((req) => (
            <RequestCard
              key={req.id}
              request={req}
              view={view}
              locale={locale}
              onAction={(status) => {
                setActionError(null);
                setPendingAction({ requestId: req.id, status });
              }}
            />
          ))}
        </div>
      )}

      {pendingAction && confirmCopy ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={acting ? undefined : () => setPendingAction(null)}
          />
          <div
            role="dialog"
            aria-modal="true"
            className="relative w-full max-w-md bg-surface-elevated border border-border rounded-3xl p-5 space-y-4 shadow-xl"
          >
            <h3 className="text-base font-black">{confirmCopy.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{confirmCopy.message}</p>
            {actionError ? <p className="text-xs font-semibold text-destructive">{actionError}</p> : null}
            <div className="flex flex-wrap justify-end gap-2 pt-1">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setPendingAction(null)}
                disabled={acting}
              >
                {dict.common.cancel}
              </Button>
              <Button
                type="button"
                size="sm"
                variant={pendingAction.status === "rejected" || pendingAction.status === "cancelled" ? "destructive" : "primary"}
                onClick={runStatusUpdate}
                disabled={acting}
              >
                {acting ? dict.common.loading : confirmCopy.confirm}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function RequestCard({
  request,
  view,
  locale,
  onAction,
}: {
  request: TransportRequestItem;
  view: RequestView;
  locale: string;
  onAction: (status: TransportRequestStatus) => void;
}) {
  const { dict } = useI18n();
  const copy = dict.transportRequests;
  const displayStatus = transportRequestDisplayStatus(request.status);
  const dateLocale = locale === "en" ? "en-GB" : locale === "fr" ? "fr-FR" : "pt-AO";
  const vehicle = [request.vehicle_name, request.vehicle_model || request.vehicle_type]
    .filter(Boolean)
    .join(" · ");
  const priceParts: string[] = [];
  if (request.estimated_trip_price != null) {
    priceParts.push(`${formatPrice(request.estimated_trip_price, request.currency)} ${copy.perTrip}`);
  }
  if (request.estimated_load_price) {
    priceParts.push(`${formatPrice(request.estimated_load_price, request.currency)} ${copy.perLoad}`);
  }

  return (
    <div className="bg-surface-card rounded-3xl border border-border p-6 shadow-xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge status={displayStatus} />
            {request.request_source === "order_expedition" ? (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-primary/10 text-primary">
                {copy.orderExpeditionBadge}
                {request.order_number ? ` #${request.order_number}` : ""}
              </span>
            ) : null}
          </div>
          <h3 className="text-base font-bold text-foreground mt-1.5">
            {request.transport_title || dict.navDash.transport}
          </h3>
        </div>
        <div className="text-xs text-muted-foreground sm:text-right">
          {request.requested_date ? (
            <div className="flex items-center sm:justify-end gap-1 text-foreground font-semibold">
              <Calendar className="w-3.5 h-3.5 text-primary" />
              <span>
                {copy.requestedAt}: {formatDateTime(request.requested_date, dateLocale)}
              </span>
            </div>
          ) : null}
          <span className="text-[11px] block mt-0.5">
            {copy.requestDate}: {formatDateTime(request.created_at, dateLocale)}
          </span>
        </div>
      </div>

      <div className="p-4 rounded-2xl bg-surface border border-border space-y-2 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 font-bold text-foreground pb-2 border-b border-border">
          <span>
            {view === "receiving"
              ? `${copy.customer}: ${request.customer_name || "—"}`
              : `${copy.transporter}: ${request.provider_name || "—"}`}
          </span>
          {priceParts.length > 0 ? (
            <span className="text-primary font-semibold">
              {copy.price}: {priceParts.join(" · ")}
            </span>
          ) : null}
        </div>

        {request.message ? (
          <p className="text-foreground/90 leading-relaxed pt-1">"{request.message}"</p>
        ) : null}

        <div className="flex flex-col gap-1.5 text-[11px] text-muted-foreground pt-2">
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
            <span>
              {copy.origin}: {request.origin || "—"} → {copy.destination}: {request.destination || "—"}
            </span>
          </div>
          {vehicle ? (
            <div className="flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5 text-primary shrink-0" />
              <span>
                {copy.vehicle}: {vehicle}
                {request.capacity_load ? ` · ${request.capacity_load}` : ""}
              </span>
            </div>
          ) : null}
        </div>
      </div>

      {view === "receiving" && request.status === "pending" ? (
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onAction("rejected")}
            className="text-xs font-semibold text-destructive hover:bg-destructive/10"
          >
            {copy.reject}
          </Button>
          <Button variant="primary" size="sm" onClick={() => onAction("accepted")} className="gap-1 text-xs font-bold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{copy.accept}</span>
          </Button>
        </div>
      ) : null}

      {view === "receiving" && request.status === "accepted" ? (
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button variant="primary" size="sm" onClick={() => onAction("completed")} className="text-xs font-bold">
            {copy.complete}
          </Button>
        </div>
      ) : null}

      {view === "sending" && request.status === "pending" ? (
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={() => onAction("cancelled")} className="text-xs font-semibold">
            {copy.cancelRequest}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: ReturnType<typeof transportRequestDisplayStatus>;
}) {
  const { dict } = useI18n();
  const copy = dict.transportRequests;
  if (status === "confirmed") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
        {copy.confirmed}
      </span>
    );
  }
  if (status === "rejected") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300">
        <XCircle className="w-3.5 h-3.5 text-rose-600" />
        {copy.rejected}
      </span>
    );
  }
  if (status === "completed") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300">
        <CheckCircle2 className="w-3.5 h-3.5 text-sky-600" />
        {copy.completed}
      </span>
    );
  }
  if (status === "cancelled") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-muted text-muted-foreground">
        <XCircle className="w-3.5 h-3.5" />
        {copy.cancelled}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
      <Clock className="w-3.5 h-3.5 text-amber-600" />
      {copy.pending}
    </span>
  );
}
