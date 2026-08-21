import { describe, it, expect } from "vitest";
import {
  calculateDistance,
  isWithinRadius,
  formatLocation,
  getProvince,
  getMunicipality,
  getMunicipalitiesByProvince,
  getCoordinates,
  searchNearby,
} from "@/lib/location";
import { ANGOLA_PROVINCES, ANGOLA_KEY_MUNICIPALITIES } from "@/config/locations";

describe("AgriLocalização Core Location Engine", () => {
  it("loads all 18 official provinces of Angola", () => {
    expect(ANGOLA_PROVINCES).toHaveLength(18);
    expect(ANGOLA_PROVINCES.map((p) => p.name)).toContain("Huambo");
    expect(ANGOLA_PROVINCES.map((p) => p.name)).toContain("Huíla");
    expect(ANGOLA_PROVINCES.map((p) => p.name)).toContain("Benguela");
    expect(ANGOLA_PROVINCES.map((p) => p.name)).toContain("Luanda");
    expect(ANGOLA_PROVINCES.map((p) => p.name)).toContain("Malanje");
  });

  it("calculates distance between two coordinates with Haversine formula", () => {
    // Luanda (-8.8383, 13.2344) to Huambo (-12.7833, 15.7333)
    const luanda = { latitude: -8.8383, longitude: 13.2344 };
    const huambo = { latitude: -12.7833, longitude: 15.7333 };

    const distance = calculateDistance(luanda, huambo);
    // Approx ~510 - 520 km straight-line distance
    expect(distance).toBeGreaterThan(490);
    expect(distance).toBeLessThan(540);
  });

  it("checks radius boundary with isWithinRadius", () => {
    const huamboCenter = { latitude: -12.7833, longitude: 15.7333 };
    const caala = { latitude: -12.8525, longitude: 15.5606 }; // ~20 km away
    const luanda = { latitude: -8.8383, longitude: 13.2344 }; // ~515 km away

    expect(isWithinRadius(huamboCenter, caala, 30)).toBe(true);
    expect(isWithinRadius(huamboCenter, caala, 10)).toBe(false);
    expect(isWithinRadius(huamboCenter, luanda, 100)).toBe(false);
  });

  it("formats location into standard Portuguese readable format", () => {
    const formatted1 = formatLocation({
      provinceName: "Huambo",
      municipalityName: "Caála",
      communeName: "Catata",
      countryName: "Angola",
    });
    expect(formatted1).toBe("Catata, Caála, Huambo • Angola");

    const formatted2 = formatLocation({
      provinceName: "Luanda",
      municipalityName: "Viana",
    });
    expect(formatted2).toBe("Viana, Luanda • Angola");

    const formattedDefault = formatLocation(null);
    expect(formattedDefault).toBe("Angola");
  });

  it("retrieves province by name or code", () => {
    const p1 = getProvince("Huambo");
    expect(p1?.code).toBe("HUA");
    expect(p1?.capital).toBe("Huambo");

    const p2 = getProvince("lua");
    expect(p2?.name).toBe("Luanda");
  });

  it("retrieves municipalities for a given province", () => {
    const huamboMunis = getMunicipalitiesByProvince("Huambo");
    expect(huamboMunis.length).toBeGreaterThanOrEqual(3);
    expect(huamboMunis.map((m) => m.name)).toContain("Caála");
    expect(huamboMunis.map((m) => m.name)).toContain("Bailundo");
  });

  it("searches and sorts items by proximity (searchNearby)", () => {
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
