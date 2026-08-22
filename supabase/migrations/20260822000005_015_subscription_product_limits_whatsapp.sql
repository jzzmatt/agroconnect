-- ==============================================================================
-- AGROCONNECT — Phase 8.5 Revision v2: Migration 015
-- Subscription Plans, Entitlements, Product Limits & WhatsApp Contact
-- 1. Updates subscription_plan constraint: 'basic', 'professional', 'business', 'enterprise'
-- 2. Adds whatsapp_phone to profiles and provider_profiles
-- 3. Concurrency-safe check function for 10-product limit on Professional tier
-- ==============================================================================

-- 1. Update subscription_plan constraint on profiles to support standard slugs
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_subscription_plan_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_subscription_plan_check CHECK (
  subscription_plan IN ('basic', 'professional', 'business', 'enterprise', 'free', 'premium')
);

-- 2. Add whatsapp_phone to profiles and provider_profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS whatsapp_phone TEXT;
ALTER TABLE public.provider_profiles ADD COLUMN IF NOT EXISTS whatsapp_phone TEXT;

-- 3. Function to count active products for a provider/seller
CREATE OR REPLACE FUNCTION public.count_active_seller_products(p_seller_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT count(*)::INTEGER
    FROM public.products
    WHERE seller_id = p_seller_id
      AND status IN ('published', 'active', 'draft')
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- 4. Server-side concurrency safe product limit validation before insertion
CREATE OR REPLACE FUNCTION public.check_product_limit_before_insert()
RETURNS TRIGGER AS $$
DECLARE
  v_plan TEXT;
  v_current_count INTEGER;
  v_profile_id UUID;
BEGIN
  -- Get provider's associated user profile subscription plan
  SELECT p.subscription_plan, pp.profile_id INTO v_plan, v_profile_id
  FROM public.provider_profiles pp
  JOIN public.profiles p ON p.id = pp.profile_id
  WHERE pp.id = NEW.seller_id;

  -- Default to basic if missing
  v_plan := COALESCE(v_plan, 'basic');

  -- Basic plan: 0 products allowed
  IF v_plan IN ('basic', 'free') THEN
    RAISE EXCEPTION 'PRODUCT_CREATION_LOCKED: O plano Básico não permite a criação de produtos. Atualize para o plano Profissional ou Business.';
  END IF;

  -- Professional plan: maximum 10 active products
  IF v_plan = 'professional' THEN
    SELECT count(*) INTO v_current_count
    FROM public.products
    WHERE seller_id = NEW.seller_id
      AND status IN ('published', 'active', 'draft');

    IF v_current_count >= 10 THEN
      RAISE EXCEPTION 'PRODUCT_LIMIT_REACHED: Atingiu o limite de 10 produtos ativos do plano Profissional. Atualize para o plano Business.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_check_product_limit ON public.products;
CREATE TRIGGER tr_check_product_limit
BEFORE INSERT ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.check_product_limit_before_insert();
