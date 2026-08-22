import { normalizePlanSlug } from "@/lib/services/pricing-service";
import type { SubscriptionPlan } from "@/types/database";

const OPTIMISTIC_PLAN_KEY = "agroconnect_optimistic_plan";
const OPTIMISTIC_TTL_MS = 10 * 60 * 1000;

type OptimisticRecord = {
  plan: SubscriptionPlan;
  at: number;
};

export function setOptimisticPlan(plan: SubscriptionPlan) {
  if (typeof window === "undefined") return;
  const record: OptimisticRecord = {
    plan: normalizePlanSlug(plan),
    at: Date.now(),
  };
  try {
    sessionStorage.setItem(OPTIMISTIC_PLAN_KEY, JSON.stringify(record));
  } catch {
    // ignore quota / private mode
  }
}

export function getOptimisticPlan(): SubscriptionPlan | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(OPTIMISTIC_PLAN_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as OptimisticRecord;
    if (!parsed?.plan || !parsed.at) return null;
    if (Date.now() - parsed.at > OPTIMISTIC_TTL_MS) {
      sessionStorage.removeItem(OPTIMISTIC_PLAN_KEY);
      return null;
    }
    return normalizePlanSlug(parsed.plan);
  } catch {
    return null;
  }
}

export function clearOptimisticPlan() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(OPTIMISTIC_PLAN_KEY);
  } catch {
    // ignore
  }
}
