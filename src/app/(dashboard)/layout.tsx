"use client";

import React, { useState } from "react";
import { DashboardSidebar, DashboardHeader } from "@/components/dashboard";
import { MobileBottomNav } from "@/components/navigation";
import type { UserRoleType } from "@/types/database";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Demo user roles supporting multiple roles (veterinarian + instructor + student)
  const activeRoles: UserRoleType[] = ["veterinarian", "instructor", "student"];

  return (
    <div className="min-h-screen bg-slate-50/60 flex">
      {/* Role-Adaptive Sidebar */}
      <DashboardSidebar
        userRoles={activeRoles}
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <DashboardHeader
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          userProvince="Huambo, Angola"
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto pb-24 lg:pb-12">
          {children}
        </main>

        <MobileBottomNav />
      </div>
    </div>
  );
}
