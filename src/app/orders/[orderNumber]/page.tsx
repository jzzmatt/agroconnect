"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Package,
  Calendar,
  Clock,
  ChevronLeft,
  MapPin,
  Store,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Truck,
} from "lucide-react";
import { Navbar, MobileBottomNav } from "@/components/navigation";
import { Footer } from "@/components/layout";
import { Button } from "@/components/ui/Button";
import { OrderTimeline } from "@/components/commerce/OrderTimeline";
import { getOrderByNumberAction, cancelOrderAction } from "@/lib/services/commerce-actions";
import type { OrderDescriptor } from "@/types/domain";

export default function OrderDetailPage() {
  const params = useParams();
  const orderNumber = params?.orderNumber as string;

  const [order, setOrder] = useState<OrderDescriptor | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    if (!orderNumber) return;
    getOrderByNumberAction(orderNumber).then((res) => {
      setOrder(res);
      setIsLoading(false);
    });
  }, [orderNumber]);

  const handleCancelOrder = async () => {
    if (!confirm("Tem a certeza que pretende cancelar este pedido?")) return;
    setIsCancelling(true);
    try {
      await cancelOrderAction(orderNumber);
      const updated = await getOrderByNumberAction(orderNumber);
      setOrder(updated);
    } catch (e: any) {
      alert(e?.message || "Erro ao cancelar pedido.");
    } finally {
      setIsCancelling(false);
    }
  };

  if (isLoading || !order) {
    return (
      <div className="min-h-screen flex flex-col bg-background text-foreground">
        <Navbar />
        <main className="flex-1 max-w-7xl mx-auto px-4 py-20 text-center">
          <p className="text-sm font-semibold text-muted-foreground">A carregar detalhes do pedido...</p>
        </main>
        <Footer />
      </div>
    );
  }

  const format = (v: number) => `${new Intl.NumberFormat("pt-AO").format(v)} ${order.currency}`;

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground transition-colors">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 w-full space-y-8">
        <div>
          <Link
            href="/orders"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors mb-3"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Voltar aos meus pedidos</span>
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-foreground">
                Pedido {order.order_number}
              </h1>
              <p className="text-xs text-muted-foreground mt-1">
                Criado em {new Date(order.created_at).toLocaleString("pt-AO")}
              </p>
            </div>

            {order.status !== "completed" && order.status !== "cancelled" && (
              <Button
                variant="outline"
                size="sm"
                disabled={isCancelling}
                onClick={handleCancelOrder}
                className="text-xs font-semibold text-destructive hover:bg-destructive/10 self-start sm:self-auto cursor-pointer"
              >
                Cancelar Pedido
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Order Items & Shipping details */}
          <div className="lg:col-span-8 space-y-6">
            {/* Products Card */}
            <div className="bg-surface-card rounded-3xl border border-border p-6 shadow-xs space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-primary">
                Produtos Encomendados
              </h3>

              <div className="divide-y divide-border">
                {order.items.map((item) => (
                  <div key={item.id} className="py-4 flex items-center justify-between gap-4 first:pt-0 last:pb-0">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-secondary/80 border border-border flex items-center justify-center">
                        <Package className="w-6 h-6 text-amber-700 dark:text-amber-300" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-foreground">{item.product_title}</h4>
                        <p className="text-xs text-muted-foreground">
                          {item.quantity} {item.unit} × {format(item.unit_price)}
                        </p>
                      </div>
                    </div>

                    <div className="text-right font-black text-sm text-foreground">
                      {format(item.subtotal)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Shipping Information Card */}
            {order.shipping_address && (
              <div className="bg-surface-card rounded-3xl border border-border p-6 shadow-xs space-y-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-primary">
                  Endereço e Destinatário
                </h3>
                <div className="text-xs text-foreground/90 space-y-1">
                  <p className="font-bold">{order.shipping_address.recipient_name}</p>
                  <p className="text-muted-foreground">Tel: {order.shipping_address.phone}</p>
                  <p className="flex items-center gap-1.5 text-primary font-semibold">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{order.shipping_address.address_line}, {order.shipping_address.municipality_name}, {order.shipping_address.province_name}</span>
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Timeline & Payment summary */}
          <div className="lg:col-span-4 space-y-6 sticky top-20">
            <OrderTimeline
              orderStatus={order.status}
              paymentStatus={order.payment_status}
              fulfillmentMethod={order.fulfillment_method}
              createdAt={order.created_at}
            />

            <div className="bg-surface-card rounded-3xl border border-border p-6 shadow-xs space-y-3">
              <h3 className="text-sm font-bold text-foreground">Resumo Financeiro</h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span className="font-bold text-foreground">{format(order.subtotal)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Taxa de Entrega</span>
                  <span className="font-bold text-emerald-600">{format(order.delivery_fee)}</span>
                </div>
                <div className="pt-2 border-t border-border flex justify-between font-black text-base text-foreground">
                  <span>Total</span>
                  <span>{format(order.total)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
      <MobileBottomNav variant="marketing" />
    </div>
  );
}
