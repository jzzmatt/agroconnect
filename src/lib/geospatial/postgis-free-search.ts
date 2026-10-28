import { conservativeRadiusBounds, isInsideRadiusBounds } from "./radius-bounds";
import {
  coerceGeographyCoordinate,
  inspectCoordinate,
  withinRadius,
  wgs84DistanceMetres,
  type CoordinateIssue,
  type GeographicCoordinate,
} from "./wgs84-distance";

/**
 * Development-only radius search. This module is not called by
 * ShoppingService or MarketplaceService.
 *
 * It follows `search_marketplace_products` / `search_marketplace_services`:
 * distances are WGS84 ellipsoidal metres, the buyer radius is capped at 200 km,
 * a null coverage radius defaults to 50 km, and the boundary is inclusive.
 * A search point with a null buyer radius does not apply the spatial predicate.
 * Out-of-range coordinates are coerced the way a `geography` cast does.
 * `get_nearby_*` still rejects those coordinates; this module does not change that.
 */

export const BUYER_RADIUS_CAP_KM = 200;
export const DEFAULT_COVERAGE_RADIUS_KM = 50;

export interface RadiusRecord {
  id: string;
  latitude: number | null;
  longitude: number | null;
  /** Seller radius or service radius, in kilometres. Null uses the 50 km default. */
  coverageRadiusKm: number | null;
}

export interface RadiusSearchInput {
  latitude: number | null;
  longitude: number | null;
  buyerRadiusKm: number | null;
}

export type InclusionReason = "buyer_radius" | "coverage_radius" | "both";

export interface RadiusSearchHit {
  id: string;
  distanceMetres: number | null;
  included: boolean;
  reason: InclusionReason | null;
  coordinateIssue: CoordinateIssue | null;
  coerced: boolean;
}

export interface RadiusSearchMetrics {
  totalRecords: number;
  candidateCount: number;
  includedCount: number;
  candidateSelectionMs: number;
  exactDistanceMs: number;
  totalMs: number;
}

export interface RadiusSearchResult {
  spatialPredicateApplied: boolean;
  searchIssue: "non_finite" | "invalid_radius" | null;
  coercedSearchCoordinate: boolean;
  /** Set when the search point was coerced or was already inside range. */
  searchCoordinate: GeographicCoordinate | null;
  prefilterRadiusMetres: number | null;
  candidateIds: string[];
  includedIds: string[];
  hits: RadiusSearchHit[];
  metrics: RadiusSearchMetrics;
}

interface PreparedRecord {
  id: string;
  coordinate: GeographicCoordinate | null;
  coordinateIssue: CoordinateIssue | null;
  coerced: boolean;
  coverageMetres: number;
}

export function searchWithoutPostgis(
  records: readonly RadiusRecord[],
  input: RadiusSearchInput,
): RadiusSearchResult {
  const started = now();
  const search = resolveSearchPoint(input.latitude, input.longitude);
  if (search.issue === "non_finite" || !isFiniteRadius(input.buyerRadiusKm)) {
    return emptyResult(records.length, search.issue === "non_finite" ? "non_finite" : "invalid_radius", started);
  }

  const prepared = records.map(prepareRecord);
  const buyerCapMetres = buyerRadiusMetres(input.buyerRadiusKm);
  const spatialPredicateApplied = search.coordinate != null && buyerCapMetres != null;

  if (!spatialPredicateApplied || search.coordinate == null) {
    const distanceStarted = now();
    const hits = prepared.map((record) => {
      const distanceMetres = distanceOrNull(search.coordinate, record.coordinate);
      return {
        id: record.id,
        distanceMetres,
        included: true,
        reason: null,
        coordinateIssue: record.coordinateIssue,
        coerced: record.coerced,
      };
    });
    const exactDistanceMs = now() - distanceStarted;
    const includedIds = hits.map((hit) => hit.id).sort();
    return {
      spatialPredicateApplied: false,
      searchIssue: null,
      coercedSearchCoordinate: search.coerced,
      searchCoordinate: search.coordinate,
      prefilterRadiusMetres: null,
      candidateIds: includedIds,
      includedIds,
      hits: hits.sort(byId),
      metrics: {
        totalRecords: records.length,
        candidateCount: records.length,
        includedCount: records.length,
        candidateSelectionMs: 0,
        exactDistanceMs,
        totalMs: now() - started,
      },
    };
  }

  const prefilterRadiusMetres = prepared.reduce(
    (maxRadius, record) => Math.max(maxRadius, inclusionRadiusMetres(buyerCapMetres, record.coverageMetres)),
    0,
  );
  const candidateStarted = now();
  const bounds = conservativeRadiusBounds(search.coordinate, prefilterRadiusMetres);
  const candidates = prepared.filter(
    (record) => record.coordinate != null && isInsideRadiusBounds(record.coordinate, bounds),
  );
  const candidateSelectionMs = now() - candidateStarted;
  const candidateIds = candidates.map((record) => record.id).sort();
  const candidateIdSet = new Set(candidateIds);

  const distanceStarted = now();
  const hits = prepared.map((record) => {
    if (record.coordinate == null || !candidateIdSet.has(record.id)) {
      return {
        id: record.id,
        distanceMetres: null,
        included: false,
        reason: null,
        coordinateIssue: record.coordinateIssue,
        coerced: record.coerced,
      };
    }
    const distanceMetres = wgs84DistanceMetres(search.coordinate as GeographicCoordinate, record.coordinate);
    const buyerHit = withinRadius(distanceMetres, buyerCapMetres);
    const coverageHit = withinRadius(distanceMetres, record.coverageMetres);
    const included = buyerHit || coverageHit;
    return {
      id: record.id,
      distanceMetres,
      included,
      reason: reasonFor(buyerHit, coverageHit),
      coordinateIssue: record.coordinateIssue,
      coerced: record.coerced,
    };
  });
  const exactDistanceMs = now() - distanceStarted;
  const included = hits.filter((hit) => hit.included);
  included.sort((left, right) => {
    const delta = (left.distanceMetres ?? 0) - (right.distanceMetres ?? 0);
    if (delta !== 0) return delta;
    return left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
  });

  return {
    spatialPredicateApplied: true,
    searchIssue: null,
    coercedSearchCoordinate: search.coerced,
    searchCoordinate: search.coordinate,
    prefilterRadiusMetres,
    candidateIds,
    includedIds: included.map((hit) => hit.id),
    hits: hits.sort(byId),
    metrics: {
      totalRecords: records.length,
      candidateCount: candidates.length,
      includedCount: included.length,
      candidateSelectionMs,
      exactDistanceMs,
      totalMs: now() - started,
    },
  };
}

