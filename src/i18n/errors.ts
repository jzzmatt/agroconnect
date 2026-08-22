import type { Dictionary } from "./dictionaries/pt";

export function localizeError(dict: Dictionary, code?: string | null, fallback?: string) {
  if (code && code in dict.errors) {
    return dict.errors[code as keyof Dictionary["errors"]];
  }
  if (code && code.includes(":")) {
    const short = code.split(":")[0];
    if (short in dict.errors) {
      return dict.errors[short as keyof Dictionary["errors"]];
    }
  }
  return fallback || dict.errors.PRODUCT_PUBLISH_FAILED;
}
