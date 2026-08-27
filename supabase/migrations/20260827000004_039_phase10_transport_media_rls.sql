-- Phase 10 follow-up: vehicle video column + clearer transport RLS

ALTER TABLE public.transport_services
  ADD COLUMN IF NOT EXISTS vehicle_video_url TEXT;

-- Replace the single FOR ALL policy with explicit per-command policies so
-- providers can insert/read/update their own drafts reliably.
DROP POLICY IF EXISTS "Providers manage own transport services" ON public.transport_services;

DROP POLICY IF EXISTS "Providers read own transport services" ON public.transport_services;
CREATE POLICY "Providers read own transport services" ON public.transport_services
  FOR SELECT USING (
    provider_id IN (
      SELECT pp.id FROM public.provider_profiles pp
      JOIN public.profiles p ON p.id = pp.profile_id
      WHERE p.clerk_user_id = auth.jwt() ->> 'sub'
    )
  );

DROP POLICY IF EXISTS "Providers insert own transport services" ON public.transport_services;
CREATE POLICY "Providers insert own transport services" ON public.transport_services
  FOR INSERT WITH CHECK (
    provider_id IN (
      SELECT pp.id FROM public.provider_profiles pp
      JOIN public.profiles p ON p.id = pp.profile_id
      WHERE p.clerk_user_id = auth.jwt() ->> 'sub'
    )
  );

DROP POLICY IF EXISTS "Providers update own transport services" ON public.transport_services;
CREATE POLICY "Providers update own transport services" ON public.transport_services
  FOR UPDATE USING (
    provider_id IN (
      SELECT pp.id FROM public.provider_profiles pp
      JOIN public.profiles p ON p.id = pp.profile_id
      WHERE p.clerk_user_id = auth.jwt() ->> 'sub'
    )
  )
  WITH CHECK (
    provider_id IN (
      SELECT pp.id FROM public.provider_profiles pp
      JOIN public.profiles p ON p.id = pp.profile_id
      WHERE p.clerk_user_id = auth.jwt() ->> 'sub'
    )
  );

DROP POLICY IF EXISTS "Providers delete own transport services" ON public.transport_services;
CREATE POLICY "Providers delete own transport services" ON public.transport_services
  FOR DELETE USING (
    provider_id IN (
      SELECT pp.id FROM public.provider_profiles pp
      JOIN public.profiles p ON p.id = pp.profile_id
      WHERE p.clerk_user_id = auth.jwt() ->> 'sub'
    )
  );