export function buyerRadiusMetres(buyerRadiusKm: number | null): number | null {
  if (buyerRadiusKm == null) return null;
  return Math.min(buyerRadiusKm, BUYER_RADIUS_CAP_KM) * 1000;
}

export function coverageRadiusMetres(coverageRadiusKm: number | null): number {
  return (coverageRadiusKm ?? DEFAULT_COVERAGE_RADIUS_KM) * 1000;
}

/**
 * `get_nearby_*` raises before the geography cast when latitude or longitude
 * is outside range. The marketplace RPCs do not. Callers that need the nearby
 * behaviour use this check and leave the marketplace search on the coerce path.
 */
export function nearbyCoordinateRejection(latitude: unknown, longitude: unknown): CoordinateIssue | null {
  const inspected = inspectCoordinate(latitude, longitude);
  if (!inspected.ok) return inspected.issue === "missing" ? null : inspected.issue;
  return null;
}

function resolveSearchPoint(
  latitude: number | null,
  longitude: number | null,
): { coordinate: GeographicCoordinate | null; coerced: boolean; issue: "non_finite" | null } {
  if (latitude == null || longitude == null) return { coordinate: null, coerced: false, issue: null };
  if (typeof latitude !== "number" || typeof longitude !== "number" || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return { coordinate: null, coerced: false, issue: "non_finite" };
  }
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
    const coerced = coerceGeographyCoordinate(latitude, longitude);
    return {
      coordinate: { latitude: coerced.latitude, longitude: coerced.longitude },
      coerced: true,
      issue: null,
    };
  }
  return { coordinate: { latitude, longitude }, coerced: false, issue: null };
}

function prepareRecord(record: RadiusRecord): PreparedRecord {
  const inspected = inspectCoordinate(record.latitude, record.longitude);
  if (inspected.ok) {
    return {
      id: record.id,
      coordinate: inspected.coordinate,
      coordinateIssue: null,
      coerced: false,
      coverageMetres: coverageRadiusMetres(record.coverageRadiusKm),
    };
  }
  if (
    inspected.issue === "out_of_range" &&
    typeof record.latitude === "number" &&
    typeof record.longitude === "number"
  ) {
    const coerced = coerceGeographyCoordinate(record.latitude, record.longitude);
    return {
      id: record.id,
      coordinate: { latitude: coerced.latitude, longitude: coerced.longitude },
      coordinateIssue: "out_of_range",
      coerced: true,
      coverageMetres: coverageRadiusMetres(record.coverageRadiusKm),
    };
  }
  return {
    id: record.id,
    coordinate: null,
    coordinateIssue: inspected.issue,
    coerced: false,
    coverageMetres: coverageRadiusMetres(record.coverageRadiusKm),
  };
}

function inclusionRadiusMetres(buyerCapMetres: number, coverageMetres: number): number {
  return Math.max(0, buyerCapMetres, coverageMetres);
}

function distanceOrNull(
  origin: GeographicCoordinate | null,
  target: GeographicCoordinate | null,
): number | null {
  if (origin == null || target == null) return null;
  return wgs84DistanceMetres(origin, target);
}

function reasonFor(buyerHit: boolean, coverageHit: boolean): InclusionReason | null {
  if (buyerHit && coverageHit) return "both";
  if (buyerHit) return "buyer_radius";
  if (coverageHit) return "coverage_radius";
  return null;
}

function isFiniteRadius(radiusKm: number | null): boolean {
  return radiusKm == null || (typeof radiusKm === "number" && Number.isFinite(radiusKm));
}

function emptyResult(
  totalRecords: number,
  searchIssue: "non_finite" | "invalid_radius",
  started: number,
): RadiusSearchResult {
  return {
    spatialPredicateApplied: false,
    searchIssue,
    coercedSearchCoordinate: false,
    searchCoordinate: null,
    prefilterRadiusMetres: null,
    candidateIds: [],
    includedIds: [],
    hits: [],
    metrics: {
      totalRecords,
      candidateCount: 0,
      includedCount: 0,
      candidateSelectionMs: 0,
      exactDistanceMs: 0,
      totalMs: now() - started,
    },
  };
}

function byId(left: { id: string }, right: { id: string }): number {
  return left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
}

function now(): number {
  return performance.now();
}
