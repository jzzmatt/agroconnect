import "server-only";

import { cookies } from "next/headers";
import { getDictionary, type Dictionary } from "@/i18n";
import { defaultLocale, isLocale, LOCALE_COOKIE_NAME, type Locale } from "@/i18n/config";

export async function getAdminDictionary(): Promise<{ locale: Locale; dict: Dictionary }> {
  const jar = await cookies();
  const value = jar.get(LOCALE_COOKIE_NAME)?.value;
  const locale = isLocale(value) ? value : defaultLocale;
  return { locale, dict: getDictionary(locale) };
}
