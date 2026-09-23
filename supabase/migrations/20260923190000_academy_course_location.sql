-- AgriAcademy: optional course geographic location for AgriLocalization GeoMap

ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS location_name TEXT,
  ADD COLUMN IF NOT EXISTS location_address TEXT,
  ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

COMMENT ON COLUMN public.courses.location_name IS 'Human-readable course location label for map and editor';
COMMENT ON COLUMN public.courses.latitude IS 'Optional WGS84 latitude; NULL when no map location';

CREATE INDEX IF NOT EXISTS idx_courses_map_location
  ON public.courses (latitude, longitude)
  WHERE status = 'published' AND latitude IS NOT NULL AND longitude IS NOT NULL;
