import { describe, it, expect } from "vitest";
import { GoogleMapProvider } from "@/lib/location/providers/google-map";
import { GOOGLE_MAP_DARK_STYLES } from "@/lib/location/google-maps/map-styles";

describe("Theme & map styling", () => {
  it("exposes dark roadmap styles for Google Maps", () => {
    expect(GOOGLE_MAP_DARK_STYLES.length).toBeGreaterThan(5);
    expect(GOOGLE_MAP_DARK_STYLES[0].elementType).toBe("geometry");
  });

  it("tracks satellite layer selection on the Google map provider", () => {
    const provider = new GoogleMapProvider("satellite");
    expect(provider.getLayerType()).toBe("satellite");
    provider.setLayerType("dark");
    expect(provider.getLayerType()).toBe("dark");
  });
});
