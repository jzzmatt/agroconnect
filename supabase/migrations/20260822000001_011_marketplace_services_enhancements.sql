-- ==============================================================================
-- AGROCONNECT — Phase 6: Migration 011 - Services & Provider Marketplace Enhancements
-- 1. Updates service status constraint to support 'published' alias seamlessly
-- 2. Adds service location_type ('physical_location', 'service_area', 'remote')
-- 3. Adds full-text search indexes on services & provider_profiles
-- 4. Extends get_nearby_services & search_services functions for full marketplace discovery
-- ==============================================================================

-- 1. Extend services status check to support 'published' in addition to 'active'
ALTER TABLE public.services DROP CONSTRAINT IF EXISTS services_status_check;
ALTER TABLE public.services ADD CONSTRAINT services_status_check CHECK (
  status IN ('draft', 'published', 'active', 'paused', 'archived')
);

-- 2. Add location_type and contact_preference to services
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS location_type TEXT NOT NULL DEFAULT 'service_area' CHECK (
  location_type IN ('physical_location', 'service_area', 'remote')
);

ALTER TABLE public.services ADD COLUMN IF NOT EXISTS contact_preference TEXT DEFAULT 'platform' CHECK (
  contact_preference IN ('platform', 'phone', 'whatsapp', 'email')
);

-- 3. Add full-text search vector / indexes on services
CREATE INDEX IF NOT EXISTS idx_services_title_desc_gin ON public.services 
  USING gin (to_tsvector('portuguese', coalesce(title, '') || ' ' || coalesce(short_description, '') || ' ' || coalesce(description, '')));

CREATE INDEX IF NOT EXISTS idx_provider_profiles_search_gin ON public.provider_profiles 
  USING gin (to_tsvector('portuguese', coalesce(business_name, '') || ' ' || coalesce(headline, '') || ' ' || coalesce(description, '')));

