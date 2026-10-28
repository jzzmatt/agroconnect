-- AgriConnect geospatial baseline for the current PostGIS search behavior.
--
-- Run this only on an isolated local or development database whose owner can
-- create PostGIS. Example:
--   sudo -u postgres psql -d geospatial_baseline -v ON_ERROR_STOP=1 \
--     -f scripts/cloudhike/geospatial-baseline.sql
--
-- Do not run this file against CloudHike project agroconnect.
-- Do not point it at DATABASE_URL or DIRECT_URL from .env.cloudhike.local.
-- It creates fixture_points, fixture_radius_hit, and haversine_km.

CREATE EXTENSION IF NOT EXISTS postgis;

SELECT postgis_full_version() AS postgis_version;

SELECT version, superuser, trusted
FROM pg_available_extension_versions
WHERE name = 'postgis';

DROP TABLE IF EXISTS fixture_points;
CREATE TABLE fixture_points (
  id text PRIMARY KEY,
  label text NOT NULL,
  selling_radius_km numeric NOT NULL,
  latitude numeric,
  longitude numeric,
  location geography(Point, 4326)
);

CREATE INDEX fixture_points_location_gist ON fixture_points USING GIST (location);

-- Luanda anchor, then points projected due north (azimuth 0) on the spheroid.
WITH anchor AS (
  SELECT ST_SetSRID(ST_MakePoint(13.2344, -8.8383), 4326)::geography AS g
)
INSERT INTO fixture_points (id, label, selling_radius_km, latitude, longitude, location)
SELECT id, label, radius_km,
       ST_Y(geom::geometry),
       ST_X(geom::geometry),
       geom
FROM (
  SELECT 'luanda'::text AS id, 'Luanda anchor'::text AS label, 50::numeric AS radius_km,
         (SELECT g FROM anchor) AS geom
  UNION ALL
  SELECT 'n_10', '10 km north', 50, ST_Project((SELECT g FROM anchor), 10000, 0)
  UNION ALL
  SELECT 'n_49_9', '49.9 km north', 50, ST_Project((SELECT g FROM anchor), 49900, 0)
  UNION ALL
  SELECT 'n_50', '50 km north', 50, ST_Project((SELECT g FROM anchor), 50000, 0)
  UNION ALL
  SELECT 'n_50_1', '50.1 km north', 50, ST_Project((SELECT g FROM anchor), 50100, 0)
  UNION ALL
  SELECT 'n_80', '80 km north', 50, ST_Project((SELECT g FROM anchor), 80000, 0)
  UNION ALL
  SELECT 'n_190', '190 km north', 20, ST_Project((SELECT g FROM anchor), 190000, 0)
  UNION ALL
  SELECT 'n_210', '210 km north', 50, ST_Project((SELECT g FROM anchor), 210000, 0)
  UNION ALL
  SELECT 'missing', 'missing coordinates', 50, NULL
) AS rows;

-- Searcher is the Luanda anchor. Mirrors search_marketplace_products radius predicate.
CREATE OR REPLACE FUNCTION fixture_radius_hit(
  p_id text,
  p_radius_km numeric
) RETURNS TABLE (
  id text,
  distance_m double precision,
  distance_km double precision,
  within_buyer boolean,
  within_seller boolean,
  included boolean
) LANGUAGE sql STABLE AS $$
  WITH searcher AS (
    SELECT ST_SetSRID(ST_MakePoint(13.2344, -8.8383), 4326)::geography AS g
  ),
  cap AS (
    SELECT LEAST(p_radius_km, 200.0) * 1000.0 AS meters
  )
  SELECT f.id,
         ST_Distance(f.location, s.g),
         ST_Distance(f.location, s.g) / 1000.0,
         ST_DWithin(f.location, s.g, c.meters),
         ST_DWithin(f.location, s.g, COALESCE(f.selling_radius_km, 50.0) * 1000.0),
         ST_DWithin(f.location, s.g, c.meters)
           OR ST_DWithin(f.location, s.g, COALESCE(f.selling_radius_km, 50.0) * 1000.0)
  FROM fixture_points f
  CROSS JOIN searcher s
  CROSS JOIN cap c
  WHERE f.id = p_id
    AND f.location IS NOT NULL;
$$;

-- Haversine with the app's in-memory fallback R = 6371 km.
CREATE OR REPLACE FUNCTION haversine_km(
  lat1 double precision,
  lon1 double precision,
  lat2 double precision,
  lon2 double precision
)
RETURNS double precision LANGUAGE sql IMMUTABLE AS $$
  SELECT 6371 * 2 * atan2(
    sqrt(
      pow(sin(radians(lat2 - lat1) / 2), 2)
      + cos(radians(lat1)) * cos(radians(lat2)) * pow(sin(radians(lon2 - lon1) / 2), 2)
    ),
    sqrt(1 - (
      pow(sin(radians(lat2 - lat1) / 2), 2)
      + cos(radians(lat1)) * cos(radians(lat2)) * pow(sin(radians(lon2 - lon1) / 2), 2)
    ))
  );
$$;

\echo '--- radius cases, buyer radius 10 km ---'
SELECT id, round(distance_m::numeric, 3) AS distance_m,
       within_buyer, within_seller, included
FROM fixture_radius_hit('n_10', 10)
UNION ALL SELECT id, round(distance_m::numeric, 3), within_buyer, within_seller, included FROM fixture_radius_hit('n_49_9', 10)
UNION ALL SELECT id, round(distance_m::numeric, 3), within_buyer, within_seller, included FROM fixture_radius_hit('n_50', 10)
UNION ALL SELECT id, round(distance_m::numeric, 3), within_buyer, within_seller, included FROM fixture_radius_hit('n_50_1', 10)
UNION ALL SELECT id, round(distance_m::numeric, 3), within_buyer, within_seller, included FROM fixture_radius_hit('n_80', 10)
UNION ALL SELECT id, round(distance_m::numeric, 3), within_buyer, within_seller, included FROM fixture_radius_hit('n_190', 10)
UNION ALL SELECT id, round(distance_m::numeric, 3), within_buyer, within_seller, included FROM fixture_radius_hit('n_210', 10)
ORDER BY 1;

