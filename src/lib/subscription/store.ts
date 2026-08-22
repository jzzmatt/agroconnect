import type { SubscriptionPlan } from "@/types/database";
import type { MarketCountryCode } from "@/config/markets";
import { DEFAULT_MARKET_COUNTRY } from "@/config/markets";

/**
 * Process-local authoritative fallback used when Supabase is unavailable.
 * The database remains the durable source of truth.
 */
type SubscriptionRecord = {
  plan: SubscriptionPlan;
  marketCountryCode: MarketCountryCode;
  preferredLanguage: "pt" | "en" | "fr";
  videoStorageUsedBytes: number;
  updatedAt: string;
};

const records = new Map<string, SubscriptionRecord>();

export const SUBSCRIPTION_CHANGED_EVENT = "agroconnect:subscription-changed";

export function getAuthoritativeSubscription(clerkUserId: string): SubscriptionRecord | null {
  return records.get(clerkUserId) ?? null;
}

export function setAuthoritativeSubscription(
  clerkUserId: string,
  patch: Partial<SubscriptionRecord> & { plan?: SubscriptionPlan }
): SubscriptionRecord {
  const current = records.get(clerkUserId);
  const next: SubscriptionRecord = {
    plan: patch.plan || current?.plan || "basic",
    marketCountryCode: patch.marketCountryCode || current?.marketCountryCode || DEFAULT_MARKET_COUNTRY,
    preferredLanguage: patch.preferredLanguage || current?.preferredLanguage || "pt",
    videoStorageUsedBytes: patch.videoStorageUsedBytes ?? current?.videoStorageUsedBytes ?? 0,
    updatedAt: new Date().toISOString(),
  };
  records.set(clerkUserId, next);
  return next;
}

export function resetAuthoritativeSubscriptions() {
  records.clear();
}
