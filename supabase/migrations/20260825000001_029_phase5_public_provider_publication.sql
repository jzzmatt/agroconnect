-- Phase 5: public provider publication lifecycle.
-- AgriProfile owns public provider identity. profiles remains private identity.
-- Nothing auto-publishes: existing rows receive draft.

ALTER TABLE public.provider_profiles
  ADD COLUMN IF NOT EXISTS publication_state TEXT NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS paused_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;

ALTER TABLE public.provider_profiles
  DROP CONSTRAINT IF EXISTS provider_profiles_publication_state_check;

ALTER TABLE public.provider_profiles
  ADD CONSTRAINT provider_profiles_publication_state_check
  CHECK (publication_state IN ('draft', 'published', 'paused'));

COMMENT ON COLUMN public.provider_profiles.publication_state IS
  'Public discovery state independent of profiles.status. Default draft. Never auto-publish.';

CREATE INDEX IF NOT EXISTS idx_provider_profiles_publication_state
  ON public.provider_profiles (publication_state);

CREATE INDEX IF NOT EXISTS idx_provider_profiles_published_slug
  ON public.provider_profiles (slug)
  WHERE publication_state = 'published';

DROP POLICY IF EXISTS "Public read active providers" ON public.provider_profiles;
CREATE POLICY "Public read published providers"
  ON public.provider_profiles
  FOR SELECT
  USING (publication_state = 'published');

-- Stop leaking private profile fields (email, subscription_plan, clerk ids) to anon.
DROP POLICY IF EXISTS "Public read active profiles" ON public.profiles;

-- Stop unfiltered public reads of every media row. Product/service/course media
-- stay publicly readable. Profile avatars are public only when the provider is published.
DROP POLICY IF EXISTS "Public read media assets" ON public.media_assets;
CREATE POLICY "Public read published profile avatars"
  ON public.media_assets
  FOR SELECT
  USING (
    entity_type = 'profile_avatar'
    AND owner_profile_id IN (
      SELECT profile_id
      FROM public.provider_profiles
      WHERE publication_state = 'published'
    )
  );
CREATE POLICY "Public read non-profile media assets"
  ON public.media_assets
  FOR SELECT
  USING (entity_type IS DISTINCT FROM 'profile_avatar');