-- 4. Unified Marketplace Search Services RPC Function
CREATE OR REPLACE FUNCTION public.search_marketplace_services(
  p_query TEXT DEFAULT NULL,
  p_category_id UUID DEFAULT NULL,
  p_province_id UUID DEFAULT NULL,
  p_municipality_id UUID DEFAULT NULL,
  p_pricing_type TEXT DEFAULT NULL,
  p_min_price NUMERIC DEFAULT NULL,
  p_max_price NUMERIC DEFAULT NULL,
  p_latitude NUMERIC DEFAULT NULL,
  p_longitude NUMERIC DEFAULT NULL,
  p_radius_km NUMERIC DEFAULT NULL,
  p_sort_by TEXT DEFAULT 'relevance', -- 'relevance', 'distance', 'price_asc', 'price_desc', 'newest', 'rating'
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  provider_id UUID,
  provider_name TEXT,
  provider_slug TEXT,
  provider_rating NUMERIC,
  provider_verified TEXT,
  category_id UUID,
  category_name TEXT,
  title TEXT,
  slug TEXT,
  short_description TEXT,
  description TEXT,
  pricing_type TEXT,
  price NUMERIC,
  currency TEXT,
  location_type TEXT,
  province_id UUID,
  province_name TEXT,
  municipality_id UUID,
  municipality_name TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  service_radius_km NUMERIC,
  distance_km DOUBLE PRECISION,
  is_within_service_area BOOLEAN,
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
      s.id,
      s.provider_id,
      pp.business_name AS provider_name,
      pp.slug AS provider_slug,
      pp.rating AS provider_rating,
      pp.verification_status AS provider_verified,
      s.category_id,
      cat.name AS category_name,
      s.title,
      s.slug,
      s.short_description,
      s.description,
      s.pricing_type::TEXT,
      s.price,
      s.currency,
      s.location_type::TEXT,
      s.province_id,
      prov.name AS province_name,
      s.municipality_id,
      mun.name AS municipality_name,
      s.latitude,
      s.longitude,
      s.service_radius_km,
      CASE 
        WHEN v_point IS NOT NULL AND s.location IS NOT NULL THEN (ST_Distance(s.location, v_point) / 1000.0)
        ELSE NULL
      END AS distance_km,
      CASE
        WHEN v_point IS NOT NULL AND s.location IS NOT NULL THEN 
          (ST_Distance(s.location, v_point) <= (COALESCE(s.service_radius_km, 50.0) * 1000.0))
        ELSE false
      END AS is_within_service_area,
      s.status::TEXT,
      s.is_featured,
      s.created_at
    FROM public.services s
    JOIN public.provider_profiles pp ON pp.id = s.provider_id
    LEFT JOIN public.categories cat ON cat.id = s.category_id
    LEFT JOIN public.provinces prov ON prov.id = s.province_id
    LEFT JOIN public.municipalities mun ON mun.id = s.municipality_id
    WHERE s.status IN ('active', 'published')
      AND pp.status = 'active'
      AND (p_category_id IS NULL OR s.category_id = p_category_id)
      AND (p_province_id IS NULL OR s.province_id = p_province_id)
      AND (p_municipality_id IS NULL OR s.municipality_id = p_municipality_id)
      AND (p_pricing_type IS NULL OR s.pricing_type::TEXT = p_pricing_type)
      AND (p_min_price IS NULL OR s.price >= p_min_price)
      AND (p_max_price IS NULL OR s.price <= p_max_price)
      AND (
        p_query IS NULL OR p_query = '' OR
        to_tsvector('portuguese', coalesce(s.title, '') || ' ' || coalesce(s.short_description, '') || ' ' || coalesce(s.description, '') || ' ' || coalesce(pp.business_name, '')) @@ plainto_tsquery('portuguese', p_query) OR
        s.title ILIKE '%' || p_query || '%' OR
        s.short_description ILIKE '%' || p_query || '%' OR
        pp.business_name ILIKE '%' || p_query || '%'
      )
      AND (
        v_max_radius_meters IS NULL OR
        (s.location IS NOT NULL AND (
          ST_DWithin(s.location, v_point, v_max_radius_meters) OR
          ST_DWithin(s.location, v_point, COALESCE(s.service_radius_km, 50.0) * 1000.0)
        ))
      )
  ),
  counted AS (
    SELECT count(*) AS total FROM filtered
  )
  SELECT
    f.id,
    f.provider_id,
    f.provider_name,
    f.provider_slug,
    f.provider_rating,
    f.provider_verified,
    f.category_id,
    f.category_name,
    f.title,
    f.slug,
    f.short_description,
    f.description,
    f.pricing_type,
    f.price,
    f.currency,
    f.location_type,
    f.province_id,
    f.province_name,
    f.municipality_id,
    f.municipality_name,
    f.latitude,
    f.longitude,
    f.service_radius_km,
    f.distance_km,
    f.is_within_service_area,
    f.status,
    f.is_featured,
    f.created_at,
    c.total AS total_count
  FROM filtered f, counted c
  ORDER BY
    CASE WHEN p_sort_by = 'price_asc' THEN f.price END ASC,
    CASE WHEN p_sort_by = 'price_desc' THEN f.price END DESC,
    CASE WHEN p_sort_by = 'distance' AND f.distance_km IS NOT NULL THEN f.distance_km END ASC,
    CASE WHEN p_sort_by = 'rating' THEN f.provider_rating END DESC NULLS LAST,
    CASE WHEN p_sort_by = 'newest' THEN f.created_at END DESC,
    f.is_featured DESC,
    f.created_at DESC
  LIMIT LEAST(COALESCE(p_limit, 20), 100)
  OFFSET GREATEST(COALESCE(p_offset, 0), 0);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 5. Additional Initial Seed for Marketplace Services (Agricultural & Expert)
DO $$
DECLARE
  v_p_hua UUID;
  v_p_bgu UUID;
  v_p_mal UUID;
  v_p_lua UUID;
  v_m_caa UUID;
  v_m_cat UUID;
  v_m_cac UUID;
  v_m_via UUID;
  v_cat_agri UUID;
  v_cat_vet UUID;
  v_cat_irrig UUID;
  v_profile_1 UUID;
  v_profile_2 UUID;
  v_profile_3 UUID;
  v_prov_1 UUID;
  v_prov_2 UUID;
  v_prov_3 UUID;
