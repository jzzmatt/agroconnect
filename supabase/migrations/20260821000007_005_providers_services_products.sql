-- ==============================================================================
-- AGROCONNECT — Phase 3: Migration 005 - Providers, Services, Products & Agricultural Resources
-- ==============================================================================

-- 1. Provider Profiles Table
CREATE TABLE IF NOT EXISTS public.provider_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  provider_type TEXT NOT NULL DEFAULT 'individual' CHECK (
    provider_type IN ('individual', 'company', 'cooperative', 'organization', 'technician', 'veterinarian', 'agronomist', 'instructor', 'supplier')
  ),
  business_name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  headline TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  tax_id TEXT, -- NIF Angola
  verification_status TEXT NOT NULL DEFAULT 'unverified' CHECK (
    verification_status IN ('unverified', 'pending', 'verified', 'rejected')
  ),
  status TEXT NOT NULL DEFAULT 'active' CHECK (
    status IN ('active', 'inactive', 'suspended')
  ),
  rating NUMERIC(3, 2) DEFAULT 5.00,
  reviews_count INTEGER DEFAULT 0,
  country_id UUID REFERENCES public.countries(id) ON DELETE SET NULL,
  province_id UUID REFERENCES public.provinces(id) ON DELETE SET NULL,
  municipality_id UUID REFERENCES public.municipalities(id) ON DELETE SET NULL,
  latitude NUMERIC(10, 7),
  longitude NUMERIC(10, 7),
  location GEOGRAPHY(Point, 4326),
  service_radius_km NUMERIC(6, 2) DEFAULT 50.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT uq_provider_profile UNIQUE (profile_id)
);

CREATE INDEX IF NOT EXISTS idx_provider_profiles_profile_id ON public.provider_profiles(profile_id);
CREATE INDEX IF NOT EXISTS idx_provider_profiles_slug ON public.provider_profiles(slug);
CREATE INDEX IF NOT EXISTS idx_provider_profiles_status ON public.provider_profiles(status);
CREATE INDEX IF NOT EXISTS idx_provider_profiles_verification ON public.provider_profiles(verification_status);
CREATE INDEX IF NOT EXISTS idx_provider_profiles_province_id ON public.provider_profiles(province_id);
CREATE INDEX IF NOT EXISTS idx_provider_profiles_location ON public.provider_profiles USING GIST (location);

DROP TRIGGER IF EXISTS tr_provider_profiles_updated_at ON public.provider_profiles;
CREATE TRIGGER tr_provider_profiles_updated_at BEFORE UPDATE ON public.provider_profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS tr_provider_profiles_spatial_sync ON public.provider_profiles;
CREATE TRIGGER tr_provider_profiles_spatial_sync BEFORE INSERT OR UPDATE ON public.provider_profiles FOR EACH ROW EXECUTE FUNCTION public.sync_geography_point();

