-- Paste this in the Supabase SQL Editor if 002 failed with:
--   ERROR: 42703: column "status" does not exist
-- Phase 1 already created profiles/user_roles. Do not recreate those tables.
-- After this succeeds, skip re-running the old 002 and continue from 003.

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS preferred_language TEXT NOT NULL DEFAULT 'pt';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS account_type TEXT NOT NULL DEFAULT 'customer';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS theme_preference TEXT NOT NULL DEFAULT 'light';

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_account_type_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_account_type_check CHECK (
  account_type IN ('customer', 'provider', 'seller', 'farmer', 'instructor', 'organization', 'admin')
);

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_status_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_status_check CHECK (
  status IN ('active', 'inactive', 'suspended', 'pending_verification')
);

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_theme_preference_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_theme_preference_check CHECK (
  theme_preference IN ('light', 'dark')
);

CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);
CREATE INDEX IF NOT EXISTS idx_profiles_account_type ON public.profiles(account_type);

DROP TRIGGER IF EXISTS tr_profiles_handle_updated_at ON public.profiles;
CREATE TRIGGER tr_profiles_handle_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS profile_id UUID;
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS is_primary BOOLEAN NOT NULL DEFAULT false;

UPDATE public.user_roles ur
SET profile_id = p.id
FROM public.profiles p
WHERE ur.profile_id IS NULL
  AND ur.clerk_user_id = p.clerk_user_id;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE profile_id IS NULL) THEN
    ALTER TABLE public.user_roles ALTER COLUMN profile_id SET NOT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'user_roles_profile_id_fkey'
      AND conrelid = 'public.user_roles'::regclass
  ) THEN
    ALTER TABLE public.user_roles
      ADD CONSTRAINT user_roles_profile_id_fkey
      FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_role_check;
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_role_check CHECK (
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
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'uq_profile_role'
      AND conrelid = 'public.user_roles'::regclass
  ) THEN
    ALTER TABLE public.user_roles ADD CONSTRAINT uq_profile_role UNIQUE (profile_id, role);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_user_roles_profile_id ON public.user_roles(profile_id);
