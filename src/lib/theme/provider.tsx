"use client";

import React, { createContext, useContext, useEffect, useLayoutEffect, useState, useTransition } from "react";
import type { ThemePreference } from "@/types/database";

export type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  resolvedTheme: Theme;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

const STORAGE_KEY = "agroconnect-theme-preference";
const useClientLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/**
 * Inline script to prevent theme flashing during SSR/hydration.
 * Executes synchronously before HTML is painted.
 */
export function ThemeScript() {
  const scriptSrc = `
    (function() {
      try {
        var stored = localStorage.getItem('${STORAGE_KEY}');
        var theme = stored === 'light' || stored === 'dark' ? stored : 'dark';
        document.documentElement.classList.remove('light', 'dark');
        document.documentElement.classList.add(theme);
        document.documentElement.setAttribute('data-theme', theme);
        document.documentElement.style.colorScheme = theme;
      } catch (e) {}
    })();
  `;

  return <script dangerouslySetInnerHTML={{ __html: scriptSrc }} />;
}

export interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
  initialServerTheme?: Theme;
}

export function ThemeProvider({
  children,
  defaultTheme = "dark",
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(defaultTheme);
  const [mounted, setMounted] = useState(false);
  const [, startTransition] = useTransition();

  useClientLayoutEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    const activeTheme: Theme = stored === "light" || stored === "dark" ? stored : defaultTheme;

    setThemeState(activeTheme);
    applyThemeToDocument(activeTheme);
    setMounted(true);
  }, [defaultTheme]);

  const applyThemeToDocument = (nextTheme: Theme) => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(nextTheme);
    root.setAttribute("data-theme", nextTheme);
    root.style.colorScheme = nextTheme;
  };

  const setTheme = (nextTheme: Theme) => {
    setThemeState(nextTheme);
    applyThemeToDocument(nextTheme);
    try {
      localStorage.setItem(STORAGE_KEY, nextTheme);
    } catch {
      // Ignore storage write errors in private browsing
    }
  };

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        toggleTheme,
        resolvedTheme: theme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    // Graceful fallback if called outside provider
    return {
      theme: "dark" as Theme,
      setTheme: () => {},
      toggleTheme: () => {},
      resolvedTheme: "dark" as Theme,
    };
  }
  return context;
}
