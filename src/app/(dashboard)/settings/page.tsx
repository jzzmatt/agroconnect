"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useClerk } from "@clerk/nextjs";
import { Button, SectionHeader, ThemeSwitcher } from "@/components/ui";
import { useI18n } from "@/i18n/provider";
import { useTheme } from "@/lib/theme";
import { useAuthoritativePlan } from "@/lib/subscription/use-authoritative-plan";
import { updateMarketCountryAction } from "@/lib/auth/profile-actions";
import { MARKET_COUNTRIES, type MarketCountryCode } from "@/config/markets";
import { Bell, Globe, Save, Check, Sun, Moon, LogOut, Lock, MapPin } from "lucide-react";

export default function SettingsPage() {
  const router = useRouter();
  const { signOut } = useClerk();
  const { dict, locale, setLocale } = useI18n();
  const { theme, setTheme } = useTheme();
  const { entitlements, marketCountry, refresh } = useAuthoritativePlan();
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(true);
  const [saved, setSaved] = useState(false);

  const handleSignOut = async () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("agroconnect_active_profile_type");
      localStorage.removeItem("agroconnect_user_profile_override");
      sessionStorage.removeItem("agroconnect_prompted_profile_selector");
    }
    await signOut({ redirectUrl: "/" });
  };

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

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2">
            <button
              type="button"
              onClick={() => setLocale("pt")}
              className={`p-4 rounded-2xl border text-left font-bold text-xs transition-all ${
                locale === "pt"
                  ? "border-primary bg-secondary text-foreground ring-2 ring-primary/20 shadow-xs"
                  : "border-border bg-surface text-foreground hover:bg-muted"
              }`}
            >
              <span className="block text-sm font-extrabold">🇦🇴 Português</span>
              <span className="text-[11px] text-muted-foreground font-normal block mt-1">
                Idioma padrão (Angola)
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
              <span className="block text-sm font-extrabold">🇬🇧 English</span>
              <span className="text-[11px] text-muted-foreground font-normal block mt-1">
                International English
              </span>
            </button>

            <button
              type="button"
              onClick={() => setLocale("fr")}
              className={`p-4 rounded-2xl border text-left font-bold text-xs transition-all ${
                locale === "fr"
                  ? "border-primary bg-secondary text-foreground ring-2 ring-primary/20 shadow-xs"
                  : "border-border bg-surface text-foreground hover:bg-muted"
              }`}
            >
              <span className="block text-sm font-extrabold">🇫🇷 Français</span>
              <span className="text-[11px] text-muted-foreground font-normal block mt-1">
                Français
              </span>
            </button>
          </div>
        </div>

        {/* Market country — independent from UI language */}
        <div className="bg-surface-card rounded-3xl p-6 sm:p-8 border border-border shadow-xs space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-secondary text-secondary-foreground flex items-center justify-center">
              <MapPin className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">País de atuação</h3>
              <p className="text-xs text-muted-foreground">
                Define o mercado, a moeda e os métodos de pagamento. Não altera o idioma da aplicação.
              </p>
            </div>
          </div>

          {entitlements.can_change_market_country ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {(Object.keys(MARKET_COUNTRIES) as MarketCountryCode[]).map((code) => {
                const country = MARKET_COUNTRIES[code];
                const selected = marketCountry.code === code;
                return (
                  <button
                    key={code}
                    type="button"
                    onClick={async () => {
                      await updateMarketCountryAction(code);
                      await refresh();
                    }}
                    className={`p-4 rounded-2xl border text-left transition-all ${
                      selected
                        ? "border-primary bg-secondary ring-2 ring-primary/20"
                        : "border-border bg-surface hover:bg-muted"
                    }`}
                  >
                    <span className="text-sm font-extrabold block">
                      {country.flag} {country.name.pt}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {country.currencyCode} / {country.currencySymbol}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800">
              <p className="text-xs font-bold flex items-center gap-1.5">
                <Lock className="w-4 h-4" />
                🔒 Disponível a partir do plano Profissional
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                País atual: Angola 🇦🇴 — atualize o plano para alterar o mercado.
              </p>
            </div>
          )}
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

        {/* Session & Sign Out */}
        <div className="bg-surface-card rounded-3xl p-6 sm:p-8 border border-border shadow-xs space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center">
              <LogOut className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">Sessão da Conta</h3>
              <p className="text-xs text-muted-foreground">
                Termine a sessão atual com segurança no seu dispositivo.
              </p>
            </div>
          </div>

          <div className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleSignOut}
              className="font-bold text-xs text-destructive hover:bg-destructive/10 border-destructive/30"
            >
              <LogOut className="w-3.5 h-3.5 mr-1.5" />
              <span>Terminar Sessão</span>
            </Button>
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
