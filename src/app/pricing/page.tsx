"use client";

import React from "react";
import Link from "next/link";
import { Navbar, MobileBottomNav } from "@/components/navigation";
import { Footer } from "@/components/layout";
import { SectionHeader, Button } from "@/components/ui";
import { Check, Lock, Sparkles, ShieldCheck, HelpCircle } from "lucide-react";
import { SUBSCRIPTION_PLANS } from "@/lib/services/pricing-service";

export default function PricingPage() {
  const plans = [
    SUBSCRIPTION_PLANS.basic,
    SUBSCRIPTION_PLANS.professional,
    SUBSCRIPTION_PLANS.business,
    SUBSCRIPTION_PLANS.enterprise,
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground transition-colors">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20 w-full space-y-12">
        <SectionHeader
          badgeText="Planos e Assinaturas • Angola"
          title="Preços Transparentes em Kwanzas (AOA)"
          subtitle="Escolha o plano adequado às necessidades da sua exploração agrícola, consultoria ou empresa de insumos."
          align="center"
        />

        {/* 4 Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto items-stretch">
          {plans.map((plan) => (
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
                <Link href="/sign-up" className="block">
                  <Button
                    variant={plan.isPopular ? "primary" : "outline"}
                    size="sm"
                    className={`w-full font-bold text-xs h-11 ${
                      plan.isPopular ? "bg-amber-600 hover:bg-amber-700 text-white shadow-md" : ""
                    }`}
                  >
                    <span>{plan.ctaText}</span>
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Comparison Notice Box */}
        <div className="bg-surface-card rounded-3xl border border-border p-6 sm:p-8 max-w-4xl mx-auto space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-secondary text-secondary-foreground flex items-center justify-center font-bold">
              <HelpCircle className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-foreground">Dúvidas sobre os limites de produtos?</h4>
              <p className="text-xs text-muted-foreground">
                O plano <strong>Profissional</strong> permite até 10 produtos ativos em simultâneo. O plano <strong>Business</strong> é recomendado para vendedores e distribuidores que necessitam de catálogo ilimitado.
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
