-- Drop ImageKit and Bunny Stream data and columns.
-- Supabase Storage rows (provider/storage_provider = supabase_storage) stay.
-- Historical migrations are unchanged.

UPDATE public.products
SET product_video_id = NULL
WHERE product_video_id IN (
  SELECT id
  FROM public.product_videos
  WHERE provider IS DISTINCT FROM 'supabase_storage'
);

DELETE FROM public.product_videos
WHERE provider IS DISTINCT FROM 'supabase_storage';

UPDATE public.products
SET primary_image_url = NULL
WHERE primary_image_url ILIKE '%imagekit.io%'
   OR primary_image_url ILIKE '%b-cdn.net%'
   OR primary_image_url ILIKE '%bunnycdn%'
   OR primary_image_url ILIKE '%mediadelivery.net%';

DELETE FROM public.product_images
WHERE storage_provider IN ('imagekit', 'bunny_stream')
   OR (
     COALESCE(storage_provider, '') IS DISTINCT FROM 'supabase_storage'
     AND (
       COALESCE(url, '') ILIKE '%imagekit.io%'
       OR COALESCE(url, '') ILIKE '%b-cdn.net%'
       OR COALESCE(url, '') ILIKE '%bunnycdn%'
       OR COALESCE(url, '') ILIKE '%mediadelivery.net%'
     )
   );

DELETE FROM public.media_assets
WHERE storage_provider IN ('imagekit', 'bunny_stream')
   OR COALESCE(url, '') ILIKE '%imagekit.io%'
   OR COALESCE(url, '') ILIKE '%b-cdn.net%'
   OR COALESCE(url, '') ILIKE '%bunnycdn%'
   OR COALESCE(url, '') ILIKE '%mediadelivery.net%'
   OR COALESCE(metadata::text, '') ILIKE '%imagekit%';

UPDATE public.profiles
SET avatar_url = NULL
WHERE avatar_url ILIKE '%imagekit.io%'
   OR avatar_url ILIKE '%b-cdn.net%'
   OR avatar_url ILIKE '%bunnycdn%'
   OR avatar_url ILIKE '%mediadelivery.net%';

UPDATE public.provider_profiles
SET avatar_url = NULL
WHERE avatar_url ILIKE '%imagekit.io%'
   OR avatar_url ILIKE '%b-cdn.net%'
   OR avatar_url ILIKE '%bunnycdn%'
   OR avatar_url ILIKE '%mediadelivery.net%';

UPDATE public.transport_services
SET vehicle_media_url = NULL
WHERE vehicle_media_url ILIKE '%imagekit.io%'
   OR vehicle_media_url ILIKE '%b-cdn.net%'
   OR vehicle_media_url ILIKE '%bunnycdn%'
   OR vehicle_media_url ILIKE '%mediadelivery.net%';

UPDATE public.transport_services
SET vehicle_video_url = NULL
WHERE vehicle_video_url ILIKE '%imagekit.io%'
   OR vehicle_video_url ILIKE '%b-cdn.net%'
   OR vehicle_video_url ILIKE '%bunnycdn%'
   OR vehicle_video_url ILIKE '%mediadelivery.net%';

UPDATE public.course_lessons
SET academy_video_id = NULL
WHERE academy_video_id IN (
  SELECT id FROM public.academy_videos WHERE bunny_video_id IS NOT NULL
);

DELETE FROM public.academy_videos
WHERE bunny_video_id IS NOT NULL;

DROP INDEX IF EXISTS public.idx_academy_videos_bunny;

ALTER TABLE public.product_videos DROP COLUMN IF EXISTS bunny_video_id;
ALTER TABLE public.product_videos DROP COLUMN IF EXISTS bunny_library_id;
ALTER TABLE public.academy_videos DROP COLUMN IF EXISTS bunny_video_id;
ALTER TABLE public.academy_videos DROP COLUMN IF EXISTS bunny_library_id;

ALTER TABLE public.product_videos ALTER COLUMN provider SET DEFAULT 'supabase_storage';

ALTER TABLE public.product_videos DROP CONSTRAINT IF EXISTS product_videos_provider_check;
ALTER TABLE public.product_videos ADD CONSTRAINT product_videos_provider_check CHECK (
  provider IN ('supabase_storage')
);

ALTER TABLE public.product_images DROP CONSTRAINT IF EXISTS product_images_storage_provider_check;
ALTER TABLE public.product_images ADD CONSTRAINT product_images_storage_provider_check CHECK (
  storage_provider IN ('cloudflare_r2', 'cloudflare_stream', 'supabase_storage', 'local', 'external')
);

ALTER TABLE public.media_assets DROP CONSTRAINT IF EXISTS media_assets_storage_provider_check;
ALTER TABLE public.media_assets ADD CONSTRAINT media_assets_storage_provider_check CHECK (
  storage_provider IN ('cloudflare_r2', 'cloudflare_stream', 'supabase_storage', 'local', 'external')
);

COMMENT ON COLUMN public.product_videos.provider IS 'Storage provider for this row. Only supabase_storage remains.';
COMMENT ON TABLE public.academy_videos IS 'Legacy academy video metadata. New lessons use course_lessons.youtube_video_id or private storage uploads.';
