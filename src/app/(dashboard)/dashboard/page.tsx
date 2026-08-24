"use client";

import React, { useState, useEffect, useCallback } from "react";
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
import { useI18n } from "@/i18n/provider";
import { getLocalizedPlanCopy } from "@/i18n/plan-copy";
import { useUser } from "@clerk/nextjs";
import { getUserGreeting, calculateEntitlements, PROFILE_TYPE_CONFIG } from "@/lib/auth/identity-resolvers";
import { SUBSCRIPTION_PLANS } from "@/lib/services/pricing-service";
import { getProfileDetailsAction } from "@/lib/auth/profile-actions";
import { useProfileChangeListener } from "@/lib/auth/profile-events";
import { getMyProductStatsAction } from "@/lib/services/shopping-actions";
import { useAuthoritativePlan } from "@/lib/subscription/use-authoritative-plan";
import type { ProfileType, ProfessionalTitle } from "@/types/database";

export default function DashboardPage() {
  const { user } = useUser();
  const { dict, locale } = useI18n();
  const { plan, loading, fromDatabase, error, refresh, marketCountry } = useAuthoritativePlan();

  const [profile, setProfile] = useState({
    displayName: "",
    firstName: "",
    lastName: "",
    professionalTitle: "none" as ProfessionalTitle,
    email: "",
    activeProfile: "personal" as ProfileType,
    subscriptionPlan: "basic" as string,
    roles: ["student"] as const,
    activeProductsCount: 0,
  });

  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [limitModalOpen, setLimitModalOpen] = useState(false);
  const [modalFeatureTitle, setModalFeatureTitle] = useState("Criar Produto no AgriShopping");
  const [modalRequiredPlan, setModalRequiredPlan] = useState<"professional" | "business" | "enterprise">("professional");

  const loadServerProfile = useCallback(async () => {
    const serverProfile = await getProfileDetailsAction();
    if (!serverProfile) return;

    setProfile((prev) => ({
      ...prev,
      displayName: serverProfile.display_name || prev.displayName,
      firstName: serverProfile.first_name || prev.firstName,
      lastName: serverProfile.last_name || prev.lastName,
      email: serverProfile.email || prev.email,
      professionalTitle: serverProfile.professional_title || prev.professionalTitle,
      activeProfile: serverProfile.active_profile_type || prev.activeProfile,
      subscriptionPlan: serverProfile.subscription_plan ?? "",
    }));
  }, []);

  useProfileChangeListener(loadServerProfile);

  useEffect(() => {
    loadServerProfile();
    getMyProductStatsAction().then((stats) => {
      setProfile((prev) => ({ ...prev, activeProductsCount: stats.activeCount }));
    });

    if (typeof window !== "undefined") {
      const realEmail = user?.primaryEmailAddress?.emailAddress || user?.emailAddresses?.[0]?.emailAddress || "";
      const clerkUsername = user?.username || "";
      const clerkFirst = user?.firstName || "";
      const clerkLast = user?.lastName || "";
      const initialDisplay = clerkUsername || (clerkFirst && clerkLast ? `${clerkFirst} ${clerkLast}` : clerkFirst) || (realEmail ? realEmail.split("@")[0] : "Utilizador");

      setProfile((prev) => ({
        ...prev,
        displayName: prev.displayName || initialDisplay,
        firstName: prev.firstName || clerkFirst,
        lastName: prev.lastName || clerkLast,
        email: prev.email || realEmail,
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
          }));
        } catch {
          // ignore
        }
      }
    }
  }, [user, loadServerProfile]);

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
    subscriptionPlan: plan,
    roles: [...profile.roles],
    activeProductCount: profile.activeProductsCount,
  });

  const activeProfileConfig = PROFILE_TYPE_CONFIG[profile.activeProfile] || PROFILE_TYPE_CONFIG.personal;
  const currentPlanDef = plan ? SUBSCRIPTION_PLANS[plan] : null;
  const planCopy = plan ? getLocalizedPlanCopy(dict, plan) : null;

  const isBasic = plan === "basic";

  const isLimitReached = entitlements.product_limit_reached || (
    entitlements.product_limit !== null &&
    profile.activeProductsCount >= entitlements.product_limit
  );

  const triggerLockedModule = (title: string, plan: "professional" | "business" = "professional") => {
    setModalFeatureTitle(title);
    setModalRequiredPlan(plan);
    setUpgradeModalOpen(true);
  };

  const handleAddProductClick = (e: React.MouseEvent) => {
    if (!entitlements.can_access_agriproduct) {
      e.preventDefault();
      triggerLockedModule("Criar Produtos no AgriProduct", "professional");
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

  if (loading || !fromDatabase) {
    return (
      <div className="space-y-4" aria-busy="true">
        <div className="h-32 rounded-3xl bg-muted animate-pulse" />
        <div className="h-48 rounded-3xl bg-muted animate-pulse" />
      </div>
    );
  }

  if (error || !plan || !currentPlanDef || !planCopy) {
    return (
      <div className="rounded-3xl border border-destructive/20 bg-destructive/10 p-6 text-center space-y-3">
        <p className="text-sm font-semibold text-destructive">
          {error || dict.dash.planUpdateFailed}
        </p>
        <Button type="button" variant="outline" size="sm" onClick={() => void refresh()}>
          {dict.pricing.retryLoad}
        </Button>
      </div>
    );
  }

  // KPIs
  const kpiCards = [
    {
      title: dict.dash.totalEarnings,
      value: isBasic ? "0 Kz" : "2.450.000 Kz",
      description: isBasic ? dict.dash.fromProfessional : dict.dash.vsLastMonth,
      trend: isBasic ? undefined : { value: "12.5% este mês", isPositive: true },
      icon: DollarSign,
    },
    {
      title: dict.dash.courseSales,
      value: isBasic ? "0 Kz" : "1.250.000 Kz",
      description: dict.navigation.agriAcademy,
      trend: isBasic ? undefined : { value: "18.3% este mês", isPositive: true },
      icon: BookOpen,
    },
    {
      title: dict.dash.activeConsults,
      value: isBasic ? "0" : "32",
      description: dict.navigation.agriExpert,
      trend: isBasic ? undefined : { value: "4.7% este mês", isPositive: true },
      icon: Calendar,
    },
    {
      title: dict.dash.productsSold,
      value: isBasic ? "0" : "56",
      description: dict.navigation.agriShopping,
      trend: isBasic ? undefined : { value: "8.2% este mês", isPositive: true },
      icon: ShoppingBag,
    },
    {
      title: dict.dash.totalStudents,
      value: isBasic ? "0" : "124",
      description: dict.dash.manageCourses,
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
              {dict.dash.controlPanel} • {dict.common.brandName}
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-secondary text-secondary-foreground border border-border">
              <span>{activeProfileConfig.icon}</span>
              <span>{dict.dash.activeProfile}: {activeProfileConfig.label}</span>
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-950 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800">
              <Sparkles className="w-3 h-3 text-amber-600" />
              <span>{dict.common.currentPlan}: {planCopy.name} ({currentPlanDef.priceFormatted})</span>
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-surface text-foreground border border-border">
              {marketCountry.flag} {marketCountry.name[locale] || marketCountry.name.pt}
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-surface text-foreground border border-border uppercase">
              {locale}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-foreground mt-1">
            {dict.common.hello}{greeting.displayName ? `, ${greeting.displayName}` : ""} 👋
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {isBasic ? dict.dash.welcomeBasic : dict.dash.welcomePaid}
          </p>
        </div>

        {/* Dynamic Context Actions */}
        <div className="flex items-center gap-2.5 flex-wrap self-start sm:self-auto">
          {isBasic ? (
            <Link href="/planos">
              <Button variant="primary" size="sm" className="gap-1.5 font-bold text-xs h-10 px-5 shadow-md">
                <Sparkles className="w-4 h-4" />
                <span>{dict.dash.upgradePlan}</span>
              </Button>
            </Link>
          ) : entitlements.can_access_agriproduct ? (
            <Link
              href={isLimitReached ? "/dashboard/products" : "/dashboard/products/new"}
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
                <span>{isLimitReached ? dict.dash.limitReached : dict.dash.addProduct}</span>
              </Button>
            </Link>
          ) : profile.activeProfile === "instructor" ? (
            <Link
              href={entitlements.can_create_courses ? "/dashboard/academy/my-courses" : "#"}
              onClick={handleCreateCourseClick}
            >
              <Button variant="primary" size="sm" className="gap-1.5 font-bold text-xs h-10 px-4">
                {!entitlements.can_create_courses ? <Lock className="w-4 h-4" /> : <BookOpen className="w-4 h-4" />}
                <span>{!entitlements.can_create_courses ? dict.dash.createCourse : dict.dash.manageCourses}</span>
              </Button>
            </Link>
          ) : (
            <Link href="/dashboard/services/new">
              <Button variant="primary" size="sm" className="gap-1.5 font-bold text-xs h-10 px-4">
                <Plus className="w-4 h-4" />
                <span>{dict.dash.newService}</span>
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
      {entitlements.can_access_agriproduct ? (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/30 rounded-3xl border border-amber-200 dark:border-amber-900/60 p-6 sm:p-7 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-black text-2xl shrink-0 shadow-md">
                <Store className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-900 dark:text-amber-200 bg-amber-200/60 dark:bg-amber-900/60 px-2 py-0.5 rounded-md">
                    {dict.dash.sellerActive}
                  </span>
                  <span className="text-xs font-bold text-amber-800 dark:text-amber-300">
                    AgriProduct
                  </span>
                  {entitlements.product_limit !== null ? (
                    <span className="text-xs font-black text-foreground bg-white dark:bg-slate-900 px-2 py-0.5 rounded-md border border-amber-300 dark:border-amber-800">
                      {dict.dash.productsCount}: {profile.activeProductsCount} / {entitlements.product_limit}
                    </span>
                  ) : (
                    <span className="text-xs font-black text-amber-600 bg-white dark:bg-slate-900 px-2 py-0.5 rounded-md border border-amber-300 dark:border-amber-800">
                      {dict.dash.productsCount}: {dict.dash.unlimitedProducts}
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-black text-amber-950 dark:text-amber-100">
                  {dict.dash.sellerTitle}
                </h3>
                <p className="text-xs text-amber-900/80 dark:text-amber-200/80 max-w-xl">
                  {entitlements.product_limit !== null
                    ? (isLimitReached
                        ? dict.dash.limitTenReached
                        : dict.dash.activeProductsOf
                            .replace("{count}", String(profile.activeProductsCount))
                            .replace("{limit}", String(entitlements.product_limit)))
                    : `${dict.products.unlimitedActive}: ${dict.dash.unlimitedProducts}`}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <Link href="/dashboard/products">
                <Button variant="outline" size="sm" className="text-xs font-bold bg-white dark:bg-slate-900 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-100">
                  <Package className="w-3.5 h-3.5 mr-1" />
                  <span>{dict.dash.myProducts} ({profile.activeProductsCount})</span>
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
                  <span>{isLimitReached ? dict.dash.limitReached : dict.dash.addProduct}</span>
                </Button>
              </Link>
              <Link href="/dashboard/orders">
                <Button variant="outline" size="sm" className="text-xs font-bold bg-white dark:bg-slate-900 border-amber-300 dark:border-amber-800">
                  <span>{dict.dash.orders}</span>
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
                <span>{dict.dash.lockedModules}</span>
              </h3>
              <p className="text-xs text-muted-foreground">
                {dict.dash.lockedHint}
              </p>
            </div>
            <Link href="/planos">
              <Button variant="outline" size="sm" className="text-xs font-bold">
                {dict.dash.seePlans}
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
                  <h4 className="font-bold text-sm text-foreground">AgriProduct</h4>
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
                <span>🔒 {dict.dash.unlockSales}</span>
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
                <span>🔒 {dict.dash.unlockTeaching}</span>
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
                <span>🔒 {dict.dash.unlockServices}</span>
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
                <span>🔒 {dict.dash.unlockMap}</span>
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
              <h3 className="font-bold text-base text-foreground">{dict.dash.upcoming}</h3>
            </div>
            <Link href="/dashboard/requests" className="text-xs font-bold text-primary hover:underline">
              Ver pedidos
            </Link>
          </div>

          <div className="space-y-3">
            {isBasic ? (
              <div className="p-8 text-center bg-surface rounded-2xl border border-border space-y-2">
                <p className="text-xs text-muted-foreground">{dict.dash.noAppointments}</p>
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
              <h3 className="font-bold text-base text-foreground">{dict.dash.recentActivity}</h3>
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
