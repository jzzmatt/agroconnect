-- Protected admin console: site settings, demo-batch tracking, and anonymous visit counts.
-- Production catalogue tables are unchanged. A real product, course, service, or
-- provider cannot be marked as demo because demo identity lives only in
-- demo_batch_records, and every record key must start with "demo-".

CREATE TABLE IF NOT EXISTS public.site_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_by UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  CONSTRAINT site_settings_demo_value CHECK (
    key <> 'demo_catalog_enabled' OR value IN ('true', 'false')
  )
);

CREATE TABLE IF NOT EXISTS public.demo_batches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'removed')),
  created_by UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  removed_at TIMESTAMPTZ NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_demo_batches_active_slug
  ON public.demo_batches (slug)
  WHERE status = 'active';

CREATE TABLE IF NOT EXISTS public.demo_batch_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  demo_batch_id UUID NOT NULL REFERENCES public.demo_batches(id) ON DELETE CASCADE,
  record_kind TEXT NOT NULL CHECK (record_kind IN ('product', 'course', 'service', 'provider', 'media')),
  record_key TEXT NOT NULL CHECK (record_key LIKE 'demo-%'),
  is_demo BOOLEAN NOT NULL DEFAULT true CHECK (is_demo = true),
  media_path TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT demo_batch_records_media_path CHECK (
    media_path IS NULL
    OR (
      media_path LIKE 'demo/%'
      AND media_path NOT LIKE '%..%'
      AND char_length(media_path) <= 180
    )
  ),
  CONSTRAINT uq_demo_batch_record UNIQUE (demo_batch_id, record_kind, record_key)
);

CREATE INDEX IF NOT EXISTS idx_demo_batch_records_batch
  ON public.demo_batch_records (demo_batch_id);

CREATE TABLE IF NOT EXISTS public.page_visits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  visited_on DATE NOT NULL,
  route TEXT NOT NULL CHECK (
    char_length(route) BETWEEN 1 AND 180
    AND left(route, 1) = '/'
    AND route NOT LIKE '%@%'
    AND route NOT LIKE '% %'
  ),
  visitor_id TEXT NOT NULL CHECK (
    visitor_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  ),
  marketplace TEXT NULL CHECK (marketplace IN ('agrishopping', 'agriacademy', 'agriservice')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_page_visits_visited_on ON public.page_visits (visited_on);
CREATE INDEX IF NOT EXISTS idx_page_visits_route ON public.page_visits (visited_on, route);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demo_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demo_batch_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_visits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS site_settings_public_read ON public.site_settings;
CREATE POLICY site_settings_public_read
  ON public.site_settings
  FOR SELECT
  TO anon, authenticated
  USING (key = 'demo_catalog_enabled');

DROP POLICY IF EXISTS demo_batches_public_read ON public.demo_batches;
CREATE POLICY demo_batches_public_read
  ON public.demo_batches
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS demo_batch_records_public_read ON public.demo_batch_records;
CREATE POLICY demo_batch_records_public_read
  ON public.demo_batch_records
  FOR SELECT
  TO anon, authenticated
  USING (is_demo = true);

REVOKE ALL ON public.site_settings FROM anon, authenticated;
GRANT SELECT ON public.site_settings TO anon, authenticated;

REVOKE ALL ON public.demo_batches FROM anon, authenticated;
GRANT SELECT ON public.demo_batches TO anon, authenticated;

REVOKE ALL ON public.demo_batch_records FROM anon, authenticated;
GRANT SELECT ON public.demo_batch_records TO anon, authenticated;

REVOKE ALL ON public.page_visits FROM anon, authenticated;

-- Isolated bucket for presentation media. No public read policy.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'storage') THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'demo',
      'demo',
      false,
      1048576,
      ARRAY['image/svg+xml']::text[]
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;
