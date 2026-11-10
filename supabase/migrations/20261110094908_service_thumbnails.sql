-- Private storage for an AgriExpert service thumbnail generated with OpenAI.
-- The saved image is recorded in media_assets as service_image. Pending previews stay in this bucket until the owner saves or cancels.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'storage') THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'service-thumbnails',
      'service-thumbnails',
      false,
      5242880,
      ARRAY['image/jpeg']::text[]
    )
    ON CONFLICT (id) DO UPDATE SET
      public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;
  END IF;
END $$;

DROP POLICY IF EXISTS "Service owners read service thumbnails" ON storage.objects;
CREATE POLICY "Service owners read service thumbnails" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'service-thumbnails'
    AND EXISTS (
      SELECT 1
      FROM public.services s
      JOIN public.provider_profiles pp ON pp.id = s.provider_id
      JOIN public.profiles p ON p.id = pp.profile_id
      WHERE p.clerk_user_id = public.current_clerk_user_id()
        AND (storage.foldername(name))[1] IN ('pending', p.id::text)
        AND (
          ((storage.foldername(name))[1] = 'pending' AND (storage.foldername(name))[2] = p.id::text AND (storage.foldername(name))[3] = s.id::text)
          OR ((storage.foldername(name))[1] = p.id::text AND (storage.foldername(name))[2] = s.id::text)
        )
    )
  );
