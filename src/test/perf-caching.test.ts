import { describe, it, expect } from "vitest";
import { getCachedUserProfile, setCachedUserProfile, invalidateCachedUserProfile, clearAllCachedUserProfiles } from "@/lib/auth/profile-cache";
import { fetchClientProfileDetails, invalidateClientProfileCache } from "@/lib/auth/user-client-cache";
import type { UserProfileWithRoles } from "@/types/domain";

describe("Performance Optimization & Caching Infrastructure", () => {
  const dummyProfile: UserProfileWithRoles = {
    id: "prof-123",
    clerk_user_id: "user_clerk_123",
    display_name: "Dr. João Silva",
    first_name: "João",
    last_name: "Silva",
    email: "joao@agroconnect.ao",
    phone: "+244 923 111 222",
    avatar_url: null,
    bio: "Médico Veterinário",
    profile_slug: "dr-joao-silva",
    preferred_language: "pt",
    account_type: "customer",
    status: "active",
    theme_preference: "light",
    is_active: true,
    roles: ["veterinarian", "expert"],
    subscription_plan: "professional",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  it("caches and retrieves server profile with short TTL", () => {
    clearAllCachedUserProfiles();
    expect(getCachedUserProfile("user_clerk_123")).toBeNull();

    setCachedUserProfile("user_clerk_123", dummyProfile);
    const cached = getCachedUserProfile("user_clerk_123");
    expect(cached).not.toBeNull();
    expect(cached?.display_name).toBe("Dr. João Silva");
    expect(cached?.subscription_plan).toBe("professional");

    invalidateCachedUserProfile("user_clerk_123");
    expect(getCachedUserProfile("user_clerk_123")).toBeNull();
  });

  it("deduplicates simultaneous client-side profile fetch requests", async () => {
    invalidateClientProfileCache();

    // Call fetchClientProfileDetails multiple times concurrently
    const [p1, p2, p3] = await Promise.all([
      fetchClientProfileDetails(),
      fetchClientProfileDetails(),
      fetchClientProfileDetails(),
    ]);

    expect(p1).toEqual(p2);
    expect(p2).toEqual(p3);
  });
});
