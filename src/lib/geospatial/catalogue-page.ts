import { searchWithoutPostgis, type RadiusRecord, type RadiusSearchInput } from "./postgis-free-search";

/**
 * Marketplace page after an exact GeographicLib decision.
 *
 * Not called by ShoppingService or MarketplaceService. The live path remains
 * the Supabase RPCs.
 *
 * The input is the complete non-spatial match set, or a conservative latitude
 * and longitude superset of that set. This function applies the radius rule,
 * then the SQL ORDER BY, then LIMIT and OFFSET. A caller that limits in SQL
 * before this step drops rows the radius rule would have ordered onto the page.
 *
 * Text search stays in SQL (`to_tsvector` OR `ILIKE`). This module does not
 * reimplement Portuguese full text. It is page formatting after
 * `searchCloudhikeMarketplaceProducts` or `searchCloudhikeMarketplaceServices`
 * has already applied that predicate. It is not itself a marketplace search.
 *
 * Sort matches `search_marketplace_products`, plus the service RPC's rating
 * key. Inactive CASE keys are NULL for every row. ASC uses NULLS LAST and
 * DESC uses NULLS FIRST, except rating, which is NULLS LAST. An `id` ascending
 * tie-break is added so a page is stable. The SQL functions do not order by id.
 */

export interface CatalogueRecord extends RadiusRecord {
  price: number | null;
  createdAt: string | Date;
  isFeatured: boolean | null;
  rating?: number | null;
}

export interface CataloguePageInput extends RadiusSearchInput {
  sortBy?: string | null;
  limit?: number | null;
  offset?: number | null;
}

export interface CataloguePageRow {
  id: string;
  distanceMetres: number | null;
  /** Unrounded kilometres. Inclusion does not use a rounded value. */
  distanceKm: number | null;
  reason: "buyer_radius" | "coverage_radius" | "both" | null;
}

export interface CataloguePage {
  issue: "non_finite" | "invalid_radius" | "invalid_limit" | null;
  spatialPredicateApplied: boolean;
  totalCount: number;
  limit: number;
  offset: number;
  rows: CataloguePageRow[];
}

export function pageMarketplaceCatalogue(
  records: readonly CatalogueRecord[],
  input: CataloguePageInput,
): CataloguePage {
  const limit = sqlLimit(input.limit, 20);
  const offset = sqlOffset(input.offset);
  if (limit === "invalid") {
    return { issue: "invalid_limit", spatialPredicateApplied: false, totalCount: 0, limit: 0, offset: 0, rows: [] };
  }
  const search = searchWithoutPostgis(records, input);
  if (search.searchIssue) {
    return {
      issue: search.searchIssue,
      spatialPredicateApplied: false,
      totalCount: 0,
      limit,
      offset,
      rows: [],
    };
  }
  const byId = new Map(records.map((record) => [record.id, record]));
  const included = search.hits.filter((hit) => hit.included);
  const ranked = included.map((hit) => {
    const record = byId.get(hit.id);
    if (!record) throw new Error(`Radius hit ${hit.id} is missing from the catalogue page input.`);
    return {
      id: hit.id,
      distanceMetres: hit.distanceMetres,
      distanceKm: hit.distanceMetres == null ? null : hit.distanceMetres / 1000,
      reason: hit.reason,
      price: record.price,
      createdAtMs: createdAtMillis(record.createdAt),
      isFeatured: record.isFeatured,
      rating: record.rating ?? null,
    };
  });
  ranked.sort((left, right) => compareMarketplace(left, right, input.sortBy ?? "relevance"));
  return {
    issue: null,
    spatialPredicateApplied: search.spatialPredicateApplied,
    totalCount: ranked.length,
    limit,
    offset,
    rows: ranked.slice(offset, offset + limit).map((row) => ({
      id: row.id,
      distanceMetres: row.distanceMetres,
      distanceKm: row.distanceKm,
      reason: row.reason,
    })),
  };
}

export function sqlLimit(value: number | null | undefined, fallback: number): number | "invalid" {
  if (value == null) return fallback;
  if (!Number.isFinite(value)) return "invalid";
  const truncated = Math.trunc(value);
  if (truncated < 0) return "invalid";
  return Math.min(truncated, 100);
}

export function sqlOffset(value: number | null | undefined): number {
  if (value == null || !Number.isFinite(value)) return 0;
  return Math.max(Math.trunc(value), 0);
}

interface RankedRow {
  id: string;
  distanceKm: number | null;
  price: number | null;
  createdAtMs: number | null;
  isFeatured: boolean | null;
  rating: number | null;
}

function compareMarketplace(left: RankedRow, right: RankedRow, sortBy: string): number {
  const steps = [
    compareNullable(sortBy === "price_asc" ? left.price : null, sortBy === "price_asc" ? right.price : null, "asc", "last"),
    compareNullable(sortBy === "price_desc" ? left.price : null, sortBy === "price_desc" ? right.price : null, "desc", "first"),
    compareNullable(
      sortBy === "distance" ? left.distanceKm : null,
      sortBy === "distance" ? right.distanceKm : null,
      "asc",
      "last",
    ),
    compareNullable(sortBy === "rating" ? left.rating : null, sortBy === "rating" ? right.rating : null, "desc", "last"),
    compareNullable(
      sortBy === "newest" ? left.createdAtMs : null,
      sortBy === "newest" ? right.createdAtMs : null,
      "desc",
      "first",
    ),
    compareNullable(featuredRank(left.isFeatured), featuredRank(right.isFeatured), "desc", "first"),
    compareNullable(left.createdAtMs, right.createdAtMs, "desc", "first"),
    left.id < right.id ? -1 : left.id > right.id ? 1 : 0,
  ];
  return steps.find((step) => step !== 0) ?? 0;
}

function featuredRank(value: boolean | null): number | null {
  if (value == null) return null;
  return value ? 1 : 0;
}

function compareNullable(
  left: number | null,
  right: number | null,
  direction: "asc" | "desc",
  nulls: "first" | "last",
): number {
  if (left == null && right == null) return 0;
  if (left == null) return nulls === "first" ? -1 : 1;
  if (right == null) return nulls === "first" ? 1 : -1;
  if (left === right) return 0;
  const ascending = left < right ? -1 : 1;
  return direction === "asc" ? ascending : -ascending;
}

function createdAtMillis(value: string | Date): number | null {
  const date = value instanceof Date ? value : new Date(value);
  const millis = date.getTime();
  return Number.isFinite(millis) ? millis : null;
}
