import type { UserProfileWithRoles } from "@/types/domain";

/**
 * High-performance server-side in-memory short TTL cache for user profiles.
 * Eliminates redundant round-trips to Clerk and Supabase during concurrent
 * and rapid route transitions while preserving strict per-user data isolation.
 */

interface CacheEntry {
  profile: UserProfileWithRoles;
  expiresAt: number;
}

const profileCache = new Map<string, CacheEntry>();
const TTL_MS = 15_000; // 15 seconds fast cache

export function getCachedUserProfile(clerkUserId: string): UserProfileWithRoles | null {
  const entry = profileCache.get(clerkUserId);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    profileCache.delete(clerkUserId);
    return null;
  }
  return entry.profile;
}

export function setCachedUserProfile(clerkUserId: string, profile: UserProfileWithRoles): void {
  profileCache.set(clerkUserId, {
    profile,
    expiresAt: Date.now() + TTL_MS,
  });
}

export function invalidateCachedUserProfile(clerkUserId: string): void {
  profileCache.delete(clerkUserId);
}

export function clearAllCachedUserProfiles(): void {
  profileCache.clear();
}
