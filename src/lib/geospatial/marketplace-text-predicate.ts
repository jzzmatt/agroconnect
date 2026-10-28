/**
 * Non-spatial text predicate from `search_marketplace_products`.
 *
 * `pageMarketplaceCatalogue` does not apply this predicate. A CloudHike
 * candidate query must return every row that matches it, and only then may
 * the application apply GeographicLib, ordering, and pagination.
 * Portuguese stemming is a database `to_tsvector` test. An ILIKE-only filter
 * drops matches the RPC keeps.
 */

export const MARKETPLACE_PRODUCT_TEXT_SQL = `
  $query IS NULL OR $query = '' OR
  to_tsvector(
    'portuguese',
    coalesce(title, '') || ' ' || coalesce(description, '') || ' ' || coalesce(seller_name, '')
  ) @@ plainto_tsquery('portuguese', $query) OR
  title ILIKE '%' || $query || '%' OR
  description ILIKE '%' || $query || '%' OR
  seller_name ILIKE '%' || $query || '%'
`;

export const MARKETPLACE_PRODUCT_STATUS_SQL = `
  status IN ('active', 'published') AND seller_status = 'active'
`;
