"use client";

import React, { useState, useEffect, useCallback } from "react";
import { DashboardSidebar, DashboardHeader } from "@/components/dashboard";
import { MobileBottomNav } from "@/components/navigation";
import type { UserRoleType, ProfileType } from "@/types/database";
import { switchActiveProfileTypeAction, getProfileDetailsAction } from "@/lib/auth/profile-actions";
import { useProfileChangeListener, notifyProfileChanged } from "@/lib/auth/profile-events";
import { useAuthoritativePlan } from "@/lib/subscription/use-authoritative-plan";
import { useUser } from "@clerk/nextjs";
import { useI18n } from "@/i18n/provider";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useUser();
  const { locale } = useI18n();
  const { plan, marketCountry } = useAuthoritativePlan();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeProfile, setActiveProfile] = useState<ProfileType>("personal");
  const [availableProfiles, setAvailableProfiles] = useState<ProfileType[]>([
    "student",
  ]);
  const [userRoles, setUserRoles] = useState<UserRoleType[]>(["student"]);
  const [displayName, setDisplayName] = useState("Utilizador");

  const loadServerProfile = useCallback(async () => {
    const serverProfile = await getProfileDetailsAction();
    if (!serverProfile) return;

    if (serverProfile.display_name) setDisplayName(serverProfile.display_name);
    if (serverProfile.active_profile_type) setActiveProfile(serverProfile.active_profile_type);
    if (serverProfile.roles && serverProfile.roles.length > 0) {
      setAvailableProfiles(serverProfile.roles as ProfileType[]);
      setUserRoles(serverProfile.roles as UserRoleType[]);
    }
  }, []);

  // This layout survives client-side navigation, so a save on /profile/edit does
  // not remount it. Without this it would keep the profile it first fetched.
  useProfileChangeListener(loadServerProfile);

  useEffect(() => {
    loadServerProfile();

    if (typeof window !== "undefined") {
      const realEmail = user?.primaryEmailAddress?.emailAddress || user?.emailAddresses?.[0]?.emailAddress || "";
      const clerkUsername = user?.username || "";
      const clerkFirst = user?.firstName || "";
      const clerkLast = user?.lastName || "";
      const initialDisplay = clerkUsername || (clerkFirst && clerkLast ? `${clerkFirst} ${clerkLast}` : clerkFirst) || (realEmail ? realEmail.split("@")[0] : "Utilizador");

      setDisplayName((prev) => (prev !== "Utilizador" ? prev : initialDisplay));

      // Pre-hydration only, to avoid a flicker before the server profile
      // arrives. The server response below is authoritative and overwrites it.
      const cachedActive = localStorage.getItem("agroconnect_active_profile_type");
      if (cachedActive) {
        setActiveProfile(cachedActive as ProfileType);
      }

      const profileOverride = localStorage.getItem("agroconnect_user_profile_override");
      if (profileOverride) {
        try {
          const parsed = JSON.parse(profileOverride);
          if (parsed.displayName) setDisplayName(parsed.displayName);
          // Available profiles come from the persisted roles, never from
          // localStorage: a stale local copy raced the server response here.
        } catch {
          // ignore — subscription is never read from localStorage
        }
      }
    }
  }, [user, loadServerProfile]);

  const handleSwitchProfile = async (profile: ProfileType) => {
    const previous = activeProfile;
    setActiveProfile(profile);
    if (typeof window !== "undefined") {
      localStorage.setItem("agroconnect_active_profile_type", profile);
    }

    const result = await switchActiveProfileTypeAction(profile);
    if (!result.success) {
      // Showing a switch that did not persist is worse than not switching: it
      // silently reverts on the next page load.
      setActiveProfile(previous);
      if (typeof window !== "undefined") {
        localStorage.setItem("agroconnect_active_profile_type", previous);
      }
      return;
    }
    // Let the dashboard banner and profile view pick up the new active profile.
    notifyProfileChanged();
  };

  const activeRoles: UserRoleType[] = userRoles.length > 0 ? userRoles : ["student"];

  return (
    <div className="min-h-screen bg-background text-foreground flex transition-colors overflow-x-hidden">
      <DashboardSidebar
        userRoles={activeRoles}
        availableProfiles={availableProfiles}
        activeProfile={activeProfile}
        subscriptionPlan={plan}
        onSwitchProfile={handleSwitchProfile}
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <DashboardHeader
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          userDisplayName={displayName}
          userProvince={`${marketCountry.flag} ${marketCountry.name[locale] || marketCountry.name.pt}`}
          activeProfile={activeProfile}
          availableProfiles={availableProfiles}
          onSwitchProfile={handleSwitchProfile}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto pb-24 lg:pb-12">
          {children}
        </main>

        <MobileBottomNav variant="dashboard" />
      </div>
    </div>
  );
}
