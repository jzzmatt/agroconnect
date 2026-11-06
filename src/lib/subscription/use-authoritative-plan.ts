"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { getAuthoritativeSubscriptionAction } from "@/lib/auth/profile-actions";
import { getUserEntitlements, parseStoredPlan } from "@/lib/services/pricing-service";
import { SUBSCRIPTION_CHANGED_EVENT } from "@/lib/subscription/store";
import { invalidateClientProfileCache } from "@/lib/auth/user-client-cache";
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
 * Client representation of the subscription stored in the database.
 *
 * React state here is a temporary copy of that database result. It is never
 * seeded from localStorage, sessionStorage, URL parameters, optimistic overlays,
 * or a previously selected plan. `currentPlan = null` means the user is not subscribed.
 */
export function useAuthoritativePlan() {
  const { isLoaded, isSignedIn, user } = useUser();
  const [plan, setPlan] = useState<SubscriptionPlan | null>(null);
  const [marketCountry, setMarketCountry] = useState<MarketCountry>(
    getMarketCountry(DEFAULT_MARKET_COUNTRY)
  );
  const [locale, setLocale] = useState<"pt" | "en" | "fr">("pt");
  const [videoStorageUsedBytes, setVideoStorageUsedBytes] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fromDatabase, setFromDatabase] = useState(false);
  const previousUserIdRef = useRef<string | null>(null);

  const refresh = useCallback(async (background = false) => {
    if (!isLoaded) return;

    if (!isSignedIn) {
      setPlan(null);
      setError(null);
      setFromDatabase(false);
      setLoading(false);
      previousUserIdRef.current = null;
      return;
    }

    // A background refresh must not blank the page. The dashboard treats
    // `loading` as "replace the whole view with a skeleton".
    if (!background) {
      setLoading(true);
      setError(null);
    }

    try {
      const result = await withTimeout(getAuthoritativeSubscriptionAction(), 8000);
      if (!result) {
        if (background) return;
        setPlan(null);
        setFromDatabase(false);
        setError("Não foi possível carregar a subscrição a partir da base de dados.");
        return;
      }
      if (!result.authenticated) {
        setPlan(null);
        setFromDatabase(false);
        setError(null);
        return;
      }
      if (result.error || result.source !== "database") {
        if (background) return;
        setPlan(null);
        setFromDatabase(false);
        setError(result.error || "Não foi possível carregar a subscrição a partir da base de dados.");
        return;
      }
      setPlan(parseStoredPlan(result.plan));
      setFromDatabase(true);
      setError(null);
      setMarketCountry(getMarketCountry(result.marketCountryCode || DEFAULT_MARKET_COUNTRY));
      const lang = result.preferredLanguage;
      if (lang === "pt" || lang === "en" || lang === "fr") {
        setLocale(lang);
      }
      setVideoStorageUsedBytes(result.videoStorageUsedBytes || 0);
    } finally {
      if (!background) setLoading(false);
    }
  }, [isLoaded, isSignedIn, user?.id]);

  useEffect(() => {
    if (user?.id !== previousUserIdRef.current) {
      setPlan(null);
      setFromDatabase(false);
      setError(null);
      previousUserIdRef.current = user?.id ?? null;
    }
    void refresh(false);
    if (typeof window === "undefined") return;

    let timer = 0;
    const onChange = () => {
      if (document.visibilityState === "hidden") return;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        invalidateClientProfileCache();
        void refresh(true);
      }, 800);
    };
    window.addEventListener(SUBSCRIPTION_CHANGED_EVENT, onChange);
    window.addEventListener("focus", onChange);
    document.addEventListener("visibilitychange", onChange);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener(SUBSCRIPTION_CHANGED_EVENT, onChange);
      window.removeEventListener("focus", onChange);
      document.removeEventListener("visibilitychange", onChange);
    };
  }, [refresh, user?.id]);

  const resolvedPlan = fromDatabase ? plan : null;
  const entitlements: UserEntitlements = getUserEntitlements({
    subscriptionPlan: resolvedPlan,
  });

  return {
    plan: resolvedPlan,
    currentPlan: resolvedPlan,
    hasSubscription: entitlements.has_subscription,
    canAccessControlPanel: entitlements.can_access_control_panel,
    entitlements,
    marketCountry,
    locale,
    videoStorageUsedBytes,
    loading: !isLoaded || loading,
    error,
    fromDatabase,
    refresh,
  };
}

export function notifySubscriptionChanged() {
  if (typeof window === "undefined") return;
  invalidateClientProfileCache();
  window.dispatchEvent(new Event(SUBSCRIPTION_CHANGED_EVENT));
}
