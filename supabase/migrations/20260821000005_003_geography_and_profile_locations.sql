-- ==============================================================================
-- AGROCONNECT — Phase 3: Migration 003 - Administrative Geography & User Locations
-- Hierarchy: countries → provinces → municipalities → communes → localities
-- ==============================================================================

-- 1. Countries Table
CREATE TABLE IF NOT EXISTS public.countries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  code CHAR(2) UNIQUE NOT NULL, -- e.g. 'AO'
  code3 CHAR(3) UNIQUE NOT NULL, -- e.g. 'AGO'
  currency_code TEXT NOT NULL DEFAULT 'AOA',
  currency_symbol TEXT NOT NULL DEFAULT 'Kz',
  phone_code TEXT NOT NULL DEFAULT '+244',
  latitude NUMERIC(10, 7),
  longitude NUMERIC(10, 7),
  location GEOGRAPHY(Point, 4326),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_countries_code ON public.countries(code);
CREATE INDEX IF NOT EXISTS idx_countries_slug ON public.countries(slug);
CREATE INDEX IF NOT EXISTS idx_countries_location ON public.countries USING GIST (location);

DROP TRIGGER IF EXISTS tr_countries_updated_at ON public.countries;
CREATE TRIGGER tr_countries_updated_at BEFORE UPDATE ON public.countries FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS tr_countries_spatial_sync ON public.countries;
CREATE TRIGGER tr_countries_spatial_sync BEFORE INSERT OR UPDATE ON public.countries FOR EACH ROW EXECUTE FUNCTION public.sync_geography_point();

-- 2. Provinces Table
CREATE TABLE IF NOT EXISTS public.provinces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  country_id UUID NOT NULL REFERENCES public.countries(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  code TEXT NOT NULL, -- e.g. 'HUA', 'LUA'
  capital TEXT,
  agricultural_focus TEXT[] DEFAULT '{}',
  latitude NUMERIC(10, 7),
  longitude NUMERIC(10, 7),
  location GEOGRAPHY(Point, 4326),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT uq_province_country_slug UNIQUE (country_id, slug),
  CONSTRAINT uq_province_country_code UNIQUE (country_id, code)
);

CREATE INDEX IF NOT EXISTS idx_provinces_country_id ON public.provinces(country_id);
CREATE INDEX IF NOT EXISTS idx_provinces_code ON public.provinces(code);
CREATE INDEX IF NOT EXISTS idx_provinces_name ON public.provinces(name);
CREATE INDEX IF NOT EXISTS idx_provinces_location ON public.provinces USING GIST (location);

DROP TRIGGER IF EXISTS tr_provinces_updated_at ON public.provinces;
CREATE TRIGGER tr_provinces_updated_at BEFORE UPDATE ON public.provinces FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS tr_provinces_spatial_sync ON public.provinces;
CREATE TRIGGER tr_provinces_spatial_sync BEFORE INSERT OR UPDATE ON public.provinces FOR EACH ROW EXECUTE FUNCTION public.sync_geography_point();

