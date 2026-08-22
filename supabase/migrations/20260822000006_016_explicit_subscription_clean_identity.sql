-- ==============================================================================
-- AGROCONNECT — Phase 8.5 Revision v3: Migration 016
-- Mandatory Subscription Onboarding, Explicit Plan Selection & Clean User Identity
-- 1. Remove automatic default for subscription_plan (NULL = no plan selected)
-- 2. Clean display_name defaults without fabricated names or automatic titles
-- 3. Concurrency-safe product limit enforcement for explicit plans
-- ==============================================================================

-- 1. Alter subscription_plan on profiles to allow NULL without 'free' or 'professional' default
ALTER TABLE public.profiles ALTER COLUMN subscription_plan DROP DEFAULT;
ALTER TABLE public.profiles ALTER COLUMN subscription_plan DROP NOT NULL;

-- 2. Update check constraint on subscription_plan
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_subscription_plan_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_subscription_plan_check CHECK (
  subscription_plan IS NULL OR
  subscription_plan IN ('basic', 'professional', 'business', 'enterprise', 'free', 'premium')
);

-- 3. Add explicit plan activation helper function
CREATE OR REPLACE FUNCTION public.activate_user_subscription_plan(
  p_plan TEXT
)
RETURNS VOID AS $$
DECLARE
  v_clerk_id TEXT;
  v_normalized_plan TEXT;
BEGIN
  v_clerk_id := public.current_clerk_user_id();
  IF v_clerk_id IS NULL THEN
    RAISE EXCEPTION 'Não autorizado: Sessão não encontrada.';
  END IF;

  v_normalized_plan := lower(trim(p_plan));
  IF v_normalized_plan NOT IN ('basic', 'professional', 'business', 'enterprise') THEN
    RAISE EXCEPTION 'Plano de subscrição inválido: %', p_plan;
  END IF;

  UPDATE public.profiles
  SET subscription_plan = v_normalized_plan,
      updated_at = timezone('utc'::text, now())
  WHERE clerk_user_id = v_clerk_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
