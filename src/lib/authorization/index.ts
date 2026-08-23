/**
 * Authorization domain — client-safe entry point.
 *
 * Role, subscription and entitlement are three separate concepts and are
 * resolved independently. Capability is asked for by name — `can(user,
 * "product.create")` — never by comparing a subscription tier.
 *
 * Everything exported here is pure and carries no server-only dependency, so a
 * client component can import it for presentation. Server-side enforcement is
 * mandatory and lives in `@/lib/authorization/server`; UI checks built on `can()`
 * control presentation only and never stand in for a server guard.
 */
export {
  PERMISSIONS,
  PERMISSION_POLICY,
  isPermission,
  type Permission,
  type PermissionRule,
  type EntitlementFlag,
} from "./permissions";

export {
  can,
  decide,
  requirePermission,
  requireEntitlement,
  grantedPermissions,
  AuthorizationError,
  type CapabilitySubject,
  type CapabilityDecision,
  type AuthorizationErrorCode,
} from "./policy";

export { subjectFromProfile } from "./subject";

export { isOwner, requireOwnership, authorizationStatus } from "./ownership";

export {
  isSelfServicePaidActivationEnabled,
  requirePlanActivationAllowed,
} from "./subscription";
