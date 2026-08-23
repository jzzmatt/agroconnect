import { getCurrentUserContext } from "@/lib/auth/user-context";
import { getUserEntitlements } from "@/lib/services/pricing-service";
import { AuthorizationError, requirePermission, type CapabilitySubject } from "./policy";
import type { Permission } from "./permissions";

/**
 * Server-only authorization entry point.
 *
 * Import this from route handlers and server actions. Client components must
 * import `@/lib/authorization`, which carries no server-only dependency.
 */
export * from "./index";
export {
  requireProductOwnership,
  resolveProductOwnerProfileId,
} from "./product-ownership";

/**
 * Resolve the capability subject for the current session. Returns null when
 * unauthenticated so callers can distinguish 401 from 403.
 */
export async function getCurrentSubject(
  options: { activeProductCount?: number } = {}
): Promise<CapabilitySubject | null> {
  const context = await getCurrentUserContext();
  if (!context) return null;

  const entitlements =
    options.activeProductCount === undefined
      ? context.entitlements
      : getUserEntitlements({
          subscriptionPlan: context.plan,
          subscriptionStatus: context.subscription.status,
          roles: context.profile.roles,
          accountType: context.profile.account_type,
          activeProductCount: options.activeProductCount,
        });

  return {
    clerkUserId: context.user.id,
    profileId: context.profile.id,
    roles: context.profile.roles,
    accountType: context.profile.account_type,
    plan: entitlements.plan,
    subscriptionStatus: entitlements.subscription_status,
    entitlements,
  };
}

/**
 * Resolve the current subject and require a capability.
 *
 * Throws AuthorizationError with AUTH_REQUIRED when unauthenticated so a caller
 * can map it to 401, and PERMISSION_DENIED / ENTITLEMENT_REQUIRED /
 * ROLE_REQUIRED to 403.
 */
export async function authorize(permission: Permission): Promise<CapabilitySubject> {
  const subject = await getCurrentSubject();
  if (!subject) {
    throw new AuthorizationError("AUTH_REQUIRED", "AUTH_REQUIRED: no authenticated subject");
  }
  requirePermission(subject, permission);
  return subject;
}
