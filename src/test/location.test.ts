import { describe, it, expect } from "vitest";
import {
  calculateDistance,
  isWithinRadius,
  isWithinBounds,
  isValidCoordinate,
  formatLocation,
  formatDistance,
  getProvince,
  getMunicipality,
  getMunicipalitiesByProvince,
  getCoordinates,
  searchLocations,
  searchNearby,
} from "@/lib/location";
import { ANGOLA_PROVINCES, ANGOLA_KEY_MUNICIPALITIES } from "@/config/locations";

describe("AGROCONNECT Phase 5 — Angola Location Engine & Geospatial Discovery", () => {
  it("1. Loads all 18 official provinces of Angola with complete metadata", () => {
    expect(ANGOLA_PROVINCES).toHaveLength(18);
    expect(ANGOLA_PROVINCES.map((p) => p.name)).toContain("Huambo");
    expect(ANGOLA_PROVINCES.map((p) => p.name)).toContain("Huíla");
    expect(ANGOLA_PROVINCES.map((p) => p.name)).toContain("Benguela");
    expect(ANGOLA_PROVINCES.map((p) => p.name)).toContain("Luanda");
    expect(ANGOLA_PROVINCES.map((p) => p.name)).toContain("Malanje");
  });

  it("2. Validates geographic coordinates under WGS84 standard", () => {
    expect(isValidCoordinate({ latitude: -12.7833, longitude: 15.7333 })).toBe(true);
    expect(isValidCoordinate({ latitude: 95.0, longitude: 15.0 })).toBe(false);
    expect(isValidCoordinate({ latitude: -12.0, longitude: 200.0 })).toBe(false);
    expect(isValidCoordinate(null)).toBe(false);
  });

  it("3. Calculates accurate distance between geographic coordinates", () => {
    // Luanda (-8.8383, 13.2344) to Huambo (-12.7833, 15.7333)
    const luanda = { latitude: -8.8383, longitude: 13.2344 };
    const huambo = { latitude: -12.7833, longitude: 15.7333 };

    const distance = calculateDistance(luanda, huambo);
    expect(distance).toBeGreaterThan(490);
    expect(distance).toBeLessThan(540);
  });

  it("4. Evaluates radius boundaries (isWithinRadius)", () => {
    const huamboCenter = { latitude: -12.7833, longitude: 15.7333 };
    const caala = { latitude: -12.8525, longitude: 15.5606 }; // ~20 km away
    const luanda = { latitude: -8.8383, longitude: 13.2344 }; // ~515 km away

    expect(isWithinRadius(huamboCenter, caala, 30)).toBe(true);
    expect(isWithinRadius(huamboCenter, caala, 10)).toBe(false);
    expect(isWithinRadius(huamboCenter, luanda, 100)).toBe(false);
  });

  it("5. Evaluates map viewport bounding box (isWithinBounds)", () => {
    const bounds = {
      north: -8.0,
      south: -16.0,
      east: 18.0,
      west: 12.0,
    };

    const huambo = { latitude: -12.7833, longitude: 15.7333 };
    const luanda = { latitude: -8.8383, longitude: 13.2344 };
    const cabinda = { latitude: -5.55, longitude: 12.2 }; // Outside north

    expect(isWithinBounds(huambo, bounds)).toBe(true);
    expect(isWithinBounds(luanda, bounds)).toBe(true);
    expect(isWithinBounds(cabinda, bounds)).toBe(false);
  });

  it("6. Formats Portuguese human-readable location labels without duplicates", () => {
    const label1 = formatLocation({
      localityName: "Catata",
      communeName: "Catata",
      municipalityName: "Caála",
      provinceName: "Huambo",
      countryName: "Angola",
    });
    expect(label1).toBe("Catata, Caála, Huambo • Angola");

    const label2 = formatLocation({
      municipalityName: "Luanda",
      provinceName: "Luanda",
    });
    expect(label2).toBe("Luanda • Angola");

    const labelDefault = formatLocation(null);
    expect(labelDefault).toBe("Angola");
  });

  it("7. Formats distances with appropriate units", () => {
    expect(formatDistance(12.5)).toBe("12.5 km");
    expect(formatDistance(0.85)).toBe("850 m");
    expect(formatDistance(0.3)).toBe("300 m");
  });

  it("8. Performs Angola-first text search prioritizing exact and prefix matches", () => {
    const results = searchLocations("Lobito");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].name).toBe("Lobito");
    expect(results[0].provinceName).toBe("Benguela");
    expect(results[0].type).toBe("municipality");
  });

  it("9. Searches and sorts nearby items by proximity (searchNearby)", () => {
    const userLocation = { latitude: -12.7833, longitude: 15.7333 }; // Huambo

    const items = [
      { id: "1", title: "Veterinário em Luanda", coordinates: { latitude: -8.8383, longitude: 13.2344 } },
      { id: "2", title: "Agrónomo na Caála", coordinates: { latitude: -12.8525, longitude: 15.5606 } },
      { id: "3", title: "Equipamento no Lubango", coordinates: { latitude: -14.9167, longitude: 13.55 } },
    ];

    const nearby = searchNearby(items, userLocation, 100);
    expect(nearby).toHaveLength(1);
    expect(nearby[0].id).toBe("2");
    expect(nearby[0].title).toBe("Agrónomo na Caála");
  });
});
