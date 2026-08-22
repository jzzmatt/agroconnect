"use client";

import React from "react";
import { CheckCircle2, Clock, Package, Truck, Store, XCircle } from "lucide-react";
import type { OrderStatus, PaymentStatus } from "@/types/database";

interface OrderTimelineProps {
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
  fulfillmentMethod: "delivery" | "pickup";
  createdAt: string;
}

export function OrderTimeline({
  orderStatus,
  paymentStatus,
  fulfillmentMethod,
  createdAt,
}: OrderTimelineProps) {
  const steps = [
    {
      key: "created",
      title: "Pedido Criado",
      desc: new Date(createdAt).toLocaleString("pt-AO"),
      isCompleted: true,
      isCurrent: orderStatus === "pending_payment" && paymentStatus !== "paid",
    },
    {
      key: "paid",
      title: "Pagamento Confirmado",
      desc: paymentStatus === "paid" ? "Liquidado com sucesso" : "A aguardar confirmação",
      isCompleted: paymentStatus === "paid" || orderStatus === "paid" || orderStatus === "processing" || orderStatus === "completed",
      isCurrent: orderStatus === "paid",
    },
    {
      key: "processing",
      title: "Em Preparação",
      desc: "Vendedor a separar os produtos",
      isCompleted: orderStatus === "processing" || orderStatus === "shipped" || orderStatus === "ready_for_pickup" || orderStatus === "completed",
      isCurrent: orderStatus === "processing",
    },
    {
      key: "fulfillment",
      title: fulfillmentMethod === "delivery" ? "Em Transporte / Expedido" : "Pronto para Recolha",
      desc: fulfillmentMethod === "delivery" ? "A caminho da fazenda" : "Disponível na loja",
      isCompleted: orderStatus === "shipped" || orderStatus === "ready_for_pickup" || orderStatus === "completed",
      isCurrent: orderStatus === "shipped" || orderStatus === "ready_for_pickup",
    },
    {
      key: "completed",
      title: "Concluído",
      desc: "Entregue ao cliente",
      isCompleted: orderStatus === "completed",
      isCurrent: orderStatus === "completed",
    },
  ];

  if (orderStatus === "cancelled") {
    return (
      <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-3xl p-6 flex items-center gap-3 text-rose-800 dark:text-rose-300">
        <XCircle className="w-6 h-6 text-rose-600 shrink-0" />
        <div>
          <h4 className="font-bold text-sm">Pedido Cancelado</h4>
          <p className="text-xs text-rose-700/80 mt-0.5">Este pedido foi cancelado e qualquer pagamento será reembolsado.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface-card rounded-3xl border border-border p-6 shadow-xs space-y-4">
      <h3 className="text-base font-bold text-foreground">Estado do Pedido</h3>

      <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-border">
        {steps.map((step, idx) => (
          <div key={step.key} className="relative flex items-start gap-3">
            <div
              className={`absolute -left-6 top-0.5 w-5 h-5 rounded-full flex items-center justify-center border-2 bg-surface-card ${
                step.isCompleted
                  ? "border-primary text-primary"
                  : step.isCurrent
                  ? "border-amber-500 text-amber-500 animate-pulse"
                  : "border-border text-muted-foreground"
              }`}
            >
              {step.isCompleted ? (
                <CheckCircle2 className="w-3.5 h-3.5 fill-primary text-white" />
              ) : (
                <div className="w-2 h-2 rounded-full bg-current" />
              )}
            </div>

            <div>
              <h4
                className={`text-xs font-bold ${
                  step.isCompleted || step.isCurrent ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {step.title}
              </h4>
              <p className="text-[11px] text-muted-foreground mt-0.5">{step.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
