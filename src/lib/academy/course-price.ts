import { isValidAoaPrice, roundAoaPrice } from "@/lib/commerce/aoa-price";

export interface ParsedCoursePrice {
  ok: true;
  price: number;
}

/** Instructor-entered amount. Zero is a free course. Empty, negative, and non-numeric values are rejected. */
export function parseCoursePrice(value: unknown): ParsedCoursePrice | { ok: false } {
  const numeric = typeof value === "number" ? value : typeof value === "string" ? readPriceText(value) : null;
  if (numeric == null) return { ok: false };
  const price = roundAoaPrice(numeric);
  if (!isValidAoaPrice(price)) return { ok: false };
  return { ok: true, price };
}

function readPriceText(value: string): number | null {
  const trimmed = value.trim().replace(/\s+/g, "");
  if (!/^\d+(?:[.,]\d{1,2})?$/.test(trimmed)) return null;
  return Number(trimmed.replace(",", "."));
}
