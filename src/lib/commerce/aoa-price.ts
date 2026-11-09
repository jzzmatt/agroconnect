/** Shared Angolan kwanza amount used by AgriProduct and AgriAcademy. */
export const AOA_CURRENCY = "AOA";

const MAX_AOA_AMOUNT = 9_999_999_999.99;

export function isValidAoaPrice(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= MAX_AOA_AMOUNT;
}

export function roundAoaPrice(value: number): number {
  return Math.round(value * 100) / 100;
}
