import { describe, it, expect } from "vitest";
import {
  MarketplaceService,
  INITIAL_SERVICES,
  INITIAL_PROVIDERS,
  slugify,
} from "@/lib/services/marketplace-service";

describe("AGROCONNECT Phase 6 — Services & Provider Marketplace", () => {
  it("1. Slugify utility produces URL-safe slugs without accents and special characters", () => {
    expect(slugify("Instalação de Sistemas de Rega")).toBe("instalacao-de-sistemas-de-rega");
    expect(slugify("Médico Veterinário & Consultoria")).toBe("medico-veterinario-consultoria");
    expect(slugify("Água & Solos em Huíla")).toBe("agua-solos-em-huila");
  });

  it("2. Searches and filters published services by keyword", async () => {
    const result = await MarketplaceService.searchServices({
      query: "veterinária",
    });

    expect(result.services.length).toBeGreaterThan(0);
    expect(
      result.services.some((s) => s.title.toLowerCase().includes("veterinária") || s.provider_name.toLowerCase().includes("veterinária"))
    ).toBe(true);
  });

  it("3. Filters services by province (Angola geography)", async () => {
    const huamboResults = await MarketplaceService.searchServices({
      provinceName: "Huambo",
    });

    expect(huamboResults.services.length).toBeGreaterThan(0);
    expect(huamboResults.services.every((s) => s.province_name?.toLowerCase() === "huambo")).toBe(true);

    const benguelaResults = await MarketplaceService.searchServices({
      provinceName: "Benguela",
    });
    expect(benguelaResults.services.length).toBeGreaterThan(0);
    expect(benguelaResults.services.every((s) => s.province_name?.toLowerCase() === "benguela")).toBe(true);
  });

  it("4. Calculates distance and filters services within geographic radius (PostGIS / Haversine)", async () => {
    // User coordinates near Huambo (-12.7833, 15.7333)
    const result = await MarketplaceService.searchServices({
      latitude: -12.7833,
      longitude: 15.7333,
      radiusKm: 70,
      sortBy: "distance",
    });

    expect(result.services.length).toBeGreaterThan(0);
    const firstService = result.services[0];
    expect(firstService.distance_km).toBeDefined();
    expect(firstService.distance_km).toBeLessThanOrEqual(70);
    expect(firstService.is_within_service_area).toBe(true);
  });

  it("5. Retrieves service details by public slug", async () => {
    const slug = "consulta-veterinaria-fazenda-sanidade-bovina";
    const service = await MarketplaceService.getServiceBySlug(slug);

    expect(service).not.toBeNull();
    expect(service?.slug).toBe(slug);
    expect(service?.title).toBe("Consulta Veterinária em Fazenda e Sanidade Bovina");
    expect(service?.pricing_type).toBe("hourly");
    expect(service?.price).toBe(25000);
    expect(service?.currency).toBe("AOA");
    expect(service?.provider_name).toContain("Dr. João Silva");
  });

  it("6. Retrieves provider profile and associated published services by slug", async () => {
    const providerSlug = "dr-joao-silva";
    const provider = await MarketplaceService.getProviderBySlug(providerSlug);

    expect(provider).not.toBeNull();
    expect(provider?.slug).toBe(providerSlug);
    expect(provider?.business_name).toContain("Dr. João Silva");
    expect(provider?.verification_status).toBe("verified");
    expect(provider?.service_radius_km).toBeGreaterThanOrEqual(50);

    const providerServices = await MarketplaceService.getProviderServices(provider!.id);
    expect(providerServices.length).toBeGreaterThan(0);
  });

  it("7. Validates pricing structure (fixed, hourly, daily, starting_from)", async () => {
    const fixedServices = await MarketplaceService.searchServices({ pricingType: "fixed" });
    expect(fixedServices.services.every((s) => s.pricing_type === "fixed")).toBe(true);

    const hourlyServices = await MarketplaceService.searchServices({ pricingType: "hourly" });
    expect(hourlyServices.services.every((s) => s.pricing_type === "hourly")).toBe(true);
  });

  it("8. Validates sorting logic by price ascending and descending", async () => {
    const ascResult = await MarketplaceService.searchServices({ sortBy: "price_asc" });
    for (let i = 0; i < ascResult.services.length - 1; i++) {
      expect(ascResult.services[i].price).toBeLessThanOrEqual(ascResult.services[i + 1].price);
    }

    const descResult = await MarketplaceService.searchServices({ sortBy: "price_desc" });
    for (let i = 0; i < descResult.services.length - 1; i++) {
      expect(descResult.services[i].price).toBeGreaterThanOrEqual(descResult.services[i + 1].price);
    }
  });
});
