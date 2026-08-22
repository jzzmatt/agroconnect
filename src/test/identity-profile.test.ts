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

    // Example 4: Business / Seller
    const g4 = getUserGreeting({
      email: "me@example.com",
      displayName: "AgroFarm Angola",
      activeProfile: "seller",
      professionalTitle: "none",
    });
    expect(g4.greeting).toBe("Olá, AgroFarm Angola");
  });

  it("4. Entitlements engine evaluates selling and service capabilities correctly", () => {
    // Free student without roles
    const freeUser = calculateEntitlements({
      subscriptionPlan: "free",
      roles: ["student"],
    });
    expect(freeUser.can_sell_products).toBe(false);
    expect(freeUser.can_create_products).toBe(false);

    // Seller role user
    const sellerUser = calculateEntitlements({
      subscriptionPlan: "free",
      roles: ["seller"],
    });
    expect(sellerUser.can_sell_products).toBe(true);
    expect(sellerUser.can_create_products).toBe(true);

    // Professional subscription user has unlocked capabilities
    const proUser = calculateEntitlements({
      subscriptionPlan: "professional",
      roles: ["student"],
    });
    expect(proUser.can_sell_products).toBe(true);
    expect(proUser.can_manage_services).toBe(true);
    expect(proUser.can_teach_courses).toBe(true);
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
