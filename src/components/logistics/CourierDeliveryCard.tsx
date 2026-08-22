"use client";

import React, { useState } from "react";
import { Truck, CheckCircle2, MapPin, KeyRound, ArrowRight, Clock, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { OrderDescriptor } from "@/types/domain";

interface CourierDeliveryCardProps {
  order: OrderDescriptor;
  courierId: string;
  onOpenOTPModal: (orderNumber: string, sellerId: string) => void;
  onUpdateStatus: (orderNumber: string, sellerId: string, nextStatus: any) => void;
}

export function CourierDeliveryCard({
  order,
  courierId,
  onOpenOTPModal,
  onUpdateStatus,
}: CourierDeliveryCardProps) {
  const sellerGroup = order.seller_groups[0];
  const deliveryStatus = sellerGroup?.delivery_status || "assigned";

  return (
    <div className="bg-surface-card rounded-3xl border border-border p-6 shadow-xs hover:shadow-md transition-shadow space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-primary">{order.order_number}</span>
            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
              {deliveryStatus}
            </span>
          </div>
          <h4 className="text-sm font-bold text-foreground mt-1">
            {sellerGroup?.seller_name} → {order.customer_name}
          </h4>
        </div>

        <div className="text-xs text-muted-foreground sm:text-right">
          <span className="text-base font-black text-foreground block">
            {new Intl.NumberFormat("pt-AO").format(order.total)} {order.currency}
          </span>
          <span>{order.fulfillment_method === "delivery" ? "Entrega na Fazenda" : "Ponto de Recolha"}</span>
        </div>
      </div>

      {/* Address & Items */}
      <div className="p-4 bg-surface rounded-2xl border border-border text-xs space-y-2">
        <div className="flex items-start gap-2 text-foreground font-semibold">
          <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <span>
            {order.shipping_address?.address_line || "Morada"}, {order.shipping_address?.municipality_name}, {order.shipping_address?.province_name}
          </span>
        </div>

        <div className="pt-2 border-t border-border/60 text-muted-foreground text-[11px]">
          {order.items.map((i) => (
            <span key={i.id} className="block">
              • {i.quantity}× {i.product_title} ({i.unit})
            </span>
          ))}
        </div>
      </div>

      {/* Courier Quick Action Workflow */}
      <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
        {deliveryStatus === "assigned" && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onUpdateStatus(order.order_number, sellerGroup.seller_id, "accepted")}
            className="text-xs font-bold"
          >
            Aceitar Corrida
          </Button>
        )}

        {deliveryStatus === "accepted" && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onUpdateStatus(order.order_number, sellerGroup.seller_id, "picked_up")}
            className="text-xs font-bold text-primary border-primary/40"
          >
            Confirmar Recolha no Vendedor
          </Button>
        )}

        {deliveryStatus === "picked_up" && (
          <Button
            size="sm"
            variant="primary"
            onClick={() => onUpdateStatus(order.order_number, sellerGroup.seller_id, "in_transit")}
            className="text-xs font-bold"
          >
            Iniciar Rota (Em Trânsito)
          </Button>
        )}

        {(deliveryStatus === "in_transit" || deliveryStatus === "picked_up") && (
          <Button
            size="sm"
            variant="primary"
            onClick={() => onOpenOTPModal(order.order_number, sellerGroup.seller_id)}
            className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md gap-1.5"
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Validar OTP & Entregar</span>
          </Button>
        )}

        {deliveryStatus === "delivered" && (
          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600">
            <CheckCircle2 className="w-4 h-4" />
            Entrega Concluída
          </span>
        )}
      </div>
    </div>
  );
}
