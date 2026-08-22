import { defaultLocale, isLocale, type Locale } from "./config";
import { pt, type Dictionary } from "./dictionaries/pt";
import { en } from "./dictionaries/en";
import { fr } from "./dictionaries/fr";

const dictionaries: Record<Locale, Dictionary> = {
  pt,
  en,
  fr,
};

export function getDictionary(locale: Locale | string | null | undefined = defaultLocale): Dictionary {
  if (isLocale(locale)) {
    return dictionaries[locale] ?? dictionaries[defaultLocale];
  }
  return dictionaries[defaultLocale];
}

export { pt, en, fr };
export type { Dictionary };
