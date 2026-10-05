import { geoArea } from "d3-geo";
import type { Feature, MultiPolygon, Polygon, Position } from "geojson";

const HEMISPHERE = Math.PI * 2;

function reverseRing(ring: Position[]): Position[] {
  return [...ring].reverse();
}

/**
 * geoBoundaries rings are clockwise. d3-geo treats that as the exterior of the
 * globe, so each province fills the world and Angola collapses to a speck.
 */
export function rewindIfInverted<T extends Feature>(feature: T): T {
  if (geoArea(feature) <= HEMISPHERE) return feature;
  const geometry = feature.geometry;
  if (!geometry || (geometry.type !== "Polygon" && geometry.type !== "MultiPolygon")) {
    return feature;
  }

  const rewound: Polygon | MultiPolygon =
    geometry.type === "Polygon"
      ? { type: "Polygon", coordinates: geometry.coordinates.map(reverseRing) }
      : {
          type: "MultiPolygon",
          coordinates: geometry.coordinates.map((polygon) => polygon.map(reverseRing)),
        };

  return { ...feature, geometry: rewound };
}
