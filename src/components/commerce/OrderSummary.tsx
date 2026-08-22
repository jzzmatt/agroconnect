"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, ShieldCheck, Truck, Store } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface OrderSummaryProps {
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
  currency?: string;
  isCheckout?: boolean;
  onProceedToCheckout?: () => void;
  isLoading?: boolean;
}

export function OrderSummary({
  subtotal,
  deliveryFee,
  discount,
  total,
  currency = "AOA",
  isCheckout = false,
  onProceedToCheckout,
  isLoading = false,
}: OrderSummaryProps) {
  const format = (v: number) => `${new Intl.NumberFormat("pt-AO").format(v)} ${currency}`;

  return (
    <div className="bg-surface-card rounded-3xl border border-border p-6 shadow-md space-y-5">
      <h3 className="text-base font-bold text-foreground">Resumo do Pedido</h3>

      <div className="space-y-3 text-xs">
        <div className="flex items-center justify-between text-muted-foreground">
          <span>Subtotal</span>
          <span className="font-bold text-foreground">{format(subtotal)}</span>
        </div>

        <div className="flex items-center justify-between text-muted-foreground">
          <span>Taxa de Entrega / Recolha</span>
          <span className="font-bold text-emerald-600">
            {deliveryFee === 0 ? "Grátis / Ponto de Recolha" : format(deliveryFee)}
          </span>
        </div>

        {discount > 0 && (
          <div className="flex items-center justify-between text-emerald-600 font-bold">
            <span>Desconto</span>
            <span>-{format(discount)}</span>
          </div>
        )}

        <div className="pt-3 border-t border-border flex items-baseline justify-between">
          <span className="text-sm font-bold text-foreground">Total Final</span>
          <span className="text-2xl font-black text-foreground">{format(total)}</span>
        </div>
      </div>

      {!isCheckout ? (
        <Link href="/checkout" className="block">
          <Button
            variant="primary"
            size="lg"
            className="w-full justify-between font-bold h-12 shadow-md cursor-pointer"
          >
            <span>Finalizar Compra</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>
      ) : null}

      <div className="pt-2 border-t border-border flex items-center justify-center gap-2 text-[11px] font-semibold text-muted-foreground">
        <ShieldCheck className="w-4 h-4 text-primary" />
        <span>Comércio Seguro • Angola-First</span>
      </div>
    </div>
  );
}
