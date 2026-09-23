-- Product, transport, and profile media in private Supabase Storage (ImageKit legacy URLs remain valid)

-- product_videos: Supabase upload path
ALTER TABLE public.product_videos
  ADD COLUMN IF NOT EXISTS upload_storage_path TEXT;

ALTER TABLE public.product_videos DROP CONSTRAINT IF EXISTS product_videos_provider_check;
ALTER TABLE public.product_videos ADD CONSTRAINT product_videos_provider_check CHECK (
  provider IN ('imagekit', 'bunny_stream', 'supabase_storage')
);

COMMENT ON COLUMN public.product_videos.upload_storage_path IS 'Private product-media object path when provider=supabase_storage';

-- transport_services: storage paths (URLs kept for legacy ImageKit)
ALTER TABLE public.transport_services
  ADD COLUMN IF NOT EXISTS vehicle_image_storage_path TEXT,
  ADD COLUMN IF NOT EXISTS vehicle_video_storage_path TEXT;

COMMENT ON COLUMN public.transport_services.vehicle_image_storage_path IS 'Private transport-media image path';
COMMENT ON COLUMN public.transport_services.vehicle_video_storage_path IS 'Private transport-media video path';

-- profiles: avatar storage path
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_storage_path TEXT,
  ADD COLUMN IF NOT EXISTS avatar_mime_type TEXT,
  ADD COLUMN IF NOT EXISTS avatar_size BIGINT;

COMMENT ON COLUMN public.profiles.avatar_storage_path IS 'Private profile-media avatar path; avatar_url legacy or display cache only';

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'storage') THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES
      (
        'product-media',
        'product-media',
        false,
        41943040,
        ARRAY['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime']::text[]
      ),
      (
        'transport-media',
        'transport-media',
        false,
        41943040,
        ARRAY['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime']::text[]
      ),
      (
        'profile-media',
        'profile-media',
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

-- Product media: owner path {profile_id}/{product_id}/...
DROP POLICY IF EXISTS "Product owners upload product media" ON storage.objects;
CREATE POLICY "Product owners upload product media" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'product-media'
    AND EXISTS (
      SELECT 1
      FROM public.products pr
      JOIN public.profiles p ON p.id = pr.seller_id
      WHERE p.clerk_user_id = public.current_clerk_user_id()
        AND (storage.foldername(name))[1] = p.id::text
        AND (storage.foldername(name))[2] = pr.id::text
    )
  );

DROP POLICY IF EXISTS "Product owners update product media" ON storage.objects;
CREATE POLICY "Product owners update product media" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'product-media'
    AND EXISTS (
      SELECT 1
      FROM public.products pr
      JOIN public.profiles p ON p.id = pr.seller_id
      WHERE p.clerk_user_id = public.current_clerk_user_id()
        AND (storage.foldername(name))[1] = p.id::text
        AND (storage.foldername(name))[2] = pr.id::text
    )
  );

DROP POLICY IF EXISTS "Product owners delete product media" ON storage.objects;
CREATE POLICY "Product owners delete product media" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'product-media'
    AND EXISTS (
      SELECT 1
      FROM public.products pr
      JOIN public.profiles p ON p.id = pr.seller_id
      WHERE p.clerk_user_id = public.current_clerk_user_id()
        AND (storage.foldername(name))[1] = p.id::text
        AND (storage.foldername(name))[2] = pr.id::text
    )
  );

-- Transport: {profile_id}/{transport_id}/...
DROP POLICY IF EXISTS "Transport owners upload transport media" ON storage.objects;
CREATE POLICY "Transport owners upload transport media" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'transport-media'
    AND EXISTS (
      SELECT 1
      FROM public.transport_services ts
      JOIN public.provider_profiles pp ON pp.id = ts.provider_id
      JOIN public.profiles p ON p.id = pp.profile_id
      WHERE p.clerk_user_id = public.current_clerk_user_id()
        AND (storage.foldername(name))[1] = p.id::text
        AND (storage.foldername(name))[2] = ts.id::text
    )
  );

DROP POLICY IF EXISTS "Transport owners update transport media" ON storage.objects;
CREATE POLICY "Transport owners update transport media" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'transport-media'
    AND EXISTS (
      SELECT 1
      FROM public.transport_services ts
      JOIN public.provider_profiles pp ON pp.id = ts.provider_id
      JOIN public.profiles p ON p.id = pp.profile_id
      WHERE p.clerk_user_id = public.current_clerk_user_id()
        AND (storage.foldername(name))[1] = p.id::text
        AND (storage.foldername(name))[2] = ts.id::text
    )
  );

DROP POLICY IF EXISTS "Transport owners delete transport media" ON storage.objects;
CREATE POLICY "Transport owners delete transport media" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'transport-media'
    AND EXISTS (
      SELECT 1
      FROM public.transport_services ts
      JOIN public.provider_profiles pp ON pp.id = ts.provider_id
      JOIN public.profiles p ON p.id = pp.profile_id
      WHERE p.clerk_user_id = public.current_clerk_user_id()
        AND (storage.foldername(name))[1] = p.id::text
        AND (storage.foldername(name))[2] = ts.id::text
    )
  );

-- Profile avatar: {profile_id}/avatar/...
DROP POLICY IF EXISTS "Profile owners upload profile media" ON storage.objects;
CREATE POLICY "Profile owners upload profile media" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'profile-media'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.clerk_user_id = public.current_clerk_user_id()
        AND (storage.foldername(name))[1] = p.id::text
    )
  );

DROP POLICY IF EXISTS "Profile owners update profile media" ON storage.objects;
CREATE POLICY "Profile owners update profile media" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'profile-media'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.clerk_user_id = public.current_clerk_user_id()
        AND (storage.foldername(name))[1] = p.id::text
    )
  );

DROP POLICY IF EXISTS "Profile owners delete profile media" ON storage.objects;
CREATE POLICY "Profile owners delete profile media" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'profile-media'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.clerk_user_id = public.current_clerk_user_id()
        AND (storage.foldername(name))[1] = p.id::text
    )
  );
