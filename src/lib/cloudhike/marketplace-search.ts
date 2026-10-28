import { pageMarketplaceCatalogue, type CataloguePage, type CatalogueRecord } from "@/lib/geospatial/catalogue-page";
import {
  MARKETPLACE_PRODUCT_STATUS_SQL,
  MARKETPLACE_PRODUCT_TEXT_SQL,
  MARKETPLACE_SERVICE_STATUS_SQL,
  MARKETPLACE_SERVICE_TEXT_SQL,
} from "@/lib/geospatial/marketplace-text-predicate";
import type { CloudhikeStatementClient } from "./authorized-transaction";

/**
 * CloudHike marketplace search.
 *
 * One entry point runs the Portuguese full-text predicate and the RPC filters,
 * then `pageMarketplaceCatalogue` applies GeographicLib, ordering, and pagination.
 * The SQL has no LIMIT or OFFSET. The live Supabase RPCs are not called here.
 */

export const PRODUCT_CANDIDATE_RELATION = "public.marketplace_product_candidates";
export const SERVICE_CANDIDATE_RELATION = "public.marketplace_service_candidates";

const RELATION_NAME = /^[a-z_][a-z0-9_]*(\.[a-z_][a-z0-9_]*)?$/;

export interface MarketplaceProductSearchInput {
  query?: string | null;
  categoryId?: string | null;
  provinceId?: string | null;
  municipalityId?: string | null;
  availabilityStatus?: string | null;
  minPrice?: number | null;
  maxPrice?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  radiusKm?: number | null;
  sortBy?: string | null;
  limit?: number | null;
  offset?: number | null;
}

export interface MarketplaceServiceSearchInput {
  query?: string | null;
  categoryId?: string | null;
  provinceId?: string | null;
  municipalityId?: string | null;
  pricingType?: string | null;
  minPrice?: number | null;
  maxPrice?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  radiusKm?: number | null;
  sortBy?: string | null;
  limit?: number | null;
  offset?: number | null;
}

export interface CloudhikeMarketplaceSearchResult extends CataloguePage {
  candidateCount: number;
  textPredicate: "portuguese-fts-or-ilike";
}

export function assertCandidateRelation(relation: string): string {
  if (!RELATION_NAME.test(relation)) {
    throw new Error("Candidate relation name is not an identifier.");
  }
  return relation;
}

export function productCandidateSql(relation = PRODUCT_CANDIDATE_RELATION): string {
  return `
SELECT
  id::text AS id,
  title,
  description,
  seller_name,
  price,
  latitude,
  longitude,
  selling_radius_km,
  is_featured,
  created_at
FROM ${assertCandidateRelation(relation)}
WHERE ${MARKETPLACE_PRODUCT_STATUS_SQL}
  AND ($2::uuid IS NULL OR category_id = $2::uuid)
  AND ($3::uuid IS NULL OR province_id = $3::uuid)
  AND ($4::uuid IS NULL OR municipality_id = $4::uuid)
  AND ($5::text IS NULL OR availability_status = $5::text)
  AND ($6::numeric IS NULL OR price >= $6::numeric)
  AND ($7::numeric IS NULL OR price <= $7::numeric)
  AND ${MARKETPLACE_PRODUCT_TEXT_SQL}
`;
}

export function serviceCandidateSql(relation = SERVICE_CANDIDATE_RELATION): string {
  return `
SELECT
  id::text AS id,
  title,
  short_description,
  description,
  provider_name,
  price,
  latitude,
  longitude,
  service_radius_km,
  is_featured,
  created_at,
  provider_rating
FROM ${assertCandidateRelation(relation)}
WHERE ${MARKETPLACE_SERVICE_STATUS_SQL}
  AND ($2::uuid IS NULL OR category_id = $2::uuid)
  AND ($3::uuid IS NULL OR province_id = $3::uuid)
  AND ($4::uuid IS NULL OR municipality_id = $4::uuid)
  AND ($5::text IS NULL OR pricing_type = $5::text)
  AND ($6::numeric IS NULL OR price >= $6::numeric)
  AND ($7::numeric IS NULL OR price <= $7::numeric)
  AND ${MARKETPLACE_SERVICE_TEXT_SQL}
`;
}

export function productCandidateParams(input: MarketplaceProductSearchInput): unknown[] {
  return [
    input.query ?? null,
    input.categoryId ?? null,
    input.provinceId ?? null,
    input.municipalityId ?? null,
    input.availabilityStatus ?? null,
    input.minPrice ?? null,
    input.maxPrice ?? null,
  ];
}

export function serviceCandidateParams(input: MarketplaceServiceSearchInput): unknown[] {
  return [
    input.query ?? null,
    input.categoryId ?? null,
    input.provinceId ?? null,
    input.municipalityId ?? null,
    input.pricingType ?? null,
    input.minPrice ?? null,
    input.maxPrice ?? null,
  ];
}

export async function searchCloudhikeMarketplaceProducts(
  db: CloudhikeStatementClient,
  input: MarketplaceProductSearchInput,
  relation = PRODUCT_CANDIDATE_RELATION,
): Promise<CloudhikeMarketplaceSearchResult> {
  const result = await db.query<ProductCandidateRow>(productCandidateSql(relation), productCandidateParams(input));
  return finish(result.rows.map(mapProduct), input);
}

export async function searchCloudhikeMarketplaceServices(
  db: CloudhikeStatementClient,
  input: MarketplaceServiceSearchInput,
  relation = SERVICE_CANDIDATE_RELATION,
): Promise<CloudhikeMarketplaceSearchResult> {
  const result = await db.query<ServiceCandidateRow>(serviceCandidateSql(relation), serviceCandidateParams(input));
  return finish(result.rows.map(mapService), input);
}

interface ProductCandidateRow extends Record<string, unknown> {
  id: string;
  price: unknown;
  latitude: unknown;
  longitude: unknown;
  selling_radius_km: unknown;
  is_featured: boolean | null;
  created_at: string | Date;
}

interface ServiceCandidateRow extends Record<string, unknown> {
  id: string;
  price: unknown;
  latitude: unknown;
  longitude: unknown;
  service_radius_km: unknown;
  is_featured: boolean | null;
  created_at: string | Date;
  provider_rating: unknown;
}

function finish(
  records: CatalogueRecord[],
  input: MarketplaceProductSearchInput,
): CloudhikeMarketplaceSearchResult {
  const page = pageMarketplaceCatalogue(records, {
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
    buyerRadiusKm: input.radiusKm ?? null,
    sortBy: input.sortBy ?? "relevance",
    limit: input.limit,
    offset: input.offset,
  });
  return { ...page, candidateCount: records.length, textPredicate: "portuguese-fts-or-ilike" };
}

function mapProduct(row: ProductCandidateRow): CatalogueRecord {
  return {
    id: String(row.id),
    latitude: asNumber(row.latitude),
    longitude: asNumber(row.longitude),
    coverageRadiusKm: asNumber(row.selling_radius_km),
    price: asNumber(row.price),
    createdAt: row.created_at,
    isFeatured: row.is_featured,
  };
}

function mapService(row: ServiceCandidateRow): CatalogueRecord {
  return {
    id: String(row.id),
    latitude: asNumber(row.latitude),
    longitude: asNumber(row.longitude),
    coverageRadiusKm: asNumber(row.service_radius_km),
    price: asNumber(row.price),
    createdAt: row.created_at,
    isFeatured: row.is_featured,
    rating: asNumber(row.provider_rating),
  };
}

function asNumber(value: unknown): number | null {
  if (value == null) return null;
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : null;
}
