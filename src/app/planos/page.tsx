"use client";

import React from "react";
import { Navbar, MobileBottomNav } from "@/components/navigation";
import { Footer } from "@/components/layout";
import { SectionHeader } from "@/components/ui";
import { PlanCatalog } from "@/components/subscription/PlanCatalog";
import { useI18n } from "@/i18n/provider";

export default function PlanosPage() {
  const { dict } = useI18n();

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground transition-colors overflow-x-hidden">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20 w-full space-y-12">
        <SectionHeader
          badgeText={dict.pricing.badge}
          title={dict.pricing.title}
          subtitle={dict.pricing.subtitle}
          align="center"
        />
        <PlanCatalog />
      </main>

      <Footer />
      <MobileBottomNav variant="marketing" />
    </div>
  );
}
