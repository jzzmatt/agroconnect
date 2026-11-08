-- Video thumbnails follow the same private temporary bucket as the processed video.
-- WhatsApp records each image separately so a retry does not resend a confirmed image.

ALTER TABLE public.product_videos
  ADD COLUMN IF NOT EXISTS thumbnail_storage_path TEXT;

COMMENT ON COLUMN public.product_videos.thumbnail_storage_path IS
  'Private object path for the generated video frame. storage_bucket names the bucket.';

ALTER TABLE public.product_temp_videos
  ADD COLUMN IF NOT EXISTS thumbnail_temp_path TEXT,
  ADD COLUMN IF NOT EXISTS thumbnail_permanent_path TEXT;

ALTER TABLE public.whatsapp_product_publication_targets
  ADD COLUMN IF NOT EXISTS product_image_status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS thumbnail_status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS product_image_message_id TEXT,
  ADD COLUMN IF NOT EXISTS thumbnail_message_id TEXT;

ALTER TABLE public.whatsapp_product_publication_targets
  DROP CONSTRAINT IF EXISTS ck_whatsapp_target_product_image_status,
  DROP CONSTRAINT IF EXISTS ck_whatsapp_target_thumbnail_status;

ALTER TABLE public.whatsapp_product_publication_targets
  ADD CONSTRAINT ck_whatsapp_target_product_image_status
    CHECK (product_image_status IN ('pending', 'sent', 'failed', 'skipped')),
  ADD CONSTRAINT ck_whatsapp_target_thumbnail_status
    CHECK (thumbnail_status IN ('pending', 'sent', 'failed', 'skipped'));

UPDATE public.whatsapp_product_publication_targets
SET
  product_image_status = CASE media_status
    WHEN 'sent' THEN 'sent'
    WHEN 'skipped' THEN 'skipped'
    WHEN 'failed' THEN 'failed'
    ELSE product_image_status
  END,
  thumbnail_status = CASE media_status
    WHEN 'sent' THEN 'sent'
    WHEN 'skipped' THEN 'skipped'
    WHEN 'failed' THEN 'failed'
    ELSE thumbnail_status
  END
WHERE media_status IN ('sent', 'skipped', 'failed');

GRANT SELECT (
  product_image_status, thumbnail_status, product_image_message_id, thumbnail_message_id
) ON TABLE public.whatsapp_product_publication_targets TO authenticated;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'storage') THEN
    UPDATE storage.buckets
    SET allowed_mime_types = ARRAY['video/mp4', 'video/webm', 'image/jpeg', 'image/webp']::text[]
    WHERE id IN ('agroproduct-temp-videos', 'agroproduct-media');
  END IF;
END $$;
