"use client";

import React from "react";
import Link from "next/link";
import { AlertCircle, ArrowRight, Check, Package, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { SUBSCRIPTION_PLANS } from "@/lib/services/pricing-service";

interface ProductLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCount?: number;
  limit?: number;
}

export function ProductLimitModal({
  isOpen,
  onClose,
  currentCount = 10,
  limit = 10,
}: ProductLimitModalProps) {
  if (!isOpen) return null;

  const businessPlan = SUBSCRIPTION_PLANS.business;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-surface-elevated w-full max-w-lg rounded-3xl border border-border shadow-2xl p-6 sm:p-7 relative flex flex-col space-y-5">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
          aria-label="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center space-y-1.5 pt-2">
          <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/80 text-rose-600 flex items-center justify-center mx-auto shadow-xs">
            <Package className="w-6 h-6" />
          </div>
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose-600 block">
            Limite de produtos atingido
          </span>
          <h2 className="text-xl font-black text-foreground">
            {currentCount} / {limit} Produtos Ativos
          </h2>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            O plano Profissional permite até <strong className="text-foreground">10 produtos ativos</strong> no AgriShopping. Para continuar a adicionar produtos sem limite, atualize para o plano Business.
          </p>
        </div>

        {/* Business Upgrade Recommendation Card */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-500/10 via-surface to-amber-500/5 border border-amber-500/40 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-amber-500 text-white shadow-2xs">
                MAIS ESCOLHIDO PARA VENDEDORES
              </span>
            </div>
            <div className="text-right">
              <span className="text-base font-black text-foreground">{businessPlan.priceFormatted}</span>
              <span className="text-[10px] text-muted-foreground">/{businessPlan.period}</span>
            </div>
          </div>

          <h3 className="font-bold text-sm text-foreground">Plano {businessPlan.name} (Ilimitado)</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Venda e gerencie os seus produtos agrícolas sem o limite de 10 produtos do plano Profissional.
          </p>

          <ul className="space-y-1.5 text-xs text-foreground/90 font-medium pt-2 border-t border-border">
            <li className="flex items-center gap-2">
              <Check className="w-3.5 h-3.5 text-primary shrink-0" />
              <span><strong>Produtos sem limite</strong> no AgriShopping</span>
            </li>
            <li className="flex items-center gap-2">
              <Check className="w-3.5 h-3.5 text-primary shrink-0" />
              <span>Gestão avançada de stock e encomendas</span>
            </li>
          </ul>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="w-full sm:w-1/3 text-xs font-semibold"
          >
            Fechar
          </Button>
          <Link href="/planos" className="w-full sm:w-2/3" onClick={onClose}>
            <Button
              variant="primary"
              size="sm"
              className="w-full gap-2 font-bold text-xs h-10 shadow-md bg-amber-600 hover:bg-amber-700 text-white"
            >
              <span>Atualizar para Business</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
