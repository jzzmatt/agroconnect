"use client";

import React, { useState, useEffect } from "react";
import { DashboardSidebar, DashboardHeader } from "@/components/dashboard";
import { MobileBottomNav } from "@/components/navigation";
import type { UserRoleType, ProfileType } from "@/types/database";
import { switchActiveProfileTypeAction } from "@/lib/auth/profile-actions";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeProfile, setActiveProfile] = useState<ProfileType>("personal");
  const [availableProfiles] = useState<ProfileType[]>([
    "student",
  ]);
  const [displayName, setDisplayName] = useState("Utilizador");
  const [subscriptionPlan, setSubscriptionPlan] = useState<string>("basic");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("agroconnect_active_profile_type");
      if (saved) {
        setActiveProfile(saved as ProfileType);
      }

      const profileOverride = localStorage.getItem("agroconnect_user_profile_override");
      if (profileOverride) {
        try {
          const parsed = JSON.parse(profileOverride);
          if (parsed.displayName) setDisplayName(parsed.displayName);
          if (parsed.subscriptionPlan) setSubscriptionPlan(parsed.subscriptionPlan);
        } catch {
          // ignore
        }
      }
    }
  }, [availableProfiles.length]);

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
    <div className="min-h-screen bg-background text-foreground flex transition-colors">
      {/* Role-Adaptive & Active Profile Context Sidebar */}
      <DashboardSidebar
        userRoles={activeRoles}
        availableProfiles={availableProfiles}
        activeProfile={activeProfile}
        subscriptionPlan={subscriptionPlan}
        onSwitchProfile={handleSwitchProfile}
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <DashboardHeader
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          userDisplayName={displayName}
          userProvince="Huambo, Angola"
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
