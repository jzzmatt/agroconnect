-- Targeted corrective fix (not a project phase):
-- New users have no subscription until they explicitly activate a plan.
-- NULL subscription_plan is a valid stored state and is distinct from 'basic'.
-- Existing basic / professional / business / enterprise rows are left unchanged.

ALTER TABLE public.profiles ALTER COLUMN subscription_plan DROP DEFAULT;
ALTER TABLE public.profiles ALTER COLUMN subscription_plan DROP NOT NULL;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_subscription_plan_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_subscription_plan_check CHECK (
  subscription_plan IS NULL OR
  subscription_plan IN ('basic', 'professional', 'business', 'enterprise')
);

CREATE OR REPLACE FUNCTION public.protect_subscription_plan_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_role := COALESCE(auth.role(), current_setting('request.jwt.claim.role', true), '');
    -- Authenticated clients may insert a profile only with no plan.
    -- Assigning any slug, including 'basic', must go through the activation RPC.
    IF v_role IN ('authenticated', 'anon') AND NEW.subscription_plan IS NOT NULL THEN
      RAISE EXCEPTION 'subscription_plan can only be changed via server activation'
        USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.subscription_plan IS NOT DISTINCT FROM OLD.subscription_plan THEN
    RETURN NEW;
  END IF;

  v_role := COALESCE(auth.role(), current_setting('request.jwt.claim.role', true), '');

  IF v_role = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF current_user IN ('postgres', 'supabase_admin') THEN
    RETURN NEW;
  END IF;

  IF current_setting('agriconnect.allow_subscription_change', true) = 'on' THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'subscription_plan can only be changed via server activation'
    USING ERRCODE = '42501';
END;
$$;
