import { describe, it, expect } from "vitest";
import {
  createLocationProvider,
  getDefaultLocationProvider,
  LocalAngolaGeocodingProvider,
  MapQuestGeocodingProvider,
  MapQuestProvider,
  getMapTileUrl,
} from "@/lib/location/providers";

describe("LocationProvider & MapQuest Geospatial Architecture", () => {
  it("creates a default LocationProvider containing MapQuest MapProvider and GeocodingProvider", () => {
    const provider = getDefaultLocationProvider();
    expect(provider).toBeDefined();
    expect(provider.mapProvider).toBeDefined();
    expect(provider.geocodingProvider).toBeDefined();
    expect(provider.mapProvider.id).toBe("mapquest");
  });

  it("generates correct tile URLs for standard map, dark and satellite layers", () => {
    const mapTile = getMapTileUrl("test_key_123", "map");
    expect(mapTile.url).toContain("tiles.mapquest.com/render/latest/vivid");

    const satTile = getMapTileUrl("test_key_123", "satellite");
    expect(satTile.url).toContain("tiles.mapquest.com/render/latest/satellite");

    const darkTile = getMapTileUrl("test_key_123", "dark");
    expect(darkTile.url).toContain("tiles.mapquest.com/render/latest/night");
  });

  it("supports layer type switching in MapQuestProvider (map, satellite, dark)", () => {
    const mapProvider = new MapQuestProvider("test_key", "map");
    expect(mapProvider.getLayerType()).toBe("map");

    mapProvider.setLayerType("satellite");
    expect(mapProvider.getLayerType()).toBe("satellite");

    mapProvider.setLayerType("dark");
    expect(mapProvider.getLayerType()).toBe("dark");
  });

  it("performs forward geocoding with LocalAngolaGeocodingProvider", async () => {
    const geocoder = new LocalAngolaGeocodingProvider();

    const huamboResults = await geocoder.forward("Huambo");
    expect(huamboResults.length).toBeGreaterThan(0);
    const huambo = huamboResults.find((r) => r.name === "Huambo");
    expect(huambo).toBeDefined();
    expect(huambo?.countryCode).toBe("AO");
    expect(huambo?.coordinates.latitude).toBeCloseTo(-12.7833, 2);

    const caalaResults = await geocoder.forward("Caála");
    expect(caalaResults.length).toBeGreaterThan(0);
    expect(caalaResults[0].provinceName).toBe("Huambo");
  });

  it("performs reverse geocoding with LocalAngolaGeocodingProvider", async () => {
    const geocoder = new LocalAngolaGeocodingProvider();
    const result = await geocoder.reverse({ latitude: -14.9167, longitude: 13.55 });
    expect(result).not.toBeNull();
    expect(result?.municipalityName).toBe("Lubango");
    expect(result?.provinceName).toBe("Huíla");
  });

  it("falls back gracefully to local provider when MapQuestGeocodingProvider has no API key", async () => {
    const geocoder = new MapQuestGeocodingProvider("");

    const results = await geocoder.forward("Benguela");
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((r) => r.name.includes("Benguela"))).toBe(true);
  });

  it("allows instantiating a custom LocationProvider with decoupled options", () => {
    const custom = createLocationProvider({
      apiKey: "custom_key_456",
      initialLayer: "satellite",
    });

    expect(custom.mapProvider.id).toBe("mapquest");
    expect(custom.geocodingProvider.id).toBe("mapquest-geocoding");
  });
});
