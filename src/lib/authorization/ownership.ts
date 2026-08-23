import { AuthorizationError, type CapabilitySubject } from "./policy";

/**
 * Ownership is a separate question from capability. Holding `product.update`
 * means a user may update products they own — never that they may update any
 * product. Both checks are required on every write to a user-owned resource.
 *
 * These helpers are pure so they run on either side of the boundary. Resolving
 * who owns a given database row is server-only and lives in
 * `./product-ownership`.
 */
export function isOwner(
  resourceOwnerProfileId: string | null | undefined,
  subject: CapabilitySubject | null
): boolean {
  if (!subject || !resourceOwnerProfileId) return false;
  return resourceOwnerProfileId === subject.profileId;
}

/** Throw unless the subject owns the resource. */
export function requireOwnership(
  resourceOwnerProfileId: string | null | undefined,
  subject: CapabilitySubject | null,
  resourceDescription = "resource"
): void {
  if (!subject) {
    throw new AuthorizationError("AUTH_REQUIRED", "AUTH_REQUIRED: no authenticated subject");
  }
  if (!isOwner(resourceOwnerProfileId, subject)) {
    throw new AuthorizationError(
      "OWNERSHIP_REQUIRED",
      `OWNERSHIP_REQUIRED: caller does not own this ${resourceDescription}`
    );
  }
}

/** Map an authorization failure onto an HTTP status. */
export function authorizationStatus(error: unknown): 401 | 403 | null {
  if (!(error instanceof AuthorizationError)) return null;
  return error.code === "AUTH_REQUIRED" ? 401 : 403;
}
