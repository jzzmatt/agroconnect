-- ==============================================================================
-- AGROCONNECT — Phase 8.5: Migration 014 - User Profile, Identity, Titles & Active Context
-- 1. Adds professional_title and professional_title_custom to profiles
-- 2. Adds active_profile_type ('veterinarian', 'expert', 'instructor', 'student', 'seller', 'farmer', 'service_provider', 'business')
-- 3. Adds subscription_plan ('free', 'professional', 'business', 'premium')
-- 4. Extends user_roles to support 'seller', 'farmer', 'service_provider' cleanly
-- 5. Helper function for updating active profile context
-- ==============================================================================

-- 1. Add professional_title, professional_title_custom, active_profile_type, subscription_plan to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS professional_title TEXT DEFAULT 'none' CHECK (
  professional_title IN ('none', 'Dr.', 'Prof.', 'Eng.', 'Tec.', 'custom')
);

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS professional_title_custom TEXT;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS active_profile_type TEXT DEFAULT 'student' CHECK (
  active_profile_type IN (
    'veterinarian',
    'expert',
    'instructor',
    'student',
    'seller',
    'farmer',
    'service_provider',
    'business',
    'personal'
  )
);

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_plan TEXT DEFAULT 'free' CHECK (
  subscription_plan IN ('free', 'professional', 'business', 'premium')
);

-- 2. Extend user_roles constraint to support all ecosystem capability types
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
    'service_provider',
    'admin'
  )
);

-- 3. Function to update active profile context safely
CREATE OR REPLACE FUNCTION public.set_active_profile_type(
  p_profile_type TEXT
)
RETURNS VOID AS $$
DECLARE
  v_clerk_id TEXT;
BEGIN
  v_clerk_id := public.current_clerk_user_id();
  IF v_clerk_id IS NULL THEN
    RAISE EXCEPTION 'Não autorizado: Sessão não encontrada.';
  END IF;

  UPDATE public.profiles
  SET active_profile_type = p_profile_type,
      updated_at = timezone('utc'::text, now())
  WHERE clerk_user_id = v_clerk_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
