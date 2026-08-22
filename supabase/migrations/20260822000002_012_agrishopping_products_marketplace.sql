-- ==============================================================================
-- AGROCONNECT — Phase 7: Migration 012 - AgriShopping & Product Marketplace Enhancements
-- 1. Updates products status constraint to support 'published' alias seamlessly
-- 2. Adds product availability_status ('in_stock', 'out_of_stock', 'limited', 'pre_order', 'on_request')
-- 3. Adds product location_type and selling_radius_km
-- 4. Creates product_requests table for marketplace inquiries & requests (pre-order/quote)
-- 5. Full-Text Search Indexes on products
-- 6. Unified Marketplace Search Products RPC Function (PostGIS & Angola filters)
-- 7. Initial Seed for Marketplace Products across Key Agricultural Hubs
-- ==============================================================================

-- 1. Extend products status check to support 'published' in addition to 'active'
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_status_check;
ALTER TABLE public.products ADD CONSTRAINT products_status_check CHECK (
  status IN ('draft', 'published', 'active', 'paused', 'out_of_stock', 'archived', 'rejected')
);

-- 2. Add availability_status, location_type, and selling_radius_km
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS availability_status TEXT NOT NULL DEFAULT 'in_stock' CHECK (
  availability_status IN ('in_stock', 'out_of_stock', 'limited', 'pre_order', 'on_request')
);

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS location_type TEXT NOT NULL DEFAULT 'physical_location' CHECK (
  location_type IN ('physical_location', 'service_area', 'remote')
);

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS selling_radius_km NUMERIC(6, 2) DEFAULT 50.00;

-- 3. Create product_requests table
CREATE TABLE IF NOT EXISTS public.product_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  seller_id UUID NOT NULL REFERENCES public.provider_profiles(id) ON DELETE RESTRICT,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit TEXT NOT NULL DEFAULT 'unidade',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'accepted', 'rejected', 'cancelled', 'completed')
  ),
  message TEXT,
  delivery_location_notes TEXT,
  offered_price NUMERIC(12, 2),
  currency TEXT NOT NULL DEFAULT 'AOA',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_product_requests_customer ON public.product_requests(customer_id);
CREATE INDEX IF NOT EXISTS idx_product_requests_seller ON public.product_requests(seller_id);
CREATE INDEX IF NOT EXISTS idx_product_requests_product ON public.product_requests(product_id);
CREATE INDEX IF NOT EXISTS idx_product_requests_status ON public.product_requests(status);

DROP TRIGGER IF EXISTS tr_product_requests_updated_at ON public.product_requests;
CREATE TRIGGER tr_product_requests_updated_at BEFORE UPDATE ON public.product_requests FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Enable RLS on product_requests
ALTER TABLE public.product_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers read own product requests" ON public.product_requests FOR SELECT 
  USING (customer_id IN (SELECT id FROM public.profiles WHERE clerk_user_id = public.current_clerk_user_id()));

CREATE POLICY "Sellers read received product requests" ON public.product_requests FOR SELECT 
  USING (seller_id IN (SELECT id FROM public.provider_profiles WHERE profile_id IN (SELECT id FROM public.profiles WHERE clerk_user_id = public.current_clerk_user_id())));

CREATE POLICY "Customers insert product requests" ON public.product_requests FOR INSERT 
  WITH CHECK (customer_id IN (SELECT id FROM public.profiles WHERE clerk_user_id = public.current_clerk_user_id()));

CREATE POLICY "Sellers update received product requests" ON public.product_requests FOR UPDATE 
  USING (seller_id IN (SELECT id FROM public.provider_profiles WHERE profile_id IN (SELECT id FROM public.profiles WHERE clerk_user_id = public.current_clerk_user_id())));

-- 4. Add full-text search index on products
CREATE INDEX IF NOT EXISTS idx_products_title_desc_gin ON public.products 
  USING gin (to_tsvector('portuguese', coalesce(title, '') || ' ' || coalesce(description, '') || ' ' || coalesce(sku, '')));

-- 5. Unified Marketplace Search Products RPC Function
CREATE OR REPLACE FUNCTION public.search_marketplace_products(
  p_query TEXT DEFAULT NULL,
  p_category_id UUID DEFAULT NULL,
  p_province_id UUID DEFAULT NULL,
  p_municipality_id UUID DEFAULT NULL,
  p_availability_status TEXT DEFAULT NULL,
  p_min_price NUMERIC DEFAULT NULL,
  p_max_price NUMERIC DEFAULT NULL,
  p_latitude NUMERIC DEFAULT NULL,
  p_longitude NUMERIC DEFAULT NULL,
  p_radius_km NUMERIC DEFAULT NULL,
  p_sort_by TEXT DEFAULT 'relevance', -- 'relevance', 'distance', 'price_asc', 'price_desc', 'newest'
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  seller_id UUID,
  seller_name TEXT,
  seller_slug TEXT,
  seller_rating NUMERIC,
  seller_verified TEXT,
  category_id UUID,
  category_name TEXT,
  title TEXT,
  slug TEXT,
  description TEXT,
  condition TEXT,
  price NUMERIC,
  currency TEXT,
  unit TEXT,
  quantity INTEGER,
  availability_status TEXT,
  location_type TEXT,
  province_id UUID,
  province_name TEXT,
  municipality_id UUID,
  municipality_name TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  selling_radius_km NUMERIC,
  distance_km DOUBLE PRECISION,
  is_within_selling_area BOOLEAN,
  status TEXT,
  is_featured BOOLEAN,
  created_at TIMESTAMPTZ,
  total_count BIGINT
) AS $$
DECLARE
  v_point GEOGRAPHY := NULL;
  v_max_radius_meters DOUBLE PRECISION := NULL;
