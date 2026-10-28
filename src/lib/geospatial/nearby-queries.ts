import { conservativeRadiusBounds, isInsideRadiusBounds } from "./radius-bounds";
import {
  coerceGeographyCoordinate,
  inspectCoordinate,
  withinRadius,
  wgs84DistanceMetres,
  type GeographicCoordinate,
} from "./wgs84-distance";
import { nearbyCoordinateRejection, searchWithoutPostgis, type RadiusRecord } from "./postgis-free-search";
import { sqlLimit, sqlOffset } from "./catalogue-page";

/**
 * Replacements for the four spatial RPCs the application does not call.
 * ShoppingService and MarketplaceService do not import this module.
 *
 * `get_nearby_services` uses the buyer-radius OR coverage-radius rule and
 * rejects out-of-range search coordinates before coercion. A null radius
 * defaults to 50 km and is still capped at 200 km. The predicate is not skipped.
 *
 * `get_nearby_products` and `get_nearby_agricultural_resources` use the buyer
 * radius only. Coverage radius does not include a row.
 *
 * Stored out-of-range coordinates are coerced the way the geography cast
 * coerced `location`. The numeric columns themselves are not rewritten.
 *
 * `get_entities_in_bounds` uses an inclusive latitude/longitude box. Reversed
 * corners are normalised to the bounding box of `ST_MakeEnvelope`, which does
 * not select the antimeridian complement. Rows are ordered by entity type
 * (services, products, agricultural resources) and then id. The SQL function
 * has no ORDER BY, so that order is a deliberate stable contract.
 */

const INVALID_COORDINATES = "Coordenadas inválidas fornecidas.";

export interface NearbyRecord {
  id: string;
  latitude: number | null;
  longitude: number | null;
  coverageRadiusKm?: number | null;
  status: string;
  categoryId?: string | null;
  provinceId?: string | null;
  resourceType?: string | null;
}

export interface NearbyQueryInput {
  latitude: number | null;
  longitude: number | null;
  radiusKm: number | null;
  categoryId?: string | null;
  provinceId?: string | null;
  resourceType?: string | null;
  limit?: number | null;
  offset?: number | null;
}

export interface NearbyRow {
  id: string;
  distanceMetres: number;
  distanceKm: number;
  withinCoverage: boolean | null;
}

export interface NearbyQueryResult {
  rejected: boolean;
  message: string | null;
  issue: "invalid_radius" | "invalid_limit" | null;
  totalCount: number;
  rows: NearbyRow[];
}

export interface BoundsRecord {
  id: string;
  entityType: "service" | "product" | "agricultural_resource";
  latitude: number | null;
  longitude: number | null;
  status: string;
}

export interface BoundsQueryInput {
  minLatitude: number;
  minLongitude: number;
  maxLatitude: number;
  maxLongitude: number;
  entityType?: "all" | BoundsRecord["entityType"] | null;
  limit?: number | null;
}

export interface BoundsQueryResult {
  issue: "non_finite" | "invalid_limit" | null;
  matchedCount: number;
  rows: BoundsRecord[];
}

export function nearbyServices(records: readonly NearbyRecord[], input: NearbyQueryInput): NearbyQueryResult {
  return nearbyOrCoverage(records, input, "category");
}

export function nearbyProducts(records: readonly NearbyRecord[], input: NearbyQueryInput): NearbyQueryResult {
  return nearbyBuyerOnly(records, input, "category");
}

export function nearbyAgriculturalResources(
  records: readonly NearbyRecord[],
  input: NearbyQueryInput,
): NearbyQueryResult {
  return nearbyBuyerOnly(records, input, "resource");
}

export function entitiesInBounds(records: readonly BoundsRecord[], input: BoundsQueryInput): BoundsQueryResult {
  const limit = sqlLimit(input.limit, 50);
  if (limit === "invalid") return { issue: "invalid_limit", matchedCount: 0, rows: [] };
  const corners = [input.minLatitude, input.maxLatitude, input.minLongitude, input.maxLongitude];
  if (corners.some((value) => !Number.isFinite(value))) return { issue: "non_finite", matchedCount: 0, rows: [] };
  const latitudeMin = Math.min(input.minLatitude, input.maxLatitude);
  const latitudeMax = Math.max(input.minLatitude, input.maxLatitude);
  const longitudeMin = Math.min(input.minLongitude, input.maxLongitude);
  const longitudeMax = Math.max(input.minLongitude, input.maxLongitude);
  const entityType = input.entityType ?? "all";
  const matched = records.filter((record) => {
    if (record.status !== "active") return false;
    if (entityType !== "all" && record.entityType !== entityType) return false;
    const stored = storedCoordinate(record.latitude, record.longitude);
    if (!stored) return false;
    return (
      stored.coordinate.latitude >= latitudeMin &&
      stored.coordinate.latitude <= latitudeMax &&
      stored.coordinate.longitude >= longitudeMin &&
      stored.coordinate.longitude <= longitudeMax
    );
  });
  const typeOrder: Record<BoundsRecord["entityType"], number> = {
    service: 0,
    product: 1,
    agricultural_resource: 2,
  };
  matched.sort((left, right) => {
    const typeDelta = typeOrder[left.entityType] - typeOrder[right.entityType];
    if (typeDelta !== 0) return typeDelta;
    return left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
  });
  return { issue: null, matchedCount: matched.length, rows: matched.slice(0, limit) };
}

