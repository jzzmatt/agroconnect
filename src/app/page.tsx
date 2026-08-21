"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Users,
  GraduationCap,
  ShoppingBag,
  MapPin,
  LayoutDashboard,
  ArrowRight,
  ShieldCheck,
  Check,
  CheckCircle2,
  Sparkles,
  Calendar,
  CreditCard,
  Award,
  Video,
  Truck,
  Store,
  Compass,
  MessageSquare,
  History,
  Bell,
  TrendingUp,
} from "lucide-react";
import { Navbar, MobileBottomNav } from "@/components/navigation";
import { Footer } from "@/components/layout";
import {
  Button,
  SectionHeader,
  Badge,
  CheckListItem,
} from "@/components/ui";
import { useI18n } from "@/i18n/provider";

export default function LandingPage() {
  const { dict } = useI18n();

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />

      <main className="flex-1">
        {/* ======================================================== */}
        {/* 1. HERO SECTION (Desktop & Mobile)                        */}
        {/* ======================================================== */}
        <section className="relative overflow-hidden bg-linear-to-b from-emerald-50/70 via-white to-white py-16 sm:py-24 lg:py-28 border-b border-emerald-900/5">
          {/* Subtle background mesh grid */}
          <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#0E6B38_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto space-y-6">
              {/* Figma Tag Badge: "✨ O Futuro da Agricultura em Angola" */}
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-100 text-emerald-900 text-xs sm:text-sm font-bold border border-emerald-200 shadow-2xs">
                <span>{dict.landing.heroTag}</span>
              </div>

              {/* Figma Main Headline: "Conecte. Aprenda. Cresça. Prospere na Agricultura." */}
              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-emerald-950 tracking-tight leading-[1.1]">
                {dict.landing.heroTitle}
              </h1>

              {/* Supporting description */}
              <p className="text-sm sm:text-lg lg:text-xl text-emerald-800/80 leading-relaxed max-w-2xl mx-auto">
                {dict.landing.heroSubtitle}
              </p>

              {/* Primary & Secondary CTAs */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <Link href="/agriexpert" className="w-full sm:w-auto">
                  <Button
                    variant="primary"
                    size="lg"
                    className="w-full sm:w-auto gap-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold shadow-md h-12 px-8"
                  >
                    <span>{dict.landing.ctaPrimary}</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>

                <Link href="/agriacademy" className="w-full sm:w-auto">
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full sm:w-auto gap-2 border-emerald-300 text-emerald-900 font-bold bg-white/80 h-12 px-8 hover:bg-emerald-50 shadow-2xs"
                  >
                    <GraduationCap className="w-4 h-4 text-emerald-700" />
                    <span>{dict.landing.ctaSecondary}</span>
                  </Button>
                </Link>
              </div>

              {/* Trust Indicators Pill Row */}
              <div className="pt-6 flex flex-wrap items-center justify-center gap-6 text-xs font-semibold text-emerald-800/80">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Profissionais Certificados</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-emerald-600" />
                  <span>18 Províncias de Angola</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Acesso Direto ao Mercado</span>
                </div>
              </div>
            </div>

            {/* ======================================================== */}
            {/* 2. STATS SECTION (Figma: 500+, 1,200+, 5,000+, 10K+)      */}
            {/* ======================================================== */}
            <div className="mt-14 sm:mt-18 grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 bg-white p-6 sm:p-8 rounded-3xl border border-emerald-900/10 shadow-sm max-w-5xl mx-auto">
              {/* Stat 1 */}
              <div className="text-center p-2">
                <div className="text-3xl sm:text-4xl lg:text-5xl font-black text-emerald-950">
                  {dict.landing.stats.expertsValue}
                </div>
                <div className="text-xs sm:text-sm font-semibold text-emerald-700 mt-1">
                  {dict.landing.stats.experts}
                </div>
              </div>

              {/* Stat 2 */}
              <div className="text-center p-2 border-l border-emerald-100">
                <div className="text-3xl sm:text-4xl lg:text-5xl font-black text-emerald-950">
                  {dict.landing.stats.coursesValue}
                </div>
                <div className="text-xs sm:text-sm font-semibold text-emerald-700 mt-1">
                  {dict.landing.stats.courses}
                </div>
              </div>

              {/* Stat 3 */}
              <div className="text-center p-2 border-l border-emerald-100">
                <div className="text-3xl sm:text-4xl lg:text-5xl font-black text-emerald-950">
                  {dict.landing.stats.productsValue}
                </div>
                <div className="text-xs sm:text-sm font-semibold text-emerald-700 mt-1">
                  {dict.landing.stats.products}
                </div>
              </div>

              {/* Stat 4 */}
              <div className="text-center p-2 border-l border-emerald-100">
                <div className="text-3xl sm:text-4xl lg:text-5xl font-black text-emerald-950">
                  {dict.landing.stats.usersValue}
                </div>
                <div className="text-xs sm:text-sm font-semibold text-emerald-700 mt-1">
                  {dict.landing.stats.users}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ======================================================== */}
        {/* 3. NOSSAS SOLUÇÕES (5 Figma Solution Cards)              */}
        {/* ======================================================== */}
        <section className="py-16 sm:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeader
            badgeText={dict.landing.solutionsBadge}
            title={dict.landing.solutionsTitle}
            subtitle={dict.landing.solutionsSubtitle}
            align="center"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-12">
            {/* Card 1: AgriExpert */}
            <div className="bg-white rounded-3xl border border-emerald-900/10 p-7 shadow-xs hover:shadow-lg transition-all duration-300 flex flex-col justify-between group">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center mb-5 group-hover:bg-emerald-700 group-hover:text-white transition-colors">
                  <Users className="w-6 h-6" />
                </div>
                <Badge variant="pillarExpert" className="mb-2.5">
                  Solução 1
                </Badge>
                <h3 className="text-xl font-bold text-emerald-950 mb-2">
                  AgriExpert
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                  Conecte-se com especialistas agrícolas, agrónomos e médicos veterinários para impulsionar a sua produção.
                </p>

                <ul className="space-y-2 border-t border-emerald-100 pt-4 text-xs font-medium text-emerald-900">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Peritos e técnicos certificados</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Consultoria técnica direta</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Agendamentos flexíveis</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Avaliações e classificações</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Pagamentos e transações seguras</span>
                  </li>
                </ul>
              </div>

              <div className="mt-6 pt-2">
                <Link href="/agriexpert" className="w-full block">
                  <Button variant="primary" className="w-full justify-between bg-emerald-700 hover:bg-emerald-800">
                    <span>Ver Especialistas</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </div>

            {/* Card 2: AgriAcademy */}
            <div className="bg-white rounded-3xl border border-blue-900/10 p-7 shadow-xs hover:shadow-lg transition-all duration-300 flex flex-col justify-between group">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-800 flex items-center justify-center mb-5 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <Badge variant="pillarAcademy" className="mb-2.5">
                  Solução 2
                </Badge>
                <h3 className="text-xl font-bold text-emerald-950 mb-2">
                  AgriAcademy
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                  Cursos e formações práticas para capacitar produtores e profissionais com o conhecimento técnico essencial.
                </p>

                <ul className="space-y-2 border-t border-emerald-100 pt-4 text-xs font-medium text-emerald-900">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>Formação online & presencial</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>Tutores e instrutores qualificados</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>Aulas práticas interativas</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>Certificados reconhecidos</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>Apoio contínuo à aprendizagem</span>
                  </li>
                </ul>
              </div>

              <div className="mt-6 pt-2">
                <Link href="/agriacademy" className="w-full block">
                  <Button variant="outline" className="w-full justify-between border-blue-200 text-blue-900 hover:bg-blue-50">
                    <span>Explorar Cursos</span>
                    <ArrowRight className="w-4 h-4 text-blue-700" />
                  </Button>
                </Link>
              </div>
            </div>

            {/* Card 3: AgriShopping */}
            <div className="bg-white rounded-3xl border border-amber-900/10 p-7 shadow-xs hover:shadow-lg transition-all duration-300 flex flex-col justify-between group">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mb-5 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                  <ShoppingBag className="w-6 h-6" />
                </div>
                <Badge variant="pillarShopping" className="mb-2.5">
                  Solução 3
                </Badge>
                <h3 className="text-xl font-bold text-emerald-950 mb-2">
                  AgriShopping
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                  Mercado digital de equipamentos, insumos, sementes e fertilizantes com entrega local garantida.
                </p>

                <ul className="space-y-2 border-t border-emerald-100 pt-4 text-xs font-medium text-emerald-900">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>Sementes e fertilizantes de qualidade</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>Equipamentos e alfaias agrícolas</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>Lojas e fornecedores locais</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>Logística e entregas locais</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>Insumos agropecuários completos</span>
                  </li>
                </ul>
              </div>

              <div className="mt-6 pt-2">
                <Link href="/agrishopping" className="w-full block">
                  <Button variant="outline" className="w-full justify-between border-amber-200 text-amber-900 hover:bg-amber-50">
                    <span>Ver Produtos</span>
                    <ArrowRight className="w-4 h-4 text-amber-700" />
                  </Button>
                </Link>
              </div>
            </div>

            {/* Card 4: AgriLocalização */}
            <div className="bg-white rounded-3xl border border-teal-900/10 p-7 shadow-xs hover:shadow-lg transition-all duration-300 flex flex-col justify-between group">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-teal-100 text-teal-800 flex items-center justify-center mb-5 group-hover:bg-teal-600 group-hover:text-white transition-colors">
                  <MapPin className="w-6 h-6" />
                </div>
                <Badge variant="pillarLocation" className="mb-2.5">
                  Solução 4
                </Badge>
                <h3 className="text-xl font-bold text-emerald-950 mb-2">
                  AgriLocalização
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                  Descoberta geográfica de produtores, serviços e recursos agrícolas por província e município.
                </p>

                <ul className="space-y-2 border-t border-emerald-100 pt-4 text-xs font-medium text-emerald-900">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                    <span>Geolocalização precisa</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                    <span>Filtros pelas 18 províncias</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                    <span>Mapa interactivo de produtores</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                    <span>Rotas e proximidade optimizadas</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                    <span>Serviços locais no campo</span>
                  </li>
                </ul>
              </div>

              <div className="mt-6 pt-2">
                <Link href="/agrilocalizacao" className="w-full block">
                  <Button variant="outline" className="w-full justify-between border-teal-200 text-teal-900 hover:bg-teal-50">
                    <span>Explorar Mapa</span>
                    <ArrowRight className="w-4 h-4 text-teal-700" />
                  </Button>
                </Link>
              </div>
            </div>

            {/* Card 5: Dashboard Pessoal */}
            <div className="bg-white rounded-3xl border border-emerald-900/10 p-7 shadow-xs hover:shadow-lg transition-all duration-300 flex flex-col justify-between group md:col-span-2 lg:col-span-2">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center mb-5 group-hover:bg-emerald-700 group-hover:text-white transition-colors">
                  <LayoutDashboard className="w-6 h-6" />
                </div>
                <Badge variant="pillarExpert" className="mb-2.5">
                  Solução 5
                </Badge>
                <h3 className="text-xl font-bold text-emerald-950 mb-2">
                  Dashboard Pessoal
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                  Painel de gestão unificado para acompanhar serviços, cursos inscritos, vendas, mensagens e notificações.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 border-t border-emerald-100 pt-4 text-xs font-medium text-emerald-900">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Painel do utilizador adaptativo</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Gestão de vendas e cursos</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Mensagens e comunicação direta</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Histórico de consultas e transações</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Notificações e alertas em tempo real</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-2">
                <Link href="/dashboard" className="w-full sm:w-auto inline-block">
                  <Button variant="primary" className="gap-2 bg-emerald-700 hover:bg-emerald-800">
                    <span>Aceder ao Painel</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ======================================================== */}
        {/* 4. OBJECTIVOS PRINCIPAIS (Figma Check-list format)       */}
        {/* ======================================================== */}
        <section className="py-16 sm:py-24 bg-emerald-50/50 border-y border-emerald-900/10">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <SectionHeader
              badgeText={dict.landing.objectivesBadge}
              title={dict.landing.objectivesTitle}
              subtitle="Trabalhamos com foco no impacto real, na sustentabilidade e no crescimento de Angola."
              align="center"
            />

            <div className="bg-white rounded-3xl p-6 sm:p-10 border border-emerald-900/10 shadow-sm mt-8">
              <ul className="space-y-4">
                {dict.landing.objectives.map((obj, index) => (
                  <CheckListItem key={index}>{obj}</CheckListItem>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ======================================================== */}
        {/* 5. TRUST SECTION (Desktop & Mobile Figma specs)          */}
        {/* ======================================================== */}
        <section className="py-16 sm:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeader
            badgeText={dict.landing.trustBadge}
            title={dict.landing.trustTitle}
            subtitle="Construído com base na segurança, proximidade local e transparência para o mercado nacional."
            align="center"
          />

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mt-10">
            {/* Item 1 */}
            <div className="p-6 bg-white rounded-3xl border border-emerald-900/10 text-center space-y-3 shadow-xs hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-sm sm:text-base text-emerald-950">
                <span className="hidden sm:inline">{dict.landing.trustItems.support.title}</span>
                <span className="sm:hidden">{dict.landing.trustItems.support.titleMobile}</span>
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {dict.landing.trustItems.support.desc}
              </p>
            </div>

            {/* Item 2 */}
            <div className="p-6 bg-white rounded-3xl border border-emerald-900/10 text-center space-y-3 shadow-xs hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto">
                <CreditCard className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-sm sm:text-base text-emerald-950">
                <span className="hidden sm:inline">{dict.landing.trustItems.payments.title}</span>
                <span className="sm:hidden">{dict.landing.trustItems.payments.titleMobile}</span>
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {dict.landing.trustItems.payments.desc}
              </p>
            </div>

            {/* Item 3 */}
            <div className="p-6 bg-white rounded-3xl border border-emerald-900/10 text-center space-y-3 shadow-xs hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto">
                <Users className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-sm sm:text-base text-emerald-950">
                <span className="hidden sm:inline">{dict.landing.trustItems.community.title}</span>
                <span className="sm:hidden">{dict.landing.trustItems.community.titleMobile}</span>
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {dict.landing.trustItems.community.desc}
              </p>
            </div>

            {/* Item 4 */}
            <div className="p-6 bg-white rounded-3xl border border-emerald-900/10 text-center space-y-3 shadow-xs hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto">
                <TrendingUp className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-sm sm:text-base text-emerald-950">
                <span className="hidden sm:inline">{dict.landing.trustItems.growth.title}</span>
                <span className="sm:hidden">{dict.landing.trustItems.growth.titleMobile}</span>
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {dict.landing.trustItems.growth.desc}
              </p>
            </div>
          </div>
        </section>

        {/* ======================================================== */}
        {/* 6. CTA BANNER                                            */}
        {/* ======================================================== */}
        <section className="py-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12">
          <div className="bg-linear-to-r from-emerald-900 to-emerald-950 rounded-3xl p-8 sm:p-12 lg:p-16 text-center text-white relative overflow-hidden shadow-xl">
            <div className="relative z-10 max-w-2xl mx-auto space-y-6">
              <span className="inline-block px-3.5 py-1 rounded-full bg-emerald-800 text-emerald-200 text-xs font-bold uppercase tracking-wider">
                Junte-se à Comunidade Agrícola
              </span>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight">
                {dict.landing.ctaBannerTitle}
              </h2>
              <p className="text-sm sm:text-base text-emerald-200/90 leading-relaxed">
                {dict.landing.ctaBannerSubtitle}
              </p>
              <div className="pt-2">
                <Link href="/sign-up">
                  <Button
                    variant="primary"
                    size="lg"
                    className="bg-white text-emerald-950 hover:bg-emerald-50 font-extrabold px-8 h-12 shadow-lg"
                  >
                    {dict.landing.ctaBannerButton}
                  </Button>
                </Link>
              </div>
            </div>

            {/* Decorative background circle rings */}
            <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full border border-emerald-800/40 pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full border border-emerald-800/40 pointer-events-none" />
          </div>
        </section>
      </main>

      <Footer />
      <MobileBottomNav variant="marketing" />
    </div>
  );
}
