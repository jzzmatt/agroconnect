-- Phase 9.7: product video duration 30s → 60s
-- AgriAcademy video quotas remain unchanged and separate.

ALTER TABLE public.product_videos DROP CONSTRAINT IF EXISTS product_videos_duration_seconds_check;
ALTER TABLE public.product_videos
  ADD CONSTRAINT product_videos_duration_seconds_check
  CHECK (duration_seconds > 0 AND duration_seconds <= 60);

-- Active product limit: published/active/draft only. Never count archived or deleted.
CREATE OR REPLACE FUNCTION public.check_product_limit_before_insert()
RETURNS TRIGGER AS $$
DECLARE
  v_plan TEXT;
  v_current_count INTEGER;
  v_profile_id UUID;
BEGIN
  SELECT p.subscription_plan, pp.profile_id INTO v_plan, v_profile_id
  FROM public.provider_profiles pp
  JOIN public.profiles p ON p.id = pp.profile_id
  WHERE pp.id = NEW.seller_id;

  v_plan := COALESCE(v_plan, 'basic');

  IF v_plan IN ('basic', 'free') THEN
    RAISE EXCEPTION 'FEATURE_NOT_AVAILABLE: O plano Básico não permite a criação de produtos. Atualize para o plano Profissional.';
  END IF;

  IF v_plan = 'professional' THEN
    SELECT count(*) INTO v_current_count
    FROM public.products
    WHERE seller_id = NEW.seller_id
      AND status IN ('published', 'active', 'draft')
      AND COALESCE(status, '') NOT IN ('archived', 'deleted');

    IF v_current_count >= 10 THEN
      RAISE EXCEPTION 'PRODUCT_LIMIT_REACHED: Atingiu o limite de 10 produtos ativos do plano Profissional.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
