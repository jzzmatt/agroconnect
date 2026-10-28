-- Development-only latitude/longitude catalogue for the PostGIS-free prototype.
-- Apply this only to an isolated local database, for example:
--   sudo -u postgres psql -d geospatial_proto -v ON_ERROR_STOP=1 \
--     -f scripts/cloudhike/geospatial-prototype.sql
-- Do not apply it to Supabase or to CloudHike project agroconnect.

CREATE TABLE IF NOT EXISTS proto_places (
  id text PRIMARY KEY,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  coverage_radius_km double precision NOT NULL
);

CREATE INDEX IF NOT EXISTS proto_places_lat_lon_idx
  ON proto_places (latitude, longitude);
