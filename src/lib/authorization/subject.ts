import { getUserEntitlements } from "@/lib/services/pricing-service";
import type { UserProfileWithRoles } from "@/types/domain";
import type { CapabilitySubject } from "./policy";

/**
 * Build a capability subject from a profile.
 *
 * Pure, so a client component can build a subject for presentation and a test
 * can build one for any combination of role, plan and entitlement. Resolving the
 * subject from the current session is server-only and lives in `./server`.
 */
export function subjectFromProfile(
  profile: Pick<
    UserProfileWithRoles,
    "id" | "clerk_user_id" | "roles" | "account_type" | "subscription_plan"
  > & { subscription_status?: string | null },
  options: { activeProductCount?: number } = {}
): CapabilitySubject {
  const entitlements = getUserEntitlements({
    subscriptionPlan: profile.subscription_plan,
    subscriptionStatus: profile.subscription_status,
    roles: profile.roles,
    accountType: profile.account_type,
    activeProductCount: options.activeProductCount,
  });

  return {
    clerkUserId: profile.clerk_user_id,
    profileId: profile.id,
    roles: profile.roles,
    accountType: profile.account_type,
    plan: entitlements.plan,
    subscriptionStatus: entitlements.subscription_status,
    entitlements,
  };
}
