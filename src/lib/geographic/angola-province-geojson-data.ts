import type { FeatureCollection } from "geojson";
import bundled from "./angola-provinces.json";

/** Bundled at build time — map works even if /geo/*.geojson is missing on the CDN. */
export const ANGOLA_PROVINCE_GEOJSON = bundled as FeatureCollection;

export function getAngolaProvinceGeoJson(): FeatureCollection {
  return ANGOLA_PROVINCE_GEOJSON;
}
