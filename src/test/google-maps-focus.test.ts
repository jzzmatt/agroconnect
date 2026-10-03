import { describe, it, expect } from "vitest";
import { computeSmartFocusZoom } from "@/lib/location/google-maps/focus-entity";
import { diagnoseGoogleMapsError } from "@/lib/location/google-maps/diagnostics";

describe("Google Maps focus & diagnostics", () => {
  it("uses higher zoom when the target is nearby", () => {
    const center = { latitude: -12.5, longitude: 17.5 };
    const near = { latitude: -12.51, longitude: 17.51 };
    const far = { latitude: -8.8, longitude: 13.2 };
    expect(computeSmartFocusZoom(center, near, 6)).toBeGreaterThanOrEqual(14);
    expect(computeSmartFocusZoom(center, far, 6)).toBeLessThanOrEqual(10);
  });

  it("maps missing key errors to external action guidance", () => {
    const diagnostic = diagnoseGoogleMapsError(new Error("MissingKeyMapError"));
    expect(diagnostic.externalActionRequired).toBe(true);
    expect(diagnostic.externalActionSteps?.length).toBeGreaterThan(0);
  });
});
