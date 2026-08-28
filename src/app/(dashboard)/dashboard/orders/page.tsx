"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Clock,
  Eye,
  Loader2,
  MapPin,
  Package,
  Truck,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { TransportSelectorModal } from "@/components/transport/TransportSelectorModal";
import { getSellerOrdersAction, updateFulfillmentStatusAction } from "@/lib/services/commerce-actions";
import { canSellerExpedirGroup } from "@/lib/transport/order-expedition";
import { useI18n } from "@/i18n/provider";
import type { OrderDescriptor, OrderSellerGroupDescriptor, OrderTransportStatus } from "@/types/commerce";

function fulfillmentStatus(order: OrderDescriptor): string {
  return order.seller_groups[0]?.status || order.status;
}

function matchesFilter(order: OrderDescriptor, filter: string): boolean {
  if (filter === "all") return true;
  if (order.status === filter || order.payment_status === filter) return true;
  return order.seller_groups.some((group) => group.status === filter);
}

export default function SellerOrdersDashboardPage() {
  const { dict, locale } = useI18n();
  const copy = dict.dashboardOrders;
  const [orders, setOrders] = useState<OrderDescriptor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [expediteTarget, setExpediteTarget] = useState<{
    order: OrderDescriptor;
    sellerGroup: OrderSellerGroupDescriptor;
  } | null>(null);

  const reloadOrders = useCallback(async () => {
    const updated = await getSellerOrdersAction();
    setOrders(Array.isArray(updated) ? updated : []);
  }, []);

  useEffect(() => {
    getSellerOrdersAction()
      .then((res) => {
        setOrders(Array.isArray(res) ? res : []);
        setLoadError(null);
      })
      .catch(() => {
        setOrders([]);
        setLoadError(copy.loadError);
      })
      .finally(() => setIsLoading(false));
  }, [copy.loadError]);

  const handleMarkDelivered = async (order: OrderDescriptor) => {
    const sellerId = order.seller_groups[0]?.seller_id || order.items[0]?.seller_id;
    if (!sellerId) return;
    await updateFulfillmentStatusAction(order.order_number, sellerId, "completed");
    await reloadOrders();
  };

  const filteredOrders = orders.filter((order) => matchesFilter(order, statusFilter));
  const dateLocale = locale === "en" ? "en-GB" : locale === "fr" ? "fr-FR" : "pt-AO";

  const statusLabel = (status: string): string => {
    switch (status) {
      case "paid":
        return copy.statusPaid;
      case "processing":
        return copy.statusProcessing;
      case "ready_for_pickup":
        return copy.statusReadyForPickup;
      case "shipped":
        return copy.statusShipped;
      case "completed":
        return copy.statusCompleted;
      case "cancelled":
        return copy.statusCancelled;
      case "pending_payment":
        return copy.statusPendingPayment;
      default:
        return status;
    }
  };

  const filterLabel = (st: string): string => {
    if (st === "all") return copy.all;
    if (st === "paid") return copy.paid;
    if (st === "processing") return copy.processing;
    if (st === "completed") return copy.completed;
    return copy.cancelled;
  };

  return (
    <div className="space-y-6">
      <div className="bg-surface-card p-6 sm:p-8 rounded-3xl border border-border shadow-xs">
        <span className="text-xs font-bold text-primary uppercase tracking-wider">{copy.eyebrow}</span>
        <h1 className="text-2xl sm:text-3xl font-black text-foreground mt-1">{copy.title}</h1>
        <p className="text-xs text-muted-foreground mt-1">{copy.subtitle}</p>

        <div className="flex items-center gap-1 mt-6 pt-4 border-t border-border overflow-x-auto">
          {["all", "paid", "processing", "completed", "cancelled"].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors capitalize cursor-pointer ${
                statusFilter === st
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-surface text-foreground hover:bg-muted"
              }`}
            >
              {filterLabel(st)}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <div className="bg-surface-card rounded-3xl p-12 text-center border border-border space-y-3">
            <Loader2 className="w-8 h-8 text-primary mx-auto animate-spin" />
            <p className="text-sm font-semibold text-muted-foreground">{copy.loading}</p>
          </div>
        ) : loadError ? (
          <div className="bg-surface-card rounded-3xl p-12 text-center border border-border space-y-3">
            <Package className="w-8 h-8 text-muted-foreground mx-auto" />
            <h4 className="text-base font-bold text-foreground">{loadError}</h4>
          </div>
        ) : filteredOrders.length > 0 ? (
          filteredOrders.map((order) => {
            const group = order.seller_groups[0];
            const groupStatus = fulfillmentStatus(order);
            const canExpedir = group
              ? canSellerExpedirGroup({
                  orderStatus: order.status,
                  groupStatus: group.status,
                  transportStatus: group.transport_status,
                })
              : false;
            const showFulfillmentActions = groupStatus !== "completed" && groupStatus !== "cancelled";

            return (
              <div
                key={order.id}
                className="bg-surface-card rounded-3xl border border-border p-6 shadow-xs space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono font-bold text-primary">{order.order_number}</span>
                      <span className="text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded-md">
                        {order.payment_status === "paid" ? copy.paidBadge : order.payment_status}
                      </span>
                      <span className="text-xs font-bold text-foreground bg-muted px-2 py-0.5 rounded-md">
                        {copy.state}: {statusLabel(groupStatus)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {copy.customer}:{" "}
                      <strong className="text-foreground">{order.customer_name || copy.defaultCustomer}</strong>
                      {order.customer_phone ? ` • ${order.customer_phone}` : ""}
                    </p>
                  </div>

                  <div className="text-xs text-muted-foreground sm:text-right">
                    <span className="text-base font-black text-foreground block">
                      {new Intl.NumberFormat("pt-AO").format(order.seller_groups[0]?.total || order.total)}{" "}
                      {order.currency}
                    </span>
                    <span className="text-[11px] block mt-0.5">
                      {new Date(order.created_at).toLocaleDateString(dateLocale)}
                    </span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-surface border border-border divide-y divide-border">
                  {order.items.map((item) => (
                    <div key={item.id} className="py-2.5 flex items-center justify-between gap-2 first:pt-0 last:pb-0">
                      <span className="text-xs font-bold text-foreground">
                        {item.quantity}× {item.product_title} ({item.unit})
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Intl.NumberFormat("pt-AO").format(item.subtotal)} {item.currency}
                      </span>
                    </div>
                  ))}
                </div>

                {group ? <OrderTransportStatusBlock group={group} /> : null}

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border">
                  <div className="text-xs text-muted-foreground">
                    {copy.fulfillment}: <strong className="text-foreground">{statusLabel(groupStatus)}</strong>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link href={`/orders/${order.order_number}`}>
                      <Button variant="outline" size="sm" className="gap-1 text-xs">
                        <Eye className="w-3.5 h-3.5" />
                        <span>{copy.view}</span>
                      </Button>
                    </Link>

                    {showFulfillmentActions ? (
                      <>
                        {canExpedir && group ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setExpediteTarget({ order, sellerGroup: group })}
                            className="text-xs font-semibold"
                          >
                            <Truck className="w-3.5 h-3.5 mr-1" />
                            <span>{copy.expedite}</span>
                          </Button>
                        ) : null}
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleMarkDelivered(order)}
                          className="text-xs font-bold"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                          <span>{copy.markDelivered}</span>
                        </Button>
                      </>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="bg-surface-card rounded-3xl p-12 text-center border border-border space-y-3">
            <Package className="w-8 h-8 text-muted-foreground mx-auto" />
            <h4 className="text-base font-bold text-foreground">{copy.emptyTitle}</h4>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">{copy.emptyBody}</p>
          </div>
        )}
      </div>

      {expediteTarget ? (
        <TransportSelectorModal
          open
          order={expediteTarget.order}
          sellerGroup={expediteTarget.sellerGroup}
          onClose={() => setExpediteTarget(null)}
          onSubmitted={() => {
            void reloadOrders();
          }}
        />
      ) : null}
    </div>
  );
}

function OrderTransportStatusBlock({ group }: { group: OrderSellerGroupDescriptor }) {
  const { dict } = useI18n();
  const copy = dict.dashboardOrders;
  const status = group.transport_status;
  if (!status) return null;

  const routeLabel = [group.transport_origin, group.transport_destination].filter(Boolean).join(" → ");

  return (
    <div className="rounded-2xl border border-border bg-surface px-4 py-3 space-y-1.5">
      <div className="flex items-center gap-2 text-xs font-bold text-foreground">
        <Truck className="w-4 h-4 text-primary shrink-0" />
        <span>{copy.transport}</span>
        <TransportStatusBadge status={status} />
      </div>
      {group.transport_provider_name ? (
        <p className="text-[11px] text-muted-foreground">
          {copy.transporter}: <strong className="text-foreground">{group.transport_provider_name}</strong>
        </p>
      ) : null}
      {routeLabel ? (
        <p className="text-[11px] text-muted-foreground flex items-center gap-1">
          <MapPin className="w-3.5 h-3.5 text-primary" />
          {copy.route}: {routeLabel}
        </p>
      ) : null}
      {status === "rejected" ? (
        <p className="text-[11px] font-semibold text-muted-foreground">{copy.selectAnotherTransport}</p>
      ) : null}
    </div>
  );
}

function TransportStatusBadge({ status }: { status: OrderTransportStatus }) {
  const { dict } = useI18n();
  const copy = dict.dashboardOrders;
  if (status === "accepted") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
        <CheckCircle2 className="w-3 h-3" />
        {copy.transportAccepted}
      </span>
    );
  }
  if (status === "rejected") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300">
        <XCircle className="w-3 h-3" />
        {copy.transportRejected}
      </span>
    );
  }
  if (status === "completed") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300">
        <CheckCircle2 className="w-3 h-3" />
        {copy.transportCompleted}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
      <Clock className="w-3 h-3" />
      {copy.waitingTransportAcceptance}
    </span>
  );
}