BEGIN
  SELECT id INTO v_p_hua FROM public.provinces WHERE code = 'HUA' LIMIT 1;
  SELECT id INTO v_p_bgu FROM public.provinces WHERE code = 'BGU' LIMIT 1;
  SELECT id INTO v_p_mal FROM public.provinces WHERE code = 'MAL' LIMIT 1;
  SELECT id INTO v_p_lua FROM public.provinces WHERE code = 'LUA' LIMIT 1;

  SELECT id INTO v_m_caa FROM public.municipalities WHERE slug = 'caala' LIMIT 1;
  SELECT id INTO v_m_cat FROM public.municipalities WHERE slug = 'catumbela' LIMIT 1;
  SELECT id INTO v_m_cac FROM public.municipalities WHERE slug = 'cacuso' LIMIT 1;
  SELECT id INTO v_m_via FROM public.municipalities WHERE slug = 'viana' LIMIT 1;

  SELECT id INTO v_cat_agri FROM public.categories WHERE slug = 'agricultura-e-solos' LIMIT 1;
  SELECT id INTO v_cat_vet FROM public.categories WHERE slug = 'veterinaria-e-pecuaria' LIMIT 1;
  SELECT id INTO v_cat_irrig FROM public.categories WHERE slug = 'maquinas-e-irrigacao' LIMIT 1;

  -- Create default profiles for demo providers if not present
  INSERT INTO public.profiles (clerk_user_id, display_name, first_name, last_name, email, profile_slug, account_type, status, is_active)
  VALUES 
    ('seed_clerk_dr_joao', 'Dr. João Silva', 'João', 'Silva', 'joao.silva@agroconnect.ao', 'dr-joao-silva', 'provider', 'active', true),
    ('seed_clerk_eng_maria', 'Eng.ª Maria Santos', 'Maria', 'Santos', 'maria.santos@agroconnect.ao', 'maria-santos-agronoma', 'provider', 'active', true),
    ('seed_clerk_carlos_m', 'Dr. Carlos Manuel', 'Carlos', 'Manuel', 'carlos.manuel@agroconnect.ao', 'carlos-manuel-fitossanidade', 'provider', 'active', true)
  ON CONFLICT (clerk_user_id) DO NOTHING;

  SELECT id INTO v_profile_1 FROM public.profiles WHERE clerk_user_id = 'seed_clerk_dr_joao' LIMIT 1;
  SELECT id INTO v_profile_2 FROM public.profiles WHERE clerk_user_id = 'seed_clerk_eng_maria' LIMIT 1;
  SELECT id INTO v_profile_3 FROM public.profiles WHERE clerk_user_id = 'seed_clerk_carlos_m' LIMIT 1;

  IF v_profile_1 IS NOT NULL THEN
    INSERT INTO public.provider_profiles (profile_id, provider_type, business_name, slug, headline, description, verification_status, status, rating, reviews_count, province_id, municipality_id, latitude, longitude, service_radius_km)
    VALUES (v_profile_1, 'veterinarian', 'Dr. João Silva • Veterinária & Pecuária', 'dr-joao-silva', 'Médico Veterinário de Grandes Animais', 'Especialista em sanidade animal, vacinação, inseminação artificial e nutrição pecuária no Planalto Central.', 'verified', 'active', 4.90, 42, v_p_hua, v_m_caa, -12.8525, 15.5606, 60.00)
    ON CONFLICT (profile_id) DO NOTHING;
    SELECT id INTO v_prov_1 FROM public.provider_profiles WHERE profile_id = v_profile_1 LIMIT 1;
  END IF;

  IF v_profile_2 IS NOT NULL THEN
    INSERT INTO public.provider_profiles (profile_id, provider_type, business_name, slug, headline, description, verification_status, status, rating, reviews_count, province_id, municipality_id, latitude, longitude, service_radius_km)
    VALUES (v_profile_2, 'agronomist', 'Eng.ª Maria Santos • Solos & Irrigação', 'maria-santos-agronoma', 'Engenheira Agrónoma Especialista em Irrigação', 'Consultoria em análise de solos, fertilidade, dimensionamento de rega gota-a-gota e horticultura comercial.', 'verified', 'active', 5.00, 38, v_p_bgu, v_m_cat, -12.4333, 13.5500, 50.00)
    ON CONFLICT (profile_id) DO NOTHING;
    SELECT id INTO v_prov_2 FROM public.provider_profiles WHERE profile_id = v_profile_2 LIMIT 1;
  END IF;

  IF v_profile_3 IS NOT NULL THEN
    INSERT INTO public.provider_profiles (profile_id, provider_type, business_name, slug, headline, description, verification_status, status, rating, reviews_count, province_id, municipality_id, latitude, longitude, service_radius_km)
    VALUES (v_profile_3, 'agricultural_consultant', 'Dr. Carlos Manuel • Fitossanidade', 'carlos-manuel-fitossanidade', 'Consultor Agrícola & Fitossanitário', 'Controlo integrado de pragas, doenças de milho e soja, calibração de pulverizadores e planeamento de safra.', 'verified', 'active', 4.80, 56, v_p_mal, v_m_cac, -9.4167, 15.7500, 80.00)
    ON CONFLICT (profile_id) DO NOTHING;
    SELECT id INTO v_prov_3 FROM public.provider_profiles WHERE profile_id = v_profile_3 LIMIT 1;
  END IF;

  -- Insert Published Services
  IF v_prov_1 IS NOT NULL THEN
    INSERT INTO public.services (provider_id, category_id, title, slug, short_description, description, pricing_type, price, currency, location_type, province_id, municipality_id, latitude, longitude, service_radius_km, status, is_featured)
    VALUES
      (v_prov_1, v_cat_vet, 'Consulta Veterinária em Fazenda e Sanidade Bovina', 'consulta-veterinaria-fazenda-sanidade-bovina', 'Visita presencial para diagnóstico, protocolo de vacinação e exame reprodutivo de gado bovino.', 'Serviço completo de acompanhamento sanitário no campo para explorações de gado de corte e leite. Inclui diagnóstico de doenças infecciosas, protocolo profilático anual, exames ginecológicos em vacas e aconselhamento de nutrição.', 'hourly', 25000.00, 'AOA', 'service_area', v_p_hua, v_m_caa, -12.8525, 15.5606, 60.00, 'published', true),
      (v_prov_1, v_cat_vet, 'Inseminação Artificial e Melhoramento Genético Pecuário', 'inseminacao-artificial-melhoramento-genetico', 'Protocolo de IATF e inseminação artificial com sémen de raças adaptadas a Angola.', 'Planeamento reprodutivo para pequenos e médios criadores de gado com foco em raças tolerantes ao clima de Angola (Brahman, Bonsmara, Nelore).', 'fixed', 45000.00, 'AOA', 'service_area', v_p_hua, v_m_caa, -12.8525, 15.5606, 50.00, 'published', false)
    ON CONFLICT (slug) DO NOTHING;
  END IF;

  IF v_prov_2 IS NOT NULL THEN
    INSERT INTO public.services (provider_id, category_id, title, slug, short_description, description, pricing_type, price, currency, location_type, province_id, municipality_id, latitude, longitude, service_radius_km, status, is_featured)
    VALUES
      (v_prov_2, v_cat_irrig, 'Instalação e Manutenção de Sistemas de Irrigação Gota-a-Gota', 'instalacao-sistemas-irrigacao-gota-a-gota', 'Dimensionamento hidráulico, montagem de tubagens, filtros e bombas para pomares e hortas.', 'Estudo topográfico, cálculo de caudal e montagem de sistemas eficientes de rega por gotejamento e microaspersão com poupança de água até 40%.', 'starting_from', 35000.00, 'AOA', 'service_area', v_p_bgu, v_m_cat, -12.4333, 13.5500, 50.00, 'published', true),
      (v_prov_2, v_cat_agri, 'Análise de Solo e Plano de Adubação Personalizado', 'analise-de-solo-plano-adubacao', 'Recolha de amostras, interpretação laboratorial de pH/NPK e plano de calagem.', 'Recomendação técnica precisa de corretivos de solo e fertilizantes para evitar gastos excessivos com adubos e maximizar o rendimento por hectare.', 'fixed', 30000.00, 'AOA', 'service_area', v_p_bgu, v_m_cat, -12.4333, 13.5500, 60.00, 'published', false)
    ON CONFLICT (slug) DO NOTHING;
  END IF;

  IF v_prov_3 IS NOT NULL THEN
    INSERT INTO public.services (provider_id, category_id, title, slug, short_description, description, pricing_type, price, currency, location_type, province_id, municipality_id, latitude, longitude, service_radius_km, status, is_featured)
    VALUES
      (v_prov_3, v_cat_agri, 'Consultoria Fitossanitária e Controlo de Pragas de Milho', 'consultoria-fitossanitaria-pragas-milho', 'Diagnóstico e combate à lagarta-do-funil, broca e ferrugem do milho e soja.', 'Acompanhamento técnico durante o ciclo da cultura com identificação precoce de pragas, calibração de pulverizadores e escolha de biodefensivos adequados.', 'daily', 60000.00, 'AOA', 'service_area', v_p_mal, v_m_cac, -9.4167, 15.7500, 80.00, 'published', true)
    ON CONFLICT (slug) DO NOTHING;
  END IF;
END $$;
