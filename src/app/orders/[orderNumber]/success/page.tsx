"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  CheckCircle2,
  Package,
  Calendar,
  ArrowRight,
  Truck,
  ShieldCheck,
  ShoppingBag,
} from "lucide-react";
import { Navbar, MobileBottomNav } from "@/components/navigation";
import { Footer } from "@/components/layout";
import { Button } from "@/components/ui/Button";
import { getOrderByNumberAction } from "@/lib/services/commerce-actions";
import { OrderReceiptActions } from "@/components/commerce/OrderReceiptActions";
import type { OrderDescriptor } from "@/types/domain";

export default function OrderSuccessPage() {
  const params = useParams();
  const orderNumber = params?.orderNumber as string;

  const [order, setOrder] = useState<OrderDescriptor | null>(null);

  useEffect(() => {
    if (!orderNumber) return;
    getOrderByNumberAction(orderNumber).then((res) => {
      setOrder(res);
    });
  }, [orderNumber]);

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground transition-colors">
      <Navbar />

      <main className="flex-1 max-w-3xl mx-auto px-4 py-16 text-center space-y-6">
        <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center mx-auto shadow-md animate-in zoom-in-50 duration-300">
          <CheckCircle2 className="w-12 h-12" />
        </div>

        <div>
          <span className="text-xs font-extrabold uppercase tracking-wider text-primary">
            Pagamento Confirmado • Modo de Teste
          </span>
          <h1 className="text-3xl sm:text-4xl font-black text-foreground mt-1">
            Pedido Realizado com Sucesso!
          </h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto leading-relaxed">
            O seu pedido foi recebido e os vendedores já foram notificados para iniciar a preparação dos seus produtos.
          </p>
        </div>

        {order && (
          <div className="bg-surface-card rounded-3xl border border-border p-6 shadow-sm text-left space-y-4 max-w-lg mx-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <span className="text-xs text-muted-foreground">Número do Pedido</span>
              <span className="text-sm font-mono font-bold text-primary">{order.order_number}</span>
            </div>

            <div className="flex items-center justify-between border-b border-border pb-3">
              <span className="text-xs text-muted-foreground">Total Pago</span>
              <span className="text-base font-black text-foreground">
                {new Intl.NumberFormat("pt-AO").format(order.total)} {order.currency}
              </span>
            </div>

            <div className="flex items-center justify-between border-b border-border pb-3">
              <span className="text-xs text-muted-foreground">Método</span>
              <span className="text-xs font-bold text-foreground capitalize">
                {order.fulfillment_method === "delivery" ? "Entrega na Morada" : "Ponto de Recolha"}
              </span>
            </div>

            <div className="pt-2 space-y-4">
              <OrderReceiptActions order={order} />
              <Link href={`/orders/${order.order_number}`}>
                <Button variant="primary" className="w-full justify-center font-bold h-11">
                  <span>Acompanhar Pedido</span>
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              </Link>
            </div>
          </div>
        )}

        <div className="pt-4 flex items-center justify-center gap-3">
          <Link href="/agrishopping">
            <Button variant="outline" size="sm" className="gap-1.5 font-bold text-xs">
              <ShoppingBag className="w-4 h-4" />
              <span>Continuar a Comprar</span>
            </Button>
          </Link>
        </div>
      </main>

      <Footer />
      <MobileBottomNav variant="marketing" />
    </div>
  );
}
