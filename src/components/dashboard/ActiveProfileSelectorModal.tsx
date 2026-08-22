"use client";

import React from "react";
import { Check, Sparkles, X } from "lucide-react";
import type { ProfileType } from "@/types/database";
import { PROFILE_TYPE_CONFIG } from "@/lib/auth/identity-resolvers";
import { Button } from "@/components/ui/Button";

interface ActiveProfileSelectorModalProps {
  isOpen: boolean;
  onClose?: () => void;
  availableProfiles: ProfileType[];
  activeProfile: ProfileType;
  onSelect: (profile: ProfileType) => void;
}

export function ActiveProfileSelectorModal({
  isOpen,
  onClose,
  availableProfiles,
  activeProfile,
  onSelect,
}: ActiveProfileSelectorModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-surface-elevated w-full max-w-md rounded-3xl border border-border shadow-2xl p-6 sm:p-7 relative flex flex-col space-y-5">
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Modal Title */}
        <div className="text-center space-y-1">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-primary">
            Ecossistema AGROCONNECT
          </span>
          <h2 className="text-xl font-black text-foreground">
            Escolha o seu perfil
          </h2>
          <p className="text-xs text-muted-foreground">
            Selecione como pretende utilizar o AgriConnect neste momento.
          </p>
        </div>

        {/* Profile Options List */}
        <div className="space-y-2.5">
          {availableProfiles.map((type) => {
            const config = PROFILE_TYPE_CONFIG[type] || PROFILE_TYPE_CONFIG.personal;
            const isSelected = activeProfile === type;

            return (
              <button
                key={type}
                type="button"
                onClick={() => onSelect(type)}
                className={`w-full p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between gap-3 ${
                  isSelected
                    ? "bg-secondary border-primary shadow-xs ring-2 ring-primary/20 font-bold"
                    : "bg-surface border-border hover:bg-muted text-foreground"
                }`}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-11 h-11 rounded-2xl bg-surface-card border border-border flex items-center justify-center text-2xl shrink-0 shadow-2xs">
                    {config.icon}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-foreground truncate">
                      {config.label}
                    </h4>
                    <p className="text-xs text-muted-foreground truncate">
                      {config.description}
                    </p>
                  </div>
                </div>

                {isSelected && (
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                    <Check className="w-4 h-4" />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {onClose && (
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="w-full font-bold text-xs"
          >
            Continuar com {PROFILE_TYPE_CONFIG[activeProfile]?.label || "Perfil Atual"}
          </Button>
        )}
      </div>
    </div>
  );
}
