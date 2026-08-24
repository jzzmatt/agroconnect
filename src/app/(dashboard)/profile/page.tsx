"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { MapPin, Mail, Phone, ShieldCheck, Edit, Sparkles, Store, GraduationCap, Briefcase } from "lucide-react";
import { Button, Badge, Avatar, WhatsAppBrandIcon } from "@/components/ui";
import { LocationBadge } from "@/components/location";
import { PROFILE_TYPE_CONFIG, getUserGreeting } from "@/lib/auth/identity-resolvers";
import { normalizeWhatsAppNumber, SUBSCRIPTION_PLANS } from "@/lib/services/pricing-service";
import { getProfileDetailsAction } from "@/lib/auth/profile-actions";
import { useProfileChangeListener } from "@/lib/auth/profile-events";
import { useAuthoritativePlan } from "@/lib/subscription/use-authoritative-plan";
import type { ProfileType, ProfessionalTitle } from "@/types/database";

export default function ProfilePage() {
  const { user } = useUser();
  const { plan } = useAuthoritativePlan();

  const [profileData, setProfileData] = useState({
    displayName: "",
    firstName: "",
    lastName: "",
    professionalTitle: "none" as ProfessionalTitle,
    professionalTitleCustom: "",
    title: "",
    email: "",
    phone: "",
    whatsappPhone: "",
    province: "",
    municipality: "",
    bio: "",
    roles: ["student"] as ProfileType[],
    activeProfile: "personal" as ProfileType,
    subscriptionPlan: "" as string,
    activeSince: "Agosto 2026",
    isVerified: false,
  });

  const loadServerProfile = useCallback(async () => {
    const serverProfile = await getProfileDetailsAction();
    if (!serverProfile) return;

    setProfileData((prev) => ({
      ...prev,
      displayName: serverProfile.display_name || prev.displayName,
      firstName: serverProfile.first_name || prev.firstName,
      lastName: serverProfile.last_name || prev.lastName,
      email: serverProfile.email || prev.email,
      phone: serverProfile.phone || prev.phone,
      whatsappPhone: serverProfile.whatsapp_phone || prev.whatsappPhone,
      bio: serverProfile.bio || prev.bio,
      professionalTitle: serverProfile.professional_title || prev.professionalTitle,
      professionalTitleCustom: serverProfile.professional_title_custom || prev.professionalTitleCustom,
      activeProfile: serverProfile.active_profile_type || prev.activeProfile,
    subscriptionPlan: serverProfile.subscription_plan ?? "",
      // Replaced outright rather than merged: a removed area of activity must
      // disappear from the card, not linger from the previous render.
      roles:
        serverProfile.roles && serverProfile.roles.length > 0
          ? (serverProfile.roles as ProfileType[])
          : prev.roles,
    }));
  }, []);

  useProfileChangeListener(loadServerProfile);

  useEffect(() => {
    loadServerProfile();

    if (typeof window !== "undefined") {
      const realEmail = user?.primaryEmailAddress?.emailAddress || user?.emailAddresses?.[0]?.emailAddress || "";
      const clerkUsername = user?.username || "";
      const clerkFirst = user?.firstName || "";
      const clerkLast = user?.lastName || "";
      const defaultName = clerkUsername || (clerkFirst && clerkLast ? `${clerkFirst} ${clerkLast}` : clerkFirst) || (realEmail ? realEmail.split("@")[0] : "Utilizador");

      setProfileData((prev) => ({
        ...prev,
        displayName: prev.displayName || defaultName,
        firstName: prev.firstName || clerkFirst,
        lastName: prev.lastName || clerkLast,
        email: prev.email || realEmail,
      }));

      const saved = localStorage.getItem("agroconnect_user_profile_override");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setProfileData((prev) => ({
            ...prev,
            displayName: parsed.displayName || prev.displayName,
            firstName: parsed.firstName || prev.firstName,
            lastName: parsed.lastName || prev.lastName,
            professionalTitle: parsed.professionalTitle || prev.professionalTitle,
            phone: parsed.phone || prev.phone,
            whatsappPhone: parsed.whatsappPhone || prev.whatsappPhone,
            bio: parsed.bio || prev.bio,
            province: parsed.province || prev.province,
            municipality: parsed.municipality || prev.municipality,
            // `roles` is intentionally not read from localStorage: the persisted
            // roles are authoritative and a stale local copy raced them.
          }));
        } catch {
          // Keep defaults
        }
      }
    }
  }, [user, loadServerProfile]);

  const greeting = getUserGreeting({
    displayName: profileData.displayName,
    firstName: profileData.firstName,
    lastName: profileData.lastName,
    username: user?.username,
    email: profileData.email || user?.primaryEmailAddress?.emailAddress,
    professionalTitle: profileData.professionalTitle,
    activeProfile: profileData.activeProfile,
  });

  const wa = normalizeWhatsAppNumber(profileData.whatsappPhone);

  const planSlug = plan;
  const planDef = planSlug ? SUBSCRIPTION_PLANS[planSlug] : null;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Profile Header Card */}
      <div className="bg-surface-card rounded-3xl p-6 sm:p-8 border border-border shadow-xs relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          <Avatar
            fallbackText={greeting.displayName}
            size="xl"
            className="w-20 h-20 text-2xl"
          />

          <div className="space-y-1.5 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-black text-foreground">
                {greeting.fullNameOrTitle}
              </h1>
              {profileData.isVerified && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  ✓ Verificado
                </span>
              )}
            </div>

            {profileData.title ? (
              <p className="text-sm font-semibold text-primary">{profileData.title}</p>
            ) : null}

            <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-muted-foreground">
              {profileData.province ? (
                <LocationBadge
                  provinceName={profileData.province}
                  municipalityName={profileData.municipality || undefined}
                  size="sm"
                />
              ) : (
                <span className="text-muted-foreground italic">Localização não definida</span>
              )}
              <span>
                • Plano: <strong className="text-foreground font-bold">{planDef ? `${planDef.name} (${planDef.priceFormatted}/mês)` : dict.dash.noSubscription}</strong>
              </span>
              <span>• Membro desde {profileData.activeSince}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {wa.isValid && (
              <a
                href={wa.waLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition-all cursor-pointer"
              >
                <WhatsAppBrandIcon className="w-4 h-4 fill-current" />
                <span>WhatsApp</span>
              </a>
            )}

            <Link href="/profile/edit">
              <Button variant="outline" size="sm" className="gap-1.5 font-bold">
                <Edit className="w-3.5 h-3.5" />
                <span>Editar Perfil</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Bio and Areas of Activity */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-surface-card rounded-3xl p-6 border border-border shadow-xs space-y-3">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
              Biografia Profissional
            </h3>
            <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-line">
              {profileData.bio || "Adicione uma breve descrição profissional na página de edição."}
            </p>
          </div>

          {/* Ecosystem Areas of Activity */}
          <div className="bg-surface-card rounded-3xl p-6 border border-border shadow-xs space-y-3">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
              ÁREAS DE ATUAÇÃO NO ECOSSISTEMA
            </h3>
            <div className="flex flex-wrap gap-2 pt-1">
              {profileData.roles.map((role) => {
                const config = PROFILE_TYPE_CONFIG[role] || PROFILE_TYPE_CONFIG.personal;
                return (
                  <span
                    key={role}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface border border-border text-xs font-bold text-foreground shadow-2xs"
                  >
                    <span>{config.icon}</span>
                    <span>{config.label}</span>
                  </span>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Contact & Location details */}
        <div className="space-y-6">
          <div className="bg-surface-card rounded-3xl p-6 border border-border shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
              CONTACTOS & LOCALIZAÇÃO
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex items-center gap-2.5 text-foreground">
                <Mail className="w-4 h-4 text-primary shrink-0" />
                <span className="truncate">{profileData.email || user?.primaryEmailAddress?.emailAddress || "Email não registado"}</span>
              </div>
              {profileData.phone ? (
                <div className="flex items-center gap-2.5 text-foreground">
                  <Phone className="w-4 h-4 text-primary shrink-0" />
                  <span>{profileData.phone}</span>
                </div>
              ) : null}
              {wa.isValid && (
                <div className="flex items-center gap-2.5 text-emerald-700 dark:text-emerald-300 font-semibold">
                  <WhatsAppBrandIcon className="w-4 h-4 fill-current shrink-0" />
                  <span>{wa.formatted}</span>
                </div>
              )}
              {profileData.province ? (
                <div className="flex items-center gap-2.5 text-foreground">
                  <MapPin className="w-4 h-4 text-primary shrink-0" />
                  <span>{profileData.municipality ? `${profileData.municipality}, ` : ""}{profileData.province} • Angola</span>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
