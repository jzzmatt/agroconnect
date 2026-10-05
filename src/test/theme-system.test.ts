import { describe, it, expect } from "vitest";
import { GeoJsonMapProvider } from "@/lib/location/providers/geojson-map-provider";
import { ANGOLA_MAP_BACKGROUND } from "@/lib/geographic/angola-map-theme";

describe("Theme & map styling", () => {
  it("exposes agricultural atlas background tokens", () => {
    expect(ANGOLA_MAP_BACKGROUND.dark.solid).toBe("#064E3B");
    expect(ANGOLA_MAP_BACKGROUND.light.surround).toBe("#E6E8EB");
    expect(ANGOLA_MAP_BACKGROUND.light.ocean).toBe("#B9DFF5");
  });

  it("tracks layer selection on the GeoJSON map provider", () => {
    const provider = new GeoJsonMapProvider();
    expect(provider.getLayerType()).toBe("map");
    provider.setLayerType("dark");
    expect(provider.getLayerType()).toBe("dark");
  });
});
