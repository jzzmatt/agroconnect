-- Pictures and one 60-second video for an owned AgriExpert service.
-- Bytes live in the private service-media bucket. Rows store the path only.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'storage') THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'service-media',
      'service-media',
      false,
      41943040,
      ARRAY['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm']::text[]
    )
    ON CONFLICT (id) DO UPDATE SET
      public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.service_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  storage_provider TEXT NOT NULL DEFAULT 'supabase_storage' CHECK (storage_provider = 'supabase_storage'),
  storage_path TEXT NOT NULL,
  alt_text TEXT,
  mime_type TEXT NOT NULL CHECK (mime_type IN ('image/jpeg', 'image/png', 'image/webp')),
  file_size BIGINT NOT NULL CHECK (file_size > 0 AND file_size <= 5242880),
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_service_images_service ON public.service_images (service_id, sort_order);
CREATE UNIQUE INDEX IF NOT EXISTS uq_service_images_primary
  ON public.service_images (service_id) WHERE is_primary;

DROP TRIGGER IF EXISTS tr_service_images_updated_at ON public.service_images;
CREATE TRIGGER tr_service_images_updated_at
  BEFORE UPDATE ON public.service_images
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TABLE IF NOT EXISTS public.service_videos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  filename TEXT,
  mime_type TEXT NOT NULL CHECK (mime_type IN ('video/mp4', 'video/webm')),
  file_size BIGINT NOT NULL CHECK (file_size > 0 AND file_size <= 41943040),
  duration_seconds NUMERIC(6, 2) NOT NULL CHECK (duration_seconds > 0 AND duration_seconds <= 60),
  status TEXT NOT NULL DEFAULT 'ready' CHECK (status IN ('ready', 'deleted')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_service_videos_one_ready
  ON public.service_videos (service_id) WHERE status = 'ready';

DROP TRIGGER IF EXISTS tr_service_videos_updated_at ON public.service_videos;
CREATE TRIGGER tr_service_videos_updated_at
  BEFORE UPDATE ON public.service_videos
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.service_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_videos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS service_images_select_own ON public.service_images;
CREATE POLICY service_images_select_own ON public.service_images
  FOR SELECT TO authenticated
  USING (
    owner_id IN (
      SELECT id FROM public.profiles WHERE clerk_user_id = public.current_clerk_user_id()
    )
  );

DROP POLICY IF EXISTS service_videos_select_own ON public.service_videos;
CREATE POLICY service_videos_select_own ON public.service_videos
  FOR SELECT TO authenticated
  USING (
    owner_id IN (
      SELECT id FROM public.profiles WHERE clerk_user_id = public.current_clerk_user_id()
    )
  );

REVOKE ALL ON TABLE public.service_images FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.service_videos FROM PUBLIC, anon, authenticated;

GRANT SELECT (
  id, service_id, owner_id, storage_provider, alt_text, mime_type, file_size, sort_order, is_primary, created_at, updated_at
) ON TABLE public.service_images TO authenticated;

GRANT SELECT (
  id, service_id, owner_id, filename, mime_type, file_size, duration_seconds, status, created_at, updated_at
) ON TABLE public.service_videos TO authenticated;