function nearbyOrCoverage(
  records: readonly NearbyRecord[],
  input: NearbyQueryInput,
  filter: "category" | "resource",
): NearbyQueryResult {
  const prepared = prepareNearby(records, input, filter);
  if (prepared.blocked) return prepared.blocked;
  const radiusKm = input.radiusKm == null ? 50 : input.radiusKm;
  const search = searchWithoutPostgis(prepared.records, {
    latitude: input.latitude,
    longitude: input.longitude,
    buyerRadiusKm: radiusKm,
  });
  if (search.searchIssue === "invalid_radius") return invalidRadius();
  const coverageById = new Map(prepared.records.map((record) => [record.id, record.coverageRadiusKm]));
  const rows = search.includedIds.map((id) => {
    const hit = search.hits.find((candidate) => candidate.id === id);
    if (!hit || hit.distanceMetres == null) throw new Error(`Included nearby service ${id} has no distance.`);
    const coverageMetres = (coverageById.get(id) ?? 50) * 1000;
    return toNearbyRow(id, hit.distanceMetres, withinRadius(hit.distanceMetres, coverageMetres));
  });
  return paginate(rows, input);
}

function nearbyBuyerOnly(
  records: readonly NearbyRecord[],
  input: NearbyQueryInput,
  filter: "category" | "resource",
): NearbyQueryResult {
  const prepared = prepareNearby(records, input, filter);
  if (prepared.blocked) return prepared.blocked;
  const searchIssue = rejectedSearch(input.latitude, input.longitude);
  if (searchIssue) return searchIssue;
  if (input.radiusKm != null && !Number.isFinite(input.radiusKm)) return invalidRadius();
  const radiusKm = input.radiusKm == null ? 50 : input.radiusKm;
  const radiusMetres = Math.min(radiusKm, 200) * 1000;
  const origin = { latitude: input.latitude as number, longitude: input.longitude as number };
  if (radiusMetres < 0) return paginate([], input);
  const bounds = conservativeRadiusBounds(origin, radiusMetres);
  const rows: NearbyRow[] = [];
  for (const record of prepared.records) {
    const stored = storedCoordinate(record.latitude, record.longitude);
    if (!stored) continue;
    if (!isInsideRadiusBounds(stored.coordinate, bounds)) continue;
    const distanceMetres = wgs84DistanceMetres(origin, stored.coordinate);
    if (!withinRadius(distanceMetres, radiusMetres)) continue;
    rows.push(toNearbyRow(record.id, distanceMetres, null));
  }
  rows.sort((left, right) => left.distanceMetres - right.distanceMetres || (left.id < right.id ? -1 : left.id > right.id ? 1 : 0));
  return paginate(rows, input);
}

function prepareNearby(
  records: readonly NearbyRecord[],
  input: NearbyQueryInput,
  filter: "category" | "resource",
): { records: RadiusRecord[]; blocked: NearbyQueryResult | null } {
  const searchIssue = rejectedSearch(input.latitude, input.longitude);
  if (searchIssue) return { records: [], blocked: searchIssue };
  if (input.radiusKm != null && !Number.isFinite(input.radiusKm)) return { records: [], blocked: invalidRadius() };
  const filtered = records.filter((record) => {
    if (record.status !== "active") return false;
    if (filter === "category" && input.categoryId != null && record.categoryId !== input.categoryId) return false;
    if (input.provinceId != null && record.provinceId !== input.provinceId) return false;
    if (filter === "resource" && input.resourceType != null && record.resourceType !== input.resourceType) return false;
    return true;
  });
  return {
    blocked: null,
    records: filtered.map((record) => ({
      id: record.id,
      latitude: record.latitude,
      longitude: record.longitude,
      coverageRadiusKm: record.coverageRadiusKm ?? null,
    })),
  };
}

function rejectedSearch(latitude: number | null, longitude: number | null): NearbyQueryResult | null {
  if (latitude == null || longitude == null) {
    return { rejected: false, message: null, issue: null, totalCount: 0, rows: [] };
  }
  const issue = nearbyCoordinateRejection(latitude, longitude);
  if (issue) {
    return { rejected: true, message: INVALID_COORDINATES, issue: null, totalCount: 0, rows: [] };
  }
  return null;
}

function paginate(rows: readonly NearbyRow[], input: NearbyQueryInput): NearbyQueryResult {
  const limit = sqlLimit(input.limit, 20);
  if (limit === "invalid") {
    return { rejected: false, message: null, issue: "invalid_limit", totalCount: 0, rows: [] };
  }
  const offset = sqlOffset(input.offset);
  return {
    rejected: false,
    message: null,
    issue: null,
    totalCount: rows.length,
    rows: rows.slice(offset, offset + limit),
  };
}

function invalidRadius(): NearbyQueryResult {
  return { rejected: false, message: null, issue: "invalid_radius", totalCount: 0, rows: [] };
}

function toNearbyRow(id: string, distanceMetres: number, withinCoverage: boolean | null): NearbyRow {
  return { id, distanceMetres, distanceKm: distanceMetres / 1000, withinCoverage };
}

function storedCoordinate(
  latitude: number | null,
  longitude: number | null,
): { coordinate: GeographicCoordinate } | null {
  const inspected = inspectCoordinate(latitude, longitude);
  if (inspected.ok) return { coordinate: inspected.coordinate };
  if (
    inspected.issue === "out_of_range" &&
    typeof latitude === "number" &&
    typeof longitude === "number" &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude)
  ) {
    const coerced = coerceGeographyCoordinate(latitude, longitude);
    return { coordinate: { latitude: coerced.latitude, longitude: coerced.longitude } };
  }
  return null;
}
