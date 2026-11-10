"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Navbar, MobileBottomNav } from "@/components/navigation";
import { Footer } from "@/components/layout";
import { Button, SectionHeader } from "@/components/ui";
import { AgroConnectHeroBanner } from "@/components/landing/AgroConnectHeroBanner";
import { LandingEcosystemCapabilities } from "@/components/landing/LandingEcosystemCapabilities";
import { useI18n } from "@/i18n/provider";

export default function LandingPage() {
  const { dict } = useI18n();

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground transition-colors overflow-x-hidden">
      <Navbar />

      <main className="flex-1">
        {/* 1. Hero */}
        <AgroConnectHeroBanner />

        {/* 2. Capacidades do ecossistema */}
        <LandingEcosystemCapabilities />

        {/* 3. O seu painel de controlo personalizado */}
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

        {/* 4. Jornada do utilizador */}
        <section className="py-16 sm:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeader
            badgeText={dict.landing.journeyBadge}
            title={dict.landing.journeyTitle}
            subtitle={dict.landing.journeySubtitle}
            align="center"
          />

          <div className="mt-14 grid grid-cols-1 gap-8 lg:grid-cols-2">
            <article className="rounded-3xl border border-border bg-surface-card p-8 shadow-xs">
              <h3 className="text-xl font-black text-foreground">{dict.landing.vendorPathTitle}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{dict.landing.vendorPathDesc}</p>
              <ol className="mt-6 space-y-4">
                <li className="rounded-2xl border border-border p-4">
                  <p className="text-[10px] font-black uppercase tracking-wider text-primary">01</p>
                  <h4 className="mt-1 text-base font-black text-foreground">{dict.landing.vendorStep1Title}</h4>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{dict.landing.vendorStep1Desc}</p>
                  <Link href="/sign-up" className="mt-3 block">
                    <Button variant="outline" size="sm" className="h-10 w-full justify-between text-xs font-bold">
                      <span>{dict.landing.vendorStep1Cta}</span>
                      <ArrowRight className="h-3.5 w-3.5 text-primary" />
                    </Button>
                  </Link>
                </li>
                <li className="rounded-2xl border border-primary/40 bg-gradient-to-b from-secondary/40 to-surface-card p-4">
                  <p className="text-[10px] font-black uppercase tracking-wider text-primary">02</p>
                  <h4 className="mt-1 text-base font-black text-foreground">{dict.landing.vendorStep2Title}</h4>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{dict.landing.vendorStep2Desc}</p>
                  <Link href="/dashboard/whatsapp" className="mt-3 block">
                    <Button variant="primary" size="sm" className="h-10 w-full justify-between text-xs font-bold">
                      <span>{dict.landing.vendorStep2Cta}</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                </li>
                <li className="rounded-2xl border border-border p-4">
                  <p className="text-[10px] font-black uppercase tracking-wider text-primary">03</p>
                  <h4 className="mt-1 text-base font-black text-foreground">{dict.landing.vendorStep3Title}</h4>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{dict.landing.vendorStep3Desc}</p>
                  <Link href="/dashboard" className="mt-3 block">
                    <Button variant="outline" size="sm" className="h-10 w-full justify-between text-xs font-bold">
                      <span>{dict.landing.vendorStep3Cta}</span>
                      <ArrowRight className="h-3.5 w-3.5 text-primary" />
                    </Button>
                  </Link>
                </li>
              </ol>
            </article>

            <article className="rounded-3xl border border-border bg-surface-card p-8 shadow-xs">
              <h3 className="text-xl font-black text-foreground">{dict.landing.customerPathTitle}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{dict.landing.customerPathDesc}</p>
              <ul className="mt-6 space-y-4">
                <li className="rounded-2xl border border-border p-4">
                  <h4 className="text-base font-black text-foreground">{dict.navigation.agriService}</h4>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{dict.landing.customerServiceDesc}</p>
                  <Link href="/agriservice" className="mt-3 block">
                    <Button variant="outline" size="sm" className="h-10 w-full justify-between text-xs font-bold">
                      <span>{dict.landing.customerServiceCta}</span>
                      <ArrowRight className="h-3.5 w-3.5 text-primary" />
                    </Button>
                  </Link>
                </li>
                <li className="rounded-2xl border border-border p-4">
                  <h4 className="text-base font-black text-foreground">{dict.navigation.agriAcademy}</h4>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{dict.landing.customerAcademyDesc}</p>
                  <Link href="/agriacademy" className="mt-3 block">
                    <Button variant="outline" size="sm" className="h-10 w-full justify-between text-xs font-bold">
                      <span>{dict.landing.customerAcademyCta}</span>
                      <ArrowRight className="h-3.5 w-3.5 text-primary" />
                    </Button>
                  </Link>
                </li>
                <li className="rounded-2xl border border-border p-4">
                  <h4 className="text-base font-black text-foreground">{dict.navigation.agriProduct}</h4>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{dict.landing.customerProductDesc}</p>
                  <Link href="/agrishopping" className="mt-3 block">
                    <Button variant="outline" size="sm" className="h-10 w-full justify-between text-xs font-bold">
                      <span>{dict.landing.customerProductCta}</span>
                      <ArrowRight className="h-3.5 w-3.5 text-primary" />
                    </Button>
                  </Link>
                </li>
              </ul>
            </article>
          </div>
        </section>
      </main>

      <Footer />
      <MobileBottomNav variant="marketing" />
    </div>
  );
}
