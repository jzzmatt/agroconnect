-- AgriAcademy Phase 1.1: private course thumbnail storage (no image processing)

ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS thumbnail_storage_path TEXT,
  ADD COLUMN IF NOT EXISTS thumbnail_original_filename TEXT,
  ADD COLUMN IF NOT EXISTS thumbnail_mime_type TEXT,
  ADD COLUMN IF NOT EXISTS thumbnail_size BIGINT;

COMMENT ON COLUMN public.courses.thumbnail_storage_path IS 'Private academy-course-thumbnails object path; source of truth for course cover';
COMMENT ON COLUMN public.courses.thumbnail_url IS 'Legacy/external URL only; new uploads use thumbnail_storage_path + signed URLs';

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'storage') THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'academy-course-thumbnails',
      'academy-course-thumbnails',
      false,
      5242880,
      ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
    )
    ON CONFLICT (id) DO UPDATE SET
      public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;
  END IF;
END $$;

DROP POLICY IF EXISTS "Academy owners upload course thumbnails" ON storage.objects;
CREATE POLICY "Academy owners upload course thumbnails" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'academy-course-thumbnails'
    AND EXISTS (
      SELECT 1
      FROM public.courses c
      JOIN public.profiles p ON p.id = c.owner_id
      WHERE p.clerk_user_id = public.current_clerk_user_id()
        AND (storage.foldername(name))[1] = p.id::text
        AND (storage.foldername(name))[2] = c.id::text
    )
  );

DROP POLICY IF EXISTS "Academy owners update course thumbnails" ON storage.objects;
CREATE POLICY "Academy owners update course thumbnails" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'academy-course-thumbnails'
    AND EXISTS (
      SELECT 1
      FROM public.courses c
      JOIN public.profiles p ON p.id = c.owner_id
      WHERE p.clerk_user_id = public.current_clerk_user_id()
        AND (storage.foldername(name))[1] = p.id::text
        AND (storage.foldername(name))[2] = c.id::text
    )
  );

DROP POLICY IF EXISTS "Academy owners delete course thumbnails" ON storage.objects;
CREATE POLICY "Academy owners delete course thumbnails" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'academy-course-thumbnails'
    AND EXISTS (
      SELECT 1
      FROM public.courses c
      JOIN public.profiles p ON p.id = c.owner_id
      WHERE p.clerk_user_id = public.current_clerk_user_id()
        AND (storage.foldername(name))[1] = p.id::text
        AND (storage.foldername(name))[2] = c.id::text
    )
  );
