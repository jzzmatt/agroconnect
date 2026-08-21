"use client";

import React from "react";
import Link from "next/link";
import { Menu, Bell, User, Search, MapPin } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ThemeSwitcher } from "@/components/ui/ThemeSwitcher";
import { UserProfileButton } from "@/features/auth/components";

interface DashboardHeaderProps {
  onOpenMobileMenu: () => void;
  title?: string;
  userDisplayName?: string;
  userProvince?: string;
}

export function DashboardHeader({
  onOpenMobileMenu,
  title = "Painel",
  userDisplayName = "Utilizador AGROCONNECT",
  userProvince = "Huambo, Angola",
}: DashboardHeaderProps) {
  return (
    <header className="h-16 bg-white border-b border-emerald-900/10 px-4 sm:px-6 lg:px-8 flex items-center justify-between sticky top-0 z-20">
      {/* Left title & mobile trigger */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 text-emerald-900 hover:bg-emerald-50 rounded-lg focus:outline-none"
          aria-label="Abrir menu lateral"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-base sm:text-lg font-bold text-emerald-950 truncate">{title}</h1>
        </div>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200/60 font-medium">
          <MapPin className="w-3.5 h-3.5 text-emerald-600" />
          <span>{userProvince}</span>
        </div>

        <Link href="/agrilocalizacao" className="hidden sm:block">
          <Button variant="outline" size="sm" className="h-8 text-xs font-bold border-border">
            Explorar Mapa
          </Button>
        </Link>

        <ThemeSwitcher />

        {/* User profile dropdown / Clerk UserButton */}
        <div className="flex items-center gap-2 pl-2 border-l border-border">
          <UserProfileButton />
        </div>
      </div>
    </header>
  );
}
