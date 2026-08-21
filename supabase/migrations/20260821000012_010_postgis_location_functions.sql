-- ==============================================================================
-- AGROCONNECT — Phase 5: Migration 010 - PostGIS Geospatial Database Functions
-- Reusable spatial search for services, products, providers, agricultural resources,
-- bounding box filtering, and coverage area evaluation.
-- ==============================================================================

-- 1. Helper function: Get nearby services within radius (km) or inside coverage
CREATE OR REPLACE FUNCTION public.get_nearby_services(
  p_latitude NUMERIC,
  p_longitude NUMERIC,
  p_radius_km NUMERIC DEFAULT 50.0,
  p_category_id UUID DEFAULT NULL,
  p_province_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  provider_id UUID,
  category_id UUID,
  title TEXT,
  slug TEXT,
  short_description TEXT,
  price NUMERIC,
  currency TEXT,
  pricing_type TEXT,
  province_id UUID,
  municipality_id UUID,
  latitude NUMERIC,
  longitude NUMERIC,
  service_radius_km NUMERIC,
  distance_meters DOUBLE PRECISION,
  distance_km DOUBLE PRECISION,
  is_within_service_area BOOLEAN
) AS $$
DECLARE
  v_point GEOGRAPHY;
  v_max_radius_meters DOUBLE PRECISION;
BEGIN
  -- Validate coordinate limits (-90..90, -180..180)
  IF p_latitude < -90 OR p_latitude > 90 OR p_longitude < -180 OR p_longitude > 180 THEN
    RAISE EXCEPTION 'Coordenadas inválidas fornecidas.';
  END IF;

  -- Limit radius to maximum 200 km for database safety
  v_max_radius_meters := LEAST(COALESCE(p_radius_km, 50.0), 200.0) * 1000.0;
  v_point := ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography;

  RETURN QUERY
  SELECT
    s.id,
    s.provider_id,
    s.category_id,
    s.title,
    s.slug,
    s.short_description,
    s.price,
    s.currency,
    s.pricing_type::TEXT,
    s.province_id,
    s.municipality_id,
    s.latitude,
    s.longitude,
    s.service_radius_km,
    ST_Distance(s.location, v_point) AS distance_meters,
    (ST_Distance(s.location, v_point) / 1000.0) AS distance_km,
    (ST_Distance(s.location, v_point) <= (COALESCE(s.service_radius_km, 50.0) * 1000.0)) AS is_within_service_area
  FROM public.services s
  WHERE s.status = 'active'
    AND s.location IS NOT NULL
    AND (p_category_id IS NULL OR s.category_id = p_category_id)
    AND (p_province_id IS NULL OR s.province_id = p_province_id)
    AND (
      ST_DWithin(s.location, v_point, v_max_radius_meters)
      OR ST_DWithin(s.location, v_point, COALESCE(s.service_radius_km, 50.0) * 1000.0)
    )
  ORDER BY distance_meters ASC
  LIMIT LEAST(COALESCE(p_limit, 20), 100)
  OFFSET GREATEST(COALESCE(p_offset, 0), 0);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 2. Helper function: Get nearby products within radius (km)
CREATE OR REPLACE FUNCTION public.get_nearby_products(
  p_latitude NUMERIC,
  p_longitude NUMERIC,
  p_radius_km NUMERIC DEFAULT 50.0,
  p_category_id UUID DEFAULT NULL,
  p_province_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  seller_id UUID,
  category_id UUID,
  title TEXT,
  slug TEXT,
  condition TEXT,
  price NUMERIC,
  currency TEXT,
  quantity INTEGER,
  unit TEXT,
  province_id UUID,
  municipality_id UUID,
  latitude NUMERIC,
  longitude NUMERIC,
  distance_meters DOUBLE PRECISION,
  distance_km DOUBLE PRECISION
) AS $$
DECLARE
  v_point GEOGRAPHY;
  v_max_radius_meters DOUBLE PRECISION;
BEGIN
  IF p_latitude < -90 OR p_latitude > 90 OR p_longitude < -180 OR p_longitude > 180 THEN
    RAISE EXCEPTION 'Coordenadas inválidas fornecidas.';
  END IF;

  v_max_radius_meters := LEAST(COALESCE(p_radius_km, 50.0), 200.0) * 1000.0;
  v_point := ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography;

  RETURN QUERY
  SELECT
    p.id,
    p.seller_id,
    p.category_id,
    p.title,
    p.slug,
    p.condition::TEXT,
    p.price,
    p.currency,
    p.quantity,
    p.unit,
    p.province_id,
    p.municipality_id,
    p.latitude,
    p.longitude,
    ST_Distance(p.location, v_point) AS distance_meters,
    (ST_Distance(p.location, v_point) / 1000.0) AS distance_km
  FROM public.products p
  WHERE p.status = 'active'
    AND p.location IS NOT NULL
    AND (p_category_id IS NULL OR p.category_id = p_category_id)
    AND (p_province_id IS NULL OR p.province_id = p_province_id)
    AND ST_DWithin(p.location, v_point, v_max_radius_meters)
  ORDER BY distance_meters ASC
  LIMIT LEAST(COALESCE(p_limit, 20), 100)
  OFFSET GREATEST(COALESCE(p_offset, 0), 0);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 3. Helper function: Get nearby agricultural resources
