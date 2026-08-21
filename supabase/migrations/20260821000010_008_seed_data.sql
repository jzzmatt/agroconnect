-- ==============================================================================
-- AGROCONNECT — Phase 3: Migration 008 - Initial Seed Data
-- 1. Country: Angola (AO)
-- 2. 18 Official Provinces of Angola
-- 3. Key Agricultural Municipalities
-- 4. Initial Hierarchical Marketplace Categories
-- ==============================================================================

-- 1. Insert Country: Angola
INSERT INTO public.countries (name, slug, code, code3, currency_code, currency_symbol, phone_code, latitude, longitude)
VALUES ('Angola', 'angola', 'AO', 'AGO', 'AOA', 'Kz', '+244', -12.5000000, 17.5000000)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  currency_code = EXCLUDED.currency_code,
  currency_symbol = EXCLUDED.currency_symbol;

-- 2. Insert 18 Provinces of Angola
DO $$
DECLARE
  v_country_id UUID;
BEGIN
  SELECT id INTO v_country_id FROM public.countries WHERE code = 'AO' LIMIT 1;

  INSERT INTO public.provinces (country_id, name, slug, code, capital, latitude, longitude, agricultural_focus)
  VALUES
    (v_country_id, 'Bengo', 'bengo', 'BGO', 'Caxito', -8.5833, 14.3333, ARRAY['Banana', 'Mandioca', 'Cana-de-açúcar', 'Hortícolas']),
    (v_country_id, 'Benguela', 'benguela', 'BGU', 'Benguela', -12.5833, 13.4167, ARRAY['Milho', 'Feijão', 'Fruticultura', 'Pesca e Aquacultura']),
    (v_country_id, 'Bié', 'bie', 'BIE', 'Kuito', -12.3833, 17.3000, ARRAY['Milho', 'Trigo', 'Arroz', 'Soja', 'Feijão']),
    (v_country_id, 'Cabinda', 'cabinda', 'CAB', 'Cabinda', -5.5500, 12.2000, ARRAY['Café', 'Cacau', 'Palmeira de Dendém', 'Mandioca']),
    (v_country_id, 'Cuando Cubango', 'cuando-cubango', 'CCU', 'Menongue', -15.5000, 19.5000, ARRAY['Milho', 'Massango', 'Massambala', 'Pecuária']),
    (v_country_id, 'Cuanza Norte', 'cuanza-norte', 'CNO', 'Ndalatando', -9.2500, 15.0000, ARRAY['Café Robusta', 'Palma de Dendém', 'Fruticultura']),
    (v_country_id, 'Cuanza Sul', 'cuanza-sul', 'CUS', 'Sumbe', -11.0000, 15.0000, ARRAY['Café', 'Milho', 'Palma de Dendém', 'Pecuária Bovina']),
    (v_country_id, 'Cunene', 'cunene', 'CNN', 'Ondjiva', -16.5000, 16.0000, ARRAY['Pecuária Bovina', 'Massango', 'Massambala']),
    (v_country_id, 'Huambo', 'huambo', 'HUA', 'Huambo', -12.7833, 15.7333, ARRAY['Milho', 'Batata', 'Feijão', 'Hortícolas', 'Avicultura']),
    (v_country_id, 'Huíla', 'huila', 'HUI', 'Lubango', -14.9167, 13.5500, ARRAY['Milho', 'Massambala', 'Pecuária de Corte e Leite', 'Fruticultura de Altitude']),
    (v_country_id, 'Luanda', 'luanda', 'LUA', 'Luanda', -8.8383, 13.2344, ARRAY['Agro-indústria', 'Cintura Verde Hortícola', 'Distribuição']),
    (v_country_id, 'Lunda Norte', 'lunda-norte', 'LNO', 'Dundo', -8.5000, 19.5000, ARRAY['Mandioca', 'Milho', 'Piscicultura']),
    (v_country_id, 'Lunda Sul', 'lunda-sul', 'LSU', 'Saurimo', -10.5000, 20.5000, ARRAY['Mandioca', 'Arroz', 'Amendoim']),
    (v_country_id, 'Malanje', 'malanje', 'MAL', 'Malanje', -9.5333, 16.3500, ARRAY['Mandioca', 'Milho', 'Soja', 'Algodão', 'Cana-de-açúcar']),
    (v_country_id, 'Moxico', 'moxico', 'MOX', 'Luena', -12.0000, 20.0000, ARRAY['Mandioca', 'Arroz', 'Milho', 'Mel']),
    (v_country_id, 'Namibe', 'namibe', 'NAM', 'Moçâmedes', -15.1961, 12.1522, ARRAY['Tomate', 'Azeitona', 'Uva', 'Caprinocultura', 'Pesca']),
    (v_country_id, 'Uíge', 'uige', 'UIG', 'Uíge', -7.6167, 15.0500, ARRAY['Café Robusta', 'Mandioca', 'Amendoim', 'Frutas Tropicais']),
    (v_country_id, 'Zaire', 'zaire', 'ZAI', 'Mbanza Kongo', -6.2667, 14.2333, ARRAY['Mandioca', 'Milho', 'Banana', 'Palma'])
  ON CONFLICT (country_id, code) DO UPDATE SET
    name = EXCLUDED.name,
    capital = EXCLUDED.capital,
    agricultural_focus = EXCLUDED.agricultural_focus;
