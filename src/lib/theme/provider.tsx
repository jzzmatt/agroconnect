"use client";

import React, { createContext, useContext, useEffect, useState, useTransition } from "react";
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

/**
 * Inline script to prevent theme flashing during SSR/hydration.
 * Executes synchronously before HTML is painted.
 */
export function ThemeScript() {
  const scriptSrc = `
    (function() {
      try {
        var stored = localStorage.getItem('${STORAGE_KEY}');
        var theme = stored;
        if (!theme || (theme !== 'light' && theme !== 'dark')) {
          theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
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
  defaultTheme = "light",
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(defaultTheme);
  const [mounted, setMounted] = useState(false);
  const [, startTransition] = useTransition();

  useEffect(() => {
    // 1. Read stored preference or system preference
    const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
    let activeTheme: Theme;

    if (stored === "light" || stored === "dark") {
      activeTheme = stored;
    } else if (typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      activeTheme = "dark";
    } else {
      activeTheme = "light";
    }

    setThemeState(activeTheme);
    applyThemeToDocument(activeTheme);
    setMounted(true);

    // 2. Listen to system preference changes if no explicit stored override
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e: MediaQueryListEvent) => {
      const currentStored = localStorage.getItem(STORAGE_KEY);
      if (!currentStored) {
        const nextSystemTheme: Theme = e.matches ? "dark" : "light";
        setThemeState(nextSystemTheme);
        applyThemeToDocument(nextSystemTheme);
      }
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

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
      theme: "light" as Theme,
      setTheme: () => {},
      toggleTheme: () => {},
      resolvedTheme: "light" as Theme,
    };
  }
  return context;
}
