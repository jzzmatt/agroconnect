import { describe, it, expect } from "vitest";
import {
  createLocationProvider,
  getDefaultLocationProvider,
  LocalAngolaGeocodingProvider,
  ConfigurableHttpGeocodingProvider,
  MapLibreOpenFreeMapProvider,
  OPEN_FREE_MAP_STYLES,
  getThemeMapStyle,
} from "@/lib/location/providers";

describe("LocationProvider & MapLibre OpenFreeMap Basemap Architecture", () => {
  it("creates a default LocationProvider containing MapProvider and GeocodingProvider", () => {
    const provider = getDefaultLocationProvider();
    expect(provider).toBeDefined();
    expect(provider.mapProvider).toBeDefined();
    expect(provider.geocodingProvider).toBeDefined();
    expect(provider.mapProvider.id).toBe("maplibre-openfreemap");
  });

  it("supports all official OpenFreeMap styles including liberty, dark, bright, positron", () => {
    const mapProvider = new MapLibreOpenFreeMapProvider("liberty");
    expect(mapProvider.id).toBe("maplibre-openfreemap");
    expect(OPEN_FREE_MAP_STYLES.liberty).toBe("https://tiles.openfreemap.org/styles/liberty");
    expect(OPEN_FREE_MAP_STYLES.dark).toBe("https://tiles.openfreemap.org/styles/dark");
    expect(OPEN_FREE_MAP_STYLES.positron).toBe("https://tiles.openfreemap.org/styles/positron");
    expect(OPEN_FREE_MAP_STYLES.bright).toBe("https://tiles.openfreemap.org/styles/bright");
  });

  it("resolves theme-aware style URLs for light and dark modes", () => {
    expect(getThemeMapStyle("light")).toBe("https://tiles.openfreemap.org/styles/liberty");
    expect(getThemeMapStyle("dark")).toBe("https://tiles.openfreemap.org/styles/dark");
  });

  it("supports 2D and 3D camera controls and state tracking", () => {
    const mapProvider = new MapLibreOpenFreeMapProvider();
    expect(mapProvider.getViewMode()).toBe("2d");
    expect(mapProvider.getPitch()).toBe(0);

    mapProvider.set3DView(60, -20);
    expect(mapProvider.getPitch()).toBe(60);
    expect(mapProvider.getBearing()).toBe(-20);
    expect(mapProvider.getViewMode()).toBe("3d");

    mapProvider.set2DView();
    expect(mapProvider.getPitch()).toBe(0);
    expect(mapProvider.getBearing()).toBe(0);
    expect(mapProvider.getViewMode()).toBe("2d");
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

  it("falls back gracefully to local provider when ConfigurableHttpGeocodingProvider has no URL", async () => {
    const geocoder = new ConfigurableHttpGeocodingProvider({
      endpointUrl: "",
    });

    const results = await geocoder.forward("Benguela");
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((r) => r.name.includes("Benguela"))).toBe(true);
  });

  it("allows instantiating a custom LocationProvider with decoupled options", () => {
    const custom = createLocationProvider({
      mapStyle: "positron",
      geocodingEndpointUrl: "https://nominatim.openstreetmap.org/search",
    });

    expect(custom.mapProvider.id).toBe("maplibre-openfreemap");
    expect(custom.geocodingProvider.id).toBe("configurable-http");
  });
});
