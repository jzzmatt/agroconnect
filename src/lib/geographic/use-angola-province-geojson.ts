"use client";

import { useMemo } from "react";
import type { FeatureCollection } from "geojson";
import { getAngolaProvinceGeoJson } from "./angola-province-geojson-data";

/**
 * Synchronous geographic layer (no network fetch).
 * Previously fetched /geo/angola-provinces.geojson, which 404'd on some deployments.
 */
export function useAngolaProvinceGeoJson() {
  const data = useMemo(() => getAngolaProvinceGeoJson(), []);

  const valid =
    data?.type === "FeatureCollection" &&
    Array.isArray(data.features) &&
    data.features.length >= 21;

  return {
    data: valid ? data : null,
    error: valid ? null : "invalid_geojson",
    loading: false,
  };
}
