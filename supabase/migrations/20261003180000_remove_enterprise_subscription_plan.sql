-- Consolidate Empresarial (enterprise) into Business: three public plans only.

UPDATE public.profiles
SET subscription_plan = 'business',
    subscription_updated_at = timezone('utc'::text, now()),
    updated_at = timezone('utc'::text, now())
WHERE subscription_plan IN ('enterprise', 'premium');

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_subscription_plan_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_subscription_plan_check
  CHECK (
    subscription_plan IS NULL
    OR subscription_plan IN ('basic', 'professional', 'business')
  );

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
    WHEN lower(p_plan) IN ('business', 'enterprise', 'empresarial', 'premium', 'create') THEN 'business'
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
    WHEN lower(p_plan) IN ('business', 'enterprise', 'empresarial', 'premium', 'create') THEN 'business'
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
