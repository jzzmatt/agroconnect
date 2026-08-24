"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { Button, Input, WhatsAppBrandIcon } from "@/components/ui";
import { ANGOLA_PROVINCES, ANGOLA_KEY_MUNICIPALITIES } from "@/config/locations";
import { ArrowLeft, Save, Check, AlertCircle, ShieldCheck, User, Sparkles, Lock } from "lucide-react";
import {
  updateProfileDetailsAction,
  updateProfileTypesAction,
} from "@/lib/auth/profile-actions";
import { fetchClientProfileDetails } from "@/lib/auth/user-client-cache";
import { notifyProfileChanged } from "@/lib/auth/profile-events";
import { PROFILE_TYPE_CONFIG } from "@/lib/auth/identity-resolvers";
import { SUBSCRIPTION_PLANS, normalizeWhatsAppNumber } from "@/lib/services/pricing-service";
import type { ProfessionalTitle, ProfileType } from "@/types/database";

export default function EditProfilePage() {
  const { user } = useUser();

  const [displayName, setDisplayName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [professionalTitle, setProfessionalTitle] = useState<ProfessionalTitle>("none");
  const [professionalTitleCustom, setProfessionalTitleCustom] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsappPhone, setWhatsappPhone] = useState("");
  const [province, setProvince] = useState("");
  const [municipality, setMunicipality] = useState("");
  const [bio, setBio] = useState("");
  const [subscriptionPlan, setSubscriptionPlan] = useState<string | null>(null);

  // Multiple Profile Types Selection
  const [selectedProfileTypes, setSelectedProfileTypes] = useState<ProfileType[]>([
    "student",
  ]);

  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // 1. Fetch authoritative server profile details
    fetchClientProfileDetails().then((serverProfile) => {
      if (serverProfile) {
        if (serverProfile.display_name) setDisplayName(serverProfile.display_name);
        if (serverProfile.first_name) setFirstName(serverProfile.first_name);
        if (serverProfile.last_name) setLastName(serverProfile.last_name);
        if (serverProfile.phone) setPhone(serverProfile.phone);
        if (serverProfile.whatsapp_phone) setWhatsappPhone(serverProfile.whatsapp_phone);
        if (serverProfile.bio) setBio(serverProfile.bio);
        if (serverProfile.professional_title) setProfessionalTitle(serverProfile.professional_title);
        if (serverProfile.professional_title_custom) setProfessionalTitleCustom(serverProfile.professional_title_custom);
        if (serverProfile.subscription_plan) setSubscriptionPlan(serverProfile.subscription_plan);
        if (serverProfile.roles && serverProfile.roles.length > 0) {
          setSelectedProfileTypes(serverProfile.roles as ProfileType[]);
        }
      }
    });

    if (typeof window !== "undefined") {
      const realEmail = user?.primaryEmailAddress?.emailAddress || user?.emailAddresses?.[0]?.emailAddress || "";
      const clerkUsername = user?.username || "";
      const clerkFirst = user?.firstName || "";
      const clerkLast = user?.lastName || "";
      const initialDisplay = clerkUsername || (clerkFirst && clerkLast ? `${clerkFirst} ${clerkLast}` : clerkFirst) || (realEmail ? realEmail.split("@")[0] : "");

      setDisplayName((prev) => prev || initialDisplay);
      setFirstName((prev) => prev || clerkFirst);
      setLastName((prev) => prev || clerkLast);

      const savedData = localStorage.getItem("agroconnect_user_profile_override");
      if (savedData) {
        try {
          const parsed = JSON.parse(savedData);
          if (parsed.displayName) setDisplayName(parsed.displayName);
          if (parsed.firstName) setFirstName(parsed.firstName);
          if (parsed.lastName) setLastName(parsed.lastName);
          if (parsed.professionalTitle) setProfessionalTitle(parsed.professionalTitle);
          if (parsed.professionalTitleCustom) setProfessionalTitleCustom(parsed.professionalTitleCustom);
          if (parsed.phone) setPhone(parsed.phone);
          if (parsed.whatsappPhone) setWhatsappPhone(parsed.whatsappPhone);
          if (parsed.bio) setBio(parsed.bio);
          if (parsed.province) setProvince(parsed.province);
          if (parsed.municipality) setMunicipality(parsed.municipality);
          // Profile types are intentionally not restored from localStorage: the
          // database is authoritative, and a stale local copy used to fight the
          // server response and win or lose depending on network timing.
        } catch {
          // ignore
        }
      }
    }
  }, [user]);

  const handleToggleProfileType = (type: ProfileType) => {
    setSelectedProfileTypes((prev) => {
      if (prev.includes(type)) {
        if (prev.length === 1) return prev; // Keep at least one
        return prev.filter((t) => t !== type);
      }
      return [...prev, type];
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const waNormalized = normalizeWhatsAppNumber(whatsappPhone);

    try {
      await updateProfileDetailsAction({
        displayName,
        firstName,
        lastName,
        professionalTitle,
        professionalTitleCustom: professionalTitle === "custom" ? professionalTitleCustom : undefined,
        phone,
        whatsappPhone: waNormalized.normalized || whatsappPhone,
        bio,
      });

      // Profile types are durable state, so they go to the database rather than
      // localStorage. Report a failure instead of showing "saved" regardless.
      const typesResult = await updateProfileTypesAction(selectedProfileTypes);
      if (!typesResult.success) {
        setSaveError(
          typesResult.error || "Não foi possível guardar as áreas de atividade."
        );
        return;
      }
      setSelectedProfileTypes(typesResult.profileTypes);

      if (typeof window !== "undefined") {
        localStorage.setItem(
          "agroconnect_user_profile_override",
          JSON.stringify({
            displayName,
            firstName,
            lastName,
            professionalTitle,
            professionalTitleCustom,
            phone,
            whatsappPhone: waNormalized.formatted || whatsappPhone,
            bio,
            province,
            municipality,
          })
        );
      }

      // The dashboard layout and banner hold their own copy of the profile and
      // do not remount on client-side navigation, so tell them to refetch.
      notifyProfileChanged();

      setSaveError(null);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.warn("Error updating profile:", err);
      setSaveError(
        err instanceof Error ? err.message : "Não foi possível guardar o perfil."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const availableMunicipalities = ANGOLA_KEY_MUNICIPALITIES.filter(
    (m) => m.provinceName.toLowerCase() === province.toLowerCase()
  );

  const allProfileTypes: ProfileType[] = [
    "veterinarian",
    "expert",
    "instructor",
    "student",
    "seller",
    "farmer",
    "service_provider",
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href="/profile"
          className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar ao Perfil</span>
        </Link>
        <span className="text-xs font-bold text-primary uppercase tracking-wider">
          Edição de Perfil & Subscrição
        </span>
      </div>

      <div className="bg-surface-card rounded-3xl p-6 sm:p-8 border border-border shadow-xs space-y-8">
        <div className="border-b border-border pb-4">
          <h2 className="text-xl font-black text-foreground">
            Configuração de Identidade & Perfil
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Personalize os seus dados, contactos de WhatsApp e áreas de atuação no ecossistema de Angola.
          </p>
        </div>

        <form onSubmit={handleSave} className="space-y-8">
          {/* ======================================================== */}
          {/* 1. IDENTIDADE                                            */}
          {/* ======================================================== */}
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-primary flex items-center gap-2">
              <span>1. IDENTIDADE</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-foreground mb-1">
                  Nome
                </label>
                <Input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Ex: João"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1">
                  Apelido
                </label>
                <Input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Ex: Silva"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-foreground mb-1">
                Nome de Apresentação
              </label>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Como pretende ser apresentado no AgriConnect?"
                required
              />
              <span className="text-[11px] text-muted-foreground mt-1 block">
                Este nome é usado prioritariamente no cabeçalho do painel e nas suas publicações.
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-foreground mb-1">
                  Título Profissional
                </label>
                <select
                  value={professionalTitle}
                  onChange={(e) => setProfessionalTitle(e.target.value as any)}
                  className="w-full text-xs bg-surface border border-border rounded-xl px-3.5 py-2.5 text-foreground font-semibold focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                >
                  <option value="none">Nenhum (Apenas Nome)</option>
                  <option value="Dr.">Dr. (Médico Veterinário / Doutor)</option>
                  <option value="Prof.">Prof. (Professor / Instrutor)</option>
                  <option value="Eng.">Eng. (Engenheiro Agrónomo)</option>
                  <option value="Tec.">Tec. (Técnico Agrícola)</option>
                  <option value="custom">Outro (Personalizado)</option>
                </select>
              </div>

              {professionalTitle === "custom" && (
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">
                    Título Personalizado
                  </label>
                  <Input
                    value={professionalTitleCustom}
                    onChange={(e) => setProfessionalTitleCustom(e.target.value)}
                    placeholder="Ex: Consultor"
                  />
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-foreground mb-1">
                Biografia e Especialidades
              </label>
              <textarea
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Descreva a sua experiência, culturas agrícolas ou produtos..."
                className="w-full rounded-2xl border border-input-border bg-input p-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              />
            </div>
          </div>

          {/* ======================================================== */}
          {/* 2. CONTACTOS & WHATSAPP                                  */}
          {/* ======================================================== */}
          <div className="space-y-4 pt-4 border-t border-border">
            <h3 className="text-xs font-black uppercase tracking-wider text-primary">
              2. CONTACTOS & WHATSAPP
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-foreground mb-1">
                  Telefone Principal
                </label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+244 9XX XXX XXX"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1 flex items-center gap-1.5">
                  <span className="text-emerald-600 dark:text-emerald-400">
                    <WhatsAppBrandIcon className="w-4 h-4 fill-current inline-block" />
                  </span>
                  <span>WhatsApp de Atendimento</span>
                </label>
                <Input
                  value={whatsappPhone}
                  onChange={(e) => setWhatsappPhone(e.target.value)}
                  placeholder="+244 9XX XXX XXX"
                />
                <span className="text-[11px] text-muted-foreground mt-1 block">
                  Permite aos clientes e produtores contactá-lo diretamente via WhatsApp.
                </span>
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* 3. LOCALIZAÇÃO                                           */}
          {/* ======================================================== */}
          <div className="space-y-4 pt-4 border-t border-border">
            <h3 className="text-xs font-black uppercase tracking-wider text-primary">
              3. LOCALIZAÇÃO
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-foreground mb-1">
                  Província
                </label>
                <select
                  value={province}
                  onChange={(e) => {
                    setProvince(e.target.value);
                    setMunicipality("");
                  }}
                  className="w-full text-xs bg-surface border border-border rounded-xl px-3.5 py-2.5 text-foreground font-semibold focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                >
                  {ANGOLA_PROVINCES.map((p) => (
                    <option key={p.code} value={p.name}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1">
                  Município
                </label>
                <select
                  value={municipality}
                  onChange={(e) => setMunicipality(e.target.value)}
                  className="w-full text-xs bg-surface border border-border rounded-xl px-3.5 py-2.5 text-foreground font-semibold focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                >
                  <option value="">Selecione o Município</option>
                  {availableMunicipalities.map((m) => (
                    <option key={m.code} value={m.name}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* 4. ÁREAS DE ATUAÇÃO NO ECOSSISTEMA                       */}
          {/* ======================================================== */}
          <div className="space-y-4 pt-4 border-t border-border">
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-primary">
                4. ÁREAS DE ATUAÇÃO NO ECOSSISTEMA
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Selecione todas as áreas de atividade que descrevem o seu perfil no AgriConnect.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {allProfileTypes.map((type) => {
                const config = PROFILE_TYPE_CONFIG[type] || PROFILE_TYPE_CONFIG.personal;
                const isSelected = selectedProfileTypes.includes(type);

                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => handleToggleProfileType(type)}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isSelected
                        ? "bg-secondary border-primary shadow-xs ring-2 ring-primary/20 font-bold text-foreground"
                        : "bg-surface border-border hover:bg-muted text-muted-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-xl shrink-0">{config.icon}</span>
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-foreground block truncate">
                          {config.label}
                        </span>
                        <span className="text-[10px] text-muted-foreground block truncate">
                          {config.description}
                        </span>
                      </div>
                    </div>

                    <div
                      className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${
                        isSelected
                          ? "bg-primary border-primary text-primary-foreground"
                          : "border-input-border bg-surface"
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ======================================================== */}
          {/* 5. SUBSCRIÇÃO & PLANO ATUAL                              */}
          {/* ======================================================== */}
          <div className="space-y-4 pt-4 border-t border-border">
            <h3 className="text-xs font-black uppercase tracking-wider text-primary">
              5. SUBSCRIÇÃO & PLANO ATUAL
            </h3>

            <div className="bg-surface p-5 rounded-2xl border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                  Plano Ativo
                </span>
                {subscriptionPlan ? (
                  <>
                    <div className="flex items-center gap-2">
                      <h4 className="text-base font-black text-foreground capitalize">
                        Plano {SUBSCRIPTION_PLANS[subscriptionPlan as keyof typeof SUBSCRIPTION_PLANS]?.name || subscriptionPlan}
                      </h4>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                        Ativo
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {SUBSCRIPTION_PLANS[subscriptionPlan as keyof typeof SUBSCRIPTION_PLANS]?.priceFormatted}/mês • {SUBSCRIPTION_PLANS[subscriptionPlan as keyof typeof SUBSCRIPTION_PLANS]?.tagline}
                    </p>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <h4 className="text-base font-black text-amber-600">Plano ainda não selecionado</h4>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                        Pendente
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Escolha um dos planos para começar a criar e publicar produtos ou cursos.
                    </p>
                  </>
                )}
              </div>

              <Link href="/planos" className="shrink-0">
                <Button variant="outline" size="sm" className="font-bold text-xs">
                  <span>{subscriptionPlan ? "Alterar Plano" : "Escolher Plano"}</span>
                </Button>
              </Link>
            </div>
          </div>

          {/* Save Action Bar */}
          <div className="pt-4 border-t border-border flex items-center justify-between">
            {saveError ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-red-600">
                <AlertCircle className="w-4 h-4" />
                {saveError}
              </span>
            ) : saved ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600">
                <Check className="w-4 h-4" />
                Alterações guardadas com sucesso!
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">
                As alterações atualizam a sua identidade em todo o ecossistema.
              </span>
            )}

            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isLoading}
              className="gap-2 font-bold px-6 shadow-md cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Guardar Perfil</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
