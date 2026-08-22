-- ==============================================================================
-- AGROCONNECT — Phase 9.5: Migration 019
-- Stabilization + Globalization + Video Infrastructure Preparation
-- 1. Authoritative subscription timestamps
-- 2. Market country profile (independent from UI language and physical location)
-- 3. AgriAcademy video metadata (Bunny) + storage accounting
-- 4. Product images
-- 5. Enterprise custom payment gateway service requests
-- ==============================================================================

-- 1. Profile: market country, locale preference, video storage usage, subscription audit
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS market_country_code CHAR(2) NOT NULL DEFAULT 'AO';

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS video_storage_used_bytes BIGINT NOT NULL DEFAULT 0 CHECK (video_storage_used_bytes >= 0);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS subscription_updated_at TIMESTAMPTZ;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS preferred_language TEXT NOT NULL DEFAULT 'pt';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_preferred_language_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_preferred_language_check
      CHECK (preferred_language IN ('pt', 'en', 'fr'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_profiles_market_country ON public.profiles(market_country_code);
CREATE INDEX IF NOT EXISTS idx_profiles_preferred_language ON public.profiles(preferred_language);

-- 2. Country market configuration (ISO codes already exist; extend payment + locale defaults)
ALTER TABLE public.countries
  ADD COLUMN IF NOT EXISTS default_locale TEXT NOT NULL DEFAULT 'pt';

ALTER TABLE public.countries
  ADD COLUMN IF NOT EXISTS payment_methods JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.countries
  ADD COLUMN IF NOT EXISTS is_market_active BOOLEAN NOT NULL DEFAULT true;

UPDATE public.countries SET
  default_locale = 'pt',
  payment_methods = '["multicaixa_online"]'::jsonb,
  currency_code = 'AOA',
  currency_symbol = 'Kz'
WHERE code = 'AO';

INSERT INTO public.countries (name, slug, code, code3, currency_code, currency_symbol, phone_code, default_locale, payment_methods, is_market_active, latitude, longitude)
VALUES
  ('França', 'franca', 'FR', 'FRA', 'EUR', '€', '+33', 'fr', '["card"]'::jsonb, true, 46.2276380, 2.2137490),
  ('Portugal', 'portugal', 'PT', 'PRT', 'EUR', '€', '+351', 'pt', '["card"]'::jsonb, true, 39.3998720, -8.2244540),
  ('Estados Unidos', 'estados-unidos', 'US', 'USA', 'USD', '$', '+1', 'en', '["card"]'::jsonb, true, 37.0902400, -95.7128910),
  ('Reino Unido', 'reino-unido', 'GB', 'GBR', 'GBP', '£', '+44', 'en', '["card"]'::jsonb, true, 55.3780510, -3.4359730)
ON CONFLICT (code) DO UPDATE SET
  default_locale = EXCLUDED.default_locale,
  payment_methods = EXCLUDED.payment_methods,
  currency_code = EXCLUDED.currency_code,
  currency_symbol = EXCLUDED.currency_symbol,
  is_market_active = EXCLUDED.is_market_active;

-- 3. Product images (object-storage metadata; binaries are not stored in PostgreSQL)
CREATE TABLE IF NOT EXISTS public.product_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  storage_provider TEXT NOT NULL DEFAULT 'local' CHECK (
    storage_provider IN ('cloudflare_r2', 'cloudflare_stream', 'supabase_storage', 'local', 'external', 'bunny_stream')
  ),
  storage_path TEXT NOT NULL,
  url TEXT NOT NULL,
  alt_text TEXT,
  mime_type TEXT NOT NULL CHECK (mime_type IN ('image/jpeg', 'image/png', 'image/webp')),
  file_size BIGINT NOT NULL DEFAULT 0 CHECK (file_size >= 0),
  width INTEGER,
  height INTEGER,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_product_images_product ON public.product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_product_images_owner ON public.product_images(owner_id);
CREATE INDEX IF NOT EXISTS idx_product_images_primary ON public.product_images(product_id, is_primary);

DROP TRIGGER IF EXISTS tr_product_images_updated_at ON public.product_images;
CREATE TRIGGER tr_product_images_updated_at BEFORE UPDATE ON public.product_images FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS primary_image_url TEXT;

-- 4. AgriAcademy videos — Bunny metadata only (no binary in Supabase)
CREATE TABLE IF NOT EXISTS public.academy_videos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_id UUID,
  chapter_id UUID,
  bunny_video_id TEXT,
  bunny_library_id TEXT,
  title TEXT NOT NULL,
  description TEXT,
  filename TEXT,
  mime_type TEXT,
  file_size BIGINT NOT NULL DEFAULT 0 CHECK (file_size >= 0),
  duration_seconds INTEGER,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'uploading', 'processing', 'ready', 'failed', 'deleted', 'video_unavailable')
  ),
  visibility TEXT NOT NULL DEFAULT 'private' CHECK (
    visibility IN ('private', 'unlisted', 'public', 'enrolled_only')
  ),
  thumbnail_url TEXT,
  playback_url TEXT,
  upload_authorization_expires_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_academy_videos_owner ON public.academy_videos(owner_id);
