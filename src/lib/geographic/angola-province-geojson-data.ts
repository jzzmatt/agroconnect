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

/** Geographic frame: Atlantic margin through the eastern border, Cabinda included. */
export const ANGOLA_MAP_FRAME: Feature = {
  type: "Feature",
  properties: {},
  geometry: {
    type: "Polygon",
    coordinates: [
      [
        [8.6, -18.9],
        [24.8, -18.9],
        [24.8, -4.15],
        [8.6, -4.15],
        [8.6, -18.9],
      ],
    ],
  },
};