-- 3. Municipalities Table
CREATE TABLE IF NOT EXISTS public.municipalities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  province_id UUID NOT NULL REFERENCES public.provinces(id) ON DELETE RESTRICT,
  country_id UUID NOT NULL REFERENCES public.countries(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  code TEXT,
  latitude NUMERIC(10, 7),
  longitude NUMERIC(10, 7),
  location GEOGRAPHY(Point, 4326),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT uq_municipality_province_slug UNIQUE (province_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_municipalities_province_id ON public.municipalities(province_id);
CREATE INDEX IF NOT EXISTS idx_municipalities_country_id ON public.municipalities(country_id);
CREATE INDEX IF NOT EXISTS idx_municipalities_name ON public.municipalities(name);
CREATE INDEX IF NOT EXISTS idx_municipalities_location ON public.municipalities USING GIST (location);

DROP TRIGGER IF EXISTS tr_municipalities_updated_at ON public.municipalities;
CREATE TRIGGER tr_municipalities_updated_at BEFORE UPDATE ON public.municipalities FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS tr_municipalities_spatial_sync ON public.municipalities;
CREATE TRIGGER tr_municipalities_spatial_sync BEFORE INSERT OR UPDATE ON public.municipalities FOR EACH ROW EXECUTE FUNCTION public.sync_geography_point();

-- 4. Communes Table
CREATE TABLE IF NOT EXISTS public.communes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  municipality_id UUID NOT NULL REFERENCES public.municipalities(id) ON DELETE RESTRICT,
  province_id UUID NOT NULL REFERENCES public.provinces(id) ON DELETE RESTRICT,
  country_id UUID NOT NULL REFERENCES public.countries(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  code TEXT,
  latitude NUMERIC(10, 7),
  longitude NUMERIC(10, 7),
  location GEOGRAPHY(Point, 4326),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT uq_commune_municipality_slug UNIQUE (municipality_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_communes_municipality_id ON public.communes(municipality_id);
CREATE INDEX IF NOT EXISTS idx_communes_province_id ON public.communes(province_id);
CREATE INDEX IF NOT EXISTS idx_communes_location ON public.communes USING GIST (location);

DROP TRIGGER IF EXISTS tr_communes_updated_at ON public.communes;
CREATE TRIGGER tr_communes_updated_at BEFORE UPDATE ON public.communes FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS tr_communes_spatial_sync ON public.communes;
CREATE TRIGGER tr_communes_spatial_sync BEFORE INSERT OR UPDATE ON public.communes FOR EACH ROW EXECUTE FUNCTION public.sync_geography_point();

-- 5. Localities Table (Neighborhoods, Bairros, Povoações, Polos Agrícolas)
CREATE TABLE IF NOT EXISTS public.localities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  commune_id UUID REFERENCES public.communes(id) ON DELETE SET NULL,
  municipality_id UUID NOT NULL REFERENCES public.municipalities(id) ON DELETE RESTRICT,
  province_id UUID NOT NULL REFERENCES public.provinces(id) ON DELETE RESTRICT,
  country_id UUID NOT NULL REFERENCES public.countries(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  address_line TEXT,
  postal_code TEXT,
  latitude NUMERIC(10, 7),
  longitude NUMERIC(10, 7),
  location GEOGRAPHY(Point, 4326),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_localities_municipality_id ON public.localities(municipality_id);
CREATE INDEX IF NOT EXISTS idx_localities_commune_id ON public.localities(commune_id);
CREATE INDEX IF NOT EXISTS idx_localities_location ON public.localities USING GIST (location);

DROP TRIGGER IF EXISTS tr_localities_updated_at ON public.localities;
CREATE TRIGGER tr_localities_updated_at BEFORE UPDATE ON public.localities FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS tr_localities_spatial_sync ON public.localities;
CREATE TRIGGER tr_localities_spatial_sync BEFORE INSERT OR UPDATE ON public.localities FOR EACH ROW EXECUTE FUNCTION public.sync_geography_point();

-- 6. User Profile Locations Table: profile_locations
CREATE TABLE IF NOT EXISTS public.profile_locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  label TEXT NOT NULL DEFAULT 'Principal', -- e.g. 'Principal', 'Fazenda Benguela', 'Armazém Luanda'
  country_id UUID NOT NULL REFERENCES public.countries(id) ON DELETE RESTRICT,
  province_id UUID NOT NULL REFERENCES public.provinces(id) ON DELETE RESTRICT,
  municipality_id UUID REFERENCES public.municipalities(id) ON DELETE SET NULL,
  commune_id UUID REFERENCES public.communes(id) ON DELETE SET NULL,
  locality_id UUID REFERENCES public.localities(id) ON DELETE SET NULL,
  address_line TEXT,
  latitude NUMERIC(10, 7),
  longitude NUMERIC(10, 7),
  location GEOGRAPHY(Point, 4326),
  is_primary BOOLEAN NOT NULL DEFAULT false,
  service_radius_km NUMERIC(6, 2) DEFAULT 50.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Partial Unique Index: only one location can be primary per profile
CREATE UNIQUE INDEX IF NOT EXISTS idx_profile_locations_single_primary 
ON public.profile_locations(profile_id) 
WHERE (is_primary = true);

CREATE INDEX IF NOT EXISTS idx_profile_locations_profile_id ON public.profile_locations(profile_id);
CREATE INDEX IF NOT EXISTS idx_profile_locations_province_id ON public.profile_locations(province_id);
CREATE INDEX IF NOT EXISTS idx_profile_locations_municipality_id ON public.profile_locations(municipality_id);
CREATE INDEX IF NOT EXISTS idx_profile_locations_location ON public.profile_locations USING GIST (location);

DROP TRIGGER IF EXISTS tr_profile_locations_updated_at ON public.profile_locations;
CREATE TRIGGER tr_profile_locations_updated_at BEFORE UPDATE ON public.profile_locations FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS tr_profile_locations_spatial_sync ON public.profile_locations;
CREATE TRIGGER tr_profile_locations_spatial_sync BEFORE INSERT OR UPDATE ON public.profile_locations FOR EACH ROW EXECUTE FUNCTION public.sync_geography_point();