END $$;

-- 3. Insert Key Municipalities across agricultural hubs
DO $$
DECLARE
  v_country_id UUID;
  v_p_hua UUID;
  v_p_hui UUID;
  v_p_bgu UUID;
  v_p_mal UUID;
  v_p_cus UUID;
  v_p_lua UUID;
  v_p_uig UUID;
  v_p_bie UUID;
BEGIN
  SELECT id INTO v_country_id FROM public.countries WHERE code = 'AO' LIMIT 1;
  SELECT id INTO v_p_hua FROM public.provinces WHERE code = 'HUA' LIMIT 1;
  SELECT id INTO v_p_hui FROM public.provinces WHERE code = 'HUI' LIMIT 1;
  SELECT id INTO v_p_bgu FROM public.provinces WHERE code = 'BGU' LIMIT 1;
  SELECT id INTO v_p_mal FROM public.provinces WHERE code = 'MAL' LIMIT 1;
  SELECT id INTO v_p_cus FROM public.provinces WHERE code = 'CUS' LIMIT 1;
  SELECT id INTO v_p_lua FROM public.provinces WHERE code = 'LUA' LIMIT 1;
  SELECT id INTO v_p_uig FROM public.provinces WHERE code = 'UIG' LIMIT 1;
  SELECT id INTO v_p_bie FROM public.provinces WHERE code = 'BIE' LIMIT 1;

  -- Huambo
  INSERT INTO public.municipalities (province_id, country_id, name, slug, code, latitude, longitude) VALUES
    (v_p_hua, v_country_id, 'Huambo', 'huambo', 'HUA-HUA', -12.7833, 15.7333),
    (v_p_hua, v_country_id, 'Caála', 'caala', 'HUA-CAI', -12.8525, 15.5606),
    (v_p_hua, v_country_id, 'Bailundo', 'bailundo', 'HUA-BAI', -12.1833, 15.8667),
    (v_p_hua, v_country_id, 'Longonjo', 'longonjo', 'HUA-LON', -12.9167, 15.2500)
  ON CONFLICT (province_id, slug) DO NOTHING;

  -- Huíla
  INSERT INTO public.municipalities (province_id, country_id, name, slug, code, latitude, longitude) VALUES
    (v_p_hui, v_country_id, 'Lubango', 'lubango', 'HUI-LUB', -14.9167, 13.5500),
    (v_p_hui, v_country_id, 'Matala', 'matala', 'HUI-MAT', -15.0000, 15.0333),
    (v_p_hui, v_country_id, 'Chibia', 'chibia', 'HUI-CHI', -15.1833, 13.7000),
    (v_p_hui, v_country_id, 'Humpata', 'humpata', 'HUI-HMP', -15.0167, 13.3667)
  ON CONFLICT (province_id, slug) DO NOTHING;

  -- Benguela
  INSERT INTO public.municipalities (province_id, country_id, name, slug, code, latitude, longitude) VALUES
    (v_p_bgu, v_country_id, 'Benguela', 'benguela', 'BGU-BGU', -12.5833, 13.4167),
    (v_p_bgu, v_country_id, 'Lobito', 'lobito', 'BGU-LOB', -12.3500, 13.5333),
    (v_p_bgu, v_country_id, 'Catumbela', 'catumbela', 'BGU-CAT', -12.4333, 13.5500),
    (v_p_bgu, v_country_id, 'Ganda', 'ganda', 'BGU-GHA', -13.0333, 14.6333)
  ON CONFLICT (province_id, slug) DO NOTHING;

  -- Malanje
  INSERT INTO public.municipalities (province_id, country_id, name, slug, code, latitude, longitude) VALUES
    (v_p_mal, v_country_id, 'Malanje', 'malanje', 'MAL-MAL', -9.5333, 16.3500),
    (v_p_mal, v_country_id, 'Cacuso', 'cacuso', 'MAL-CAC', -9.4167, 15.7500),
    (v_p_mal, v_country_id, 'Calandula', 'calandula', 'MAL-CAL', -9.1333, 15.9500)
  ON CONFLICT (province_id, slug) DO NOTHING;

  -- Luanda
  INSERT INTO public.municipalities (province_id, country_id, name, slug, code, latitude, longitude) VALUES
    (v_p_lua, v_country_id, 'Viana', 'viana', 'LUA-VIA', -8.9050, 13.3700),
    (v_p_lua, v_country_id, 'Belas', 'belas', 'LUA-BEL', -8.9950, 13.1600),
    (v_p_lua, v_country_id, 'Cacuaco', 'cacuaco', 'LUA-CAC', -8.7800, 13.3600),
    (v_p_lua, v_country_id, 'Talatona', 'talatona', 'LUA-TAL', -8.9167, 13.1833),
    (v_p_lua, v_country_id, 'Icolo e Bengo', 'icolo-e-bengo', 'LUA-IBA', -9.1000, 13.6000)
  ON CONFLICT (province_id, slug) DO NOTHING;

  -- Cuanza Sul
  INSERT INTO public.municipalities (province_id, country_id, name, slug, code, latitude, longitude) VALUES
    (v_p_cus, v_country_id, 'Sumbe', 'sumbe', 'CUS-SUM', -11.2000, 13.8500),
    (v_p_cus, v_country_id, 'Porto Amboim', 'porto-amboim', 'CUS-POR', -10.7333, 13.7667),
    (v_p_cus, v_country_id, 'Waku Kungo (Cela)', 'waku-kungo', 'CUS-WAK', -11.4167, 15.1167)
  ON CONFLICT (province_id, slug) DO NOTHING;

  -- Uíge
  INSERT INTO public.municipalities (province_id, country_id, name, slug, code, latitude, longitude) VALUES
    (v_p_uig, v_country_id, 'Uíge', 'uige', 'UIG-UIG', -7.6167, 15.0500),
    (v_p_uig, v_country_id, 'Negage', 'negage', 'UIG-NEG', -7.7667, 15.2667)
  ON CONFLICT (province_id, slug) DO NOTHING;

  -- Bié
  INSERT INTO public.municipalities (province_id, country_id, name, slug, code, latitude, longitude) VALUES
    (v_p_bie, v_country_id, 'Kuito', 'kuito', 'BIE-KUI', -12.3833, 17.3000),
    (v_p_bie, v_country_id, 'Andulo', 'andulo', 'BIE-AND', -11.4833, 16.6833)
  ON CONFLICT (province_id, slug) DO NOTHING;
