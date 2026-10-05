/**
 * Canonical province resolution for Angola (21-province structure, Lei n.º 14/24).
 * IDs are relationship keys; names are display values.
 */

import { ANGOLA_PROVINCES, type AngolaProvince } from "@/config/locations";

/** Legacy codes/names from the obsolete 18-province model → current province code. */
export const LEGACY_PROVINCE_TO_CODE: Record<string, string> = {
  ccu: "CUB",
  "cuando cubango": "CUB",
  "cuando-cubango": "CUB",
};

export function normalizeProvinceKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[\s_-]+/g, " ");
}

export function resolveProvinceCode(codeOrName: string): string | undefined {
  const raw = codeOrName.trim();
  if (!raw) return undefined;

  const byCode = ANGOLA_PROVINCES.find((p) => p.code.toLowerCase() === raw.toLowerCase());
  if (byCode) return byCode.code;

  const normalized = normalizeProvinceKey(raw);
  const legacy = LEGACY_PROVINCE_TO_CODE[normalized];
  if (legacy) return legacy;

  const byName = ANGOLA_PROVINCES.find((p) => normalizeProvinceKey(p.name) === normalized);
  return byName?.code;
}

export function resolveProvince(codeOrName: string): AngolaProvince | undefined {
  const code = resolveProvinceCode(codeOrName);
  if (!code) return undefined;
  return ANGOLA_PROVINCES.find((p) => p.code === code);
}

export function provinceMatchesFilter(
  markerProvinceName: string,
  selectedProvince: AngolaProvince | undefined
): boolean {
  if (!selectedProvince) return true;
  const markerCode = resolveProvinceCode(markerProvinceName);
  return markerCode === selectedProvince.code;
}