\echo '--- radius cases, buyer radius 100 km ---'
SELECT id, round(distance_m::numeric, 3) AS distance_m, included
FROM fixture_radius_hit('n_80', 100);

\echo '--- radius cases, buyer radius 250 km, cap is 200 ---'
SELECT id, round(distance_m::numeric, 3) AS distance_m, within_buyer, included
FROM fixture_radius_hit('n_190', 250)
UNION ALL
SELECT id, round(distance_m::numeric, 3), within_buyer, included
FROM fixture_radius_hit('n_210', 250);

\echo '--- spheroid vs sphere vs haversine ---'
SELECT f.id,
       round(ST_Distance(f.location, a.g)::numeric, 3) AS spheroid_m,
       round(ST_Distance(f.location, a.g, false)::numeric, 3) AS sphere_m,
       round((haversine_km(ST_Y(a.g::geometry), ST_X(a.g::geometry), f.latitude, f.longitude) * 1000)::numeric, 3) AS haversine_m,
       round((ST_Distance(f.location, a.g) - haversine_km(ST_Y(a.g::geometry), ST_X(a.g::geometry), f.latitude, f.longitude) * 1000)::numeric, 3) AS spheroid_minus_haversine_m,
       (haversine_km(ST_Y(a.g::geometry), ST_X(a.g::geometry), f.latitude, f.longitude) <= f.selling_radius_km) AS haversine_within_seller
FROM fixture_points f
CROSS JOIN (SELECT location AS g FROM fixture_points WHERE id = 'luanda') a
WHERE f.id <> 'luanda' AND f.location IS NOT NULL
ORDER BY f.id;

\echo '--- missing coordinates are not a radius hit when a search point exists ---'
SELECT id, location IS NULL AS location_missing,
       (SELECT count(*) FROM fixture_radius_hit('missing', 50)) AS radius_rows
FROM fixture_points WHERE id = 'missing';

\echo '--- invalid latitude 95 is coerced, not rejected, by a geography cast ---'
SELECT round(ST_Distance(
  ST_SetSRID(ST_MakePoint(13.2344, 95), 4326)::geography,
  ST_SetSRID(ST_MakePoint(13.2344, -8.8383), 4326)::geography
)::numeric, 3) AS invalid_lat_distance_m;

\echo '--- invalid longitude 200 is coerced, not rejected, by a geography cast ---'
SELECT ST_X(ST_SetSRID(ST_MakePoint(200, -8.8383), 4326)::geography::geometry) AS coerced_lon,
       round(ST_Distance(
         ST_SetSRID(ST_MakePoint(200, -8.8383), 4326)::geography,
         ST_SetSRID(ST_MakePoint(13.2344, -8.8383), 4326)::geography
       )::numeric, 3) AS invalid_lon_distance_m;

\echo '--- polygon containment and intersection ---'
WITH poly AS (
  SELECT ST_GeomFromText(
    'POLYGON((13.20 -8.90, 13.30 -8.90, 13.30 -8.80, 13.20 -8.80, 13.20 -8.90))',
    4326
  ) AS g
),
overlap AS (
  SELECT ST_GeomFromText(
    'POLYGON((13.25 -8.85, 13.40 -8.85, 13.40 -8.70, 13.25 -8.70, 13.25 -8.85))',
    4326
  ) AS g
),
disjoint AS (
  SELECT ST_GeomFromText(
    'POLYGON((14.00 -9.00, 14.10 -9.00, 14.10 -8.90, 14.00 -8.90, 14.00 -9.00))',
    4326
  ) AS g
),
edge AS (
  SELECT ST_GeomFromText(
    'POLYGON((13.30 -8.90, 13.40 -8.90, 13.40 -8.80, 13.30 -8.80, 13.30 -8.90))',
    4326
  ) AS g
)
SELECT
  ST_Contains(p.g, ST_SetSRID(ST_MakePoint(13.25, -8.85), 4326)) AS inside_contains,
  ST_Intersects(p.g, ST_SetSRID(ST_MakePoint(13.25, -8.85), 4326)) AS inside_intersects,
  ST_Contains(p.g, ST_SetSRID(ST_MakePoint(13.20, -8.85), 4326)) AS boundary_contains,
  ST_Intersects(p.g, ST_SetSRID(ST_MakePoint(13.20, -8.85), 4326)) AS boundary_intersects,
  ST_Contains(p.g, ST_SetSRID(ST_MakePoint(13.10, -8.85), 4326)) AS outside_contains,
  ST_Intersects(p.g, ST_SetSRID(ST_MakePoint(13.10, -8.85), 4326)) AS outside_intersects,
  ST_IsValid(p.g) AS polygon_valid,
  ST_Intersects(p.g, o.g) AS overlap_intersects,
  round(ST_Area(ST_Intersection(p.g, o.g)::geography)::numeric, 3) AS overlap_area_m2,
  ST_Intersects(p.g, d.g) AS disjoint_intersects,
  ST_Intersects(p.g, e.g) AS shared_edge_intersects,
  ST_Touches(p.g, e.g) AS shared_edge_touches,
  ST_Overlaps(p.g, e.g) AS shared_edge_overlaps
FROM poly p, overlap o, disjoint d, edge e;

\echo '--- gist index present ---'
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'fixture_points'
ORDER BY indexname;
