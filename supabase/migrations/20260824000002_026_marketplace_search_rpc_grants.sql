-- Targeted corrective fix (not a project phase):
-- PostgREST returned 404 for /rest/v1/rpc/search_marketplace_services because
-- PostgreSQL 15+ does not GRANT EXECUTE TO PUBLIC by default. PostgREST treats
-- an unexecutable RPC as missing (HTTP 404).
--
-- This migration re-asserts the existing marketplace search functions and
-- grants them to the API roles. It does not invent a replacement RPC.

CREATE OR REPLACE FUNCTION public.search_marketplace_services(
  p_query TEXT DEFAULT NULL,
  p_category_id UUID DEFAULT NULL,
  p_province_id UUID DEFAULT NULL,
  p_municipality_id UUID DEFAULT NULL,
  p_pricing_type TEXT DEFAULT NULL,
  p_min_price NUMERIC DEFAULT NULL,
  p_max_price NUMERIC DEFAULT NULL,
  p_latitude NUMERIC DEFAULT NULL,
  p_longitude NUMERIC DEFAULT NULL,
  p_radius_km NUMERIC DEFAULT NULL,
  p_sort_by TEXT DEFAULT 'relevance',
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  provider_id UUID,
  provider_name TEXT,
  provider_slug TEXT,
  provider_rating NUMERIC,
  provider_verified TEXT,
  category_id UUID,
  category_name TEXT,
  title TEXT,
  slug TEXT,
  short_description TEXT,
  description TEXT,
  pricing_type TEXT,
  price NUMERIC,
  currency TEXT,
  location_type TEXT,
  province_id UUID,
  province_name TEXT,
  municipality_id UUID,
  municipality_name TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  service_radius_km NUMERIC,
  distance_km DOUBLE PRECISION,
  is_within_service_area BOOLEAN,
  status TEXT,
  is_featured BOOLEAN,
  created_at TIMESTAMPTZ,
  total_count BIGINT
) AS $$
DECLARE
  v_point GEOGRAPHY := NULL;
  v_max_radius_meters DOUBLE PRECISION := NULL;
BEGIN
  IF p_latitude IS NOT NULL AND p_longitude IS NOT NULL THEN
    v_point := ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography;
    IF p_radius_km IS NOT NULL THEN
      v_max_radius_meters := LEAST(p_radius_km, 200.0) * 1000.0;
    END IF;
  END IF;

  RETURN QUERY
  WITH filtered AS (
    SELECT
      s.id,
      s.provider_id,
      pp.business_name AS provider_name,
      pp.slug AS provider_slug,
      pp.rating AS provider_rating,
      pp.verification_status AS provider_verified,
      s.category_id,
      cat.name AS category_name,
      s.title,
      s.slug,
      s.short_description,
      s.description,
      s.pricing_type::TEXT,
      s.price,
      s.currency,
      s.location_type::TEXT,
      s.province_id,
      prov.name AS province_name,
      s.municipality_id,
      mun.name AS municipality_name,
      s.latitude,
      s.longitude,
      s.service_radius_km,
      CASE
        WHEN v_point IS NOT NULL AND s.location IS NOT NULL THEN (ST_Distance(s.location, v_point) / 1000.0)
        ELSE NULL
      END AS distance_km,
      CASE
        WHEN v_point IS NOT NULL AND s.location IS NOT NULL THEN
          (ST_Distance(s.location, v_point) <= (COALESCE(s.service_radius_km, 50.0) * 1000.0))
        ELSE false
      END AS is_within_service_area,
      s.status::TEXT,
      s.is_featured,
      s.created_at
    FROM public.services s
    JOIN public.provider_profiles pp ON pp.id = s.provider_id
    LEFT JOIN public.categories cat ON cat.id = s.category_id
    LEFT JOIN public.provinces prov ON prov.id = s.province_id
    LEFT JOIN public.municipalities mun ON mun.id = s.municipality_id
    WHERE s.status IN ('active', 'published')
      AND pp.status = 'active'
      AND (p_category_id IS NULL OR s.category_id = p_category_id)
      AND (p_province_id IS NULL OR s.province_id = p_province_id)
      AND (p_municipality_id IS NULL OR s.municipality_id = p_municipality_id)
      AND (p_pricing_type IS NULL OR s.pricing_type::TEXT = p_pricing_type)
      AND (p_min_price IS NULL OR s.price >= p_min_price)
      AND (p_max_price IS NULL OR s.price <= p_max_price)
      AND (
        p_query IS NULL OR p_query = '' OR
        to_tsvector('portuguese', coalesce(s.title, '') || ' ' || coalesce(s.short_description, '') || ' ' || coalesce(s.description, '') || ' ' || coalesce(pp.business_name, '')) @@ plainto_tsquery('portuguese', p_query) OR
        s.title ILIKE '%' || p_query || '%' OR
        s.short_description ILIKE '%' || p_query || '%' OR
        pp.business_name ILIKE '%' || p_query || '%'
      )
      AND (
        v_max_radius_meters IS NULL OR
        (s.location IS NOT NULL AND (
          ST_DWithin(s.location, v_point, v_max_radius_meters) OR
          ST_DWithin(s.location, v_point, COALESCE(s.service_radius_km, 50.0) * 1000.0)
        ))
      )
  ),
  counted AS (
    SELECT count(*) AS total FROM filtered
  )
  SELECT
    f.id,
    f.provider_id,
    f.provider_name,
    f.provider_slug,
    f.provider_rating,
    f.provider_verified,
    f.category_id,
    f.category_name,
    f.title,
    f.slug,
    f.short_description,
    f.description,
    f.pricing_type,
    f.price,
    f.currency,
    f.location_type,
    f.province_id,
    f.province_name,
    f.municipality_id,
    f.municipality_name,
    f.latitude,
    f.longitude,
    f.service_radius_km,
    f.distance_km,
    f.is_within_service_area,
    f.status,
    f.is_featured,
    f.created_at,
    c.total AS total_count
  FROM filtered f, counted c
  ORDER BY
    CASE WHEN p_sort_by = 'price_asc' THEN f.price END ASC,
    CASE WHEN p_sort_by = 'price_desc' THEN f.price END DESC,
    CASE WHEN p_sort_by = 'distance' AND f.distance_km IS NOT NULL THEN f.distance_km END ASC,
    CASE WHEN p_sort_by = 'rating' THEN f.provider_rating END DESC NULLS LAST,
    CASE WHEN p_sort_by = 'newest' THEN f.created_at END DESC,
    f.is_featured DESC,
    f.created_at DESC
  LIMIT LEAST(COALESCE(p_limit, 20), 100)
  OFFSET GREATEST(COALESCE(p_offset, 0), 0);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.search_marketplace_services(TEXT, UUID, UUID, UUID, TEXT, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, TEXT, INTEGER, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_marketplace_services(TEXT, UUID, UUID, UUID, TEXT, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, TEXT, INTEGER, INTEGER) TO anon, authenticated, service_role;

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'search_marketplace_products'
  LOOP
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO anon, authenticated, service_role', r.sig);
    EXECUTE format('ALTER FUNCTION %s SET search_path = public', r.sig);
  END LOOP;
END
$$;

NOTIFY pgrst, 'reload schema';