END $$;

-- 4. Initial Hierarchical Marketplace Categories
INSERT INTO public.categories (name, slug, category_type, pillar, description, icon, sort_order)
VALUES
  -- Top Level Pillars
  ('Agricultura & Solos', 'agricultura-e-solos', 'service', 'agriExpert', 'Consultoria agronómica, análise de solo e correção', 'Sprout', 1),
  ('Medicina Veterinária & Pecuária', 'veterinaria-e-pecuaria', 'service', 'agriExpert', 'Sanidade animal, vacinação, inseminação e nutrição', 'Stethoscope', 2),
  ('Formações & Cursos Agrícolas', 'formacoes-agricolas', 'academy_course', 'agriAcademy', 'Cursos práticos, masterclasses e certificações', 'GraduationCap', 3),
  ('Sementes & Fertilizantes', 'sementes-e-fertilizantes', 'product', 'agriShopping', 'Sementes certificadas, adubos NPK e correctivos', 'Package', 4),
  ('Máquinas & Irrigação', 'maquinas-e-irrigacao', 'product', 'agriShopping', 'Bombas de água solares, tratores e sistemas de rega', 'Tractor', 5),
  ('Serviços no Campo & Colheita', 'servicos-de-campo', 'agricultural_resource', 'agriLocalizacao', 'Aluguer de alfaias, colheita mecanizada e mão-de-obra', 'Hammer', 6)
ON CONFLICT (category_type, slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  pillar = EXCLUDED.pillar;

-- Subcategories under Sementes & Fertilizantes
DO $$
DECLARE
  v_parent_id UUID;
BEGIN
  SELECT id INTO v_parent_id FROM public.categories WHERE slug = 'sementes-e-fertilizantes' LIMIT 1;
  IF v_parent_id IS NOT NULL THEN
    INSERT INTO public.categories (parent_id, name, slug, category_type, pillar, sort_order) VALUES
      (v_parent_id, 'Sementes de Milho', 'sementes-de-milho', 'product', 'agriShopping', 1),
      (v_parent_id, 'Sementes de Soja e Feijão', 'sementes-soja-feijao', 'product', 'agriShopping', 2),
      (v_parent_id, 'Fertilizantes NPK Composto', 'fertilizantes-npk', 'product', 'agriShopping', 3)
    ON CONFLICT (category_type, slug) DO NOTHING;
  END IF;
END $$;
