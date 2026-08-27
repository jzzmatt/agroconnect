-- ==============================================================================
-- AGROCONNECT — Phase 10: Transport domain (AgriService)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.transport_services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id UUID NOT NULL REFERENCES public.provider_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  short_description TEXT,
  description TEXT,
  origin_label TEXT,
  destination_label TEXT,
  origin_province_id UUID REFERENCES public.provinces(id) ON DELETE SET NULL,
  origin_municipality_id UUID REFERENCES public.municipalities(id) ON DELETE SET NULL,
  origin_latitude NUMERIC(10, 7),
  origin_longitude NUMERIC(10, 7),
  origin_location GEOGRAPHY(Point, 4326),
  destination_province_id UUID REFERENCES public.provinces(id) ON DELETE SET NULL,
  destination_municipality_id UUID REFERENCES public.municipalities(id) ON DELETE SET NULL,
  destination_latitude NUMERIC(10, 7),
  destination_longitude NUMERIC(10, 7),
  destination_location GEOGRAPHY(Point, 4326),
  vehicle_name TEXT NOT NULL,
  vehicle_type TEXT,
  vehicle_model TEXT,
  capacity_load TEXT,
  vehicle_media_url TEXT,
  base_province_id UUID REFERENCES public.provinces(id) ON DELETE SET NULL,
  base_municipality_id UUID REFERENCES public.municipalities(id) ON DELETE SET NULL,
  base_latitude NUMERIC(10, 7),
  base_longitude NUMERIC(10, 7),
  base_location GEOGRAPHY(Point, 4326),
  price_per_trip NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  price_per_load NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  currency TEXT NOT NULL DEFAULT 'AOA',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (
    status IN ('draft', 'published', 'paused', 'archived')
  ),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_transport_services_provider_id ON public.transport_services(provider_id);
CREATE INDEX IF NOT EXISTS idx_transport_services_slug ON public.transport_services(slug);
CREATE INDEX IF NOT EXISTS idx_transport_services_status ON public.transport_services(status);
CREATE INDEX IF NOT EXISTS idx_transport_services_base_location ON public.transport_services USING GIST (base_location);

DROP TRIGGER IF EXISTS tr_transport_services_updated_at ON public.transport_services;
CREATE TRIGGER tr_transport_services_updated_at
  BEFORE UPDATE ON public.transport_services
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TABLE IF NOT EXISTS public.transport_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  provider_id UUID NOT NULL REFERENCES public.provider_profiles(id) ON DELETE RESTRICT,
  transport_service_id UUID REFERENCES public.transport_services(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'accepted', 'rejected', 'cancelled')
  ),
  message TEXT,
  origin_notes TEXT,
  destination_notes TEXT,
  requested_date TIMESTAMPTZ,
  estimated_trip_price NUMERIC(12, 2),
  estimated_load_price NUMERIC(12, 2),
  currency TEXT NOT NULL DEFAULT 'AOA',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_transport_requests_customer ON public.transport_requests(customer_id);
CREATE INDEX IF NOT EXISTS idx_transport_requests_provider ON public.transport_requests(provider_id);
CREATE INDEX IF NOT EXISTS idx_transport_requests_status ON public.transport_requests(status);
CREATE INDEX IF NOT EXISTS idx_transport_requests_service ON public.transport_requests(transport_service_id);

DROP TRIGGER IF EXISTS tr_transport_requests_updated_at ON public.transport_requests;
CREATE TRIGGER tr_transport_requests_updated_at
  BEFORE UPDATE ON public.transport_requests
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- RLS
ALTER TABLE public.transport_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transport_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read published transport services" ON public.transport_services;
CREATE POLICY "Public read published transport services" ON public.transport_services
  FOR SELECT USING (status = 'published');

DROP POLICY IF EXISTS "Providers manage own transport services" ON public.transport_services;
CREATE POLICY "Providers manage own transport services" ON public.transport_services
  FOR ALL USING (
    provider_id IN (
      SELECT pp.id FROM public.provider_profiles pp
      JOIN public.profiles p ON p.id = pp.profile_id
      WHERE p.clerk_user_id = auth.jwt() ->> 'sub'
    )
  );

DROP POLICY IF EXISTS "Customers read own transport requests" ON public.transport_requests;
CREATE POLICY "Customers read own transport requests" ON public.transport_requests
  FOR SELECT USING (
    customer_id IN (
      SELECT id FROM public.profiles WHERE clerk_user_id = auth.jwt() ->> 'sub'
    )
  );

DROP POLICY IF EXISTS "Providers read received transport requests" ON public.transport_requests;
CREATE POLICY "Providers read received transport requests" ON public.transport_requests
  FOR SELECT USING (
    provider_id IN (
      SELECT pp.id FROM public.provider_profiles pp
      JOIN public.profiles p ON p.id = pp.profile_id
      WHERE p.clerk_user_id = auth.jwt() ->> 'sub'
    )
  );

DROP POLICY IF EXISTS "Customers create transport requests" ON public.transport_requests;
CREATE POLICY "Customers create transport requests" ON public.transport_requests
  FOR INSERT WITH CHECK (
    customer_id IN (
      SELECT id FROM public.profiles WHERE clerk_user_id = auth.jwt() ->> 'sub'
    )
  );

DROP POLICY IF EXISTS "Participants update transport requests" ON public.transport_requests;
CREATE POLICY "Participants update transport requests" ON public.transport_requests
  FOR UPDATE USING (
    customer_id IN (
      SELECT id FROM public.profiles WHERE clerk_user_id = auth.jwt() ->> 'sub'
    )
    OR provider_id IN (
      SELECT pp.id FROM public.provider_profiles pp
      JOIN public.profiles p ON p.id = pp.profile_id
      WHERE p.clerk_user_id = auth.jwt() ->> 'sub'
    )
  );
