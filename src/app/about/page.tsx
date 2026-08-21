"use client";

import React from "react";
import { Navbar, MobileBottomNav } from "@/components/navigation";
import { Footer } from "@/components/layout";
import { SectionHeader } from "@/components/ui";
import { useI18n } from "@/i18n/provider";
import { Target, Eye, Shield } from "lucide-react";

export default function AboutPage() {
  const { dict } = useI18n();

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground transition-colors">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20 w-full space-y-16">
        <SectionHeader
          badgeText="Nossa História & Propósito"
          title={dict.about.title}
          subtitle={dict.about.subtitle}
          align="center"
        />

        {/* Mission & Vision Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-8 rounded-3xl bg-surface-card border border-border space-y-4 shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-secondary text-secondary-foreground flex items-center justify-center">
              <Target className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-bold text-foreground">{dict.about.mission}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {dict.about.missionText}
            </p>
          </div>

          <div className="p-8 rounded-3xl bg-surface-card border border-border space-y-4 shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-secondary text-secondary-foreground flex items-center justify-center">
              <Eye className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-bold text-foreground">{dict.about.vision}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {dict.about.visionText}
            </p>
          </div>

          <div className="p-8 rounded-3xl bg-surface-card border border-border space-y-4 shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-secondary text-secondary-foreground flex items-center justify-center">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-bold text-foreground">{dict.about.values}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {dict.about.valuesText}
            </p>
          </div>
        </div>

        {/* Pillars Summary */}
        <div className="bg-surface-elevated rounded-3xl p-8 sm:p-12 border border-border space-y-8 shadow-md">
          <div className="max-w-2xl">
            <span className="text-xs font-bold text-primary uppercase tracking-wider">
              Ecossistema Integrado
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-foreground mt-1">
              Como o AGROCONNECT funciona para si
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-5 rounded-2xl bg-surface border border-border space-y-2">
              <h4 className="font-bold text-primary">1. AgriExpert</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Acesso a veterinários e agrónomos para consultoria técnica de solo, sanidade e produção.
              </p>
            </div>
            <div className="p-5 rounded-2xl bg-surface border border-border space-y-2">
              <h4 className="font-bold text-blue-500">2. AgriAcademy</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Formação profissional contínua para elevar a produtividade no campo.
              </p>
            </div>
            <div className="p-5 rounded-2xl bg-surface border border-border space-y-2">
              <h4 className="font-bold text-amber-500">3. AgriShopping</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Comércio direto de sementes, máquinas e adubos sem barreiras geográficas.
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
