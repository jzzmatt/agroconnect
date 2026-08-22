"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { defaultLocale, isLocale, LOCALE_COOKIE_NAME, LOCALE_STORAGE_KEY, type Locale } from "./config";
import { getDictionary, type Dictionary } from "./index";
import { updatePreferredLanguageAction } from "@/lib/auth/profile-actions";

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  dict: Dictionary;
}

const I18nContext = createContext<I18nContextType | null>(null);

function persistLocale(locale: Locale) {
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    document.cookie = `${LOCALE_COOKIE_NAME}=${locale}; path=/; max-age=31536000; SameSite=Lax`;
    document.documentElement.lang = locale;
  } catch {
    // ignore
  }
}

function readStoredLocale(): Locale | null {
  try {
    const fromStorage = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (isLocale(fromStorage)) return fromStorage;
    const match = document.cookie.match(new RegExp(`(?:^|; )${LOCALE_COOKIE_NAME}=([^;]*)`));
    const fromCookie = match?.[1];
    if (isLocale(fromCookie)) return fromCookie;
  } catch {
    // ignore
  }
  return null;
}

export function I18nProvider({
  children,
  initialLocale = defaultLocale,
}: {
  children: React.ReactNode;
  initialLocale?: Locale;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  useEffect(() => {
    const stored = readStoredLocale();
    if (stored && stored !== locale) {
      setLocaleState(stored);
      document.documentElement.lang = stored;
    } else {
      document.documentElement.lang = locale;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    persistLocale(next);
    updatePreferredLanguageAction(next).catch(() => {
      // Unauthenticated users persist via cookie/localStorage only.
    });
  }, []);

  const dict = useMemo(() => getDictionary(locale), [locale]);

  return (
    <I18nContext.Provider value={{ locale, setLocale, dict }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    return {
      locale: defaultLocale,
      setLocale: () => {},
      dict: getDictionary(defaultLocale),
    };
  }
  return context;
}
