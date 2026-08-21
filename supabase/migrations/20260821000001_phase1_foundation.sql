-- ==============================================================================
-- AGROCONNECT — Phase 1 Database Migration
-- Extensions: uuid-ossp, postgis
-- Tables: profiles, user_roles, locations
-- Security: Row Level Security (RLS) configured for Clerk native Supabase auth
-- ==============================================================================

-- 1. Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- 2. Profiles Table
-- Stores application user profile linked directly to Clerk identity via clerk_user_id.
-- Passwords and auth credentials are NEVER stored here.
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clerk_user_id TEXT UNIQUE NOT NULL,
  display_name TEXT,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  avatar_url TEXT,
  bio TEXT,
  profile_slug TEXT UNIQUE,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for fast lookup by clerk user ID
CREATE INDEX IF NOT EXISTS idx_profiles_clerk_user_id ON public.profiles(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_profile_slug ON public.profiles(profile_slug);

-- 3. User Roles Table
-- Supports multiple simultaneous roles per user (e.g. veterinarian + instructor, or seller + expert)
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clerk_user_id TEXT NOT NULL REFERENCES public.profiles(clerk_user_id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (
    role IN (
      'student',
      'creator',
      'seller',
      'instructor',
      'expert',
      'veterinarian',
      'agronomist',
      'agricultural_consultant',
      'business',
      'admin'
    )
  ),
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT uq_user_roles UNIQUE(clerk_user_id, role)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_clerk_user_id ON public.user_roles(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);

-- 4. Locations Table (AgriLocalização Core Service)
-- Platform-wide geographic capability supporting country, province, municipality, commune,
-- coordinates, radius searches, and PostGIS spatial indexing.
CREATE TABLE IF NOT EXISTS public.locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  country_code TEXT NOT NULL DEFAULT 'AO',
  country_name TEXT NOT NULL DEFAULT 'Angola',
  province_code TEXT,
  province_name TEXT NOT NULL,
  municipality_code TEXT,
  municipality_name TEXT,
  commune_code TEXT,
  commune_name TEXT,
  latitude NUMERIC(10, 7),
  longitude NUMERIC(10, 7),
  location GEOGRAPHY(Point, 4326),
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Spatial index for radius and proximity queries
CREATE INDEX IF NOT EXISTS idx_locations_geography ON public.locations USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_locations_province ON public.locations(province_name);
CREATE INDEX IF NOT EXISTS idx_locations_municipality ON public.locations(municipality_name);

-- 5. Trigger to sync geography point when lat/lon updated
CREATE OR REPLACE FUNCTION public.sync_location_point()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    NEW.location = ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
  ELSE
    NEW.location = NULL;
  END IF;
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_sync_location_point ON public.locations;
CREATE TRIGGER tr_sync_location_point
BEFORE INSERT OR UPDATE ON public.locations
FOR EACH ROW
EXECUTE FUNCTION public.sync_location_point();

-- Trigger to update updated_at on profiles
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_profiles_updated_at ON public.profiles;
CREATE TRIGGER tr_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- 6. Row Level Security (RLS) Policies
-- Using Clerk Native Third-Party Supabase Auth integration:
-- `auth.jwt() ->> 'sub'` extracts the authenticated Clerk user ID.

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

-- Profiles Policies:
-- 1. Anyone can read active profiles (public marketplace & expert discovery)
CREATE POLICY "Public profiles are viewable by everyone"
ON public.profiles FOR SELECT
USING (is_active = true);

-- 2. Authenticated user can read their own profile even if inactive
CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
USING (clerk_user_id = (auth.jwt()->>'sub'));

-- 3. Users can insert their own profile on registration
CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT
WITH CHECK (clerk_user_id = (auth.jwt()->>'sub'));

-- 4. Users can update their own profile
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
USING (clerk_user_id = (auth.jwt()->>'sub'))
WITH CHECK (clerk_user_id = (auth.jwt()->>'sub'));

-- User Roles Policies:
-- 1. Anyone can view public user roles (e.g. expert, veterinarian, instructor)
CREATE POLICY "User roles are viewable by everyone"
ON public.user_roles FOR SELECT
USING (true);

-- 2. Users can manage their own roles
CREATE POLICY "Users can insert own roles"
ON public.user_roles FOR INSERT
WITH CHECK (clerk_user_id = (auth.jwt()->>'sub'));

CREATE POLICY "Users can delete own roles"
ON public.user_roles FOR DELETE
USING (clerk_user_id = (auth.jwt()->>'sub'));

-- Locations Policies (AgriLocalização):
-- 1. Locations are readable by everyone
CREATE POLICY "Locations are viewable by everyone"
ON public.locations FOR SELECT
USING (true);

-- 2. Authenticated users can create/update location records
CREATE POLICY "Authenticated users can insert locations"
ON public.locations FOR INSERT
WITH CHECK ((auth.jwt()->>'sub') IS NOT NULL);

CREATE POLICY "Authenticated users can update locations"
ON public.locations FOR UPDATE
USING ((auth.jwt()->>'sub') IS NOT NULL);
