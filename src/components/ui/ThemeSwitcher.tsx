"use client";

import React from "react";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

export interface ThemeSwitcherProps {
  className?: string;
  variant?: "icon" | "toggle" | "segmented";
}

/**
 * Minimal & accessible Theme Switcher component.
 * Allows instant toggle between Claro (Light) and Escuro (Dark).
 */
export function ThemeSwitcher({ className, variant = "icon" }: ThemeSwitcherProps) {
  const { theme, setTheme, toggleTheme } = useTheme();

  if (variant === "segmented") {
    return (
      <div
        className={cn(
          "inline-flex p-1 rounded-xl bg-muted border border-border text-xs font-semibold select-none",
          className
        )}
      >
        <button
          type="button"
          onClick={() => setTheme("light")}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all",
            theme === "light"
              ? "bg-surface-elevated text-foreground shadow-xs font-bold"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Sun className="w-3.5 h-3.5 text-amber-500" />
          <span>Claro</span>
        </button>

        <button
          type="button"
          onClick={() => setTheme("dark")}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all",
            theme === "dark"
              ? "bg-surface-elevated text-foreground shadow-xs font-bold"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Moon className="w-3.5 h-3.5 text-emerald-400" />
          <span>Escuro</span>
        </button>
      </div>
    );
  }

  if (variant === "toggle") {
    return (
      <div className={cn("flex items-center justify-between p-3 rounded-2xl bg-surface border border-border", className)}>
        <div className="flex items-center gap-2.5">
          {theme === "dark" ? (
            <div className="w-8 h-8 rounded-lg bg-secondary text-secondary-foreground flex items-center justify-center">
              <Moon className="w-4 h-4 text-emerald-400" />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-lg bg-secondary text-secondary-foreground flex items-center justify-center">
              <Sun className="w-4 h-4 text-amber-500" />
            </div>
          )}
          <div>
            <span className="text-xs font-bold text-foreground block">
              Tema da Aplicação
            </span>
            <span className="text-[11px] text-muted-foreground block">
              {theme === "dark" ? "Modo Escuro Ativo" : "Modo Claro Ativo"}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={toggleTheme}
          className="px-3 py-1.5 rounded-xl bg-surface-elevated border border-border text-xs font-bold text-foreground hover:bg-muted transition-colors shadow-2xs"
          aria-label="Alternar tema"
        >
          {theme === "dark" ? "Mudar para Claro" : "Mudar para Escuro"}
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={cn(
        "p-2 rounded-xl text-foreground/80 hover:text-foreground hover:bg-muted border border-border transition-colors",
        className
      )}
      title={theme === "dark" ? "Mudar para Claro (☀️)" : "Mudar para Escuro (🌙)"}
      aria-label={theme === "dark" ? "Ativar Modo Claro" : "Ativar Modo Escuro"}
    >
      {theme === "dark" ? (
        <Sun className="w-4 h-4 text-amber-400 hover:rotate-45 transition-transform" />
      ) : (
        <Moon className="w-4 h-4 text-emerald-700 hover:-rotate-12 transition-transform" />
      )}
    </button>
  );
}
