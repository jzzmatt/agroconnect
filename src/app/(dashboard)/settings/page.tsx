"use client";

import React, { useState } from "react";
import { Button, SectionHeader, ThemeSwitcher } from "@/components/ui";
import { useI18n } from "@/i18n/provider";
import { useTheme } from "@/lib/theme";
import { Bell, Globe, Shield, Save, Check, Sun, Moon } from "lucide-react";

export default function SettingsPage() {
  const { dict, locale, setLocale } = useI18n();
  const { theme, setTheme } = useTheme();
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
        subtitle="Gerencie o tema visual, idioma, notificações e definições da sua conta AGROCONNECT."
      />

      <div className="space-y-6">
        {/* Visual Theme Selection (Figma Dark / Light) */}
        <div className="bg-surface-card rounded-3xl p-6 sm:p-8 border border-border shadow-xs space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-secondary text-secondary-foreground flex items-center justify-center">
              {theme === "dark" ? <Moon className="w-5 h-5 text-emerald-400" /> : <Sun className="w-5 h-5 text-amber-500" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">Tema Visual (Figma Design)</h3>
              <p className="text-xs text-muted-foreground">
                Escolha entre o tema Claro e o tema Escuro dedicado.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2">
            <button
              type="button"
              onClick={() => setTheme("light")}
              className={`p-4 rounded-2xl border text-left font-bold text-xs transition-all ${
                theme === "light"
                  ? "border-primary bg-secondary text-foreground ring-2 ring-primary/20 shadow-xs"
                  : "border-border bg-surface text-foreground hover:bg-muted"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Sun className="w-4 h-4 text-amber-500" />
                <span className="block text-sm font-extrabold">☀️ Claro / Branco</span>
              </div>
              <span className="text-[11px] text-muted-foreground font-normal block">
                Visual luminoso com superfícies brancas e verdes suaves
              </span>
            </button>

            <button
              type="button"
              onClick={() => setTheme("dark")}
              className={`p-4 rounded-2xl border text-left font-bold text-xs transition-all ${
                theme === "dark"
                  ? "border-primary bg-secondary text-foreground ring-2 ring-primary/20 shadow-xs"
                  : "border-border bg-surface text-foreground hover:bg-muted"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Moon className="w-4 h-4 text-emerald-400" />
                <span className="block text-sm font-extrabold">🌙 Escuro / Verde Floresta</span>
              </div>
              <span className="text-[11px] text-muted-foreground font-normal block">
                Visual escuro otimizado para conforto visual noturno
              </span>
            </button>
          </div>
        </div>

        {/* Language Selection */}
        <div className="bg-surface-card rounded-3xl p-6 sm:p-8 border border-border shadow-xs space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-secondary text-secondary-foreground flex items-center justify-center">
              <Globe className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">Idioma Padrão (i18n)</h3>
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
                  ? "border-primary bg-secondary text-foreground ring-2 ring-primary/20 shadow-xs"
                  : "border-border bg-surface text-foreground hover:bg-muted"
              }`}
            >
              <span className="block text-sm font-extrabold">🇦🇴 Português (Padrão)</span>
              <span className="text-[11px] text-muted-foreground font-normal block mt-1">
                Idioma oficial de Angola
              </span>
            </button>

            <button
              type="button"
              onClick={() => setLocale("en")}
              className={`p-4 rounded-2xl border text-left font-bold text-xs transition-all ${
                locale === "en"
                  ? "border-primary bg-secondary text-foreground ring-2 ring-primary/20 shadow-xs"
                  : "border-border bg-surface text-foreground hover:bg-muted"
              }`}
            >
              <span className="block text-sm font-extrabold">🌐 English</span>
              <span className="text-[11px] text-muted-foreground font-normal block mt-1">
                International English
              </span>
            </button>
          </div>
        </div>

        {/* Notifications Setting */}
        <div className="bg-surface-card rounded-3xl p-6 sm:p-8 border border-border shadow-xs space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-secondary text-secondary-foreground flex items-center justify-center">
              <Bell className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">Notificações e Alertas</h3>
              <p className="text-xs text-muted-foreground">
                Controle como deseja receber alertas de consultas e pedidos.
              </p>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <label className="flex items-center justify-between p-3.5 rounded-2xl bg-surface border border-border cursor-pointer hover:bg-muted transition-colors">
              <span className="text-xs font-semibold text-foreground">
                Notificações por Email (Novas Consultas & Mensagens)
              </span>
              <input
                type="checkbox"
                checked={emailNotifications}
                onChange={(e) => setEmailNotifications(e.target.checked)}
                className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between p-3.5 rounded-2xl bg-surface border border-border cursor-pointer hover:bg-muted transition-colors">
              <span className="text-xs font-semibold text-foreground">
                Alertas por SMS para Telemóveis de Angola (+244)
              </span>
              <input
                type="checkbox"
                checked={smsNotifications}
                onChange={(e) => setSmsNotifications(e.target.checked)}
                className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
              />
            </label>
          </div>
        </div>

        {/* Save button */}
        <div className="flex items-center justify-between pt-2">
          {saved ? (
            <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
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
