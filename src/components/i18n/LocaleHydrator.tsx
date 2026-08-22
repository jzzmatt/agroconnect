"use client";

import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { getProfileDetailsAction } from "@/lib/auth/profile-actions";
import { useI18n } from "@/i18n/provider";
import { isLocale, LOCALE_STORAGE_KEY } from "@/i18n/config";

export function LocaleHydrator() {
  const { isSignedIn, isLoaded } = useUser();
  const { locale, setLocale } = useI18n();

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    } catch {
      stored = null;
    }
    if (isLocale(stored)) return;

    getProfileDetailsAction().then((profile) => {
      const preferred = profile?.preferred_language;
      if (isLocale(preferred) && preferred !== locale) {
        setLocale(preferred);
      }
    });
  }, [isLoaded, isSignedIn, locale, setLocale]);

  return null;
}
