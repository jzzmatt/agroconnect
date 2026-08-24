"use client";

import { useCallback, useEffect, useState } from "react";
import {
  fetchClientProfileDetails,
  getSynchronousCachedProfile,
  invalidateClientProfileCache,
} from "@/lib/auth/user-client-cache";
import { getUserEntitlements, normalizePlanSlug } from "@/lib/services/pricing-service";
import { SUBSCRIPTION_CHANGED_EVENT } from "@/lib/subscription/store";
import { clearOptimisticPlan, getOptimisticPlan } from "@/lib/subscription/optimistic";
import { getMarketCountry, DEFAULT_MARKET_COUNTRY, type MarketCountry } from "@/config/markets";
import type { UserEntitlements } from "@/types/domain";
import type { SubscriptionPlan } from "@/types/database";

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      () => {
        clearTimeout(timer);
        resolve(null);
      }
    );
  });
}

/**
 * Client representation of the authoritative backend subscription.
 * Optimistic session values are used only while the first server fetch is
 * in flight after a confirmed activation — they never override a returned
 * server plan.
 */
export function useAuthoritativePlan() {
  const syncCached = typeof window !== "undefined" ? getSynchronousCachedProfile() : null;
  const initialPlan = syncCached?.subscription_plan
    ? normalizePlanSlug(syncCached.subscription_plan)
    : "basic";

  const [plan, setPlan] = useState<SubscriptionPlan>(initialPlan);
  const [marketCountry, setMarketCountry] = useState<MarketCountry>(
    getMarketCountry(syncCached?.market_country_code || DEFAULT_MARKET_COUNTRY)
  );
  const [locale, setLocale] = useState<"pt" | "en" | "fr">(
    (syncCached?.preferred_language as "pt" | "en" | "fr") || "pt"
  );
  const [videoStorageUsedBytes, setVideoStorageUsedBytes] = useState(
    syncCached?.video_storage_used_bytes || 0
  );
  const [loading, setLoading] = useState(!syncCached);

  const refresh = useCallback(async (force = false) => {
    const optimistic = getOptimisticPlan();
    if (optimistic && loading) {
      setPlan(optimistic);
    }

    try {
      const profile = await withTimeout(fetchClientProfileDetails(force), 8000);
      if (profile) {
        const nextPlan = normalizePlanSlug(profile.subscription_plan);
        setPlan(nextPlan);
        if (optimistic && nextPlan === optimistic) {
          clearOptimisticPlan();
        } else if (optimistic && nextPlan !== optimistic) {
          // Server won. Do not keep a competing client plan.
          clearOptimisticPlan();
        }
        setMarketCountry(getMarketCountry(profile.market_country_code || DEFAULT_MARKET_COUNTRY));
        const lang = profile.preferred_language;
        if (lang === "pt" || lang === "en" || lang === "fr") {
          setLocale(lang);
        }
        setVideoStorageUsedBytes(profile.video_storage_used_bytes || 0);
      } else if (optimistic) {
        setPlan(optimistic);
      }
    } finally {
      setLoading(false);
    }
  }, [loading]);

  useEffect(() => {
    refresh();
    if (typeof window === "undefined") return;

    const onChange = () => {
      invalidateClientProfileCache();
      refresh(true);
    };
    window.addEventListener(SUBSCRIPTION_CHANGED_EVENT, onChange);
    window.addEventListener("focus", onChange);
    // visibilitychange fires on document, so listening on window never fired.
    document.addEventListener("visibilitychange", onChange);
    return () => {
      window.removeEventListener(SUBSCRIPTION_CHANGED_EVENT, onChange);
      window.removeEventListener("focus", onChange);
      document.removeEventListener("visibilitychange", onChange);
    };
  }, [refresh]);

  const entitlements: UserEntitlements = getUserEntitlements({ subscriptionPlan: plan });

  return {
    plan,
    entitlements,
    marketCountry,
    locale,
    videoStorageUsedBytes,
    loading,
    refresh,
  };
}

export function notifySubscriptionChanged() {
  if (typeof window === "undefined") return;
  invalidateClientProfileCache();
  window.dispatchEvent(new Event(SUBSCRIPTION_CHANGED_EVENT));
}