BEGIN
  IF p_latitude IS NOT NULL AND p_longitude IS NOT NULL THEN
    v_point := ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography;
    IF p_radius_km IS NOT NULL THEN
      v_max_radius_meters := LEAST(p_radius_km, 200.0) * 1000.0;
    END IF;
  END IF;

  RETURN QUERY
  WITH filtered AS (
    SELECT
      p.id,
      p.seller_id,
      pp.business_name AS seller_name,
      pp.slug AS seller_slug,
      pp.rating AS seller_rating,
      pp.verification_status AS seller_verified,
      p.category_id,
      cat.name AS category_name,
      p.title,
      p.slug,
      p.description,
      p.condition::TEXT,
      p.price,
      p.currency,
      p.unit,
      p.quantity,
      p.availability_status::TEXT,
      p.location_type::TEXT,
      p.province_id,
      prov.name AS province_name,
      p.municipality_id,
      mun.name AS municipality_name,
      p.latitude,
      p.longitude,
      p.selling_radius_km,
      CASE 
        WHEN v_point IS NOT NULL AND p.location IS NOT NULL THEN (ST_Distance(p.location, v_point) / 1000.0)
        ELSE NULL
      END AS distance_km,
      CASE
        WHEN v_point IS NOT NULL AND p.location IS NOT NULL THEN 
          (ST_Distance(p.location, v_point) <= (COALESCE(p.selling_radius_km, 50.0) * 1000.0))
        ELSE false
      END AS is_within_selling_area,
      p.status::TEXT,
      p.is_featured,
      p.created_at
    FROM public.products p
    JOIN public.provider_profiles pp ON pp.id = p.seller_id
    LEFT JOIN public.categories cat ON cat.id = p.category_id
    LEFT JOIN public.provinces prov ON prov.id = p.province_id
    LEFT JOIN public.municipalities mun ON mun.id = p.municipality_id
    WHERE p.status IN ('active', 'published')
      AND pp.status = 'active'
      AND (p_category_id IS NULL OR p.category_id = p_category_id)
      AND (p_province_id IS NULL OR p.province_id = p_province_id)
      AND (p_municipality_id IS NULL OR p.municipality_id = p_municipality_id)
      AND (p_availability_status IS NULL OR p.availability_status::TEXT = p_availability_status)
      AND (p_min_price IS NULL OR p.price >= p_min_price)
      AND (p_max_price IS NULL OR p.price <= p_max_price)
      AND (
        p_query IS NULL OR p_query = '' OR
        to_tsvector('portuguese', coalesce(p.title, '') || ' ' || coalesce(p.description, '') || ' ' || coalesce(pp.business_name, '')) @@ plainto_tsquery('portuguese', p_query) OR
        p.title ILIKE '%' || p_query || '%' OR
        p.description ILIKE '%' || p_query || '%' OR
        pp.business_name ILIKE '%' || p_query || '%'
      )
      AND (
        v_max_radius_meters IS NULL OR
        (p.location IS NOT NULL AND (
          ST_DWithin(p.location, v_point, v_max_radius_meters) OR
          ST_DWithin(p.location, v_point, COALESCE(p.selling_radius_km, 50.0) * 1000.0)
        ))
      )
  ),
  counted AS (
    SELECT count(*) AS total FROM filtered
  )
  SELECT
    f.id,
    f.seller_id,
    f.seller_name,
    f.seller_slug,
    f.seller_rating,
    f.seller_verified,
    f.category_id,
    f.category_name,
    f.title,
    f.slug,
    f.description,
    f.condition,
    f.price,
    f.currency,
    f.unit,
    f.quantity,
    f.availability_status,
    f.location_type,
    f.province_id,
    f.province_name,
    f.municipality_id,
    f.municipality_name,
    f.latitude,
    f.longitude,
    f.selling_radius_km,
    f.distance_km,
    f.is_within_selling_area,
    f.status,
    f.is_featured,
    f.created_at,
    c.total AS total_count
  FROM filtered f, counted c
  ORDER BY
    CASE WHEN p_sort_by = 'price_asc' THEN f.price END ASC,
    CASE WHEN p_sort_by = 'price_desc' THEN f.price END DESC,
    CASE WHEN p_sort_by = 'distance' AND f.distance_km IS NOT NULL THEN f.distance_km END ASC,
    CASE WHEN p_sort_by = 'newest' THEN f.created_at END DESC,
    f.is_featured DESC,
    f.created_at DESC
  LIMIT LEAST(COALESCE(p_limit, 20), 100)
  OFFSET GREATEST(COALESCE(p_offset, 0), 0);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 6. Additional Initial Seed for Marketplace Products
