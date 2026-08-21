"use client";

import React, { useState } from "react";
import { Button, SectionHeader } from "@/components/ui";
import { useI18n } from "@/i18n/provider";
import { Bell, Globe, Shield, Save, Check } from "lucide-react";

export default function SettingsPage() {
  const { dict, locale, setLocale } = useI18n();
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(true);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <SectionHeader
        badgeText="Preferências"
        title={dict.navigation.settings}
        subtitle="Gerencie o idioma, preferências de notificação e definições da sua conta AGROCONNECT."
      />

      <div className="space-y-6">
        {/* Language Selection */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-emerald-900/10 shadow-xs space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-emerald-950">Idioma Padrão (i18n)</h3>
              <p className="text-xs text-muted-foreground">
                Selecione o idioma de apresentação da plataforma.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2">
            <button
              type="button"
              onClick={() => setLocale("pt")}
              className={`p-4 rounded-2xl border text-left font-bold text-xs transition-all ${
                locale === "pt"
                  ? "border-emerald-700 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-700/20"
                  : "border-emerald-100 bg-white text-emerald-900 hover:bg-emerald-50/50"
              }`}
            >
              <span className="block text-sm">🇦🇴 Português (Padrão)</span>
              <span className="text-[11px] text-muted-foreground font-normal block mt-1">
                Idioma oficial de Angola
              </span>
            </button>

            <button
              type="button"
              onClick={() => setLocale("en")}
              className={`p-4 rounded-2xl border text-left font-bold text-xs transition-all ${
                locale === "en"
                  ? "border-emerald-700 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-700/20"
                  : "border-emerald-100 bg-white text-emerald-900 hover:bg-emerald-50/50"
              }`}
            >
              <span className="block text-sm">🌐 English</span>
              <span className="text-[11px] text-muted-foreground font-normal block mt-1">
                International English
              </span>
            </button>
          </div>
        </div>

        {/* Notifications Setting */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-emerald-900/10 shadow-xs space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-emerald-950">Notificações e Alertas</h3>
              <p className="text-xs text-muted-foreground">
                Controle como deseja receber alertas de consultas e pedidos.
              </p>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <label className="flex items-center justify-between p-3 rounded-xl bg-emerald-50/50 border border-emerald-100 cursor-pointer">
              <span className="text-xs font-semibold text-emerald-950">
                Notificações por Email (Novas Consultas & Mensagens)
              </span>
              <input
                type="checkbox"
                checked={emailNotifications}
                onChange={(e) => setEmailNotifications(e.target.checked)}
                className="w-4 h-4 accent-emerald-700 rounded cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-xl bg-emerald-50/50 border border-emerald-100 cursor-pointer">
              <span className="text-xs font-semibold text-emerald-950">
                Alertas por SMS para Telemóveis de Angola (+244)
              </span>
              <input
                type="checkbox"
                checked={smsNotifications}
                onChange={(e) => setSmsNotifications(e.target.checked)}
                className="w-4 h-4 accent-emerald-700 rounded cursor-pointer"
              />
            </label>
          </div>
        </div>

        {/* Save button */}
        <div className="flex items-center justify-between pt-2">
          {saved ? (
            <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
              <Check className="w-4 h-4 text-emerald-600" />
              Definições atualizadas com sucesso!
            </span>
          ) : (
            <div />
          )}

          <Button onClick={handleSave} variant="primary" className="gap-1.5 font-bold">
            <Save className="w-4 h-4" />
            <span>Guardar Definições</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
