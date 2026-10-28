import geographicLibGeodesic from "geographiclib-geodesic";

/**
 * Development-only WGS84 inverse geodesic.
 * `geographiclib-geodesic` 2.2.0 is CommonJS. Its public export is
 * `{ Geodesic, Constants, Math, GeodesicLine, PolygonArea, Accumulator }`.
 * `Geodesic.WGS84.Inverse` is the Karney inverse problem and returns metres in `s12`.
 */
const { Geodesic } = geographicLibGeodesic;

const wgs84 = Geodesic.WGS84;
const DISTANCE_MASK = Geodesic.DISTANCE;
const DIRECT_MASK = Geodesic.LATITUDE | Geodesic.LONGITUDE | Geodesic.DISTANCE;

export const WGS84_EQUATORIAL_RADIUS_METRES = wgs84.a;
export const WGS84_FLATTENING = wgs84.f;

/**
 * Distances are compared at full precision. PostGIS 3.4.2 and GeographicLib
 * 2.2.0 disagreed by 1.16e-10 m on the exact 50 km boundary point, which is
 * enough for a raw `<=` test to flip. 1e-6 m is 0.001 mm, far inside the 1 m
 * acceptance tolerance, and does not pull a point 1 mm outside back in.
 */
export const INCLUSION_EPSILON_METRES = 1e-6;

export type CoordinateIssue = "missing" | "non_finite" | "out_of_range";

export interface GeographicCoordinate {
  latitude: number;
  longitude: number;
}

export function inspectCoordinate(
  latitude: unknown,
  longitude: unknown,
): { ok: true; coordinate: GeographicCoordinate } | { ok: false; issue: CoordinateIssue } {
  if (latitude == null || longitude == null) return { ok: false, issue: "missing" };
  if (typeof latitude !== "number" || typeof longitude !== "number") {
    return { ok: false, issue: "non_finite" };
  }
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return { ok: false, issue: "non_finite" };
  }
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
    return { ok: false, issue: "out_of_range" };
  }
  return { ok: true, coordinate: { latitude, longitude } };
}

/**
 * PostGIS `geography` casts fold latitude by reflection at ±90° and wrap
 * longitude into [-180, 180], without adding 180° when latitude crosses a pole.
 * Measured on PostGIS 3.4.2. This is the marketplace RPC behaviour.
 * `get_nearby_*` rejects the same inputs before the cast.
 */
export function coerceGeographyCoordinate(
  latitude: number,
  longitude: number,
): GeographicCoordinate & { coerced: boolean } {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new Error("Cannot coerce a non-finite coordinate.");
  }
  const nextLatitude = foldLatitude(latitude);
  const nextLongitude = wrapLongitude(longitude);
  return {
    latitude: nextLatitude,
    longitude: nextLongitude,
    coerced: nextLatitude !== latitude || nextLongitude !== longitude,
  };
}

export function withinRadius(distanceMetres: number, radiusMetres: number): boolean {
  return distanceMetres <= radiusMetres + INCLUSION_EPSILON_METRES;
}

export function wgs84DistanceMetres(from: GeographicCoordinate, to: GeographicCoordinate): number {
  const start = inspectCoordinate(from.latitude, from.longitude);
  const end = inspectCoordinate(to.latitude, to.longitude);
  if (!start.ok || !end.ok) {
    throw new Error("WGS84 distance requires finite coordinates inside the valid latitude and longitude range.");
  }
  const result = wgs84.Inverse(
    start.coordinate.latitude,
    start.coordinate.longitude,
    end.coordinate.latitude,
    end.coordinate.longitude,
    DISTANCE_MASK,
  );
  if (result.s12 == null || !Number.isFinite(result.s12)) {
    throw new Error("GeographicLib returned a non-finite distance.");
  }
  return result.s12;
}

export function wgs84Direct(
  from: GeographicCoordinate,
  azimuthDegrees: number,
  distanceMetres: number,
): GeographicCoordinate {
  const start = inspectCoordinate(from.latitude, from.longitude);
  if (!start.ok) {
    throw new Error("WGS84 direct requires a finite coordinate inside the valid range.");
  }
  if (!Number.isFinite(azimuthDegrees) || !Number.isFinite(distanceMetres) || distanceMetres < 0) {
    throw new Error("Azimuth and distance must be finite, and distance must be zero or positive.");
  }
  const result = wgs84.Direct(
    start.coordinate.latitude,
    start.coordinate.longitude,
    azimuthDegrees,
    distanceMetres,
    DIRECT_MASK,
  );
  if (result.lat2 == null || result.lon2 == null) {
    throw new Error("GeographicLib direct solution did not return a coordinate.");
  }
  return { latitude: result.lat2, longitude: result.lon2 };
}

function foldLatitude(latitude: number): number {
  let value = latitude;
  for (let attempt = 0; attempt < 16; attempt += 1) {
    if (value > 90) value = 180 - value;
    else if (value < -90) value = -180 - value;
    else return value;
  }
  throw new Error("Latitude did not fold into [-90, 90].");
}

function wrapLongitude(longitude: number): number {
  if (longitude >= -180 && longitude <= 180) return longitude;
  let value = longitude % 360;
  if (value > 180) value -= 360;
  else if (value < -180) value += 360;
  if (value === -180) return 180;
  if (Object.is(value, -0)) return 0;
  return value;
}
