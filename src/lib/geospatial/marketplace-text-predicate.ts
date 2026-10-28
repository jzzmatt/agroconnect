/**
 * Non-spatial text predicates from the live marketplace RPCs.
 *
 * Product and service search do not use the same fields. Both use the
 * Portuguese text-search configuration. Both keep a row when full text matches
 * or when the RPC's ILIKE fallback matches. User text is bound as `$1`.
 * These fragments are not installed on CloudHike and are not the live RPCs.
 */

export const MARKETPLACE_PRODUCT_TEXT_SQL = `(
  $1::text IS NULL OR $1::text = '' OR
  to_tsvector(
    'portuguese',
    coalesce(title, '') || ' ' || coalesce(description, '') || ' ' || coalesce(seller_name, '')
  ) @@ plainto_tsquery('portuguese', $1::text)
  OR title ILIKE '%' || $1::text || '%'
  OR description ILIKE '%' || $1::text || '%'
  OR seller_name ILIKE '%' || $1::text || '%'
)`;

export const MARKETPLACE_SERVICE_TEXT_SQL = `(
  $1::text IS NULL OR $1::text = '' OR
  to_tsvector(
    'portuguese',
    coalesce(title, '') || ' ' || coalesce(short_description, '') || ' ' || coalesce(description, '') || ' ' || coalesce(provider_name, '')
  ) @@ plainto_tsquery('portuguese', $1::text)
  OR title ILIKE '%' || $1::text || '%'
  OR short_description ILIKE '%' || $1::text || '%'
  OR provider_name ILIKE '%' || $1::text || '%'
)`;

export const MARKETPLACE_PRODUCT_STATUS_SQL = `
  status IN ('active', 'published') AND seller_status = 'active'
`;

export const MARKETPLACE_SERVICE_STATUS_SQL = `
  status IN ('active', 'published') AND provider_status = 'active'
`;
