"use client";

import React from "react";
import Link from "next/link";
import { Lock, Sparkles, X, ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { SUBSCRIPTION_PLANS } from "@/lib/services/pricing-service";

interface UpgradePlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  featureTitle?: string;
  requiredPlan?: "professional" | "business" | "enterprise";
  currentPlanName?: string;
}

export function UpgradePlanModal({
  isOpen,
  onClose,
  featureTitle = "Funcionalidade Restrita",
  requiredPlan = "professional",
  currentPlanName = "Básico",
}: UpgradePlanModalProps) {
  if (!isOpen) return null;

  const targetPlan = SUBSCRIPTION_PLANS[requiredPlan] || SUBSCRIPTION_PLANS.professional;

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
          <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/80 text-amber-600 flex items-center justify-center mx-auto shadow-xs">
            <Lock className="w-6 h-6" />
          </div>
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-600 block">
            Função disponível num plano superior
          </span>
          <h2 className="text-xl font-black text-foreground">
            {featureTitle}
          </h2>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Atualmente está no plano <strong className="text-foreground">{currentPlanName}</strong>. Para desbloquear a criação e publicação no AgriConnect, atualize a sua subscrição.
          </p>
        </div>

        {/* Target Plan Card */}
        <div className="p-5 rounded-2xl bg-surface border border-primary/40 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-primary" />
              <h3 className="font-bold text-sm text-foreground">Plano {targetPlan.name}</h3>
            </div>
            <div className="text-right">
              <span className="text-base font-black text-foreground">{targetPlan.priceFormatted}</span>
              <span className="text-[10px] text-muted-foreground">/{targetPlan.period}</span>
            </div>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed">
            {targetPlan.tagline}
          </p>

          <ul className="space-y-1.5 text-xs text-foreground/90 font-medium pt-2 border-t border-border">
            {targetPlan.features.slice(0, 4).map((f, i) => (
              <li key={i} className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                <span>{f}</span>
              </li>
            ))}
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
            Agora não
          </Button>
          <Link href="/pricing" className="w-full sm:w-2/3" onClick={onClose}>
            <Button
              variant="primary"
              size="sm"
              className="w-full gap-2 font-bold text-xs h-10 shadow-md"
            >
              <span>Ver Planos e Atualizar</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
