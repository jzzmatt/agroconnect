import type { UserRoleType } from "@/types/database";
import type { UserEntitlements } from "@/types/domain";
import {
  PERMISSION_POLICY,
  type EntitlementFlag,
  type Permission,
} from "./permissions";

/**
 * Everything a capability decision is allowed to depend on.
 *
 * Role, subscription and entitlement are three separate fields. `plan` is
 * carried for diagnostics and for the paid-activation guard only — no capability
 * decision compares it to a tier name.
 */
export interface CapabilitySubject {
  clerkUserId: string;
  profileId: string;
  roles: UserRoleType[];
  accountType: string;
  plan: UserEntitlements["plan"];
  subscriptionStatus: UserEntitlements["subscription_status"];
  entitlements: UserEntitlements;
}

export type AuthorizationErrorCode =
  | "AUTH_REQUIRED"
  | "PERMISSION_DENIED"
  | "ENTITLEMENT_REQUIRED"
  | "ROLE_REQUIRED"
  | "OWNERSHIP_REQUIRED";

export class AuthorizationError extends Error {
  public readonly code: AuthorizationErrorCode;
  public readonly permission?: Permission;

  constructor(code: AuthorizationErrorCode, message: string, permission?: Permission) {
    super(message);
    this.name = "AuthorizationError";
    this.code = code;
    this.permission = permission;
  }
}

export interface CapabilityDecision {
  granted: boolean;
  code?: AuthorizationErrorCode;
  /** Which requirement failed, for logs and tests. */
  reason?: string;
}

function isAdmin(subject: CapabilitySubject): boolean {
  return subject.accountType === "admin";
}

/**
 * Resolve one permission for one subject. Pure: no I/O, no session access, so it
 * is directly testable across every combination of role, plan and entitlement.
 */
export function decide(
  subject: CapabilitySubject | null,
  permission: Permission
): CapabilityDecision {
  if (!subject) {
    return { granted: false, code: "AUTH_REQUIRED", reason: "no authenticated subject" };
  }

  const rule = PERMISSION_POLICY[permission];
  if (!rule) {
    return { granted: false, code: "PERMISSION_DENIED", reason: "unknown permission" };
  }

  // Admins bypass entitlement and role requirements. This is an account-type
  // capability, not a subscription tier.
  if (isAdmin(subject)) return { granted: true };

  if (rule.entitlement && !subject.entitlements[rule.entitlement]) {
    return {
      granted: false,
      code: "ENTITLEMENT_REQUIRED",
      reason: `entitlement ${rule.entitlement} is false`,
    };
  }

  if (rule.roles && rule.roles.length > 0) {
    const hasRole = subject.roles.some((role) => rule.roles!.includes(role));
    if (!hasRole) {
      return {
        granted: false,
        code: "ROLE_REQUIRED",
        reason: `requires one of: ${rule.roles.join(", ")}`,
      };
    }
  }

  return { granted: true };
}

/** Does this subject hold this capability? */
export function can(subject: CapabilitySubject | null, permission: Permission): boolean {
  return decide(subject, permission).granted;
}

/** Throw unless this subject holds this capability. */
export function requirePermission(
  subject: CapabilitySubject | null,
  permission: Permission
): void {
  const decision = decide(subject, permission);
  if (decision.granted) return;
  const rule = PERMISSION_POLICY[permission];
  throw new AuthorizationError(
    decision.code || "PERMISSION_DENIED",
    `${decision.code || "PERMISSION_DENIED"}: ${rule?.describe || permission} (${decision.reason})`,
    permission
  );
}

/** Throw unless this subject holds this entitlement flag directly. */
export function requireEntitlement(
  subject: CapabilitySubject | null,
  entitlement: EntitlementFlag
): void {
  if (!subject) {
    throw new AuthorizationError("AUTH_REQUIRED", "AUTH_REQUIRED: no authenticated subject");
  }
  if (isAdmin(subject)) return;
  if (!subject.entitlements[entitlement]) {
    throw new AuthorizationError(
      "ENTITLEMENT_REQUIRED",
      `ENTITLEMENT_REQUIRED: ${entitlement}`
    );
  }
}

/** Every capability this subject holds. Useful for a single UI payload. */
export function grantedPermissions(subject: CapabilitySubject | null): Permission[] {
  return (Object.keys(PERMISSION_POLICY) as Permission[]).filter((permission) =>
    can(subject, permission)
  );
}
