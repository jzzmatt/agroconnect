"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  DollarSign,
  BookOpen,
  Calendar,
  ShoppingBag,
  Users,
  Lock,
  Sparkles,
} from "lucide-react";
import { MetricCard, Button, UpgradePlanModal } from "@/components/ui";
import { DashboardInboxPreview } from "@/components/notifications/NotificationCenter";
import { useI18n } from "@/i18n/provider";
import { getLocalizedPlanCopy } from "@/i18n/plan-copy";
import { useUser } from "@clerk/nextjs";
import { getUserGreeting, PROFILE_TYPE_CONFIG } from "@/lib/auth/identity-resolvers";
import { SUBSCRIPTION_PLANS } from "@/lib/services/pricing-service";
import { fetchClientProfileDetails } from "@/lib/auth/user-client-cache";
import { useProfileChangeListener } from "@/lib/auth/profile-events";
import { getAgriprofileOverviewAction } from "@/lib/agriprofile/overview-actions";
import { emptyAgriprofileOverview, formatDashboardAmount } from "@/lib/agriprofile/overview";
import { useAuthoritativePlan } from "@/lib/subscription/use-authoritative-plan";
import type { AgriprofileOverview } from "@/types/agriprofile";
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
  });

  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [modalFeatureTitle, setModalFeatureTitle] = useState("Criar Produto no AgriShopping");
  const [modalRequiredPlan, setModalRequiredPlan] = useState<"professional" | "business">("professional");
  const [overview, setOverview] = useState<AgriprofileOverview>(emptyAgriprofileOverview);
  const [overviewLoaded, setOverviewLoaded] = useState(false);

  const loadServerProfile = useCallback(async () => {
    const serverProfile = await fetchClientProfileDetails();
    if (!serverProfile) return;

    setProfile((prev) => ({
      ...prev,
      displayName: serverProfile.display_name || prev.displayName,
      firstName: serverProfile.first_name || prev.firstName,
      lastName: serverProfile.last_name || prev.lastName,
      email: serverProfile.email || prev.email,
      professionalTitle: serverProfile.professional_title || prev.professionalTitle,
      activeProfile: serverProfile.active_profile_type || prev.activeProfile,
    }));
  }, []);

  useProfileChangeListener(loadServerProfile);

  useEffect(() => {
    loadServerProfile();

    const loadOverview = () => {
      getAgriprofileOverviewAction()
        .then((result) => setOverview(result))
        .catch(() => setOverview(emptyAgriprofileOverview()))
        .finally(() => setOverviewLoaded(true));
    };
    loadOverview();
    const refreshOverview = () => {
      if (document.visibilityState === "hidden") return;
      loadOverview();
    };
    window.addEventListener("focus", refreshOverview);
    document.addEventListener("visibilitychange", refreshOverview);

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

    return () => {
      window.removeEventListener("focus", refreshOverview);
      document.removeEventListener("visibilitychange", refreshOverview);
    };
  }, [user?.id, loadServerProfile]);

  const greeting = getUserGreeting({
    displayName: profile.displayName,
    firstName: profile.firstName,
    lastName: profile.lastName,
    username: user?.username,
    email: profile.email || user?.primaryEmailAddress?.emailAddress,
    professionalTitle: profile.professionalTitle,
    activeProfile: profile.activeProfile,
  });

  const activeProfileConfig = PROFILE_TYPE_CONFIG[profile.activeProfile] || PROFILE_TYPE_CONFIG.personal;
  const currentPlanDef = plan ? SUBSCRIPTION_PLANS[plan] : null;
  const planCopy = plan ? getLocalizedPlanCopy(dict, plan) : null;

  const isBasic = plan === "basic";

  const triggerLockedModule = (title: string, plan: "professional" | "business" = "professional") => {
    setModalFeatureTitle(title);
    setModalRequiredPlan(plan);
    setUpgradeModalOpen(true);
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

  const currency = overview.currency || "AOA";
  const kpiValue = (value: string) => (overviewLoaded ? value : "—");
  const kpiCards = [
    {
      title: dict.dash.totalEarnings,
      value: kpiValue(formatDashboardAmount(overview.totalEarnings, currency)),
      description: dict.dash.fromYourAccount,
      icon: DollarSign,
    },
    {
      title: dict.dash.courseSales,
      value: kpiValue(formatDashboardAmount(overview.courseSales, currency)),
      description: dict.navigation.agriAcademy,
      icon: BookOpen,
    },
    {
      title: dict.dash.activeConsults,
      value: kpiValue(String(overview.activeConsultations)),
      description: dict.navigation.agriExpert,
      icon: Calendar,
    },
    {
      title: dict.dash.productsSold,
      value: kpiValue(String(overview.productsSold)),
      description: dict.navigation.agriShopping,
      icon: ShoppingBag,
    },
    {
      title: dict.dash.totalStudents,
      value: kpiValue(String(overview.totalStudents)),
      description: dict.dash.manageCourses,
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

        {isBasic ? (
          <div className="flex items-center gap-2.5 flex-wrap self-start sm:self-auto">
            <Link href="/planos">
              <Button variant="primary" size="sm" className="gap-1.5 font-bold text-xs h-10 px-5 shadow-md">
                <Sparkles className="w-4 h-4" />
                <span>{dict.dash.upgradePlan}</span>
              </Button>
            </Link>
          </div>
        ) : null}
      </div>

      {/* Locked modules stay available for subscribers who cannot create yet. */}
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
                  Destaque a localização da sua fazenda ou loja nas 21 províncias.
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
            icon={kpi.icon}
          />
        ))}
      </div>

      <DashboardInboxPreview />

      <UpgradePlanModal
        isOpen={upgradeModalOpen}
        onClose={() => setUpgradeModalOpen(false)}
        featureTitle={modalFeatureTitle}
        requiredPlan={modalRequiredPlan}
        currentPlanName={currentPlanDef.name}
      />
    </div>
  );
}
