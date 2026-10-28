import type { GeographicCoordinate } from "./wgs84-distance";
import { WGS84_EQUATORIAL_RADIUS_METRES, WGS84_FLATTENING } from "./wgs84-distance";

/**
 * Conservative latitude/longitude box for a WGS84 geodesic ball.
 *
 * Meridional radius of curvature is smallest at the equator:
 *   M(φ) = a(1-e²) / (1-e² sin²φ)^(3/2) >= M(0) = a(1-e²).
 * A geodesic of length R therefore changes latitude by at most R / M(0) radians.
 *
 * On that latitude band the parallel radius ρ(φ) = N(φ) cos φ is smallest at the
 * latitude closest to a pole. A curve of length R changes longitude by at most
 * R / ρ_min radians. If that span reaches half a turn, or the band reaches a
 * pole, every longitude stays in the candidate set.
 *
 * The box is widened by 1 metre and 1e-8 degrees so float rounding cannot drop
 * a point whose ellipsoidal distance is within R. It is not a distance test.
 */
const ECCENTRICITY_SQUARED = WGS84_FLATTENING * (2 - WGS84_FLATTENING);
const MERIDIONAL_RADIUS_MIN_METRES = WGS84_EQUATORIAL_RADIUS_METRES * (1 - ECCENTRICITY_SQUARED);
const RADIANS_TO_DEGREES = 180 / Math.PI;
const PAD_METRES = 1;
const PAD_DEGREES = 1e-8;

export interface LongitudeRange {
  min: number;
  max: number;
}

export interface RadiusBounds {
  latitudeMin: number;
  latitudeMax: number;
  longitudeRanges: LongitudeRange[] | "all";
  radiusMetres: number;
}

export function conservativeRadiusBounds(
  center: GeographicCoordinate,
  radiusMetres: number,
): RadiusBounds {
  if (!Number.isFinite(radiusMetres) || radiusMetres < 0) {
    throw new Error("Candidate radius must be finite and zero or positive.");
  }
  const padded = radiusMetres + PAD_METRES;
  const latitudeSpan = (padded / MERIDIONAL_RADIUS_MIN_METRES) * RADIANS_TO_DEGREES + PAD_DEGREES;
  const unclampedMin = center.latitude - latitudeSpan;
  const unclampedMax = center.latitude + latitudeSpan;
  const reachesPole = unclampedMin <= -90 || unclampedMax >= 90;
  const latitudeMin = Math.max(-90, unclampedMin);
  const latitudeMax = Math.min(90, unclampedMax);

  if (reachesPole) {
    return { latitudeMin, latitudeMax, longitudeRanges: "all", radiusMetres };
  }

  const poleward = Math.abs(latitudeMin) >= Math.abs(latitudeMax) ? latitudeMin : latitudeMax;
  const parallel = parallelRadiusMetres((poleward * Math.PI) / 180);
  if (!(parallel > 1)) {
    return { latitudeMin, latitudeMax, longitudeRanges: "all", radiusMetres };
  }
  const longitudeSpanRadians = padded / parallel;
  if (longitudeSpanRadians >= Math.PI) {
    return { latitudeMin, latitudeMax, longitudeRanges: "all", radiusMetres };
  }
  const longitudeSpan = longitudeSpanRadians * RADIANS_TO_DEGREES + PAD_DEGREES;
  return {
    latitudeMin,
    latitudeMax,
    longitudeRanges: splitAntimeridian(center.longitude - longitudeSpan, center.longitude + longitudeSpan),
    radiusMetres,
  };
}

export function isInsideRadiusBounds(
  coordinate: GeographicCoordinate,
  bounds: RadiusBounds,
): boolean {
  if (coordinate.latitude < bounds.latitudeMin || coordinate.latitude > bounds.latitudeMax) return false;
  if (bounds.longitudeRanges === "all") return true;
  return bounds.longitudeRanges.some(
    (range) => coordinate.longitude >= range.min && coordinate.longitude <= range.max,
  );
}

function parallelRadiusMetres(latitudeRadians: number): number {
  const sine = Math.sin(latitudeRadians);
  const primeVertical = WGS84_EQUATORIAL_RADIUS_METRES / Math.sqrt(1 - ECCENTRICITY_SQUARED * sine * sine);
  return primeVertical * Math.cos(latitudeRadians);
}

function splitAntimeridian(min: number, max: number): LongitudeRange[] {
  if (max - min >= 360) return [{ min: -180, max: 180 }];
  if (min >= -180 && max <= 180) return [{ min, max }];
  if (min < -180) {
    return [
      { min: min + 360, max: 180 },
      { min: -180, max: max },
    ];
  }
  return [
    { min, max: 180 },
    { min: -180, max: max - 360 },
  ];
}
