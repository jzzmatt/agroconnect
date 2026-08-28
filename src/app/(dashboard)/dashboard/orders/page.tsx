"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Package,
  CheckCircle2,
  Eye,
  Truck,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { getSellerOrdersAction, updateFulfillmentStatusAction } from "@/lib/services/commerce-actions";
import type { OrderDescriptor } from "@/types/domain";

function fulfillmentStatus(order: OrderDescriptor): string {
  return order.seller_groups[0]?.status || order.status;
}

function matchesFilter(order: OrderDescriptor, filter: string): boolean {
  if (filter === "all") return true;
  if (order.status === filter || order.payment_status === filter) return true;
  return order.seller_groups.some((group) => group.status === filter);
}

function statusLabel(status: string): string {
  switch (status) {
    case "paid":
      return "Paga";
    case "processing":
      return "Em preparação";
    case "ready_for_pickup":
      return "Pronta para recolha";
    case "shipped":
      return "Expedida";
    case "completed":
      return "Concluída";
    case "cancelled":
      return "Cancelada";
    case "pending_payment":
      return "Pagamento pendente";
    default:
      return status;
  }
}

export default function SellerOrdersDashboardPage() {
  const [orders, setOrders] = useState<OrderDescriptor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    getSellerOrdersAction()
      .then((res) => {
        setOrders(Array.isArray(res) ? res : []);
        setLoadError(null);
      })
      .catch(() => {
        setOrders([]);
        setLoadError("Não foi possível carregar as encomendas recebidas.");
      })
      .finally(() => setIsLoading(false));
  }, []);

  const handleUpdateStatus = async (
    orderNumber: string,
    sellerId: string,
    nextStatus: "processing" | "ready_for_pickup" | "shipped" | "completed"
  ) => {
    await updateFulfillmentStatusAction(orderNumber, sellerId, nextStatus);
    const updated = await getSellerOrdersAction();
    setOrders(Array.isArray(updated) ? updated : []);
  };

  const filteredOrders = orders.filter((order) => matchesFilter(order, statusFilter));

  return (
    <div className="space-y-6">
      <div className="bg-surface-card p-6 sm:p-8 rounded-3xl border border-border shadow-xs">
        <span className="text-xs font-bold text-primary uppercase tracking-wider">
          AgriShopping • Gestão de Vendas
        </span>
        <h1 className="text-2xl sm:text-3xl font-black text-foreground mt-1">
          Encomendas Recebidas
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          Gira a preparação, expedição e conclusão das encomendas efetuadas pelos compradores.
        </p>

        <div className="flex items-center gap-1 mt-6 pt-4 border-t border-border overflow-x-auto">
          {["all", "paid", "processing", "completed", "cancelled"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors capitalize cursor-pointer ${
                statusFilter === st
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-surface text-foreground hover:bg-muted"
              }`}
            >
              {st === "all"
                ? "Todas"
                : st === "paid"
                  ? "Pagas"
                  : st === "processing"
                    ? "Em Preparação"
                    : st === "completed"
                      ? "Concluídas"
                      : "Canceladas"}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <div className="bg-surface-card rounded-3xl p-12 text-center border border-border space-y-3">
            <Loader2 className="w-8 h-8 text-primary mx-auto animate-spin" />
            <p className="text-sm font-semibold text-muted-foreground">A carregar encomendas recebidas...</p>
          </div>
        ) : loadError ? (
          <div className="bg-surface-card rounded-3xl p-12 text-center border border-border space-y-3">
            <Package className="w-8 h-8 text-muted-foreground mx-auto" />
            <h4 className="text-base font-bold text-foreground">{loadError}</h4>
          </div>
        ) : filteredOrders.length > 0 ? (
          filteredOrders.map((order) => {
            const groupStatus = fulfillmentStatus(order);
            return (
              <div
                key={order.id}
                className="bg-surface-card rounded-3xl border border-border p-6 shadow-xs space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono font-bold text-primary">
                        {order.order_number}
                      </span>
                      <span className="text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded-md">
                        {order.payment_status === "paid" ? "Pago" : order.payment_status}
                      </span>
                      <span className="text-xs font-bold text-foreground bg-muted px-2 py-0.5 rounded-md">
                        Estado: {statusLabel(groupStatus)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Cliente: <strong className="text-foreground">{order.customer_name || "Cliente AgriConnect"}</strong>
                      {order.customer_phone ? ` • ${order.customer_phone}` : ""}
                    </p>
                  </div>

                  <div className="text-xs text-muted-foreground sm:text-right">
                    <span className="text-base font-black text-foreground block">
                      {new Intl.NumberFormat("pt-AO").format(order.seller_groups[0]?.total || order.total)} {order.currency}
                    </span>
                    <span className="text-[11px] block mt-0.5">
                      {new Date(order.created_at).toLocaleDateString("pt-AO")}
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

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border">
                  <div className="text-xs text-muted-foreground">
                    Fulfillment: <strong className="text-foreground">{statusLabel(groupStatus)}</strong>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link href={`/orders/${order.order_number}`}>
                      <Button variant="outline" size="sm" className="gap-1 text-xs">
                        <Eye className="w-3.5 h-3.5" />
                        <span>Ver</span>
                      </Button>
                    </Link>

                    {groupStatus !== "completed" && groupStatus !== "cancelled" && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            handleUpdateStatus(
                              order.order_number,
                              order.seller_groups[0]?.seller_id || order.items[0]?.seller_id,
                              "shipped"
                            )
                          }
                          className="text-xs font-semibold"
                        >
                          <Truck className="w-3.5 h-3.5 mr-1" />
                          <span>Expedir</span>
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() =>
                            handleUpdateStatus(
                              order.order_number,
                              order.seller_groups[0]?.seller_id || order.items[0]?.seller_id,
                              "completed"
                            )
                          }
                          className="text-xs font-bold"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                          <span>Marcar Entregue</span>
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="bg-surface-card rounded-3xl p-12 text-center border border-border space-y-3">
            <Package className="w-8 h-8 text-muted-foreground mx-auto" />
            <h4 className="text-base font-bold text-foreground">Nenhuma encomenda registada</h4>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Assim que os clientes comprarem produtos da sua loja, as encomendas aparecerão aqui.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
