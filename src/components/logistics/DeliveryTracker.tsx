"use client";

import React from "react";
import { CheckCircle2, Clock, Truck, Store, MapPin, KeyRound, AlertTriangle } from "lucide-react";
import type { OrderTrackingEventDescriptor } from "@/types/domain";

interface DeliveryTrackerProps {
  orderNumber: string;
  deliveryStatus: string;
  fulfillmentMethod: "delivery" | "pickup";
  deliveryOtp?: string | null;
  trackingEvents: OrderTrackingEventDescriptor[];
  courierName?: string | null;
  courierPhone?: string | null;
}

export function DeliveryTracker({
  orderNumber,
  deliveryStatus,
  fulfillmentMethod,
  deliveryOtp,
  trackingEvents,
  courierName,
  courierPhone,
}: DeliveryTrackerProps) {
  const getStatusLabel = (st: string) => {
    switch (st) {
      case "not_assigned":
        return "A aguardar atribuição de transportador";
      case "assigned":
        return "Transportador atribuído";
      case "accepted":
        return "Transportador a caminho do vendedor";
      case "picked_up":
        return "Produtos recolhidos no vendedor";
      case "in_transit":
        return "Em trânsito para a morada de entrega";
      case "delivered":
        return "Entregue com sucesso";
      case "failed":
        return "Tentativa de entrega falhada";
      default:
        return st;
    }
  };

  return (
    <div className="bg-surface-card rounded-3xl border border-border p-6 shadow-xs space-y-6">
      {/* Top Delivery Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <span className="text-[10px] font-black uppercase tracking-wider text-primary block">
            Acompanhamento de Envio
          </span>
          <h3 className="text-lg font-black text-foreground mt-0.5">
            {getStatusLabel(deliveryStatus)}
          </h3>
          {courierName && (
            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5 text-primary" />
              <span>Transportador: <strong className="text-foreground">{courierName}</strong> ({courierPhone})</span>
            </p>
          )}
        </div>

        {/* Security OTP Code for Customer */}
        {deliveryOtp && deliveryStatus !== "delivered" && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 rounded-2xl border border-emerald-300 dark:border-emerald-800 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-black text-emerald-900 dark:text-emerald-200 block">
                Código de Confirmação (OTP)
              </span>
              <span className="text-lg font-mono font-black tracking-widest text-emerald-700 dark:text-emerald-300">
                {deliveryOtp}
              </span>
              <span className="text-[9px] text-emerald-800/80 dark:text-emerald-300/80 block">
                Entregue apenas ao transportador no ato de recebimento
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Audit Event Timeline */}
      <div className="space-y-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Histórico do Pedido & Rastreamento
        </h4>

        {trackingEvents.length > 0 ? (
          <div className="relative pl-6 space-y-5 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
            {trackingEvents.map((evt, idx) => (
              <div key={evt.id || idx} className="relative flex items-start gap-3">
                <div className="absolute -left-6 top-1 w-5 h-5 rounded-full flex items-center justify-center border-2 border-primary bg-surface-card text-primary">
                  <CheckCircle2 className="w-3.5 h-3.5 fill-primary text-white" />
                </div>

                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-foreground">{evt.title}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(evt.created_at).toLocaleTimeString("pt-AO", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{evt.description}</p>
                  {evt.location_name && (
                    <span className="text-[11px] text-primary font-semibold flex items-center gap-1 pt-0.5">
                      <MapPin className="w-3 h-3" />
                      {evt.location_name}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">A aguardar primeiros eventos de logística...</p>
        )}
      </div>
    </div>
  );
}
