import {
  area,
  booleanContains,
  booleanIntersects,
  booleanTouches,
  booleanValid,
  featureCollection,
  intersect,
  kinks,
  point,
  polygon,
} from "@turf/turf";
import type { Feature, Polygon } from "geojson";

/**
 * Development-only planar polygon checks for GeoJSON rings in longitude/latitude.
 * Delivery-zone boundaries are `geometry(Polygon, 4326)`, so the PostGIS reference
 * is GEOS on the plane, not a geodesic polygon. Marketplace search does not call
 * these predicates. Turf 7.4.0 `booleanOverlap` treats a shared edge as overlap;
 * this module does not use it.
 */

export interface PointRelation {
  valid: boolean;
  contains: boolean | null;
  intersects: boolean | null;
}

export interface PolygonRelation {
  valid: boolean;
  contains: boolean | null;
  intersects: boolean | null;
  touches: boolean | null;
  /** True when the intersection has area and neither polygon contains the other. */
  overlaps: boolean | null;
}

export function pointPolygonRelation(
  ring: readonly (readonly number[])[],
  longitude: number,
  latitude: number,
): PointRelation {
  const geometry = closedPolygon(ring);
  if (!geometry) return { valid: false, contains: null, intersects: null };
  const subject = point([longitude, latitude]);
  return {
    valid: true,
    contains: booleanContains(geometry, subject),
    intersects: booleanIntersects(geometry, subject),
  };
}

export function polygonPolygonRelation(
  left: readonly (readonly number[])[],
  right: readonly (readonly number[])[],
): PolygonRelation {
  const leftGeometry = closedPolygon(left);
  const rightGeometry = closedPolygon(right);
  if (!leftGeometry || !rightGeometry) {
    return { valid: false, contains: null, intersects: null, touches: null, overlaps: null };
  }
  const contains = booleanContains(leftGeometry, rightGeometry);
  const intersects = booleanIntersects(leftGeometry, rightGeometry);
  const touches = booleanTouches(leftGeometry, rightGeometry);
  const intersection = intersect(featureCollection([leftGeometry, rightGeometry]));
  const intersectionArea = intersection ? area(intersection) : 0;
  const reverseContains = booleanContains(rightGeometry, leftGeometry);
  return {
    valid: true,
    contains,
    intersects,
    touches,
    overlaps: intersects && intersectionArea > 0 && !contains && !reverseContains,
  };
}

function closedPolygon(ring: readonly (readonly number[])[]): Feature<Polygon> | null {
  if (ring.length < 4) return null;
  const coordinates = ring.map((position) => {
    if (position.length < 2 || !Number.isFinite(position[0]) || !Number.isFinite(position[1])) return null;
    return [position[0], position[1]] as [number, number];
  });
  if (coordinates.some((position) => position == null)) return null;
  const linearRing = coordinates as [number, number][];
  const first = linearRing[0];
  const last = linearRing[linearRing.length - 1];
  if (!first || !last || first[0] !== last[0] || first[1] !== last[1]) return null;
  try {
    const geometry = polygon([linearRing]);
    if (!booleanValid(geometry)) return null;
    if (kinks(geometry).features.length > 0) return null;
    return geometry;
  } catch {
    return null;
  }
}
