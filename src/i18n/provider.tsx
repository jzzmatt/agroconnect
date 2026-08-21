"use client";

import React, { createContext, useContext, useMemo, useState } from "react";
import { defaultLocale, type Locale } from "./config";
import { getDictionary, type Dictionary } from "./index";

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  dict: Dictionary;
}

const I18nContext = createContext<I18nContextType | null>(null);

export function I18nProvider({
  children,
  initialLocale = defaultLocale,
}: {
  children: React.ReactNode;
  initialLocale?: Locale;
}) {
  const [locale, setLocale] = useState<Locale>(initialLocale);

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
    // Fallback to default dictionary if used outside provider
    return {
      locale: defaultLocale,
      setLocale: () => {},
      dict: getDictionary(defaultLocale),
    };
  }
  return context;
}