DO $$
DECLARE
  v_p_hua UUID;
  v_p_hui UUID;
  v_p_bgu UUID;
  v_p_mal UUID;
  v_p_lua UUID;
  v_m_caa UUID;
  v_m_lub UUID;
  v_m_lob UUID;
  v_m_via UUID;
  v_cat_sem UUID;
  v_cat_fert UUID;
  v_cat_maq UUID;
  v_prov_1 UUID;
  v_prov_2 UUID;
BEGIN
  SELECT id INTO v_p_hua FROM public.provinces WHERE code = 'HUA' LIMIT 1;
  SELECT id INTO v_p_hui FROM public.provinces WHERE code = 'HUI' LIMIT 1;
  SELECT id INTO v_p_bgu FROM public.provinces WHERE code = 'BGU' LIMIT 1;
  SELECT id INTO v_p_mal FROM public.provinces WHERE code = 'MAL' LIMIT 1;
  SELECT id INTO v_p_lua FROM public.provinces WHERE code = 'LUA' LIMIT 1;

  SELECT id INTO v_m_caa FROM public.municipalities WHERE slug = 'caala' LIMIT 1;
  SELECT id INTO v_m_lub FROM public.municipalities WHERE slug = 'lubango' LIMIT 1;
  SELECT id INTO v_m_lob FROM public.municipalities WHERE slug = 'lobito' LIMIT 1;
  SELECT id INTO v_m_via FROM public.municipalities WHERE slug = 'viana' LIMIT 1;

  SELECT id INTO v_cat_sem FROM public.categories WHERE slug = 'sementes-e-fertilizantes' LIMIT 1;
  SELECT id INTO v_cat_maq FROM public.categories WHERE slug = 'maquinas-e-irrigacao' LIMIT 1;

  SELECT id INTO v_prov_1 FROM public.provider_profiles WHERE slug = 'dr-joao-silva' LIMIT 1;
  SELECT id INTO v_prov_2 FROM public.provider_profiles WHERE slug = 'maria-santos-agronoma' LIMIT 1;

  IF v_prov_1 IS NOT NULL THEN
    INSERT INTO public.products (seller_id, category_id, title, slug, description, condition, price, currency, quantity, unit, sku, province_id, municipality_id, latitude, longitude, selling_radius_km, status, availability_status, is_featured)
    VALUES
      (v_prov_1, v_cat_sem, 'Semente de Milho Híbrido Certificada ZM-521 (25kg)', 'semente-milho-hibrido-zm521-25kg', 'Semente de alta produtividade tolerante à seca e adaptada ao Planalto Central de Angola.', 'new', 28500.00, 'AOA', 80, 'saco 25kg', 'SEM-MIL-521', v_p_hua, v_m_caa, -12.8525, 15.5606, 60.00, 'published', 'in_stock', true),
      (v_prov_1, v_cat_sem, 'Kit de Vacinação e Medicamentos Veterinários Bovinos', 'kit-vacinacao-medicamentos-veterinarios', 'Kit profilático contendo vacinas contra carbúnculo, desparasitantes e complexo vitamínico ADE.', 'new', 65000.00, 'AOA', 25, 'kit', 'VET-KIT-01', v_p_hua, v_m_caa, -12.8525, 15.5606, 80.00, 'published', 'in_stock', false)
    ON CONFLICT (slug) DO NOTHING;
  END IF;

  IF v_prov_2 IS NOT NULL THEN
    INSERT INTO public.products (seller_id, category_id, title, slug, description, condition, price, currency, quantity, unit, sku, province_id, municipality_id, latitude, longitude, selling_radius_km, status, availability_status, is_featured)
    VALUES
      (v_prov_2, v_cat_maq, 'Bomba de Irrigação Solar 3HP com Painéis Fotovoltaicos', 'bomba-irrigacao-solar-3hp-paineis', 'Sistema completo de bombagem solar com inversor e 6 painéis solares monocristalinos.', 'new', 480000.00, 'AOA', 12, 'conjunto', 'BOM-SOL-3HP', v_p_bgu, v_m_lob, -12.3500, 13.5333, 100.00, 'published', 'in_stock', true),
      (v_prov_2, v_cat_sem, 'Adubo Composto NPK 12-24-12 (Saco 50kg)', 'adubo-composto-npk-12-24-12-50kg', 'Fertilizante mineral balanceado para arranque de culturas de milho, feijão e batata.', 'new', 32000.00, 'AOA', 150, 'saco 50kg', 'FER-NPK-122412', v_p_bgu, v_m_lob, -12.3500, 13.5333, 70.00, 'published', 'in_stock', false)
    ON CONFLICT (slug) DO NOTHING;
  END IF;
END $$;
