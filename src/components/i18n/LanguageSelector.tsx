"use client";

import React from "react";
import { useI18n } from "@/i18n/provider";
import { supportedLocales, localeNames, type Locale } from "@/i18n/config";
import { cn } from "@/lib/utils";

export function LanguageSelector({ compact = false, className }: { compact?: boolean; className?: string }) {
  const { locale, setLocale } = useI18n();

  return (
    <div
      role="group"
      aria-label="Idioma da aplicação"
      className={cn("inline-flex items-center rounded-xl border border-border bg-surface p-0.5", className)}
    >
      {supportedLocales.map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => setLocale(code as Locale)}
          aria-pressed={locale === code}
          title={localeNames[code]}
          className={cn(
            "px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer",
            locale === code
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          )}
        >
          {compact ? code.toUpperCase() : localeNames[code]}
        </button>
      ))}
    </div>
  );
}
