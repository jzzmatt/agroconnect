import { describe, expect, it } from "vitest";
import {
  buildProviderSlug,
  canTransitionPublication,
  isManagedProfileImageUrl,
  isPubliclyDiscoverable,
  publicationStateLabel,
  toPublicProviderIdentity,
} from "@/lib/agriprofile/publication";
import { can, requirePermission, AuthorizationError } from "@/lib/authorization";
import { subjectFromProfile } from "@/lib/authorization";
import { getUserEntitlements } from "@/lib/services/pricing-service";
import { validateProfileImage } from "@/lib/agriprofile/profile-media-service";
import type { AccountType, SubscriptionPlan, UserRoleType } from "@/types/database";

function subject(plan: SubscriptionPlan | null) {
  return subjectFromProfile({
    id: "profile-owner",
    clerk_user_id: "clerk-1",
    roles: ["student"] as UserRoleType[],
    account_type: "customer" as AccountType,
    subscription_plan: plan,
    subscription_status: "active",
  });
}

const draftSource = {
  id: "prov-1",
  slug: "dr-joao-silva",
  publication_state: "draft" as const,
  business_name: "Dr. João Silva",
  professional_title: "Dr.",
  provider_type: "veterinarian",
  headline: "Veterinário",
  description: "Sanidade animal",
  avatar_url: "https://ik.imagekit.io/demo/tr:w-400/avatar.jpg",
  website: "https://agroconnect.ao",
  verification_status: "verified",
  province_name: "Huambo",
  municipality_name: "Caála",
  published_at: null,
  profile_id: "secret-profile-id",
  email: "private@example.com",
  phone: "+244923000000",
  tax_id: "540123456",
  subscription_plan: "professional",
};

describe("Phase 5 — public provider publication", () => {
  it("treats draft and paused profiles as not public", () => {
    expect(isPubliclyDiscoverable("draft")).toBe(false);
    expect(isPubliclyDiscoverable("paused")).toBe(false);
    expect(isPubliclyDiscoverable("published")).toBe(true);
    expect(toPublicProviderIdentity(draftSource)).toBeNull();
    expect(toPublicProviderIdentity({ ...draftSource, publication_state: "paused" })).toBeNull();
  });

  it("exposes a published profile without private fields", () => {
    const publicProfile = toPublicProviderIdentity({
      ...draftSource,
      publication_state: "published",
      published_at: "2026-08-25T00:00:00.000Z",
    });
    expect(publicProfile).not.toBeNull();
    expect(publicProfile?.slug).toBe("dr-joao-silva");
    expect(publicProfile?.display_name).toBe("Dr. João Silva");
    expect(publicProfile?.avatar_url).toContain("imagekit.io");
    expect(publicProfile).not.toHaveProperty("email");
    expect(publicProfile).not.toHaveProperty("phone");
    expect(publicProfile).not.toHaveProperty("profile_id");
    expect(publicProfile).not.toHaveProperty("subscription_plan");
    expect(publicProfile).not.toHaveProperty("tax_id");
    expect(JSON.stringify(publicProfile)).not.toContain("private@example.com");
    expect(JSON.stringify(publicProfile)).not.toContain("secret-profile-id");
    expect(JSON.stringify(publicProfile)).not.toContain("540123456");
  });

  it("allows eligible plans to publish and denies basic or missing subscriptions", () => {
    expect(getUserEntitlements({ subscriptionPlan: null }).can_publish_public_provider).toBe(false);
    expect(getUserEntitlements({ subscriptionPlan: "basic" }).can_publish_public_provider).toBe(false);
    expect(getUserEntitlements({ subscriptionPlan: "professional" }).can_publish_public_provider).toBe(true);
    expect(getUserEntitlements({ subscriptionPlan: "business" }).can_publish_public_provider).toBe(true);
    expect(getUserEntitlements({ subscriptionPlan: "enterprise" }).can_publish_public_provider).toBe(true);

    expect(can(null, "profile.publish")).toBe(false);
    expect(can(subject(null), "profile.publish")).toBe(false);
    expect(can(subject("basic"), "profile.publish")).toBe(false);
    expect(can(subject("professional"), "profile.publish")).toBe(true);
    expect(() => requirePermission(subject("basic"), "profile.publish")).toThrow(AuthorizationError);
    expect(() => requirePermission(subject("professional"), "profile.publish")).not.toThrow();
  });

  it("only allows draft→published, published→paused and paused→published", () => {
    expect(canTransitionPublication("draft", "publish")).toBe(true);
    expect(canTransitionPublication("draft", "pause")).toBe(false);
    expect(canTransitionPublication("published", "pause")).toBe(true);
    expect(canTransitionPublication("published", "publish")).toBe(false);
    expect(canTransitionPublication("paused", "resume")).toBe(true);
    expect(canTransitionPublication("paused", "pause")).toBe(false);
    expect(publicationStateLabel("draft")).toBe("Rascunho");
  });

  it("validates profile image persistence constraints", () => {
    expect(validateProfileImage({ mimeType: "image/jpeg", fileSize: 1024, fileName: "avatar.jpg" }).ok).toBe(true);
    expect(validateProfileImage({ mimeType: "image/gif", fileSize: 1024, fileName: "avatar.gif" }).ok).toBe(false);
    expect(validateProfileImage({ mimeType: "image/png", fileSize: 6 * 1024 * 1024, fileName: "avatar.png" }).ok).toBe(false);
    expect(buildProviderSlug("Dr. João Silva", "abcdef12")).toContain("dr-joao-silva");
    expect(isManagedProfileImageUrl("https://ik.imagekit.io/demo/avatar.jpg")).toBe(true);
    expect(isManagedProfileImageUrl("https://img.clerk.com/avatar.jpg")).toBe(false);
  });
});
