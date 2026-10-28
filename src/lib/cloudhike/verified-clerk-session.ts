/**
 * Server-side Clerk session boundary for the CloudHike adapter.
 *
 * `userId` comes from Clerk's `auth()`. A browser-supplied id, role, or
 * claims object is not a session. This module does not decode JWTs.
 */

export class CloudhikeAuthorizationError extends Error {
  readonly code: "unauthenticated" | "unverified" | "privileged-connection";

  constructor(code: "unauthenticated" | "unverified" | "privileged-connection") {
    super(code);
    this.name = "CloudhikeAuthorizationError";
    this.code = code;
  }
}

export interface VerifiedClerkSession {
  readonly kind: "verified-clerk-session";
  readonly clerkUserId: string;
}

export interface ClerkAuthUser {
  userId: string | null | undefined;
}

export function sessionFromClerkAuth(result: ClerkAuthUser): VerifiedClerkSession {
  if (!isClerkUserId(result.userId)) {
    throw new CloudhikeAuthorizationError("unauthenticated");
  }
  return { kind: "verified-clerk-session", clerkUserId: result.userId };
}

export function claimsForVerifiedSession(session: VerifiedClerkSession): { sub: string; role: "authenticated" } {
  if (session.kind !== "verified-clerk-session") {
    throw new CloudhikeAuthorizationError("unverified");
  }
  if (!isClerkUserId(session.clerkUserId)) {
    throw new CloudhikeAuthorizationError("unauthenticated");
  }
  return { sub: session.clerkUserId, role: "authenticated" };
}

function isClerkUserId(value: string | null | undefined): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 256 && value === value.trim() && !value.includes("\0");
}
