"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Package,
  Calendar,
  Clock,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Eye,
  Store,
} from "lucide-react";
import { Navbar, MobileBottomNav } from "@/components/navigation";
import { Footer } from "@/components/layout";
import { SectionHeader, EmptyState } from "@/components/ui";
import { Button } from "@/components/ui/Button";
import { getCustomerOrdersAction } from "@/lib/services/commerce-actions";
import type { OrderDescriptor } from "@/types/domain";

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderDescriptor[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getCustomerOrdersAction().then((res) => {
      setOrders(res);
      setIsLoading(false);
    });
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
      case "completed":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            {status === "paid" ? "Pago" : "Concluído"}
          </span>
        );
      case "processing":
      case "shipped":
      case "ready_for_pickup":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300">
            <Clock className="w-3.5 h-3.5" />
            Em Preparação
          </span>
        );
      case "cancelled":
      case "failed":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300">
            Cancelado
          </span>
        );
      case "pending_payment":
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
            Pagamento Pendente
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground transition-colors">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 w-full space-y-6">
        <SectionHeader
          badgeText="AgriShopping • Minhas Compras"
          title="Os Meus Pedidos"
          subtitle="Consulte o histórico de compras de sementes, fertilizantes e equipamentos agrícolas."
        />

        {orders.length > 0 ? (
          <div className="space-y-4">
            {orders.map((order) => (
              <div
                key={order.id}
                className="bg-surface-card rounded-3xl border border-border p-6 shadow-xs hover:shadow-md transition-shadow flex flex-col sm:flex-row sm:items-center justify-between gap-6"
              >
                <div className="space-y-2 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {getStatusBadge(order.status)}
                    <span className="text-xs font-mono font-bold text-primary">
                      {order.order_number}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      • {new Date(order.created_at).toLocaleDateString("pt-AO")}
                    </span>
                  </div>

                  <div className="space-y-1">
                    {order.items.map((item) => (
                      <p key={item.id} className="text-xs font-bold text-foreground">
                        {item.quantity}× {item.product_title} ({item.unit})
                      </p>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground pt-1">
                    <span>
                      Total: <strong className="text-foreground text-sm">{new Intl.NumberFormat("pt-AO").format(order.total)} {order.currency}</strong>
                    </span>
                    <span>• Modalidade: {order.fulfillment_method === "delivery" ? "Entrega" : "Recolha"}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border">
                  <Link href={`/orders/${order.order_number}`}>
                    <Button variant="primary" size="sm" className="gap-1.5 font-bold text-xs h-10 px-4">
                      <span>Ver Detalhes</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Package}
            title="Nenhum pedido efetuado"
            description="Ainda não realizou encomendas no AgriShopping."
            actionLabel="Explorar Produtos"
            onAction={() => {
              window.location.href = "/agrishopping";
            }}
          />
        )}
      </main>

      <Footer />
      <MobileBottomNav variant="marketing" />
    </div>
  );
}
