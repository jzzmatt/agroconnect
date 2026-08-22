"use client";

import React from "react";
import Link from "next/link";
import {
  Users,
  GraduationCap,
  ShoppingBag,
  MapPin,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Sparkles,
  Store,
  Layers,
  UserPlus,
  CreditCard,
  LayoutDashboard,
  Check,
} from "lucide-react";
import { Navbar, MobileBottomNav } from "@/components/navigation";
import { Footer } from "@/components/layout";
import {
  Button,
  SectionHeader,
  Badge,
  CheckListItem,
} from "@/components/ui";
import { SUBSCRIPTION_PLANS } from "@/lib/services/pricing-service";

export default function LandingPage() {
  const plans = [
    SUBSCRIPTION_PLANS.basic,
    SUBSCRIPTION_PLANS.professional,
    SUBSCRIPTION_PLANS.business,
    SUBSCRIPTION_PLANS.enterprise,
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground transition-colors">
      <Navbar />

      <main className="flex-1">
        {/* ======================================================== */}
        {/* 1. HERO SECTION (Conversion & Flow Oriented)              */}
        {/* ======================================================== */}
        <section className="relative overflow-hidden bg-gradient-to-b from-secondary/60 via-background to-background py-16 sm:py-24 lg:py-28 border-b border-border">
          <div className="absolute inset-0 opacity-15 bg-[radial-gradient(var(--color-primary)_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-secondary text-secondary-foreground text-xs sm:text-sm font-bold border border-border-subtle shadow-2xs">
                <span>✨ Todo o ecossistema agrícola de Angola num só lugar</span>
              </div>

              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-foreground tracking-tight leading-[1.1]">
                Conecte. Aprenda. Compre. Venda e Prospere no Campo.
              </h1>

              <p className="text-sm sm:text-lg lg:text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto">
                Descubra especialistas certificados, aceda a formações práticas, compre sementes e equipamentos ou venda os seus produtos com localização em Angola.
              </p>

              {/* Primary Guided CTAs */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-2">
                <Link href="/sign-up" className="w-full sm:w-auto">
                  <Button
                    variant="primary"
                    size="lg"
                    className="w-full sm:w-auto gap-2 font-black shadow-lg h-12 px-8 text-sm"
                  >
                    <span>Começar agora</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>

                <Link href="#planos" className="w-full sm:w-auto">
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full sm:w-auto gap-2 font-bold h-12 px-8 shadow-2xs text-sm"
                  >
                    <CreditCard className="w-4 h-4 text-primary" />
                    <span>Ver Planos e Preços</span>
                  </Button>
                </Link>
              </div>

              {/* Trust Indicators Pill Row */}
              <div className="pt-6 flex flex-wrap items-center justify-center gap-6 text-xs font-semibold text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-primary" />
                  <span className="text-foreground">Profissionais Certificados</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-primary" />
                  <span className="text-foreground">18 Províncias de Angola</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  <span className="text-foreground">Comércio Direto & Seguro</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ======================================================== */}
        {/* 2. THREE-STEP GUIDED JOURNEY (Visual Flow)               */}
        {/* ======================================================== */}
        <section className="py-16 sm:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-b border-border">
          <SectionHeader
            badgeText="Jornada do Utilizador"
            title="Como Funciona o AgriConnect"
            subtitle="Três passos simples para desbloquear todas as ferramentas do ecossistema agropecuário nacional."
            align="center"
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-14 relative">
            {/* Step 1 */}
            <div className="bg-surface-card rounded-3xl border border-border p-8 shadow-xs relative flex flex-col justify-between space-y-6 group hover:border-primary/40 transition-all">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-secondary text-secondary-foreground flex items-center justify-center font-black text-xl text-primary shadow-xs">
                  01
                </div>
                <div className="space-y-1.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-primary">
                    Passo 1 • Registo Rápido
                  </span>
                  <h3 className="text-xl font-black text-foreground">Criar a sua conta</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Comece gratuitamente e crie o seu perfil no AgriConnect com telefone de Angola e identificação clara.
                  </p>
                </div>
              </div>

              <Link href="/sign-up" className="block pt-2">
                <Button variant="outline" size="sm" className="w-full justify-between font-bold text-xs h-10">
                  <span>Criar conta gratuita</span>
                  <ArrowRight className="w-3.5 h-3.5 text-primary" />
                </Button>
              </Link>
            </div>

            {/* Step 2 */}
            <div className="bg-surface-card rounded-3xl border border-primary/40 bg-gradient-to-b from-secondary/40 to-surface-card p-8 shadow-sm relative flex flex-col justify-between space-y-6 group">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center font-black text-xl shadow-xs">
                  02
                </div>
                <div className="space-y-1.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-primary">
                    Passo 2 • Subscrição
                  </span>
                  <h3 className="text-xl font-black text-foreground">Escolher o plano ideal</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Escolha o nível de acesso adequado às suas necessidades (Básico 0 Kz, Profissional 15.000 Kz ou Business 30.000 Kz).
                  </p>
                </div>
              </div>

              <Link href="#planos" className="block pt-2">
                <Button variant="primary" size="sm" className="w-full justify-between font-bold text-xs h-10">
                  <span>Ver planos e preços</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>

            {/* Step 3 */}
            <div className="bg-surface-card rounded-3xl border border-border p-8 shadow-xs relative flex flex-col justify-between space-y-6 group hover:border-primary/40 transition-all">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-secondary text-secondary-foreground flex items-center justify-center font-black text-xl text-primary shadow-xs">
                  03
                </div>
                <div className="space-y-1.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-primary">
                    Passo 3 • Acesso Total
                  </span>
                  <h3 className="text-xl font-black text-foreground">Começar a utilizar</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Aceda ao seu dashboard personalizado e utilize as ferramentas, produtos e formações disponíveis no seu plano.
                  </p>
                </div>
              </div>

              <Link href="/dashboard" className="block pt-2">
                <Button variant="outline" size="sm" className="w-full justify-between font-bold text-xs h-10">
                  <span>Explorar o painel</span>
                  <ArrowRight className="w-3.5 h-3.5 text-primary" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* ======================================================== */}
        {/* 3. SUBSCRIPTION PLANS SECTION (Exact 4 Plans)            */}
        {/* ======================================================== */}
        <section id="planos" className="py-16 sm:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-b border-border scroll-mt-20">
          <SectionHeader
            badgeText="Planos e Subscrições"
            title="Escolha o Plano Ideal para o Seu Negócio"
            subtitle="Planos transparentes em Kwanzas (AOA) com recursos dimensionados para estudantes, profissionais e empresas."
            align="center"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-14">
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
                    <h3 className="text-lg font-black text-foreground">{plan.name}</h3>
                    <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed min-h-[32px]">
                      {plan.tagline}
                    </p>
                  </div>

                  <div className="py-2 border-y border-border">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-black text-foreground">{plan.priceFormatted}</span>
                      <span className="text-xs text-muted-foreground font-semibold">/{plan.period}</span>
                    </div>
                    {plan.productLimit !== null ? (
                      <span className="text-[10px] font-bold text-primary block mt-1">
                        {plan.productLimit === 0 ? "Apenas navegação e compra" : `Até ${plan.productLimit} produtos ativos`}
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-amber-600 block mt-1">
                        Produtos sem limite definido
                      </span>
                    )}
                  </div>

                  <div className="space-y-2 text-xs">
                    <span className="text-[10px] font-black uppercase text-muted-foreground block">
                      Recursos Incluídos
                    </span>
                    <ul className="space-y-2">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-2 text-foreground/90">
                          <Check className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                          <span className="text-[11px] leading-snug">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    {plan.lockedFeatures && (
                      <div className="pt-2 border-t border-border/60">
                        <ul className="space-y-1.5 opacity-60">
                          {plan.lockedFeatures.map((locked, i) => (
                            <li key={i} className="flex items-start gap-2 text-muted-foreground">
                              <Lock className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                              <span className="text-[11px] leading-snug line-through">{locked}</span>
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
                      className={`w-full font-bold text-xs h-10 ${
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
        </section>

        {/* ======================================================== */}
        {/* 4. DASHBOARD PREVIEW SECTION (What you get)              */}
        {/* ======================================================== */}
        <section className="py-16 sm:py-24 bg-surface border-b border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <SectionHeader
              badgeText="Experiência de Trabalho"
              title="O Seu Painel de Controlo Personalizado"
              subtitle="Após criar a conta e escolher o plano, este é o centro de comando onde gere as suas atividades no campo."
              align="center"
            />

            <div className="mt-12 bg-surface-card rounded-3xl border border-border shadow-xl p-6 sm:p-8 max-w-5xl mx-auto space-y-6">
              {/* Mock Dashboard Hero Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface p-5 sm:p-6 rounded-2xl border border-border">
                <div className="space-y-1">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-secondary text-secondary-foreground">
                    <span>🩺</span>
                    <span>Perfil ativo: Veterinário • Plano Profissional (15.000 Kz/mês)</span>
                  </span>
                  <h3 className="text-xl font-black text-foreground">Olá, Dr. Mateus 👋</h3>
                  <p className="text-xs text-muted-foreground">Aqui está o resumo da sua atividade profissional no ecossistema.</p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-3 py-1.5 rounded-xl bg-surface-card border border-border text-xs font-bold text-foreground">
                    Produtos: <strong>7 / 10</strong>
                  </span>
                </div>
              </div>

              {/* Mock Module Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-surface border border-border space-y-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                    🩺
                  </div>
                  <h4 className="font-bold text-sm text-foreground">AgriExpert</h4>
                  <p className="text-[11px] text-muted-foreground">Consultorias veterinárias e agronómicas.</p>
                </div>

                <div className="p-4 rounded-2xl bg-surface border border-border space-y-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-xs">
                    🎓
                  </div>
                  <h4 className="font-bold text-sm text-foreground">AgriAcademy</h4>
                  <p className="text-[11px] text-muted-foreground">Cursos técnicos e formações práticas.</p>
                </div>

                <div className="p-4 rounded-2xl bg-surface border border-border space-y-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs">
                    🛒
                  </div>
                  <h4 className="font-bold text-sm text-foreground">AgriShopping</h4>
                  <p className="text-[11px] text-muted-foreground">Venda de sementes, adubos e alfaias.</p>
                </div>

                <div className="p-4 rounded-2xl bg-surface border border-border space-y-2">
                  <div className="w-8 h-8 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-xs">
                    📍
                  </div>
                  <h4 className="font-bold text-sm text-foreground">AgriLocalização</h4>
                  <p className="text-[11px] text-muted-foreground">Descoberta geográfica nas 18 províncias.</p>
                </div>
              </div>

              <div className="text-center pt-2">
                <Link href="/sign-up">
                  <Button variant="primary" className="font-bold text-xs h-10 px-8 shadow-md">
                    <span>Criar Conta e Aceder ao Painel</span>
                    <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ======================================================== */}
        {/* 5. ECOSYSTEM PILLARS (Detailed Features)                  */}
        {/* ======================================================== */}
        <section className="py-16 sm:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeader
            badgeText="Capacidades do Ecossistema"
            title="4 Pilares Integrados para o Agro em Angola"
            subtitle="Uma solução completa construída com base na realidade rural e comercial das 18 províncias de Angola."
            align="center"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-12">
            {/* Pillar 1 */}
            <div className="bg-surface-card rounded-3xl border border-border p-6 shadow-xs space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 flex items-center justify-center font-bold">
                <Users className="w-5 h-5 text-emerald-600" />
              </div>
              <h3 className="font-bold text-base text-foreground">AgriExpert</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Encontre agrónomos, veterinários e técnicos credenciados para consultoria presencial e remota.
              </p>
              <Link href="/services" className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline pt-1">
                <span>Ver especialistas</span> →
              </Link>
            </div>

            {/* Pillar 2 */}
            <div className="bg-surface-card rounded-3xl border border-border p-6 shadow-xs space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 flex items-center justify-center font-bold">
                <GraduationCap className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="font-bold text-base text-foreground">AgriAcademy</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Cursos práticos e masterclasses focadas em culturas de milho, soja, pecuária e gestão agrícola.
              </p>
              <Link href="/agriacademy" className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:underline pt-1">
                <span>Ver cursos</span> →
              </Link>
            </div>

            {/* Pillar 3 */}
            <div className="bg-surface-card rounded-3xl border border-border p-6 shadow-xs space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 flex items-center justify-center font-bold">
                <ShoppingBag className="w-5 h-5 text-amber-600" />
              </div>
              <h3 className="font-bold text-base text-foreground">AgriShopping</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Compre e venda sementes certificadas, adubos e sistemas de irrigação com entrega garantida.
              </p>
              <Link href="/agrishopping" className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 hover:underline pt-1">
                <span>Ver produtos</span> →
              </Link>
            </div>

            {/* Pillar 4 */}
            <div className="bg-surface-card rounded-3xl border border-border p-6 shadow-xs space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 flex items-center justify-center font-bold">
                <MapPin className="w-5 h-5 text-teal-600" />
              </div>
              <h3 className="font-bold text-base text-foreground">AgriLocalização</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Motor geoespacial alimentado por PostGIS e MapQuest para descobrir recursos perto de si.
              </p>
              <Link href="/agrilocalizacao" className="inline-flex items-center gap-1 text-xs font-bold text-teal-600 hover:underline pt-1">
                <span>Explorar mapa</span> →
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
      <MobileBottomNav variant="marketing" />
    </div>
  );
}
