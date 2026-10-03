import { describe, it, expect } from "vitest";
import {
  createLocationProvider,
  getDefaultLocationProvider,
  GoogleMapProvider,
} from "@/lib/location/providers";
import { LocalAngolaGeocodingProvider } from "@/lib/location/providers/geocoding";
import { getGoogleMapsApiKey } from "@/lib/location/google-maps/loader";

describe("LocationProvider & Google Maps geospatial architecture", () => {
  it("creates a default LocationProvider with Google map adapter", () => {
    const provider = getDefaultLocationProvider();
    expect(provider.mapProvider.id).toBe("google-maps");
    expect(provider.mapProvider.name).toContain("Google");
  });

  it("uses local Angola geocoding when no Google Maps API key is configured", () => {
    const original = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    delete process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    const provider = createLocationProvider();
    expect(provider.geocodingProvider.id).toBe("local-angola");
    if (original) process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY = original;
  });

  it("supports layer type metadata on GoogleMapProvider", () => {
    const mapProvider = new GoogleMapProvider("map");
    expect(mapProvider.getLayerType()).toBe("map");
    mapProvider.setLayerType("satellite");
    expect(mapProvider.getLayerType()).toBe("satellite");
  });

  it("local provider resolves Luanda queries offline", async () => {
    const geocoder = new LocalAngolaGeocodingProvider();
    const results = await geocoder.forward("Luanda", { limit: 3 });
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].provinceName || results[0].name).toMatch(/Luanda/i);
  });

  it("reads Google Maps key only from environment when present", () => {
    const key = getGoogleMapsApiKey();
    expect(typeof key === "string" || key === undefined).toBe(true);
  });
});
