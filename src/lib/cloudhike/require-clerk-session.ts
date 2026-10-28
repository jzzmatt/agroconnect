import { auth } from "@clerk/nextjs/server";
import { sessionFromClerkAuth, type VerifiedClerkSession } from "./verified-clerk-session";

/**
 * Verifies the Clerk session with the server SDK before any CloudHike claims
 * are built. The returned subject is `auth().userId`. Client claims are ignored.
 */
export async function requireVerifiedClerkSession(): Promise<VerifiedClerkSession> {
  const { userId } = await auth();
  return sessionFromClerkAuth({ userId });
}