-- 2. Services Table (AgriExpert & Platform Services)
CREATE TABLE IF NOT EXISTS public.services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id UUID NOT NULL REFERENCES public.provider_profiles(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  short_description TEXT,
  description TEXT,
  pricing_type TEXT NOT NULL DEFAULT 'hourly' CHECK (
    pricing_type IN ('fixed', 'starting_from', 'hourly', 'daily', 'quotation', 'free')
  ),
  price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  currency TEXT NOT NULL DEFAULT 'AOA',
  country_id UUID REFERENCES public.countries(id) ON DELETE SET NULL,
  province_id UUID REFERENCES public.provinces(id) ON DELETE SET NULL,
  municipality_id UUID REFERENCES public.municipalities(id) ON DELETE SET NULL,
  latitude NUMERIC(10, 7),
  longitude NUMERIC(10, 7),
  location GEOGRAPHY(Point, 4326),
  service_radius_km NUMERIC(6, 2) DEFAULT 50.00,
  status TEXT NOT NULL DEFAULT 'active' CHECK (
    status IN ('draft', 'active', 'paused', 'archived')
  ),
  is_featured BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_services_provider_id ON public.services(provider_id);
CREATE INDEX IF NOT EXISTS idx_services_category_id ON public.services(category_id);
CREATE INDEX IF NOT EXISTS idx_services_slug ON public.services(slug);
CREATE INDEX IF NOT EXISTS idx_services_status ON public.services(status);
CREATE INDEX IF NOT EXISTS idx_services_province_id ON public.services(province_id);
CREATE INDEX IF NOT EXISTS idx_services_location ON public.services USING GIST (location);

DROP TRIGGER IF EXISTS tr_services_updated_at ON public.services;
CREATE TRIGGER tr_services_updated_at BEFORE UPDATE ON public.services FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS tr_services_spatial_sync ON public.services;
CREATE TRIGGER tr_services_spatial_sync BEFORE INSERT OR UPDATE ON public.services FOR EACH ROW EXECUTE FUNCTION public.sync_geography_point();

-- 3. Products Table (AgriShopping)
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id UUID NOT NULL REFERENCES public.provider_profiles(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  condition TEXT NOT NULL DEFAULT 'new' CHECK (
    condition IN ('new', 'used', 'refurbished')
  ),
  price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  currency TEXT NOT NULL DEFAULT 'AOA',
  quantity INTEGER NOT NULL DEFAULT 1,
  unit TEXT NOT NULL DEFAULT 'unidade', -- e.g. 'unidade', 'kg', 'saco 50kg', 'litro', 'tonelada'
  sku TEXT,
  country_id UUID REFERENCES public.countries(id) ON DELETE SET NULL,
  province_id UUID REFERENCES public.provinces(id) ON DELETE SET NULL,
  municipality_id UUID REFERENCES public.municipalities(id) ON DELETE SET NULL,
  latitude NUMERIC(10, 7),
  longitude NUMERIC(10, 7),
  location GEOGRAPHY(Point, 4326),
  status TEXT NOT NULL DEFAULT 'active' CHECK (
    status IN ('draft', 'active', 'out_of_stock', 'archived')
  ),
  is_featured BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_products_seller_id ON public.products(seller_id);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_slug ON public.products(slug);
CREATE INDEX IF NOT EXISTS idx_products_status ON public.products(status);
CREATE INDEX IF NOT EXISTS idx_products_province_id ON public.products(province_id);
CREATE INDEX IF NOT EXISTS idx_products_location ON public.products USING GIST (location);

DROP TRIGGER IF EXISTS tr_products_updated_at ON public.products;
CREATE TRIGGER tr_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS tr_products_spatial_sync ON public.products;
CREATE TRIGGER tr_products_spatial_sync BEFORE INSERT OR UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.sync_geography_point();

-- 4. Agricultural Resources Table
CREATE TABLE IF NOT EXISTS public.agricultural_resources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id UUID NOT NULL REFERENCES public.provider_profiles(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  resource_type TEXT NOT NULL CHECK (
    resource_type IN (
      'agronomist',
      'veterinarian',
      'agricultural_technician',
      'irrigation_specialist',
      'farm_equipment',
      'machinery_rental',
      'seed_supplier',
      'fertilizer_supplier',
      'soil_testing_lab',
      'training_facility',
      'agricultural_cooperative'
    )
  ),
  country_id UUID REFERENCES public.countries(id) ON DELETE SET NULL,
  province_id UUID REFERENCES public.provinces(id) ON DELETE SET NULL,
  municipality_id UUID REFERENCES public.municipalities(id) ON DELETE SET NULL,
  latitude NUMERIC(10, 7),
  longitude NUMERIC(10, 7),
  location GEOGRAPHY(Point, 4326),
  service_radius_km NUMERIC(6, 2) DEFAULT 50.00,
  status TEXT NOT NULL DEFAULT 'active' CHECK (
    status IN ('draft', 'active', 'inactive', 'archived')
  ),
  is_verified BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_agricultural_resources_provider_id ON public.agricultural_resources(provider_id);
CREATE INDEX IF NOT EXISTS idx_agricultural_resources_type ON public.agricultural_resources(resource_type);
CREATE INDEX IF NOT EXISTS idx_agricultural_resources_slug ON public.agricultural_resources(slug);
CREATE INDEX IF NOT EXISTS idx_agricultural_resources_status ON public.agricultural_resources(status);
CREATE INDEX IF NOT EXISTS idx_agricultural_resources_province_id ON public.agricultural_resources(province_id);
CREATE INDEX IF NOT EXISTS idx_agricultural_resources_location ON public.agricultural_resources USING GIST (location);

DROP TRIGGER IF EXISTS tr_agricultural_resources_updated_at ON public.agricultural_resources;
CREATE TRIGGER tr_agricultural_resources_updated_at BEFORE UPDATE ON public.agricultural_resources FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS tr_agricultural_resources_spatial_sync ON public.agricultural_resources;
CREATE TRIGGER tr_agricultural_resources_spatial_sync BEFORE INSERT OR UPDATE ON public.agricultural_resources FOR EACH ROW EXECUTE FUNCTION public.sync_geography_point();
