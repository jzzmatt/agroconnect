"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  DollarSign,
  BookOpen,
  Calendar,
  ShoppingBag,
  Users,
  Clock,
  MapPin,
  CheckCircle2,
  TrendingUp,
  Star,
  Plus,
  Package,
  Store,
  ArrowRight,
  ShieldCheck,
  Lock,
  Sparkles,
} from "lucide-react";
import { MetricCard, Button, UpgradePlanModal, ProductLimitModal } from "@/components/ui";
import { useUser } from "@clerk/nextjs";
import { getUserGreeting, calculateEntitlements, PROFILE_TYPE_CONFIG } from "@/lib/auth/identity-resolvers";
import { SUBSCRIPTION_PLANS } from "@/lib/services/pricing-service";
import type { ProfileType, ProfessionalTitle } from "@/types/database";

export default function DashboardPage() {
  const { user } = useUser();

  const [profile, setProfile] = useState({
    displayName: "",
    firstName: "",
    lastName: "",
    professionalTitle: "none" as ProfessionalTitle,
    email: "",
    activeProfile: "personal" as ProfileType,
    subscriptionPlan: "basic" as string, // Default plan is Basic (0 Kz/mês)
    roles: ["student"] as const,
    activeProductsCount: 0,
  });

  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [limitModalOpen, setLimitModalOpen] = useState(false);
  const [modalFeatureTitle, setModalFeatureTitle] = useState("Criar Produto no AgriShopping");
  const [modalRequiredPlan, setModalRequiredPlan] = useState<"professional" | "business" | "enterprise">("professional");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const realEmail = user?.primaryEmailAddress?.emailAddress || user?.emailAddresses?.[0]?.emailAddress || "";
      const clerkUsername = user?.username || "";
      const clerkFirst = user?.firstName || "";
      const clerkLast = user?.lastName || "";
      const initialDisplay = clerkUsername || (clerkFirst && clerkLast ? `${clerkFirst} ${clerkLast}` : clerkFirst) || (realEmail ? realEmail.split("@")[0] : "Utilizador");

      setProfile((prev) => ({
        ...prev,
        displayName: initialDisplay,
        firstName: clerkFirst,
        lastName: clerkLast,
        email: realEmail,
      }));

      const savedActive = localStorage.getItem("agroconnect_active_profile_type");
      if (savedActive) {
        setProfile((prev) => ({ ...prev, activeProfile: savedActive as ProfileType }));
      }

      const override = localStorage.getItem("agroconnect_user_profile_override");
      if (override) {
        try {
          const parsed = JSON.parse(override);
          setProfile((prev) => ({
            ...prev,
            displayName: parsed.displayName || prev.displayName,
            firstName: parsed.firstName || prev.firstName,
            lastName: parsed.lastName || prev.lastName,
            professionalTitle: parsed.professionalTitle || prev.professionalTitle,
            subscriptionPlan: parsed.subscriptionPlan || prev.subscriptionPlan,
          }));
        } catch {
          // ignore
        }
      }
    }
  }, [user]);

  const greeting = getUserGreeting({
    displayName: profile.displayName,
    firstName: profile.firstName,
    lastName: profile.lastName,
    username: user?.username,
    email: profile.email || user?.primaryEmailAddress?.emailAddress,
    professionalTitle: profile.professionalTitle,
    activeProfile: profile.activeProfile,
  });

  const entitlements = calculateEntitlements({
    subscriptionPlan: profile.subscriptionPlan,
    roles: [...profile.roles],
  });

  const activeProfileConfig = PROFILE_TYPE_CONFIG[profile.activeProfile] || PROFILE_TYPE_CONFIG.personal;
  const planKey = (profile.subscriptionPlan && profile.subscriptionPlan in SUBSCRIPTION_PLANS)
    ? (profile.subscriptionPlan as keyof typeof SUBSCRIPTION_PLANS)
    : "basic";
  const currentPlanDef = SUBSCRIPTION_PLANS[planKey];

  const isBasic = planKey === "basic";

  const isLimitReached =
    entitlements.product_limit !== null &&
    profile.activeProductsCount >= entitlements.product_limit;

  const triggerLockedModule = (title: string, plan: "professional" | "business" = "professional") => {
    setModalFeatureTitle(title);
    setModalRequiredPlan(plan);
    setUpgradeModalOpen(true);
  };

  const handleAddProductClick = (e: React.MouseEvent) => {
    if (!entitlements.can_create_products) {
      e.preventDefault();
      triggerLockedModule("Criar Produtos no AgriShopping", "professional");
      return;
    }
    if (isLimitReached) {
      e.preventDefault();
      setLimitModalOpen(true);
    }
  };

  const handleCreateCourseClick = (e: React.MouseEvent) => {
    if (!entitlements.can_create_courses) {
      e.preventDefault();
      triggerLockedModule("Criar e Publicar Cursos no AgriAcademy", "professional");
    }
  };

  // KPIs
  const kpiCards = [
    {
      title: "Ganhos Totais",
      value: isBasic ? "0 Kz" : "2.450.000 Kz",
      description: isBasic ? "Disponível a partir do plano Profissional" : "em relação ao mês anterior",
      trend: isBasic ? undefined : { value: "12.5% este mês", isPositive: true },
      icon: DollarSign,
    },
    {
      title: "Venda de Cursos",
      value: isBasic ? "0 Kz" : "1.250.000 Kz",
      description: "AgriAcademy",
      trend: isBasic ? undefined : { value: "18.3% este mês", isPositive: true },
      icon: BookOpen,
    },
    {
      title: "Consultas Activas",
      value: isBasic ? "0 Agendadas" : "32 Agendadas",
      description: "AgriExpert",
      trend: isBasic ? undefined : { value: "4.7% este mês", isPositive: true },
      icon: Calendar,
    },
    {
      title: "Produtos Vendidos",
      value: isBasic ? "0 Items" : "56 Items",
      description: "AgriShopping",
      trend: isBasic ? undefined : { value: "8.2% este mês", isPositive: true },
      icon: ShoppingBag,
    },
    {
      title: "Total Estudantes",
      value: isBasic ? "0 Alunos" : "124 Alunos",
      description: "Inscritos nos seus cursos",
      trend: isBasic ? undefined : { value: "15.4% este mês", isPositive: true },
      icon: Users,
    },
  ];

  return (
    <div className="space-y-8">
      {/* 1. Dashboard Hero with Plan Badge & Dynamic Greeting */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface-card p-6 sm:p-8 rounded-3xl border border-border shadow-xs">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-primary">
              Painel de Controlo • AGROCONNECT
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-secondary text-secondary-foreground border border-border">
              <span>{activeProfileConfig.icon}</span>
              <span>Perfil ativo: {activeProfileConfig.label}</span>
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-950 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800">
              <Sparkles className="w-3 h-3 text-amber-600" />
              <span>Plano {currentPlanDef.name} ({currentPlanDef.priceFormatted}/mês)</span>
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-foreground mt-1">
            {greeting.greeting} 👋
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {isBasic
              ? "Plano Básico ativo (Acesso a visualização do ecossistema e gestão do perfil pessoal)."
              : "Bem-vindo ao seu espaço profissional no ecossistema agrícola de Angola."}
          </p>
        </div>

        {/* Dynamic Context Actions */}
        <div className="flex items-center gap-2.5 flex-wrap self-start sm:self-auto">
          {isBasic ? (
            <Link href="/pricing">
              <Button variant="primary" size="sm" className="gap-1.5 font-bold text-xs h-10 px-5 shadow-md">
                <Sparkles className="w-4 h-4" />
                <span>Melhorar Plano</span>
              </Button>
            </Link>
          ) : profile.activeProfile === "seller" ? (
            <Link
              href={isLimitReached ? "#" : "/dashboard/products/new"}
              onClick={handleAddProductClick}
            >
              <Button
                variant="primary"
                size="sm"
                className={`gap-1.5 font-bold text-xs h-10 px-4 ${
                  isLimitReached ? "bg-amber-600 hover:bg-amber-700 text-white" : ""
                }`}
              >
                {isLimitReached ? <Lock className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                <span>{isLimitReached ? "🔒 Limite atingido (10/10)" : "Adicionar Produto"}</span>
              </Button>
            </Link>
          ) : profile.activeProfile === "instructor" ? (
            <Link
              href={entitlements.can_create_courses ? "/dashboard/academy/my-courses" : "#"}
              onClick={handleCreateCourseClick}
            >
              <Button variant="primary" size="sm" className="gap-1.5 font-bold text-xs h-10 px-4">
                {!entitlements.can_create_courses ? <Lock className="w-4 h-4" /> : <BookOpen className="w-4 h-4" />}
                <span>{!entitlements.can_create_courses ? "🔒 Criar Curso" : "Gerir Cursos"}</span>
              </Button>
            </Link>
          ) : (
            <Link href="/dashboard/services/new">
              <Button variant="primary" size="sm" className="gap-1.5 font-bold text-xs h-10 px-4">
                <Plus className="w-4 h-4" />
                <span>Novo Serviço</span>
              </Button>
            </Link>
          )}

          <Link href="/agrilocalizacao">
            <Button variant="outline" size="sm" className="text-xs font-bold gap-1.5 h-10">
              <MapPin className="w-3.5 h-3.5 text-primary" />
              <span>AgriLocalização</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* 2. Capability-Driven AgriShopping Seller Card OR Locked Card for Basic */}
      {entitlements.can_sell_products ? (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/30 rounded-3xl border border-amber-200 dark:border-amber-900/60 p-6 sm:p-7 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-black text-2xl shrink-0 shadow-md">
                <Store className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-900 dark:text-amber-200 bg-amber-200/60 dark:bg-amber-900/60 px-2 py-0.5 rounded-md">
                    Capacidade Comercial Ativa
                  </span>
                  <span className="text-xs font-bold text-amber-800 dark:text-amber-300">
                    Vendedor AgriShopping
                  </span>
                  {entitlements.product_limit !== null ? (
                    <span className="text-xs font-black text-foreground bg-white dark:bg-slate-900 px-2 py-0.5 rounded-md border border-amber-300 dark:border-amber-800">
                      Produtos: {profile.activeProductsCount} / {entitlements.product_limit}
                    </span>
                  ) : (
                    <span className="text-xs font-black text-amber-600 bg-white dark:bg-slate-900 px-2 py-0.5 rounded-md border border-amber-300 dark:border-amber-800">
                      Produtos: Sem limite (Business)
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-black text-amber-950 dark:text-amber-100">
                  AgriShopping • Gestão de Vendas & Insumos
                </h3>
                <p className="text-xs text-amber-900/80 dark:text-amber-200/80 max-w-xl">
                  {entitlements.product_limit !== null
                    ? `Plano Profissional: utilize até ${entitlements.product_limit} produtos ativos. Atualize para Business para catálogo ilimitado.`
                    : "Plano Business ativo: venda e gira o seu catálogo completo sem limites de produtos."}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <Link href="/dashboard/products">
                <Button variant="outline" size="sm" className="text-xs font-bold bg-white dark:bg-slate-900 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-100">
                  <Package className="w-3.5 h-3.5 mr-1" />
                  <span>Meus Produtos ({profile.activeProductsCount})</span>
                </Button>
              </Link>
              <Link
                href={isLimitReached ? "#" : "/dashboard/products/new"}
                onClick={handleAddProductClick}
              >
                <Button
                  variant="primary"
                  size="sm"
                  className={`text-xs font-bold ${
                    isLimitReached ? "bg-amber-600 hover:bg-amber-700 text-white shadow-md" : "bg-amber-600 hover:bg-amber-700 text-white"
                  }`}
                >
                  {isLimitReached ? <Lock className="w-4 h-4 mr-1" /> : <Plus className="w-4 h-4 mr-1" />}
                  <span>{isLimitReached ? "🔒 Limite atingido" : "Adicionar Produto"}</span>
                </Button>
              </Link>
              <Link href="/dashboard/orders">
                <Button variant="outline" size="sm" className="text-xs font-bold bg-white dark:bg-slate-900 border-amber-300 dark:border-amber-800">
                  <span>Encomendas</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      ) : null}

      {/* 3. Locked Modules Section for Basic Plan Users */}
      {isBasic && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-foreground flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-600" />
                <span>Módulos do Ecossistema (Disponíveis em Planos Superiores)</span>
              </h3>
              <p className="text-xs text-muted-foreground">
                No plano Básico tem acesso a navegação e compras. Para criar produtos, serviços e cursos, atualize o seu plano.
              </p>
            </div>
            <Link href="/pricing">
              <Button variant="outline" size="sm" className="text-xs font-bold">
                Ver Todos os Planos
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Locked AgriShopping */}
            <div className="bg-surface-card rounded-3xl p-6 border border-border shadow-xs relative flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                  🛒
                </div>
                <div className="flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-amber-600" />
                  <h4 className="font-bold text-sm text-foreground">AgriShopping</h4>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Venda sementes, adubos e equipamentos agrícolas a produtores em Angola.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => triggerLockedModule("Venda de Produtos no AgriShopping", "professional")}
                className="w-full text-xs font-bold border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200"
              >
                <span>🔒 Desbloquear Vendas</span>
              </Button>
            </div>

            {/* Locked AgriAcademy */}
            <div className="bg-surface-card rounded-3xl p-6 border border-border shadow-xs relative flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-800 flex items-center justify-center font-bold">
                  🎓
                </div>
                <div className="flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-blue-600" />
                  <h4 className="font-bold text-sm text-foreground">AgriAcademy</h4>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Crie e publique cursos técnicos, masterclasses e formações práticas.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => triggerLockedModule("Criação de Cursos no AgriAcademy", "professional")}
                className="w-full text-xs font-bold border-blue-300 dark:border-blue-800 text-blue-900 dark:text-blue-200"
              >
                <span>🔒 Desbloquear Ensino</span>
              </Button>
            </div>

            {/* Locked AgriExpert */}
            <div className="bg-surface-card rounded-3xl p-6 border border-border shadow-xs relative flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  🩺
                </div>
                <div className="flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-emerald-600" />
                  <h4 className="font-bold text-sm text-foreground">AgriExpert</h4>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Ofereça consultoria agronómica, medicina veterinária e assistência técnica.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => triggerLockedModule("Gestão Profissional no AgriExpert", "professional")}
                className="w-full text-xs font-bold border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200"
              >
                <span>🔒 Desbloquear Serviços</span>
              </Button>
            </div>

            {/* Locked AgriLocalização */}
            <div className="bg-surface-card rounded-3xl p-6 border border-border shadow-xs relative flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-2xl bg-teal-100 text-teal-800 flex items-center justify-center font-bold">
                  📍
                </div>
                <div className="flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-teal-600" />
                  <h4 className="font-bold text-sm text-foreground">AgriLocalização</h4>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Destaque a localização da sua fazenda ou loja nas 18 províncias.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => triggerLockedModule("Destaque no AgriLocalização", "professional")}
                className="w-full text-xs font-bold border-teal-300 dark:border-teal-800 text-teal-900 dark:text-teal-200"
              >
                <span>🔒 Desbloquear Destaque</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 4. KPI / Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {kpiCards.map((kpi, idx) => (
          <MetricCard
            key={idx}
            title={kpi.title}
            value={kpi.value}
            description={kpi.description}
            trend={kpi.trend}
            icon={kpi.icon}
          />
        ))}
      </div>

      {/* 5. Split Activity & Appointments Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-surface-card rounded-3xl p-6 sm:p-7 border border-border shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-secondary text-secondary-foreground flex items-center justify-center">
                <Calendar className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-base text-foreground">Próximos Agendamentos</h3>
            </div>
            <Link href="/dashboard/requests" className="text-xs font-bold text-primary hover:underline">
              Ver pedidos
            </Link>
          </div>

          <div className="space-y-3">
            {isBasic ? (
              <div className="p-8 text-center bg-surface rounded-2xl border border-border space-y-2">
                <p className="text-xs text-muted-foreground">Nenhum agendamento ativo.</p>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-surface border border-border space-y-1">
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-primary" />
                  <span className="text-xs font-bold text-foreground">Amanhã, 09:00</span>
                </div>
                <h4 className="text-sm font-bold text-foreground">Visita Técnica • Fazenda Huambo</h4>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-primary" />
                  <span>Caála, Huambo</span>
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-5 bg-surface-card rounded-3xl p-6 sm:p-7 border border-border shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-secondary text-secondary-foreground flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-base text-foreground">Atividade Recente</h3>
            </div>
          </div>

          <div className="space-y-3.5">
            <div className="flex items-start gap-3 text-xs">
              <div className="w-8 h-8 rounded-xl bg-surface border border-border text-primary flex items-center justify-center shrink-0 mt-0.5">
                <Package className="w-4 h-4" />
              </div>
              <div className="flex-1 space-y-0.5">
                <p className="font-semibold text-foreground leading-snug">Conta criada com sucesso no plano {currentPlanDef.name}</p>
                <span className="text-[11px] text-muted-foreground block">Hoje</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Upgrade Modal */}
      <UpgradePlanModal
        isOpen={upgradeModalOpen}
        onClose={() => setUpgradeModalOpen(false)}
        featureTitle={modalFeatureTitle}
        requiredPlan={modalRequiredPlan}
        currentPlanName={currentPlanDef.name}
      />

      {/* Product Limit Modal */}
      <ProductLimitModal
        isOpen={limitModalOpen}
        onClose={() => setLimitModalOpen(false)}
        currentCount={profile.activeProductsCount}
        limit={entitlements.product_limit || 10}
      />
    </div>
  );
}
