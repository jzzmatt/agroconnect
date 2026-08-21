export const defaultLocale = "pt" as const;
export const supportedLocales = ["pt", "en"] as const;

export type Locale = (typeof supportedLocales)[number];

export const localeNames: Record<Locale, string> = {
  pt: "Português",
  en: "English",
};