CREATE INDEX IF NOT EXISTS idx_academy_videos_course ON public.academy_videos(course_id);
CREATE INDEX IF NOT EXISTS idx_academy_videos_bunny ON public.academy_videos(bunny_video_id);
CREATE INDEX IF NOT EXISTS idx_academy_videos_status ON public.academy_videos(status);

DROP TRIGGER IF EXISTS tr_academy_videos_updated_at ON public.academy_videos;
CREATE TRIGGER tr_academy_videos_updated_at BEFORE UPDATE ON public.academy_videos FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 5. Enterprise custom payment gateway setup — SELLING SERVICE (not a subscription feature)
CREATE TABLE IF NOT EXISTS public.enterprise_service_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  service_code TEXT NOT NULL DEFAULT 'custom_payment_gateway_setup',
  title TEXT NOT NULL DEFAULT 'Configuração personalizada de gateway de pagamento',
  message TEXT,
  status TEXT NOT NULL DEFAULT 'requested' CHECK (
    status IN ('requested', 'in_review', 'quoted', 'in_progress', 'completed', 'cancelled')
  ),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_enterprise_service_requests_profile ON public.enterprise_service_requests(profile_id);
CREATE INDEX IF NOT EXISTS idx_enterprise_service_requests_status ON public.enterprise_service_requests(status);

DROP TRIGGER IF EXISTS tr_enterprise_service_requests_updated_at ON public.enterprise_service_requests;
CREATE TRIGGER tr_enterprise_service_requests_updated_at BEFORE UPDATE ON public.enterprise_service_requests FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 6. Authoritative plan activation RPC (server-side only; users cannot UPDATE subscription_plan directly)
CREATE OR REPLACE FUNCTION public.activate_user_subscription_plan(
  p_clerk_user_id TEXT,
  p_plan TEXT
)
RETURNS TEXT AS $$
DECLARE
  v_normalized_plan TEXT;
BEGIN
  v_normalized_plan := CASE
    WHEN lower(p_plan) IN ('basic', 'basico', 'free') THEN 'basic'
    WHEN lower(p_plan) IN ('professional', 'profissional', 'pro') THEN 'professional'
    WHEN lower(p_plan) IN ('business') THEN 'business'
    WHEN lower(p_plan) IN ('enterprise', 'empresarial', 'premium') THEN 'enterprise'
    ELSE NULL
  END;

  IF v_normalized_plan IS NULL THEN
    RAISE EXCEPTION 'Plano de subscrição inválido.';
  END IF;

  UPDATE public.profiles
  SET subscription_plan = v_normalized_plan,
      subscription_updated_at = timezone('utc'::text, now()),
      updated_at = timezone('utc'::text, now())
  WHERE clerk_user_id = p_clerk_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Perfil não encontrado.';
  END IF;

  RETURN v_normalized_plan;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. RLS
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enterprise_service_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners manage own product images" ON public.product_images;
CREATE POLICY "Owners manage own product images" ON public.product_images FOR ALL
  USING (owner_id IN (SELECT id FROM public.profiles WHERE clerk_user_id = public.current_clerk_user_id()))
  WITH CHECK (owner_id IN (SELECT id FROM public.profiles WHERE clerk_user_id = public.current_clerk_user_id()));

DROP POLICY IF EXISTS "Public read product images" ON public.product_images;
CREATE POLICY "Public read product images" ON public.product_images FOR SELECT USING (true);

DROP POLICY IF EXISTS "Owners manage own academy videos" ON public.academy_videos;
CREATE POLICY "Owners manage own academy videos" ON public.academy_videos FOR ALL
  USING (owner_id IN (SELECT id FROM public.profiles WHERE clerk_user_id = public.current_clerk_user_id()))
  WITH CHECK (owner_id IN (SELECT id FROM public.profiles WHERE clerk_user_id = public.current_clerk_user_id()));

DROP POLICY IF EXISTS "Users manage own enterprise service requests" ON public.enterprise_service_requests;
CREATE POLICY "Users manage own enterprise service requests" ON public.enterprise_service_requests FOR ALL
  USING (profile_id IN (SELECT id FROM public.profiles WHERE clerk_user_id = public.current_clerk_user_id()))
  WITH CHECK (profile_id IN (SELECT id FROM public.profiles WHERE clerk_user_id = public.current_clerk_user_id()));

-- Users cannot UPDATE their own subscription_plan via client RLS (server/RPC only)
DROP POLICY IF EXISTS "Users cannot self-update subscription" ON public.profiles;

COMMENT ON TABLE public.academy_videos IS 'AgriAcademy video metadata. Binary media lives on Bunny Stream/CDN, not in PostgreSQL.';
COMMENT ON TABLE public.product_images IS 'Product image metadata. Binary media lives in object storage, not in PostgreSQL.';
-- 8. Allow Multicaixa Online as a payment method code (no fake live charges)
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_payment_method_check;
ALTER TABLE public.payments ADD CONSTRAINT payments_payment_method_check CHECK (
  payment_method IN ('card', 'bank_transfer', 'mobile_money', 'cash_on_delivery', 'mock_sandbox', 'multicaixa_online')
);
