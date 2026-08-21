import { describe, it, expect } from "vitest";
import type {
  UserRoleType,
  Profile,
  UserRole,
  Country,
  Province,
  Municipality,
  Category,
  ProviderProfile,
  Service,
  Product,
  AgriculturalResource,
  Review,
  ServiceRequest,
  Notification,
  Favorite,
  AuditLog,
  LocationRecord,
} from "@/types/database";
import type { UserProfileWithRoles } from "@/types/domain";

describe("AGROCONNECT Phase 3 — Supabase Database Architecture & Domain Models", () => {
  it("supports all required user roles including agricultural specialists and farmers", () => {
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
      "farmer",
      "admin",
    ];

    expect(roles).toHaveLength(11);
    expect(roles).toContain("veterinarian");
    expect(roles).toContain("agronomist");
    expect(roles).toContain("farmer");
    expect(roles).toContain("agricultural_consultant");
  });

  it("supports decoupled user profiles with multi-role assignment and UUID primary keys", () => {
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
      preferred_language: "pt",
      account_type: "provider",
      status: "active",
      theme_preference: "light",
      is_active: true,
      roles: ["veterinarian", "instructor", "expert"],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    expect(userProfile.roles).toContain("veterinarian");
    expect(userProfile.account_type).toBe("provider");
    expect(userProfile.preferred_language).toBe("pt");
    expect(userProfile.status).toBe("active");
  });

  it("models full administrative geography hierarchy (Country → Province → Municipality)", () => {
    const angola: Country = {
      id: "c-1",
      name: "Angola",
      slug: "angola",
      code: "AO",
      code3: "AGO",
      currency_code: "AOA",
      currency_symbol: "Kz",
      phone_code: "+244",
      latitude: -12.5,
      longitude: 17.5,
      location: null,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const huambo: Province = {
      id: "p-1",
      country_id: angola.id,
      name: "Huambo",
      slug: "huambo",
      code: "HUA",
      capital: "Huambo",
      agricultural_focus: ["Milho", "Batata", "Avicultura"],
      latitude: -12.7833,
      longitude: 15.7333,
      location: null,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const caala: Municipality = {
      id: "m-1",
      province_id: huambo.id,
      country_id: angola.id,
      name: "Caála",
      slug: "caala",
      code: "HUA-CAI",
      latitude: -12.8525,
      longitude: 15.5606,
      location: null,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    expect(angola.code).toBe("AO");
    expect(huambo.code).toBe("HUA");
    expect(caala.name).toBe("Caála");
    expect(huambo.agricultural_focus).toContain("Milho");
  });

  it("models marketplace categories, services, products, and agricultural resources", () => {
    const category: Category = {
      id: "cat-1",
      parent_id: null,
      name: "Agricultura & Solos",
      slug: "agricultura-e-solos",
      description: "Consultoria agronómica",
      icon: "Sprout",
      category_type: "service",
      pillar: "agriExpert",
      is_active: true,
      sort_order: 1,
      metadata: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const provider: ProviderProfile = {
      id: "prov-1",
      profile_id: "prof-1",
      provider_type: "veterinarian",
      business_name: "Clínica Veterinária do Huambo",
      slug: "clinica-veterinaria-huambo",
      description: "Sanidade animal e reprodução",
      headline: "Médico Veterinário",
      phone: "+244923000000",
      email: "vet@agroconnect.ao",
      website: null,
      tax_id: "540123456",
      verification_status: "verified",
      status: "active",
      rating: 4.9,
      reviews_count: 24,
      country_id: "c-1",
      province_id: "p-1",
      municipality_id: "m-1",
      latitude: -12.7833,
      longitude: 15.7333,
      location: null,
      service_radius_km: 100,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const service: Service = {
      id: "srv-1",
      provider_id: provider.id,
      category_id: category.id,
      title: "Consulta de Sanidade Bovina",
      slug: "consulta-sanidade-bovina",
      short_description: "Exame clínico em fazenda",
      description: "Avaliação sanitária completa de rebanho bovino.",
      pricing_type: "hourly",
      price: 25000,
      currency: "AOA",
      country_id: "c-1",
      province_id: "p-1",
      municipality_id: "m-1",
      latitude: -12.8525,
      longitude: 15.5606,
      location: null,
      service_radius_km: 80,
      status: "active",
      is_featured: true,
      metadata: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    expect(category.pillar).toBe("agriExpert");
    expect(provider.verification_status).toBe("verified");
    expect(service.price).toBe(25000);
    expect(service.currency).toBe("AOA");
  });
});
