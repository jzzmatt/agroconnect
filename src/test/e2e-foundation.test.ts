import { describe, it, expect } from "vitest";
import { getDictionary } from "@/i18n";
import { ANGOLA_PROVINCES } from "@/config/locations";
import { calculateDistance, isWithinRadius, formatLocation } from "@/lib/location";
import { MOCK_EXPERTS, MOCK_COURSES, MOCK_PRODUCTS, MOCK_MAP_MARKERS } from "@/config/mock-data";
import { DASHBOARD_NAVIGATION } from "@/config/navigation";

describe("AGROCONNECT Phase 1 Foundation — End-to-End Acceptance Tests", () => {
  it("1. Verifies official product and pillar naming across the entire platform", () => {
    const dict = getDictionary("pt");
    expect(dict.common.brandName).toBe("AGROCONNECT");
    expect(dict.navigation.agriExpert).toBe("AgriExpert");
    expect(dict.navigation.agriAcademy).toBe("AgriAcademy");
    expect(dict.navigation.agriShopping).toBe("AgriShopping");
    expect(dict.navigation.agriLocalizacao).toBe("AgriLocalização");
  });

  it("2. Verifies Portuguese is the default language and terminology is consistent", () => {
    const dict = getDictionary();
    expect(dict.roles.veterinarian).toBe("Veterinário");
    expect(dict.roles.agronomist).toBe("Agrónomo");
    expect(dict.roles.agricultural_consultant).toBe("Consultor Agrícola");
    expect(dict.entities.province).toBe("Província");
    expect(dict.entities.municipality).toBe("Município");
    expect(dict.entities.commune).toBe("Comuna");
    expect(dict.navigation.dashboard).toBe("Painel");
  });

  it("3. Verifies Angola geographic foundation covers all 18 provinces", () => {
    expect(ANGOLA_PROVINCES).toHaveLength(18);
    const provinceNames = ANGOLA_PROVINCES.map((p) => p.name);
    expect(provinceNames).toEqual(
      expect.arrayContaining([
        "Bengo",
        "Benguela",
        "Bié",
        "Cabinda",
        "Cuando Cubango",
        "Cuanza Norte",
        "Cuanza Sul",
        "Cunene",
        "Huambo",
        "Huíla",
        "Luanda",
        "Lunda Norte",
        "Lunda Sul",
        "Malanje",
        "Moxico",
        "Namibe",
        "Uíge",
        "Zaire",
      ])
    );
  });

  it("4. Verifies geospatial proximity calculations for AgriLocalização", () => {
    const huambo = { latitude: -12.7833, longitude: 15.7333 };
    const caala = { latitude: -12.8525, longitude: 15.5606 };
    const distance = calculateDistance(huambo, caala);

    expect(distance).toBeGreaterThan(15);
    expect(distance).toBeLessThan(30);
    expect(isWithinRadius(huambo, caala, 25)).toBe(true);
    expect(isWithinRadius(huambo, caala, 10)).toBe(false);

    const formatted = formatLocation({
      provinceName: "Huambo",
      municipalityName: "Caála",
      countryName: "Angola",
    });
    expect(formatted).toBe("Caála, Huambo • Angola");
  });

  it("5. Verifies all 3 business pillars and AgriLocalização map markers are populated", () => {
    expect(MOCK_EXPERTS.length).toBeGreaterThanOrEqual(4);
    expect(MOCK_COURSES.length).toBeGreaterThanOrEqual(4);
    expect(MOCK_PRODUCTS.length).toBeGreaterThanOrEqual(4);
    expect(MOCK_MAP_MARKERS.length).toBeGreaterThanOrEqual(6);

    // Map markers cover all pillars
    const categories = new Set(MOCK_MAP_MARKERS.map((m) => m.category));
    expect(categories.has("expert")).toBe(true);
    expect(categories.has("academy")).toBe(true);
    expect(categories.has("shopping")).toBe(true);
  });

  it("6. Verifies role-adaptive dashboard navigation structure", () => {
    const allSections = DASHBOARD_NAVIGATION;
    expect(allSections.length).toBeGreaterThanOrEqual(4);

    const expertSection = allSections.find((s) => s.pillar === "agriExpert");
    expect(expertSection?.roles).toContain("veterinarian");
    expect(expertSection?.roles).toContain("agronomist");
    expect(expertSection?.roles).toContain("expert");

    const academySection = allSections.find((s) => s.pillar === "agriAcademy");
    expect(academySection?.roles).toContain("instructor");
  });
});
