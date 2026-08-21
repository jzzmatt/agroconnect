import { defaultLocale, type Locale } from "./config";
import { pt, type Dictionary } from "./dictionaries/pt";
import { en } from "./dictionaries/en";

const dictionaries: Record<Locale, Dictionary> = {
  pt,
  en,
};

export function getDictionary(locale: Locale = defaultLocale): Dictionary {
  return dictionaries[locale] ?? dictionaries[defaultLocale];
}

export { pt, en };
export type { Dictionary };