CREATE OR REPLACE FUNCTION public.get_nearby_agricultural_resources(
  p_latitude NUMERIC,
  p_longitude NUMERIC,
  p_radius_km NUMERIC DEFAULT 50.0,
  p_resource_type TEXT DEFAULT NULL,
  p_province_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  provider_id UUID,
  category_id UUID,
  title TEXT,
  slug TEXT,
  description TEXT,
  resource_type TEXT,
  province_id UUID,
  municipality_id UUID,
  latitude NUMERIC,
  longitude NUMERIC,
  service_radius_km NUMERIC,
  distance_meters DOUBLE PRECISION,
  distance_km DOUBLE PRECISION
) AS $$
DECLARE
  v_point GEOGRAPHY;
  v_max_radius_meters DOUBLE PRECISION;
BEGIN
  IF p_latitude < -90 OR p_latitude > 90 OR p_longitude < -180 OR p_longitude > 180 THEN
    RAISE EXCEPTION 'Coordenadas inválidas fornecidas.';
  END IF;

  v_max_radius_meters := LEAST(COALESCE(p_radius_km, 50.0), 200.0) * 1000.0;
  v_point := ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography;

  RETURN QUERY
  SELECT
    ar.id,
    ar.provider_id,
    ar.category_id,
    ar.title,
    ar.slug,
    ar.description,
    ar.resource_type::TEXT,
    ar.province_id,
    ar.municipality_id,
    ar.latitude,
    ar.longitude,
    ar.service_radius_km,
    ST_Distance(ar.location, v_point) AS distance_meters,
    (ST_Distance(ar.location, v_point) / 1000.0) AS distance_km
  FROM public.agricultural_resources ar
  WHERE ar.status = 'active'
    AND ar.location IS NOT NULL
    AND (p_resource_type IS NULL OR ar.resource_type = p_resource_type)
    AND (p_province_id IS NULL OR ar.province_id = p_province_id)
    AND ST_DWithin(ar.location, v_point, v_max_radius_meters)
  ORDER BY distance_meters ASC
  LIMIT LEAST(COALESCE(p_limit, 20), 100)
  OFFSET GREATEST(COALESCE(p_offset, 0), 0);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 4. Helper function: Search locations by Bounding Box (Map Extents: North, South, East, West)
CREATE OR REPLACE FUNCTION public.get_entities_in_bounds(
  p_min_lat NUMERIC,
  p_min_lon NUMERIC,
  p_max_lat NUMERIC,
  p_max_lon NUMERIC,
  p_entity_type TEXT DEFAULT 'all', -- 'service', 'product', 'agricultural_resource', 'all'
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  entity_type TEXT,
  title TEXT,
  slug TEXT,
  category_name TEXT,
  latitude NUMERIC,
  longitude NUMERIC
) AS $$
DECLARE
  v_bbox GEOMETRY;
BEGIN
  v_bbox := ST_MakeEnvelope(p_min_lon, p_min_lat, p_max_lon, p_max_lat, 4326);

  RETURN QUERY
  -- Services
  SELECT
    s.id,
    'service'::TEXT AS entity_type,
    s.title,
    s.slug,
    COALESCE(c.name, 'AgriExpert') AS category_name,
    s.latitude,
    s.longitude
  FROM public.services s
  LEFT JOIN public.categories c ON c.id = s.category_id
  WHERE (p_entity_type = 'all' OR p_entity_type = 'service')
    AND s.status = 'active'
    AND s.location IS NOT NULL
    AND s.location::geometry && v_bbox

  UNION ALL

  -- Products
  SELECT
    p.id,
    'product'::TEXT AS entity_type,
    p.title,
    p.slug,
    COALESCE(c.name, 'AgriShopping') AS category_name,
    p.latitude,
    p.longitude
  FROM public.products p
  LEFT JOIN public.categories c ON c.id = p.category_id
  WHERE (p_entity_type = 'all' OR p_entity_type = 'product')
    AND p.status = 'active'
    AND p.location IS NOT NULL
    AND p.location::geometry && v_bbox

  UNION ALL

  -- Agricultural Resources
  SELECT
    ar.id,
    'agricultural_resource'::TEXT AS entity_type,
    ar.title,
    ar.slug,
    ar.resource_type::TEXT AS category_name,
    ar.latitude,
    ar.longitude
  FROM public.agricultural_resources ar
  WHERE (p_entity_type = 'all' OR p_entity_type = 'agricultural_resource')
    AND ar.status = 'active'
    AND ar.location IS NOT NULL
    AND ar.location::geometry && v_bbox

  LIMIT LEAST(COALESCE(p_limit, 50), 100);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
