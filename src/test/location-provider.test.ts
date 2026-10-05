import { describe, it, expect } from "vitest";
import {
  createLocationProvider,
  getDefaultLocationProvider,
  GeoJsonMapProvider,
} from "@/lib/location/providers";
import { LocalAngolaGeocodingProvider } from "@/lib/location/providers/geocoding";

describe("LocationProvider & GeoJSON atlas architecture", () => {
  it("creates a default LocationProvider with GeoJSON map adapter", () => {
    const provider = getDefaultLocationProvider();
    expect(provider.mapProvider.id).toBe("geojson-atlas");
    expect(provider.mapProvider.name).toContain("GeoJSON");
  });

  it("always uses local Angola geocoding (no external map SDK search)", () => {
    const provider = createLocationProvider();
    expect(provider.geocodingProvider.id).toBe("local-angola");
    expect(provider.geocodingProvider).toBeInstanceOf(LocalAngolaGeocodingProvider);
  });

  it("supports layer metadata on GeoJsonMapProvider", () => {
    const mapProvider = new GeoJsonMapProvider();
    expect(mapProvider.getLayerType()).toBe("map");
    mapProvider.setLayerType("dark");
    expect(mapProvider.getLayerType()).toBe("dark");
  });

  it("local provider resolves Luanda queries offline", async () => {
    const geocoder = new LocalAngolaGeocodingProvider();
    const results = await geocoder.forward("Luanda", { limit: 3 });
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].provinceName || results[0].name).toMatch(/Luanda/i);
  });
});
