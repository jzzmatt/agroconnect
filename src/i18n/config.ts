export const defaultLocale = "pt" as const;
export const supportedLocales = ["pt", "en", "fr"] as const;

export type Locale = (typeof supportedLocales)[number];

export const localeNames: Record<Locale, string> = {
  pt: "Português",
  en: "English",
  fr: "Français",
};

export const LOCALE_STORAGE_KEY = "agroconnect-locale";
export const LOCALE_COOKIE_NAME = "agroconnect_locale";

export function isLocale(value?: string | null): value is Locale {
  return value === "pt" || value === "en" || value === "fr";
}
