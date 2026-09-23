-- AgriAcademy Phase 1: lesson uploaded video (private Supabase Storage, no transcoding)

ALTER TABLE public.course_lessons
  ADD COLUMN IF NOT EXISTS video_source TEXT NOT NULL DEFAULT 'youtube'
    CHECK (video_source IN ('youtube', 'upload'));

ALTER TABLE public.course_lessons
  ADD COLUMN IF NOT EXISTS upload_storage_path TEXT,
  ADD COLUMN IF NOT EXISTS upload_original_filename TEXT,
  ADD COLUMN IF NOT EXISTS upload_original_size BIGINT,
  ADD COLUMN IF NOT EXISTS upload_original_mime_type TEXT,
  ADD COLUMN IF NOT EXISTS upload_status TEXT
    CHECK (upload_status IS NULL OR upload_status IN ('uploading', 'ready', 'failed'));

COMMENT ON COLUMN public.course_lessons.video_source IS 'Active lesson video: youtube or upload';
COMMENT ON COLUMN public.course_lessons.upload_storage_path IS 'Private academy-videos object path when video_source=upload';

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'storage') THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'academy-videos',
      'academy-videos',
      false,
      524288000,
      ARRAY['video/mp4', 'video/webm', 'video/quicktime']::text[]
    )
    ON CONFLICT (id) DO UPDATE SET
      public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;
  END IF;
END $$;

-- Instructors manage objects under paths for courses they own ({owner_id}/{course_id}/{lesson_id}/...)
DROP POLICY IF EXISTS "Academy instructors upload lesson videos" ON storage.objects;
CREATE POLICY "Academy instructors upload lesson videos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'academy-videos'
    AND EXISTS (
      SELECT 1
      FROM public.course_lessons cl
      JOIN public.courses c ON c.id = cl.course_id
      JOIN public.profiles p ON p.id = c.owner_id
      WHERE p.clerk_user_id = public.current_clerk_user_id()
        AND (storage.foldername(name))[1] = p.id::text
        AND (storage.foldername(name))[2] = cl.course_id::text
        AND (storage.foldername(name))[3] = cl.id::text
    )
  );

DROP POLICY IF EXISTS "Academy instructors update own lesson videos" ON storage.objects;
CREATE POLICY "Academy instructors update own lesson videos" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'academy-videos'
    AND EXISTS (
      SELECT 1
      FROM public.course_lessons cl
      JOIN public.courses c ON c.id = cl.course_id
      JOIN public.profiles p ON p.id = c.owner_id
      WHERE p.clerk_user_id = public.current_clerk_user_id()
        AND (storage.foldername(name))[1] = p.id::text
        AND (storage.foldername(name))[2] = cl.course_id::text
        AND (storage.foldername(name))[3] = cl.id::text
    )
  );

DROP POLICY IF EXISTS "Academy instructors delete own lesson videos" ON storage.objects;
CREATE POLICY "Academy instructors delete own lesson videos" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'academy-videos'
    AND EXISTS (
      SELECT 1
      FROM public.course_lessons cl
      JOIN public.courses c ON c.id = cl.course_id
      JOIN public.profiles p ON p.id = c.owner_id
      WHERE p.clerk_user_id = public.current_clerk_user_id()
        AND (storage.foldername(name))[1] = p.id::text
        AND (storage.foldername(name))[2] = cl.course_id::text
        AND (storage.foldername(name))[3] = cl.id::text
    )
  );

-- No broad SELECT on storage.objects for students; playback uses server-signed URLs.
