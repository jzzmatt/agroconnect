const MAX_COURSE_PRICE = 9_999_999_999.99;

export interface ParsedCoursePrice {
  ok: true;
  price: number;
}

/** Instructor-entered amount. Zero is a free course. Empty, negative, and non-numeric values are rejected. */
export function parseCoursePrice(value: unknown): ParsedCoursePrice | { ok: false } {
  const numeric = typeof value === "number" ? value : typeof value === "string" ? readPriceText(value) : null;
  if (numeric == null || !Number.isFinite(numeric) || numeric < 0 || numeric > MAX_COURSE_PRICE) {
    return { ok: false };
  }
  return { ok: true, price: Math.round(numeric * 100) / 100 };
}

function readPriceText(value: string): number | null {
  const trimmed = value.trim().replace(/\s+/g, "");
  if (!/^\d+(?:[.,]\d{1,2})?$/.test(trimmed)) return null;
  return Number(trimmed.replace(",", "."));
}
