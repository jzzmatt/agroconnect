import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getDictionary } from "@/i18n";
import {
  formatProductLimitLabel,
  formatVideoStorageLabel,
  getLocalizedPlanCopy,
} from "@/i18n/plan-copy";
import {
  clearOptimisticPlan,
  getOptimisticPlan,
  setOptimisticPlan,
} from "@/lib/subscription/optimistic";

describe("Plan copy and optimistic activation", () => {
  const memory = new Map<string, string>();

  beforeEach(() => {
    memory.clear();
    (globalThis as any).window = globalThis;
    (globalThis as any).sessionStorage = {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => {
        memory.set(key, value);
      },
      removeItem: (key: string) => {
        memory.delete(key);
      },
    };
  });

  afterEach(() => {
    clearOptimisticPlan();
  });

  it("localizes professional plan copy and limits", () => {
    const en = getDictionary("en");
    const copy = getLocalizedPlanCopy(en, "professional");
    expect(copy.name).toBe("Professional");
    expect(copy.cta).toMatch(/Professional/i);
    expect(formatProductLimitLabel(en, 10)).toBe("Up to 10 active products");
    expect(formatVideoStorageLabel(en, 100)).toBe("100 GB of AgriAcademy video");
  });

  it("stores an optimistic plan so the dashboard can update immediately", () => {
    expect(getOptimisticPlan()).toBeNull();
    setOptimisticPlan("professional");
    expect(getOptimisticPlan()).toBe("professional");
    clearOptimisticPlan();
    expect(getOptimisticPlan()).toBeNull();
  });
});
