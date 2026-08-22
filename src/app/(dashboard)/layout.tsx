"use client";

import React, { useState, useEffect } from "react";
import { DashboardSidebar, DashboardHeader } from "@/components/dashboard";
import { MobileBottomNav } from "@/components/navigation";
import type { UserRoleType, ProfileType } from "@/types/database";
import { switchActiveProfileTypeAction, getProfileDetailsAction } from "@/lib/auth/profile-actions";
import { useAuthoritativePlan } from "@/lib/subscription/use-authoritative-plan";
import { useUser } from "@clerk/nextjs";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useUser();
  const { plan, marketCountry } = useAuthoritativePlan();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeProfile, setActiveProfile] = useState<ProfileType>("personal");
  const [availableProfiles, setAvailableProfiles] = useState<ProfileType[]>([
    "student",
  ]);
  const [displayName, setDisplayName] = useState("Utilizador");

  useEffect(() => {
    getProfileDetailsAction().then((serverProfile) => {
      if (serverProfile) {
        if (serverProfile.display_name) setDisplayName(serverProfile.display_name);
        if (serverProfile.active_profile_type) setActiveProfile(serverProfile.active_profile_type);
        if (serverProfile.roles && serverProfile.roles.length > 0) {
          setAvailableProfiles(serverProfile.roles as ProfileType[]);
        }
      }
    });

    if (typeof window !== "undefined") {
      const realEmail = user?.primaryEmailAddress?.emailAddress || user?.emailAddresses?.[0]?.emailAddress || "";
      const clerkUsername = user?.username || "";
      const clerkFirst = user?.firstName || "";
      const clerkLast = user?.lastName || "";
      const initialDisplay = clerkUsername || (clerkFirst && clerkLast ? `${clerkFirst} ${clerkLast}` : clerkFirst) || (realEmail ? realEmail.split("@")[0] : "Utilizador");

      setDisplayName((prev) => (prev !== "Utilizador" ? prev : initialDisplay));

      const saved = localStorage.getItem("agroconnect_active_profile_type");
      if (saved) {
        setActiveProfile(saved as ProfileType);
      }

      const profileOverride = localStorage.getItem("agroconnect_user_profile_override");
      if (profileOverride) {
        try {
          const parsed = JSON.parse(profileOverride);
          if (parsed.displayName) setDisplayName(parsed.displayName);
          if (parsed.selectedProfileTypes) setAvailableProfiles(parsed.selectedProfileTypes);
        } catch {
          // ignore — subscription is never read from localStorage
        }
      }
    }
  }, [user]);

  const handleSwitchProfile = async (profile: ProfileType) => {
    setActiveProfile(profile);
    if (typeof window !== "undefined") {
      localStorage.setItem("agroconnect_active_profile_type", profile);
    }
    await switchActiveProfileTypeAction(profile);
  };

  const activeRoles: UserRoleType[] = [
    "student",
  ];

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
          userProvince={`${marketCountry.flag} ${marketCountry.name.pt}`}
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
