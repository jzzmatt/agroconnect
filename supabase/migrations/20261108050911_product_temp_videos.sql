-- Temporary AgriProduct videos stay private until publish copies them
-- into agroproduct-media. Service-role writes; owners can only read their rows.

ALTER TABLE public.product_videos
  ADD COLUMN IF NOT EXISTS storage_bucket TEXT;

COMMENT ON COLUMN public.product_videos.storage_bucket IS
  'Private bucket for upload_storage_path. Null means the legacy product-media bucket.';

CREATE TABLE IF NOT EXISTS public.product_temp_videos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  client_request_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'processing' CHECK (
    status IN (
      'processing',
      'saved',
      'transferring',
      'permanent_ready',
      'transferred',
      'cleanup_failed',
      'deleted'
    )
  ),
  temp_bucket TEXT NOT NULL DEFAULT 'agroproduct-temp-videos',
  temp_path TEXT,
  permanent_bucket TEXT NOT NULL DEFAULT 'agroproduct-media',
  permanent_path TEXT,
  mime_type TEXT NOT NULL,
  file_size BIGINT NOT NULL CHECK (file_size > 0 AND file_size <= 41943040),
  duration_seconds NUMERIC(8,2) NOT NULL CHECK (duration_seconds > 0 AND duration_seconds <= 60.05),
  error_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT uq_product_temp_video_request UNIQUE (user_id, client_request_id),
  CONSTRAINT ck_product_temp_video_request CHECK (char_length(client_request_id) BETWEEN 16 AND 80)
);

CREATE INDEX IF NOT EXISTS idx_product_temp_videos_user
  ON public.product_temp_videos (user_id, created_at DESC);

DROP TRIGGER IF EXISTS tr_product_temp_videos_updated_at ON public.product_temp_videos;
CREATE TRIGGER tr_product_temp_videos_updated_at
  BEFORE UPDATE ON public.product_temp_videos
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.product_temp_videos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS product_temp_videos_select_own ON public.product_temp_videos;
CREATE POLICY product_temp_videos_select_own
  ON public.product_temp_videos
  FOR SELECT
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM public.profiles
      WHERE clerk_user_id = public.current_clerk_user_id()
    )
  );

REVOKE ALL ON TABLE public.product_temp_videos FROM PUBLIC, anon, authenticated;
GRANT SELECT (
  id, user_id, product_id, status, mime_type, file_size, duration_seconds,
  error_code, created_at, updated_at
) ON TABLE public.product_temp_videos TO authenticated;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'storage') THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES
      (
        'agroproduct-temp-videos',
        'agroproduct-temp-videos',
        false,
        41943040,
        ARRAY['video/mp4', 'video/webm']::text[]
      ),
      (
        'agroproduct-media',
        'agroproduct-media',
        false,
        41943040,
        ARRAY['video/mp4', 'video/webm']::text[]
      )
    ON CONFLICT (id) DO UPDATE SET
      public = false,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;
  END IF;
END $$;
