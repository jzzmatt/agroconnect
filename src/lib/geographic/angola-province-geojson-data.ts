import type { Feature, FeatureCollection } from "geojson";
import bundled from "./angola-provinces.json";
import { rewindIfInverted } from "./rewind-polygons";

let cached: FeatureCollection | null = null;

/** Bundled province boundaries, corrected to counterclockwise outer rings. */
export function getAngolaProvinceGeoJson(): FeatureCollection {
  if (cached) return cached;
  const source = bundled as FeatureCollection;
  cached = {
    type: "FeatureCollection",
    features: source.features.map((feature) => rewindIfInverted(feature as Feature)),
  };
  return cached;
}
