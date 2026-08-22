import { describe, it, expect } from "vitest";
import {
  resolveDisplayName,
  resolveEffectiveTitle,
  getUserGreeting,
  calculateEntitlements,
  getAvailableProfileTypes,
  PROFILE_TYPE_CONFIG,
} from "@/lib/auth/identity-resolvers";
import type { UserProfileWithRoles } from "@/types/domain";

describe("AGROCONNECT Phase 8.5 — User Profile, Identity & Active Context", () => {
  it("1. Name resolution priority: displayName > firstName+lastName > username > email local-part > Utilizador", () => {
    // 1. Display name present
    expect(resolveDisplayName({ displayName: "Dr. Mateus Silva", email: "me@example.com" })).toBe("Dr. Mateus Silva");

    // 2. First + Last name
    expect(resolveDisplayName({ firstName: "Mateus", lastName: "Silva", email: "me@example.com" })).toBe("Mateus Silva");

    // 3. Username
    expect(resolveDisplayName({ username: "mateus_angola", email: "me@example.com" })).toBe("mateus_angola");

    // 4. Email local-part fallback (Never returns me@example.com)
    expect(resolveDisplayName({ email: "me@example.com" })).toBe("me");
    expect(resolveDisplayName({ email: "dr.joao@agroconnect.ao" })).toBe("dr.joao");

    // 5. Ultimate fallback
    expect(resolveDisplayName({})).toBe("Utilizador");
  });

  it("2. Professional Title Resolution: user-configured title overrides or dynamic profile derivation", () => {
    // Explicit title
    expect(resolveEffectiveTitle({ professionalTitle: "Dr." })).toBe("Dr.");
    expect(resolveEffectiveTitle({ professionalTitle: "Prof." })).toBe("Prof.");
    expect(resolveEffectiveTitle({ professionalTitle: "Eng." })).toBe("Eng.");
    expect(resolveEffectiveTitle({ professionalTitle: "custom", professionalTitleCustom: "Consultor" })).toBe("Consultor");

    // Dynamic derivation from active profile
    expect(resolveEffectiveTitle({ professionalTitle: "none", activeProfile: "veterinarian" })).toBe("Dr.");
    expect(resolveEffectiveTitle({ professionalTitle: "none", activeProfile: "instructor" })).toBe("Instrutor");
    expect(resolveEffectiveTitle({ professionalTitle: "none", activeProfile: "expert" })).toBe("Especialista");
    expect(resolveEffectiveTitle({ professionalTitle: "none", activeProfile: "student" })).toBe("");
    expect(resolveEffectiveTitle({ professionalTitle: "none", activeProfile: "seller" })).toBe("");
  });

  it("3. Hero greeting builder creates clean Portuguese greetings and NEVER includes email domain", () => {
    // Example 1: Email fallback with Dr.
    const g1 = getUserGreeting({
      email: "me@example.com",
      activeProfile: "veterinarian",
      professionalTitle: "Dr.",
    });
    expect(g1.greeting).toBe("Olá, Dr. me");
    expect(g1.greeting).not.toContain("@example.com");

    // Example 2: Display name override
    const g2 = getUserGreeting({
      email: "me@example.com",
      displayName: "Mateus",
      activeProfile: "veterinarian",
      professionalTitle: "Dr.",
    });
    expect(g2.greeting).toBe("Olá, Dr. Mateus");

    // Example 3: Instructor title
    const g3 = getUserGreeting({
      email: "me@example.com",
      displayName: "Mateus",
      activeProfile: "instructor",
      professionalTitle: "Prof.",
    });
    expect(g3.greeting).toBe("Olá, Prof. Mateus");

    // Example 5: Duplicate title prevention (e.g. displayName = "Dr. João Silva" with professionalTitle = "Dr.")
    const g5 = getUserGreeting({
      displayName: "Dr. João Silva",
      professionalTitle: "Dr.",
    });
    expect(g5.fullNameOrTitle).toBe("Dr. João Silva");
    expect(g5.fullNameOrTitle).not.toContain("Dr. Dr.");
    expect(g5.greeting).toBe("Olá, Dr. João Silva");

    const g6 = getUserGreeting({
      displayName: "Prof. Mateus",
      professionalTitle: "Prof.",
    });
    expect(g6.fullNameOrTitle).toBe("Prof. Mateus");
    expect(g6.fullNameOrTitle).not.toContain("Prof. Prof.");
  });

  it("4. Entitlements engine evaluates selling and service capabilities based on subscription plan", () => {
    // Basic plan user (cannot create products or courses)
    const basicUser = calculateEntitlements({
      subscriptionPlan: "basic",
      roles: ["seller", "veterinarian"],
    });
    expect(basicUser.can_create_products).toBe(false);
    expect(basicUser.can_publish_products).toBe(false);
    expect(basicUser.can_create_courses).toBe(false);

    // Professional subscription user has unlocked capabilities with 10-product limit
    const proUser = calculateEntitlements({
      subscriptionPlan: "professional",
      roles: ["student"],
    });
    expect(proUser.can_create_products).toBe(true);
    expect(proUser.can_publish_products).toBe(true);
    expect(proUser.can_create_courses).toBe(true);
    expect(proUser.can_teach_courses).toBe(true);
    expect(proUser.product_limit).toBe(10);

    // Business subscription user has unlimited products
    const bizUser = calculateEntitlements({
      subscriptionPlan: "business",
      roles: ["seller"],
    });
    expect(bizUser.can_create_products).toBe(true);
    expect(bizUser.product_limit).toBeNull(); // Unlimited
  });

  it("5. Discovers available profile types for multi-role users", () => {
    const mockProfile: UserProfileWithRoles = {
      id: "u-1",
      clerk_user_id: "clerk-1",
      display_name: "Mateus",
      first_name: "Mateus",
      last_name: "Silva",
      email: "mateus@example.com",
      phone: null,
      avatar_url: null,
      bio: null,
      profile_slug: "mateus",
      preferred_language: "pt",
      account_type: "customer",
      status: "active",
      theme_preference: "light",
      is_active: true,
      roles: ["veterinarian", "instructor", "seller"],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const available = getAvailableProfileTypes(mockProfile);
    expect(available).toContain("veterinarian");
    expect(available).toContain("instructor");
    expect(available).toContain("seller");
  });

  it("6. Validates proper Portuguese labels and configuration for all profile types", () => {
    expect(PROFILE_TYPE_CONFIG.veterinarian.label).toBe("Veterinário");
    expect(PROFILE_TYPE_CONFIG.expert.label).toBe("Especialista");
    expect(PROFILE_TYPE_CONFIG.instructor.label).toBe("Instrutor");
    expect(PROFILE_TYPE_CONFIG.student.label).toBe("Estudante");
    expect(PROFILE_TYPE_CONFIG.seller.label).toBe("Vendedor");
    expect(PROFILE_TYPE_CONFIG.farmer.label).toBe("Produtor Agrícola");
  });
});
