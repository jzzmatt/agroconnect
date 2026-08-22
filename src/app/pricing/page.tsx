"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Navbar, MobileBottomNav } from "@/components/navigation";
import { Footer } from "@/components/layout";
import { SectionHeader, Button } from "@/components/ui";
import { Check, Lock, HelpCircle, Loader2 } from "lucide-react";
import { SUBSCRIPTION_PLANS } from "@/lib/services/pricing-service";
import { activateSubscriptionPlanAction } from "@/lib/auth/profile-actions";
import { notifySubscriptionChanged, useAuthoritativePlan } from "@/lib/subscription/use-authoritative-plan";
import { LanguageSelector } from "@/components/i18n/LanguageSelector";
import type { SubscriptionPlan } from "@/types/database";

export default function PricingPage() {
  const router = useRouter();
  const { isSignedIn } = useUser();
  const { plan: currentPlan } = useAuthoritativePlan();
  const [activating, setActivating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const plans = [
    SUBSCRIPTION_PLANS.basic,
    SUBSCRIPTION_PLANS.professional,
    SUBSCRIPTION_PLANS.business,
    SUBSCRIPTION_PLANS.enterprise,
  ];

  const handleSelectPlan = async (planId: SubscriptionPlan) => {
    if (!isSignedIn) {
      router.push("/sign-up");
      return;
    }

    setActivating(planId);
    setError(null);
    try {
      const result = await activateSubscriptionPlanAction(planId);
      if (!result.success) {
        setError(result.error || "Não foi possível atualizar o plano.");
        return;
      }
      notifySubscriptionChanged();
      router.refresh();
      router.push("/dashboard");
    } catch (err: any) {
      setError(err?.message || "Não foi possível atualizar o plano.");
    } finally {
      setActivating(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground transition-colors">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20 w-full space-y-12">
        <div className="flex justify-end">
          <LanguageSelector compact />
        </div>
        <SectionHeader
          badgeText="Planos e Assinaturas • Angola"
          title="Preços Transparentes em Kwanzas (AOA)"
          subtitle="Escolha o plano adequado às necessidades da sua exploração agrícola, consultoria ou empresa de insumos."
          align="center"
        />

        {error && (
          <div className="max-w-xl mx-auto p-3 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold text-center">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto items-stretch">
          {plans.map((plan) => {
            const isCurrent = currentPlan === plan.id;
            return (
              <div
                key={plan.id}
                className={`rounded-3xl p-6 sm:p-7 border flex flex-col justify-between relative transition-all duration-300 ${
                  plan.isPopular
                    ? "border-amber-500 bg-gradient-to-b from-amber-500/10 via-surface-card to-surface-card shadow-xl ring-2 ring-amber-500/30 scale-102"
                    : "border-border bg-surface-card shadow-xs hover:shadow-md"
                }`}
              >
                {plan.highlightBadge && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-amber-500 text-white text-[9px] font-black uppercase tracking-wider shadow-md whitespace-nowrap">
                    {plan.highlightBadge}
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <h3 className="text-xl font-black text-foreground">{plan.name}</h3>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed min-h-[36px]">
                      {plan.tagline}
                    </p>
                  </div>

                  <div className="py-3 border-y border-border">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl sm:text-4xl font-black text-foreground">{plan.priceFormatted}</span>
                      <span className="text-xs text-muted-foreground font-semibold">/{plan.period}</span>
                    </div>
                    {plan.productLimit !== null ? (
                      <span className="text-xs font-bold text-primary block mt-1.5">
                        {plan.productLimit === 0 ? "Apenas exploração e compras" : `Até ${plan.productLimit} produtos ativos`}
                      </span>
                    ) : (
                      <span className="text-xs font-bold text-amber-600 block mt-1.5">
                        Produtos sem limite definido
                      </span>
                    )}
                    <span className="text-xs font-semibold text-muted-foreground block mt-1">
                      {plan.videoStorageLimitGb === 0
                        ? "Sem armazenamento de vídeo AgriAcademy"
                        : plan.videoStorageLimitGb >= 1024
                          ? "1 TB de vídeo AgriAcademy"
                          : `${plan.videoStorageLimitGb} GB de vídeo AgriAcademy`}
                    </span>
                  </div>

                  <div className="space-y-2.5 text-xs">
                    <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block">
                      Recursos do Plano
                    </span>
                    <ul className="space-y-2.5">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-2.5 text-foreground/90">
                          <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                          <span className="text-xs leading-snug">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    {plan.lockedFeatures && (
                      <div className="pt-2 border-t border-border/60">
                        <ul className="space-y-2 opacity-60">
                          {plan.lockedFeatures.map((locked, i) => (
                            <li key={i} className="flex items-start gap-2.5 text-muted-foreground">
                              <Lock className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                              <span className="text-xs leading-snug line-through">{locked}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-6">
                  <Button
                    variant={plan.isPopular ? "primary" : "outline"}
                    size="sm"
                    disabled={activating !== null || isCurrent}
                    onClick={() => handleSelectPlan(plan.id)}
                    className={`w-full font-bold text-xs h-11 ${
                      plan.isPopular ? "bg-amber-600 hover:bg-amber-700 text-white shadow-md" : ""
                    }`}
                  >
                    {activating === plan.id ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>A ativar...</span>
                      </>
                    ) : isCurrent ? (
                      <span>Plano atual</span>
                    ) : (
                      <span>{plan.ctaText}</span>
                    )}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="bg-surface-card rounded-3xl border border-border p-6 sm:p-8 max-w-4xl mx-auto space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-secondary text-secondary-foreground flex items-center justify-center font-bold">
              <HelpCircle className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-foreground">Dúvidas sobre os limites?</h4>
              <p className="text-xs text-muted-foreground">
                O plano <strong>Profissional</strong> permite até 10 produtos ativos e 100 GB de vídeo AgriAcademy.
                O plano <strong>Business</strong> oferece produtos ilimitados e 300 GB. O plano <strong>Empresarial</strong> inclui 1 TB e o serviço de configuração personalizada de gateway de pagamento.
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
      <MobileBottomNav variant="marketing" />
    </div>
  );
}
