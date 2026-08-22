-- Phase 9.7b: make plan activation callable from the trusted Next.js server.
-- Users still cannot UPDATE subscription_plan through ordinary client RLS.

DROP FUNCTION IF EXISTS public.activate_user_subscription_plan(TEXT);
CREATE OR REPLACE FUNCTION public.activate_user_subscription_plan(p_plan TEXT)
RETURNS TEXT AS $$
DECLARE
  v_clerk_id TEXT;
  v_normalized_plan TEXT;
BEGIN
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

DROP FUNCTION IF EXISTS public.activate_user_subscription_plan(TEXT, TEXT);
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
