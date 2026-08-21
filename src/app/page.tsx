"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Users,
  GraduationCap,
  ShoppingBag,
  MapPin,
  ArrowRight,
  ShieldCheck,
  Award,
  Sparkles,
  Search,
  CheckCircle2,
  TrendingUp,
} from "lucide-react";
import { Navbar, MobileBottomNav } from "@/components/navigation";
import { Footer } from "@/components/layout";
import { Button, SectionHeader, ExpertCard, CourseCard, ProductCard, Badge } from "@/components/ui";
import { LocationMap, LocationSelector } from "@/components/location";
import { useI18n } from "@/i18n/provider";
import { MOCK_EXPERTS, MOCK_COURSES, MOCK_PRODUCTS, MOCK_MAP_MARKERS } from "@/config/mock-data";

export default function LandingPage() {
  const { dict } = useI18n();
  const [selectedProvince, setSelectedProvince] = useState<string>("");
  const [selectedMunicipality, setSelectedMunicipality] = useState<string>("");
  const [selectedRadius, setSelectedRadius] = useState<number>(50);

  // Filter map markers dynamically by selected province if chosen
  const currentMarkers = selectedProvince
    ? MOCK_MAP_MARKERS.filter(
        (m) => m.provinceName.toLowerCase() === selectedProvince.toLowerCase()
      )
    : MOCK_MAP_MARKERS;

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />

      <main className="flex-1">
        {/* ======================================================== */}
        {/* HERO SECTION                                             */}
        {/* ======================================================== */}
        <section className="relative overflow-hidden bg-linear-to-b from-emerald-50/60 via-white to-white py-16 sm:py-24 lg:py-28 border-b border-emerald-900/5">
          {/* Subtle background mesh grid */}
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#0E6B38_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto space-y-6">
              {/* Country Badge */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-100 text-emerald-900 text-xs font-bold border border-emerald-200/80 shadow-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                <span>{dict.landing.heroTag}</span>
              </div>

              {/* Headline */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-emerald-950 tracking-tight leading-[1.1]">
                {dict.landing.heroTitle}
              </h1>

              {/* Subtitle */}
              <p className="text-base sm:text-lg lg:text-xl text-emerald-800/80 leading-relaxed max-w-2xl mx-auto">
                {dict.landing.heroSubtitle}
              </p>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <Link href="/sign-up" className="w-full sm:w-auto">
                  <Button
                    variant="primary"
                    size="lg"
                    className="w-full sm:w-auto gap-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold shadow-md h-12 px-8"
                  >
                    <span>{dict.landing.ctaPrimary}</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>

                <Link href="/agrilocalizacao" className="w-full sm:w-auto">
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full sm:w-auto gap-2 border-emerald-300 text-emerald-900 font-bold bg-white/80 h-12 px-6 hover:bg-emerald-50"
                  >
                    <MapPin className="w-4 h-4 text-emerald-600" />
                    <span>{dict.pillars.agriLocalizacao.cta}</span>
                  </Button>
                </Link>
              </div>

              {/* Trust Indicators */}
              <div className="pt-8 flex flex-wrap items-center justify-center gap-6 text-xs font-semibold text-emerald-800/70">
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
                  <span>Negociação Direta sem Intermediários</span>
                </div>
              </div>
            </div>

            {/* Stats Bar */}
            <div className="mt-14 sm:mt-18 grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 bg-white p-6 sm:p-8 rounded-2xl border border-emerald-900/10 shadow-sm max-w-5xl mx-auto">
              <div className="text-center p-2">
                <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-emerald-950">120+</div>
                <div className="text-xs sm:text-sm font-semibold text-emerald-700 mt-1">{dict.landing.stats.experts}</div>
              </div>
              <div className="text-center p-2 border-l border-emerald-100">
                <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-emerald-950">45+</div>
                <div className="text-xs sm:text-sm font-semibold text-emerald-700 mt-1">{dict.landing.stats.courses}</div>
              </div>
              <div className="text-center p-2 border-l border-emerald-100">
                <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-emerald-950">350+</div>
                <div className="text-xs sm:text-sm font-semibold text-emerald-700 mt-1">{dict.landing.stats.products}</div>
              </div>
              <div className="text-center p-2 border-l border-emerald-100">
                <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-emerald-950">18</div>
                <div className="text-xs sm:text-sm font-semibold text-emerald-700 mt-1">{dict.landing.stats.provinces}</div>
              </div>
            </div>
          </div>
        </section>

        {/* ======================================================== */}
        {/* THREE BUSINESS PILLARS SECTION                           */}
        {/* ======================================================== */}
        <section className="py-16 sm:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeader
            badgeText="Estrutura de Negócio"
            title={dict.landing.pillarsTitle}
            subtitle={dict.landing.pillarsSubtitle}
            align="center"
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
            {/* Pillar 1: AgriExpert */}
            <div className="bg-white rounded-2xl border border-emerald-900/10 p-8 shadow-xs hover:shadow-lg transition-all duration-300 flex flex-col justify-between group">
              <div>
                <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center mb-6 group-hover:bg-emerald-700 group-hover:text-white transition-colors">
                  <Users className="w-7 h-7" />
                </div>
                <Badge variant="pillarExpert" className="mb-3">
                  Pilar 1
                </Badge>
                <h3 className="text-xl font-bold text-emerald-950 mb-2">
                  {dict.pillars.agriExpert.name}
                </h3>
                <p className="text-sm font-semibold text-emerald-800 mb-3">
                  {dict.pillars.agriExpert.headline}
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {dict.pillars.agriExpert.description}
                </p>

                <div className="mt-6 space-y-2 border-t border-emerald-100 pt-4 text-xs font-medium text-emerald-900">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Agrónomos & Médicos Veterinários</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Consultorias Técnicas e Agendamentos</span>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-4">
                <Link href="/agriexpert" className="w-full block">
                  <Button variant="primary" className="w-full justify-between bg-emerald-700">
                    <span>{dict.pillars.agriExpert.cta}</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </div>

            {/* Pillar 2: AgriAcademy */}
            <div className="bg-white rounded-2xl border border-emerald-900/10 p-8 shadow-xs hover:shadow-lg transition-all duration-300 flex flex-col justify-between group">
              <div>
                <div className="w-14 h-14 rounded-2xl bg-blue-100 text-blue-800 flex items-center justify-center mb-6 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <GraduationCap className="w-7 h-7" />
                </div>
                <Badge variant="pillarAcademy" className="mb-3">
                  Pilar 2
                </Badge>
                <h3 className="text-xl font-bold text-emerald-950 mb-2">
                  {dict.pillars.agriAcademy.name}
                </h3>
                <p className="text-sm font-semibold text-blue-900 mb-3">
                  {dict.pillars.agriAcademy.headline}
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {dict.pillars.agriAcademy.description}
                </p>

                <div className="mt-6 space-y-2 border-t border-emerald-100 pt-4 text-xs font-medium text-emerald-900">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                    <span>Cursos Práticos & Certificados</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                    <span>Instrutores Qualificados do Setor</span>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-4">
                <Link href="/agriacademy" className="w-full block">
                  <Button variant="outline" className="w-full justify-between border-blue-200 text-blue-900 hover:bg-blue-50">
                    <span>{dict.pillars.agriAcademy.cta}</span>
                    <ArrowRight className="w-4 h-4 text-blue-700" />
                  </Button>
                </Link>
              </div>
            </div>

            {/* Pillar 3: AgriShopping */}
            <div className="bg-white rounded-2xl border border-emerald-900/10 p-8 shadow-xs hover:shadow-lg transition-all duration-300 flex flex-col justify-between group">
              <div>
                <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mb-6 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                  <ShoppingBag className="w-7 h-7" />
                </div>
                <Badge variant="pillarShopping" className="mb-3">
                  Pilar 3
                </Badge>
                <h3 className="text-xl font-bold text-emerald-950 mb-2">
                  {dict.pillars.agriShopping.name}
                </h3>
                <p className="text-sm font-semibold text-amber-900 mb-3">
                  {dict.pillars.agriShopping.headline}
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {dict.pillars.agriShopping.description}
                </p>

                <div className="mt-6 space-y-2 border-t border-emerald-100 pt-4 text-xs font-medium text-emerald-900">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" />
                    <span>Insumos, Máquinas e Sementes</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" />
                    <span>Vendedores e Produtores Verificados</span>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-4">
                <Link href="/agrishopping" className="w-full block">
                  <Button variant="outline" className="w-full justify-between border-amber-200 text-amber-900 hover:bg-amber-50">
                    <span>{dict.pillars.agriShopping.cta}</span>
                    <ArrowRight className="w-4 h-4 text-amber-700" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ======================================================== */}
        {/* PLATFORM-WIDE CAPABILITY: AGRILOCALIZAÇÃO MAP PREVIEW     */}
        {/* ======================================================== */}
        <section className="py-16 sm:py-24 bg-emerald-50/50 border-y border-emerald-900/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              {/* Left explanation column */}
              <div className="lg:col-span-5 space-y-6">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-teal-100 text-teal-900 border border-teal-200 uppercase tracking-wider">
                  <MapPin className="w-3.5 h-3.5 text-teal-700" />
                  Capacidade Transversal
                </span>

                <h2 className="text-3xl sm:text-4xl font-black text-emerald-950 tracking-tight leading-tight">
                  {dict.landing.locationHighlightTitle}
                </h2>

                <p className="text-base text-emerald-800/80 leading-relaxed">
                  {dict.landing.locationHighlightSubtitle}
                </p>

                <div className="space-y-3 pt-2">
                  <div className="p-3 bg-white rounded-xl border border-emerald-100 text-xs font-semibold text-emerald-900 flex items-center gap-3 shadow-xs">
                    <span className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">1</span>
                    <span>AgriExpert: Encontre veterinários e agrónomos perto da sua fazenda</span>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-emerald-100 text-xs font-semibold text-emerald-900 flex items-center gap-3 shadow-xs">
                    <span className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">2</span>
                    <span>AgriAcademy: Descubra polos de formação prática na sua província</span>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-emerald-100 text-xs font-semibold text-emerald-900 flex items-center gap-3 shadow-xs">
                    <span className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold">3</span>
                    <span>AgriShopping: Compre equipamentos e insumos com fornecedores locais</span>
                  </div>
                </div>

                <div className="pt-2">
                  <Link href="/agrilocalizacao">
                    <Button variant="primary" className="gap-2 bg-emerald-800 hover:bg-emerald-900">
                      <span>Abrir AgriLocalização Completa</span>
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Right map column */}
              <div className="lg:col-span-7 space-y-4">
                <LocationSelector
                  selectedProvince={selectedProvince}
                  selectedMunicipality={selectedMunicipality}
                  selectedRadius={selectedRadius}
                  onProvinceChange={setSelectedProvince}
                  onMunicipalityChange={setSelectedMunicipality}
                  onRadiusChange={setSelectedRadius}
                />
                <LocationMap
                  markers={currentMarkers}
                  height="h-[420px]"
                />
              </div>
            </div>
          </div>
        </section>

        {/* ======================================================== */}
        {/* FEATURED EXPERTS SHOWCASE                                */}
        {/* ======================================================== */}
        <section className="py-16 sm:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 gap-4">
            <SectionHeader
              badgeText="AgriExpert"
              title={dict.landing.featuredExpertsTitle}
              subtitle="Especialistas agrícolas e veterinários certificados prontos para prestar consultoria."
              className="mb-0"
            />
            <Link href="/agriexpert">
              <Button variant="outline" className="text-xs font-bold border-emerald-300">
                Ver Todos os Especialistas ({MOCK_EXPERTS.length})
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {MOCK_EXPERTS.map((expert) => (
              <ExpertCard key={expert.id} {...expert} />
            ))}
          </div>
        </section>

        {/* ======================================================== */}
        {/* FEATURED COURSES SHOWCASE                                */}
        {/* ======================================================== */}
        <section className="py-16 sm:py-24 bg-emerald-50/40 border-t border-emerald-900/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 gap-4">
              <SectionHeader
                badgeText="AgriAcademy"
                title={dict.landing.featuredCoursesTitle}
                subtitle="Formação técnica adaptada à realidade produtiva e climática de Angola."
                className="mb-0"
              />
              <Link href="/agriacademy">
                <Button variant="outline" className="text-xs font-bold border-emerald-300">
                  Explorar Cursos ({MOCK_COURSES.length})
                </Button>
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {MOCK_COURSES.map((course) => (
                <CourseCard key={course.id} {...course} />
              ))}
            </div>
          </div>
        </section>

        {/* ======================================================== */}
        {/* FEATURED PRODUCTS SHOWCASE                               */}
        {/* ======================================================== */}
        <section className="py-16 sm:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 gap-4">
            <SectionHeader
              badgeText="AgriShopping"
              title={dict.landing.featuredProductsTitle}
              subtitle="Máquinas, sementes e insumos agrícolas de fornecedores confiáveis."
              className="mb-0"
            />
            <Link href="/agrishopping">
              <Button variant="outline" className="text-xs font-bold border-emerald-300">
                Ver Catálogo ({MOCK_PRODUCTS.length})
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {MOCK_PRODUCTS.map((product) => (
              <ProductCard key={product.id} {...product} />
            ))}
          </div>
        </section>

        {/* ======================================================== */}
        {/* CTA BANNER                                               */}
        {/* ======================================================== */}
        <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12">
          <div className="bg-linear-to-r from-emerald-900 to-emerald-950 rounded-3xl p-8 sm:p-12 lg:p-16 text-center text-white relative overflow-hidden shadow-xl">
            <div className="relative z-10 max-w-2xl mx-auto space-y-6">
              <span className="inline-block px-3 py-1 rounded-full bg-emerald-800 text-emerald-200 text-xs font-bold uppercase tracking-wider">
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
      <MobileBottomNav />
    </div>
  );
}
