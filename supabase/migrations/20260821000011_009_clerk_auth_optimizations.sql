-- ==============================================================================
-- AGROCONNECT — Phase 4: Migration 009 - Clerk Authentication & Identity Optimization
-- Adds dedicated indexes, helper claim verification functions and profile sync guards
-- ==============================================================================

-- 1. Ensure unique index on profiles.clerk_user_id (Critical lookup path)
CREATE UNIQUE INDEX IF NOT EXISTS uq_idx_profiles_clerk_user_id ON public.profiles(clerk_user_id);

-- 2. Ensure indexing on provider_profiles ownership for rapid RLS traversal
CREATE INDEX IF NOT EXISTS idx_provider_profiles_lookup ON public.provider_profiles(id, profile_id);

-- 3. Ensure indexing on services ownership
CREATE INDEX IF NOT EXISTS idx_services_ownership_lookup ON public.services(id, provider_id);

-- 4. Ensure indexing on products ownership
CREATE INDEX IF NOT EXISTS idx_products_ownership_lookup ON public.products(id, seller_id);

-- 5. Helper function for verifying if caller is admin
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS BOOLEAN AS $$
DECLARE
  v_account_type TEXT;
BEGIN
  SELECT account_type INTO v_account_type
  FROM public.profiles
  WHERE clerk_user_id = public.current_clerk_user_id()
  LIMIT 1;

  RETURN COALESCE(v_account_type = 'admin', false);
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
