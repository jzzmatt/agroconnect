"use client";

import React from "react";
import Link from "next/link";
import {
  Users,
  GraduationCap,
  ShoppingBag,
  MapPin,
  ArrowRight,
} from "lucide-react";
import { Navbar, MobileBottomNav } from "@/components/navigation";
import { Footer } from "@/components/layout";
import { Button, SectionHeader } from "@/components/ui";
import { AgroConnectHeroBanner } from "@/components/landing/AgroConnectHeroBanner";
import { LandingPillarCard } from "@/components/landing/LandingPillarCard";
import { PlanCatalog } from "@/components/subscription/PlanCatalog";
import { useI18n } from "@/i18n/provider";

export default function LandingPage() {
  const { dict } = useI18n();

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground transition-colors overflow-x-hidden">
      <Navbar />

      <main className="flex-1">
        <AgroConnectHeroBanner />

        <section className="py-16 sm:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-b border-border">
          <SectionHeader
            badgeText={dict.landing.journeyBadge}
            title={dict.landing.journeyTitle}
            subtitle={dict.landing.journeySubtitle}
            align="center"
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-14 relative">
            <div className="w-full max-w-sm mx-auto md:max-w-none bg-surface-card rounded-3xl border border-border p-8 shadow-xs relative flex flex-col justify-between space-y-6 group hover:border-primary/40 transition-all text-center md:text-left">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-secondary text-secondary-foreground flex items-center justify-center font-black text-xl text-primary shadow-xs mx-auto md:mx-0">
                  01
                </div>
                <div className="space-y-1.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-primary">
                    {dict.landing.step1Label}
                  </span>
                  <h3 className="text-xl font-black text-foreground">{dict.landing.step1Title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {dict.landing.step1Desc}
                  </p>
                </div>
              </div>

              <Link href="/sign-up" className="block pt-2">
                <Button variant="outline" size="sm" className="w-full justify-between font-bold text-xs h-10">
                  <span>{dict.landing.step1Cta}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-primary" />
                </Button>
              </Link>
            </div>

            <div className="w-full max-w-sm mx-auto md:max-w-none bg-surface-card rounded-3xl border border-primary/40 bg-gradient-to-b from-secondary/40 to-surface-card p-8 shadow-sm relative flex flex-col justify-between space-y-6 group text-center md:text-left">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center font-black text-xl shadow-xs mx-auto md:mx-0">
                  02
                </div>
                <div className="space-y-1.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-primary">
                    {dict.landing.step2Label}
                  </span>
                  <h3 className="text-xl font-black text-foreground">{dict.landing.step2Title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {dict.landing.step2Desc}
                  </p>
                </div>
              </div>

              <Link href="#planos" className="block pt-2">
                <Button variant="primary" size="sm" className="w-full justify-between font-bold text-xs h-10">
                  <span>{dict.landing.step2Cta}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>

            <div className="w-full max-w-sm mx-auto md:max-w-none bg-surface-card rounded-3xl border border-border p-8 shadow-xs relative flex flex-col justify-between space-y-6 group hover:border-primary/40 transition-all text-center md:text-left">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-secondary text-secondary-foreground flex items-center justify-center font-black text-xl text-primary shadow-xs mx-auto md:mx-0">
                  03
                </div>
                <div className="space-y-1.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-primary">
                    {dict.landing.step3Label}
                  </span>
                  <h3 className="text-xl font-black text-foreground">{dict.landing.step3Title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {dict.landing.step3Desc}
                  </p>
                </div>
              </div>

              <Link href="/dashboard" className="block pt-2">
                <Button variant="outline" size="sm" className="w-full justify-between font-bold text-xs h-10">
                  <span>{dict.landing.step3Cta}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-primary" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <section className="py-16 sm:py-24 bg-surface border-b border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <SectionHeader
              badgeText={dict.landing.previewBadge}
              title={dict.landing.previewTitle}
              subtitle={dict.landing.previewSubtitle}
              align="center"
            />

            <div className="mt-12 bg-surface-card rounded-3xl border border-border shadow-xl p-6 sm:p-8 max-w-5xl mx-auto space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface p-5 sm:p-6 rounded-2xl border border-border text-center sm:text-left">
                <div className="space-y-1">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-secondary text-secondary-foreground">
                    <span>🩺</span>
                    <span>{dict.landing.previewProfile}</span>
                  </span>
                  <h3 className="text-xl font-black text-foreground">{dict.landing.previewHello}</h3>
                  <p className="text-xs text-muted-foreground">{dict.landing.previewSummary}</p>
                </div>

                <div className="flex items-center justify-center gap-2">
                  <span className="px-3 py-1.5 rounded-xl bg-surface-card border border-border text-xs font-bold text-foreground">
                    {dict.landing.previewProducts}: <strong>7 / 10</strong>
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="w-full max-w-sm mx-auto sm:max-w-none p-4 rounded-2xl bg-surface border border-border space-y-2 text-center sm:text-left">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs mx-auto sm:mx-0">
                    🩺
                  </div>
                  <h4 className="font-bold text-sm text-foreground">{dict.navigation.agriExpert}</h4>
                  <p className="text-[11px] text-muted-foreground">{dict.landing.previewExpert}</p>
                </div>

                <div className="w-full max-w-sm mx-auto sm:max-w-none p-4 rounded-2xl bg-surface border border-border space-y-2 text-center sm:text-left">
                  <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-xs mx-auto sm:mx-0">
                    🎓
                  </div>
                  <h4 className="font-bold text-sm text-foreground">{dict.navigation.agriAcademy}</h4>
                  <p className="text-[11px] text-muted-foreground">{dict.landing.previewAcademy}</p>
                </div>

                <div className="w-full max-w-sm mx-auto sm:max-w-none p-4 rounded-2xl bg-surface border border-border space-y-2 text-center sm:text-left">
                  <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs mx-auto sm:mx-0">
                    🛒
                  </div>
                  <h4 className="font-bold text-sm text-foreground">{dict.navigation.agriShopping}</h4>
                  <p className="text-[11px] text-muted-foreground">{dict.landing.previewShopping}</p>
                </div>

                <div className="w-full max-w-sm mx-auto sm:max-w-none p-4 rounded-2xl bg-surface border border-border space-y-2 text-center sm:text-left">
                  <div className="w-8 h-8 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-xs mx-auto sm:mx-0">
                    📍
                  </div>
                  <h4 className="font-bold text-sm text-foreground">{dict.navigation.agriLocalizacao}</h4>
                  <p className="text-[11px] text-muted-foreground">{dict.landing.previewLocation}</p>
                </div>
              </div>

              <div className="text-center pt-2">
                <Link href="/sign-up">
                  <Button variant="primary" className="font-bold text-xs h-10 px-8 shadow-md">
                    <span>{dict.landing.previewCta}</span>
                    <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 sm:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-b border-border">
          <SectionHeader
            badgeText={dict.landing.pillarsBadge}
            title={dict.landing.pillarsTitle}
            subtitle={dict.landing.pillarsSubtitle}
            align="center"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-12">
            <LandingPillarCard
              accent="emerald"
              title={dict.navigation.agriExpert}
              description={dict.landing.pillarExpertDesc}
              href="/agriexpert"
              linkLabel={dict.landing.seeExperts}
              icon={<Users className="h-5 w-5" />}
            />
            <LandingPillarCard
              accent="blue"
              title={dict.navigation.agriAcademy}
              description={dict.landing.pillarAcademyDesc}
              href="/agriacademy"
              linkLabel={dict.landing.seeCourses}
              icon={<GraduationCap className="h-5 w-5" />}
            />
            <LandingPillarCard
              accent="amber"
              title={dict.navigation.agriShopping}
              description={dict.landing.pillarShoppingDesc}
              href="/agrishopping"
              linkLabel={dict.landing.seeProducts}
              icon={<ShoppingBag className="h-5 w-5" />}
            />
            <LandingPillarCard
              accent="teal"
              title={dict.navigation.agriLocalizacao}
              description={dict.landing.pillarLocationDesc}
              href="/agrilocalizacao"
              linkLabel={dict.landing.seeMap}
              icon={<MapPin className="h-5 w-5" />}
            />
          </div>
        </section>

        <section id="planos" className="py-16 sm:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 scroll-mt-20">
          <SectionHeader
            badgeText={dict.landing.plansBadge}
            title={dict.landing.plansTitle}
            subtitle={dict.landing.plansSubtitle}
            align="center"
          />

          <div className="mt-14">
            <PlanCatalog embedded />
          </div>
        </section>
      </main>

      <Footer />
      <MobileBottomNav variant="marketing" />
    </div>
  );
}
