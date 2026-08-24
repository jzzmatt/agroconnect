import { getProfileDetailsAction } from "@/lib/auth/profile-actions";
import type { UserProfileWithRoles } from "@/types/domain";

/**
 * Client-side deduplication and short TTL cache for getProfileDetailsAction.
 * Prevents multiple components mounting in the same route transition from
 * firing duplicate server actions.
 */

let pendingPromise: Promise<UserProfileWithRoles | null> | null = null;
let cachedProfile: UserProfileWithRoles | null = null;
let cachedAt = 0;
const CLIENT_TTL_MS = 15_000; // 15 seconds

export function getSynchronousCachedProfile(): UserProfileWithRoles | null {
  const now = Date.now();
  if (cachedProfile && now - cachedAt < CLIENT_TTL_MS) {
    return cachedProfile;
  }
  return null;
}

export async function fetchClientProfileDetails(force = false): Promise<UserProfileWithRoles | null> {
  const now = Date.now();
  if (!force && cachedProfile && now - cachedAt < CLIENT_TTL_MS) {
    return cachedProfile;
  }

  if (pendingPromise) {
    return pendingPromise;
  }

  pendingPromise = (async () => {
    try {
      const res = await getProfileDetailsAction();
      cachedProfile = res;
      cachedAt = Date.now();
      return res;
    } finally {
      pendingPromise = null;
    }
  })();

  return pendingPromise;
}

export function invalidateClientProfileCache() {
  cachedProfile = null;
  cachedAt = 0;
  pendingPromise = null;
}
