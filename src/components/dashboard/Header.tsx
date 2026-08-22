"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useClerk } from "@clerk/nextjs";
import { Menu, Bell, User, Search, MapPin, ChevronDown, UserCircle, Settings, LogOut, Heart, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ThemeSwitcher } from "@/components/ui/ThemeSwitcher";
import { ProfileSwitcher } from "./ProfileSwitcher";
import type { ProfileType } from "@/types/database";
import { PROFILE_TYPE_CONFIG } from "@/lib/auth/identity-resolvers";

interface DashboardHeaderProps {
  onOpenMobileMenu: () => void;
  title?: string;
  userDisplayName?: string;
  userProvince?: string;
  activeProfile?: ProfileType;
  availableProfiles?: ProfileType[];
  onSwitchProfile?: (profile: ProfileType) => void;
}

export function DashboardHeader({
  onOpenMobileMenu,
  title = "Painel",
  userDisplayName = "Utilizador AGROCONNECT",
  userProvince = "Huambo, Angola",
  activeProfile = "expert",
  availableProfiles = ["expert", "instructor", "student", "seller"],
  onSwitchProfile,
}: DashboardHeaderProps) {
  const router = useRouter();
  const { signOut } = useClerk();
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const activeConfig = PROFILE_TYPE_CONFIG[activeProfile] || PROFILE_TYPE_CONFIG.personal;

  const handleSignOut = async () => {
    setAccountMenuOpen(false);
    if (typeof window !== "undefined") {
      localStorage.removeItem("agroconnect_active_profile_type");
      localStorage.removeItem("agroconnect_user_profile_override");
      sessionStorage.removeItem("agroconnect_prompted_profile_selector");
    }
    await signOut({ redirectUrl: "/" });
  };

  return (
    <header className="h-16 bg-surface-elevated border-b border-border px-4 sm:px-6 lg:px-8 flex items-center justify-between sticky top-0 z-20 transition-colors">
      {/* Left title & mobile trigger */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 text-foreground hover:bg-muted rounded-lg focus:outline-none"
          aria-label="Abrir menu lateral"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="min-w-0">
          <h1 className="text-base sm:text-lg font-bold text-foreground truncate">{title}</h1>
        </div>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
        <div className="hidden md:flex items-center gap-1.5 text-xs text-secondary-foreground bg-secondary px-2.5 py-1 rounded-full border border-border font-medium">
          <MapPin className="w-3.5 h-3.5 text-primary" />
          <span>{userProvince}</span>
        </div>

        <Link href="/agrilocalizacao" className="hidden sm:block">
          <Button variant="outline" size="sm" className="h-8 text-xs font-bold border-border">
            Explorar Mapa
          </Button>
        </Link>

        <ThemeSwitcher />

        {/* Global Account Menu */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setAccountMenuOpen(!accountMenuOpen)}
            className="flex items-center gap-2 p-1 sm:px-2 sm:py-1 rounded-xl hover:bg-muted transition-colors cursor-pointer border border-border bg-surface"
          >
            <div className="w-7 h-7 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs shrink-0">
              {userDisplayName.charAt(0)}
            </div>
            <span className="hidden sm:inline text-xs font-bold text-foreground truncate max-w-[120px]">
              {userDisplayName}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
          </button>

          {accountMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setAccountMenuOpen(false)}
              />
              <div className="absolute right-0 mt-2 w-56 bg-surface-elevated rounded-2xl border border-border shadow-xl p-1.5 space-y-1 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-2 border-b border-border">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase block">
                    Sessão Iniciada
                  </span>
                  <span className="text-xs font-black text-foreground truncate block">
                    {userDisplayName}
                  </span>
                  <span className="text-[11px] text-primary font-bold flex items-center gap-1 mt-0.5">
                    <span>{activeConfig.icon}</span>
                    <span>{activeConfig.label}</span>
                  </span>
                </div>

                <Link
                  href="/profile"
                  onClick={() => setAccountMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-foreground hover:bg-muted transition-colors"
                >
                  <UserCircle className="w-4 h-4 text-primary" />
                  <span>Meu Perfil</span>
                </Link>

                <Link
                  href="/orders"
                  onClick={() => setAccountMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-foreground hover:bg-muted transition-colors"
                >
                  <Heart className="w-4 h-4 text-primary" />
                  <span>Minhas Compras</span>
                </Link>

                <Link
                  href="/settings"
                  onClick={() => setAccountMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-foreground hover:bg-muted transition-colors"
                >
                  <Settings className="w-4 h-4 text-primary" />
                  <span>Definições da Conta</span>
                </Link>

                <div className="pt-1 border-t border-border">
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-4 h-4 text-destructive" />
                    <span>Terminar Sessão</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
