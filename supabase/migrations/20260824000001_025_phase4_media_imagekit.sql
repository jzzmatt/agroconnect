-- ==============================================================================
-- AGROCONNECT — Phase 4: Migration 025
-- Media infrastructure: ImageKit for product images/videos, Bunny narrowed to
-- AgriAcademy training video only. Additive only — no past migration is edited.
-- ==============================================================================

-- 1. product_images: allow ImageKit as a storage provider, add the external
--    file id ImageKit assigns so a delete can target the right remote asset.
ALTER TABLE public.product_images DROP CONSTRAINT IF EXISTS product_images_storage_provider_check;
ALTER TABLE public.product_images ADD CONSTRAINT product_images_storage_provider_check CHECK (
  storage_provider IN ('cloudflare_r2', 'cloudflare_stream', 'supabase_storage', 'local', 'external', 'bunny_stream', 'imagekit')
);

ALTER TABLE public.product_images ADD COLUMN IF NOT EXISTS external_id TEXT;

COMMENT ON COLUMN public.product_images.external_id IS 'Provider-assigned file id (e.g. ImageKit fileId) used to delete the remote asset.';

-- 2. product_videos: move the default provider to ImageKit while keeping the
--    Bunny columns for any video already in flight, and widen the file size /
--    duration checks to match the app-level limits in src/config/product-catalog.ts
--    (PRODUCT_VIDEO_MAX_BYTES = 40 MB, PRODUCT_VIDEO_MAX_SECONDS = 60s). These
--    were narrower than the app already validated for; the mismatch was masked
--    only because the previous write path swallowed insert failures.
ALTER TABLE public.product_videos ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'imagekit';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'product_videos_provider_check'
  ) THEN
    ALTER TABLE public.product_videos
      ADD CONSTRAINT product_videos_provider_check
      CHECK (provider IN ('imagekit', 'bunny_stream'));
  END IF;
END $$;

ALTER TABLE public.product_videos ADD COLUMN IF NOT EXISTS external_id TEXT;
ALTER TABLE public.product_videos ADD COLUMN IF NOT EXISTS error_message TEXT;

ALTER TABLE public.product_videos ALTER COLUMN bunny_video_id DROP NOT NULL;
ALTER TABLE public.product_videos ALTER COLUMN bunny_library_id DROP NOT NULL;

ALTER TABLE public.product_videos DROP CONSTRAINT IF EXISTS product_videos_file_size_check;
ALTER TABLE public.product_videos ADD CONSTRAINT product_videos_file_size_check CHECK (
  file_size >= 0 AND file_size <= 41943040
);

ALTER TABLE public.product_videos DROP CONSTRAINT IF EXISTS product_videos_duration_seconds_check;
ALTER TABLE public.product_videos ADD CONSTRAINT product_videos_duration_seconds_check CHECK (
  duration_seconds > 0 AND duration_seconds <= 60
);

COMMENT ON COLUMN public.product_videos.provider IS 'Media provider backing this row. ImageKit for all new product videos; bunny_stream only for rows created before Phase 4 narrowed Bunny to AgriAcademy.';
COMMENT ON COLUMN public.product_videos.external_id IS 'Provider-assigned file id (e.g. ImageKit fileId) used to delete the remote asset.';

-- 3. media_assets: allow ImageKit so profile/application media can adopt this
--    generic table in a later phase without another migration.
ALTER TABLE public.media_assets DROP CONSTRAINT IF EXISTS media_assets_storage_provider_check;
ALTER TABLE public.media_assets ADD CONSTRAINT media_assets_storage_provider_check CHECK (
  storage_provider IN ('cloudflare_r2', 'cloudflare_stream', 'supabase_storage', 'local', 'external', 'bunny_stream', 'imagekit')
);
