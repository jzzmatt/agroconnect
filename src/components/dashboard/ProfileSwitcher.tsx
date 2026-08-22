"use client";

import React, { useState } from "react";
import { Check, ChevronDown, Sparkles } from "lucide-react";
import type { ProfileType } from "@/types/database";
import { PROFILE_TYPE_CONFIG } from "@/lib/auth/identity-resolvers";

interface ProfileSwitcherProps {
  availableProfiles: ProfileType[];
  activeProfile: ProfileType;
  onSwitch: (profile: ProfileType) => void;
  className?: string;
}

export function ProfileSwitcher({
  availableProfiles,
  activeProfile,
  onSwitch,
  className,
}: ProfileSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);

  const currentConfig = PROFILE_TYPE_CONFIG[activeProfile] || PROFILE_TYPE_CONFIG.personal;

  return (
    <div className={`relative select-none ${className || ""}`}>
      {/* Switcher Card Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-3 rounded-2xl bg-surface border border-border hover:border-border-strong transition-all flex items-center justify-between text-left cursor-pointer group"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="text-xl shrink-0">{currentConfig.icon}</span>
          <div className="min-w-0">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground block">
              Perfil Ativo
            </span>
            <span className="text-xs font-bold text-foreground block truncate">
              {currentConfig.label}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 text-[11px] font-bold text-primary group-hover:text-primary-hover shrink-0">
          <span className="hidden sm:inline">Trocar</span>
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </div>
      </button>

      {/* Switcher Dropdown */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-surface-elevated rounded-2xl border border-border shadow-xl p-1.5 space-y-1 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-2.5 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              Áreas de Atuação Disponíveis
            </div>

            {availableProfiles.map((type) => {
              const config = PROFILE_TYPE_CONFIG[type] || PROFILE_TYPE_CONFIG.personal;
              const isSelected = activeProfile === type;

              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    onSwitch(type);
                    setIsOpen(false);
                  }}
                  className={`w-full p-2 rounded-xl flex items-center justify-between text-left transition-colors cursor-pointer ${
                    isSelected
                      ? "bg-secondary text-secondary-foreground font-bold"
                      : "hover:bg-muted text-foreground"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-base shrink-0">{config.icon}</span>
                    <div className="min-w-0">
                      <span className="text-xs font-bold block truncate">{config.label}</span>
                      <span className="text-[10px] text-muted-foreground block truncate">
                        {config.description}
                      </span>
                    </div>
                  </div>

                  {isSelected && <Check className="w-3.5 h-3.5 text-primary shrink-0 ml-2" />}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
