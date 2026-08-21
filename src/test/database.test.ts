import { describe, it, expect } from "vitest";
import type { UserRoleType, Profile, UserRole, LocationRecord } from "@/types/database";
import type { UserProfileWithRoles } from "@/types/domain";

describe("Database Types & Multi-role Architecture", () => {
  it("supports all required user roles without single-role limitation", () => {
    const roles: UserRoleType[] = [
      "student",
      "creator",
      "seller",
      "instructor",
      "expert",
      "veterinarian",
      "agronomist",
      "agricultural_consultant",
      "business",
      "admin",
    ];

    expect(roles).toHaveLength(10);
    expect(roles).toContain("veterinarian");
    expect(roles).toContain("agronomist");
    expect(roles).toContain("agricultural_consultant");
  });

  it("supports multiple simultaneous roles on a user profile", () => {
    // Example: User is both veterinarian and instructor
    const userProfile: UserProfileWithRoles = {
      id: "11111111-1111-1111-1111-111111111111",
      clerk_user_id: "user_clerk_123",
      display_name: "Dr. João Silva",
      first_name: "João",
      last_name: "Silva",
      email: "joao.silva@agroconnect.ao",
      phone: "+244923000000",
      avatar_url: "https://example.com/avatar.jpg",
      bio: "Médico Veterinário especialista em bovinos e caprinos no Huambo.",
      profile_slug: "dr-joao-silva",
      is_active: true,
      roles: ["veterinarian", "instructor", "expert"],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    expect(userProfile.roles).toContain("veterinarian");
    expect(userProfile.roles).toContain("instructor");
    expect(userProfile.roles).toContain("expert");
    expect(userProfile.roles.length).toBe(3);
  });

  it("structures LocationRecord for Angola geographic engine", () => {
    const location: LocationRecord = {
      id: "22222222-2222-2222-2222-222222222222",
      country_code: "AO",
      country_name: "Angola",
      province_code: "HUA",
      province_name: "Huambo",
      municipality_code: "HUA-CAI",
      municipality_name: "Caála",
      commune_code: null,
      commune_name: "Catata",
      latitude: -12.8525,
      longitude: 15.5606,
      location: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    expect(location.country_code).toBe("AO");
    expect(location.province_name).toBe("Huambo");
    expect(location.municipality_name).toBe("Caála");
    expect(location.latitude).toBe(-12.8525);
  });
});
