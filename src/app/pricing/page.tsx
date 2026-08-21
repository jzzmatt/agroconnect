"use client";

import React from "react";
import Link from "next/link";
import { Navbar, MobileBottomNav } from "@/components/navigation";
import { Footer } from "@/components/layout";
import { SectionHeader, Button } from "@/components/ui";
import { useI18n } from "@/i18n/provider";
import { CheckCircle2, Zap } from "lucide-react";

export default function PricingPage() {
  const { dict } = useI18n();

  const plans = [
    {
      name: dict.pricing.free.name,
      price: dict.pricing.free.price,
      period: dict.pricing.free.period,
      description: dict.pricing.free.description,
      cta: dict.pricing.free.cta,
      popular: false,
      features: [
        "Acesso para pesquisar especialistas no AgriExpert",
        "Navegação no catálogo do AgriShopping",
        "Acesso a cursos introdutórios do AgriAcademy",
        "Busca geográfica por província e município",
      ],
    },
    {
      name: dict.pricing.pro.name,
      price: dict.pricing.pro.price,
      period: dict.pricing.pro.period,
      description: dict.pricing.pro.description,
      cta: dict.pricing.pro.cta,
      popular: true,
      features: [
        "Perfil verificado de Especialista ou Instrutor",
        "Agendamento direto de consultorias técnicas",
        "Publicação de até 15 produtos no AgriShopping",
        "Destaque nos resultados do AgriLocalização",
        "Acesso completo à biblioteca do AgriAcademy",
      ],
    },
    {
      name: dict.pricing.business.name,
      price: dict.pricing.business.price,
      period: dict.pricing.business.period,
      description: dict.pricing.business.description,
      cta: dict.pricing.business.cta,
      popular: false,
      features: [
        "Gestão multi-utilizador para fazendas e empresas",
        "Catálogo ilimitado de produtos e insumos agrícolas",
        "Publicação de formações e cursos corporativos",
        "Suporte técnico prioritário dedicado",
        "Relatórios de procura e análise de mercado",
      ],
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground transition-colors">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20 w-full">
        <SectionHeader
          badgeText="Planos e Assinaturas"
          title={dict.pricing.title}
          subtitle={dict.pricing.subtitle}
          align="center"
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12 max-w-6xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-3xl p-8 border flex flex-col justify-between relative transition-all duration-300 ${
                plan.popular
                  ? "border-primary bg-linear-to-b from-secondary/80 to-surface-card shadow-xl scale-103"
                  : "border-border bg-surface-card shadow-xs hover:shadow-md"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="bg-primary text-primary-foreground text-xs font-black uppercase tracking-wider px-3.5 py-1 rounded-full shadow-sm flex items-center gap-1">
                    <Zap className="w-3 h-3 fill-white" />
                    Mais Recomendado
                  </span>
                </div>
              )}

              <div>
                <h3 className="text-xl font-bold text-foreground">{plan.name}</h3>
                <p className="text-xs text-muted-foreground mt-1 min-h-[32px]">
                  {plan.description}
                </p>

                <div className="mt-6 mb-6 flex items-baseline gap-1">
                  <span className="text-3xl sm:text-4xl font-black text-foreground">
                    {plan.price}
                  </span>
                  <span className="text-xs text-muted-foreground font-semibold">
                    {plan.period}
                  </span>
                </div>

                <div className="border-t border-border pt-6 space-y-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-primary block">
                    O que inclui:
                  </span>
                  <ul className="space-y-2.5 text-xs text-foreground font-medium">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="mt-8 pt-4">
                <Link href="/sign-up" className="block w-full">
                  <Button
                    variant={plan.popular ? "primary" : "outline"}
                    className="w-full font-bold h-11"
                  >
                    {plan.cta}
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </main>

      <Footer />
      <MobileBottomNav variant="marketing" />
    </div>
  );
}
