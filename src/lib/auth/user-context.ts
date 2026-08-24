import { currentUser } from "@clerk/nextjs/server";
import { getCurrentUserProfile } from "@/lib/clerk/auth";
import {
  getUserEntitlements,
  parseStoredPlan,
  normalizeSubscriptionStatus,
} from "@/lib/services/pricing-service";
import { getMarketCountry, DEFAULT_MARKET_COUNTRY } from "@/config/markets";
import type { UserEntitlements, UserProfileWithRoles } from "@/types/domain";
import type { SubscriptionPlan } from "@/types/database";

export type SubscriptionStatus = "active" | "pending" | "cancelled" | "expired";

export interface AuthoritativeSubscription {
  id: string;
  plan: SubscriptionPlan | null;
  status: SubscriptionStatus;
}

export interface CurrentUserContext {
  user: {
    id: string;
    email: string | null;
  };
  profile: UserProfileWithRoles;
  subscription: AuthoritativeSubscription;
  plan: SubscriptionPlan | null;
  entitlements: UserEntitlements;
  locale: "pt" | "en" | "fr";
  country: string;
}

function normalizeLocale(value?: string | null): "pt" | "en" | "fr" {
  return value === "en" || value === "fr" ? value : "pt";
}

/**
 * Authoritative authenticated context. Dashboard, profile, and product APIs
 * must all resolve plan/entitlements from this function — never from
 * localStorage, React state, or URL parameters.
 */
export async function getCurrentUserContext(): Promise<CurrentUserContext | null> {
  const clerkUser = await currentUser();
  if (!clerkUser) return null;

  const profile = await getCurrentUserProfile();
  if (!profile) return null;

  const plan = parseStoredPlan(profile.subscription_plan);
  const status = normalizeSubscriptionStatus((profile as { subscription_status?: string }).subscription_status);
  const entitlements = getUserEntitlements({
    subscriptionPlan: plan,
    subscriptionStatus: status,
    roles: profile.roles,
    accountType: profile.account_type,
  });

  return {
    user: {
      id: clerkUser.id,
      email: profile.email,
    },
    profile,
    subscription: {
      id: profile.id,
      plan,
      status,
    },
    plan,
    entitlements,
    locale: normalizeLocale(profile.preferred_language),
    country: getMarketCountry(profile.market_country_code || DEFAULT_MARKET_COUNTRY).code,
  };
}

/**
 * Central entitlement resolver. Product APIs must call this instead of
 * branching on plan === "professional" in each route.
 */
export async function getUserEntitlementsForUser(userId?: string): Promise<UserEntitlements | null> {
  const context = await getCurrentUserContext();
  if (!context) return null;
  if (userId && context.user.id !== userId && context.profile.id !== userId) {
    return null;
  }
  return context.entitlements;
}

export const getUserEntitlementsByUserId = getUserEntitlementsForUser;
