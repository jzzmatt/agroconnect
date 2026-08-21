-- ==============================================================================
-- AGROCONNECT — Phase 3: Migration 002 - Profiles & Multi-Role User Foundation
-- ==============================================================================

-- 1. Ensure profiles table has all Phase 3 required fields and constraints
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clerk_user_id TEXT UNIQUE NOT NULL,
  email TEXT,
  phone TEXT,
  first_name TEXT,
  last_name TEXT,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  profile_slug TEXT UNIQUE,
  preferred_language TEXT NOT NULL DEFAULT 'pt',
  account_type TEXT NOT NULL DEFAULT 'customer' CHECK (
    account_type IN ('customer', 'provider', 'seller', 'farmer', 'instructor', 'organization', 'admin')
  ),
  status TEXT NOT NULL DEFAULT 'active' CHECK (
    status IN ('active', 'inactive', 'suspended', 'pending_verification')
  ),
  theme_preference TEXT NOT NULL DEFAULT 'light' CHECK (
    theme_preference IN ('light', 'dark')
  ),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indexes on Profiles
CREATE INDEX IF NOT EXISTS idx_profiles_clerk_user_id ON public.profiles(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_profile_slug ON public.profiles(profile_slug);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);
CREATE INDEX IF NOT EXISTS idx_profiles_account_type ON public.profiles(account_type);

-- Trigger for profiles updated_at
DROP TRIGGER IF EXISTS tr_profiles_handle_updated_at ON public.profiles;
CREATE TRIGGER tr_profiles_handle_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- 2. Multi-Role Capability Table: user_roles
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
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
      'farmer',
      'admin'
    )
  ),
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT uq_profile_role UNIQUE(profile_id, role)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_profile_id ON public.user_roles(profile_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_clerk_user_id ON public.user_roles(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);
