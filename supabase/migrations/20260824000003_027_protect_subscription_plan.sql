-- Targeted corrective fix (not a project phase):
-- Prevent authenticated clients from changing profiles.subscription_plan via
-- PostgREST. Plan changes must go through the trusted server activation RPC
-- or the service_role admin client.

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
    IF v_role IN ('authenticated', 'anon') AND NEW.subscription_plan IS DISTINCT FROM 'basic' THEN
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

DROP TRIGGER IF EXISTS trg_protect_subscription_plan ON public.profiles;
CREATE TRIGGER trg_protect_subscription_plan
  BEFORE INSERT OR UPDATE OF subscription_plan ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_subscription_plan_column();

-- Trusted activation RPCs explicitly opt into the column change.
CREATE OR REPLACE FUNCTION public.activate_user_subscription_plan(p_plan TEXT)
RETURNS TEXT AS $$
DECLARE
  v_clerk_id TEXT;
  v_normalized_plan TEXT;
BEGIN
  PERFORM set_config('agriconnect.allow_subscription_change', 'on', true);

  v_clerk_id := public.current_clerk_user_id();
  IF v_clerk_id IS NULL THEN
    RAISE EXCEPTION 'Não autorizado: Sessão não encontrada.';
  END IF;

  v_normalized_plan := CASE
    WHEN lower(p_plan) IN ('basic', 'basico', 'free') THEN 'basic'
    WHEN lower(p_plan) IN ('professional', 'profissional', 'pro') THEN 'professional'
    WHEN lower(p_plan) IN ('business') THEN 'business'
    WHEN lower(p_plan) IN ('enterprise', 'empresarial', 'premium') THEN 'enterprise'
    ELSE NULL
  END;

  IF v_normalized_plan IS NULL THEN
    RAISE EXCEPTION 'Plano de subscrição inválido.';
  END IF;

  UPDATE public.profiles
  SET subscription_plan = v_normalized_plan,
      subscription_updated_at = timezone('utc'::text, now()),
      updated_at = timezone('utc'::text, now())
  WHERE clerk_user_id = v_clerk_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Perfil não encontrado.';
  END IF;

  RETURN v_normalized_plan;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.activate_user_subscription_plan(
  p_clerk_user_id TEXT,
  p_plan TEXT
)
RETURNS TEXT AS $$
DECLARE
  v_actor TEXT := public.current_clerk_user_id();
  v_target TEXT;
  v_normalized_plan TEXT;
BEGIN
  PERFORM set_config('agriconnect.allow_subscription_change', 'on', true);

  IF v_actor IS NOT NULL AND v_actor <> p_clerk_user_id THEN
    RAISE EXCEPTION 'Não autorizado.';
  END IF;

  v_target := COALESCE(NULLIF(v_actor, ''), NULLIF(p_clerk_user_id, ''));
  IF v_target IS NULL THEN
    RAISE EXCEPTION 'Não autorizado: Sessão não encontrada.';
  END IF;

  v_normalized_plan := CASE
    WHEN lower(p_plan) IN ('basic', 'basico', 'free') THEN 'basic'
    WHEN lower(p_plan) IN ('professional', 'profissional', 'pro') THEN 'professional'
    WHEN lower(p_plan) IN ('business') THEN 'business'
    WHEN lower(p_plan) IN ('enterprise', 'empresarial', 'premium') THEN 'enterprise'
    ELSE NULL
  END;

  IF v_normalized_plan IS NULL THEN
    RAISE EXCEPTION 'Plano de subscrição inválido.';
  END IF;

  UPDATE public.profiles
  SET subscription_plan = v_normalized_plan,
      subscription_updated_at = timezone('utc'::text, now()),
      updated_at = timezone('utc'::text, now())
  WHERE clerk_user_id = v_target;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Perfil não encontrado.';
  END IF;

  RETURN v_normalized_plan;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.activate_user_subscription_plan(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.activate_user_subscription_plan(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.activate_user_subscription_plan(TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.activate_user_subscription_plan(TEXT, TEXT) TO authenticated, service_role;
