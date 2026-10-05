-- ==============================================================================
-- Angola administrative update: 21 provinces (Lei n.º 14/24)
-- Splits legacy Cuando Cubango (CCU) and adds Icolo e Bengo, Moxico Leste.
-- ==============================================================================

DO $$
DECLARE
  v_country_id UUID;
  v_ccu_id UUID;
BEGIN
  SELECT id INTO v_country_id FROM public.countries WHERE code = 'AO' LIMIT 1;
  IF v_country_id IS NULL THEN
    RAISE NOTICE 'Angola country row missing; skipping province migration';
    RETURN;
  END IF;

  SELECT id INTO v_ccu_id FROM public.provinces WHERE country_id = v_country_id AND code = 'CCU' LIMIT 1;

  INSERT INTO public.provinces (country_id, name, slug, code, capital, latitude, longitude, agricultural_focus, is_active)
  VALUES
    (v_country_id, 'Cuando', 'cuando', 'CUA', 'Mavinga', -15.8500, 21.2000, ARRAY['Milho', 'Massango', 'Pecuária'], true),
    (v_country_id, 'Cubango', 'cubango', 'CUB', 'Menongue', -15.5000, 18.2000, ARRAY['Milho', 'Massambala', 'Pecuária'], true),
    (v_country_id, 'Icolo e Bengo', 'icolo-e-bengo', 'IEB', 'Catete', -9.1500, 13.7500, ARRAY['Hortícolas', 'Avicultura', 'Cintura Verde'], true),
    (v_country_id, 'Moxico Leste', 'moxico-leste', 'MXL', 'Cazombo', -11.9000, 22.0000, ARRAY['Mandioca', 'Arroz', 'Mel'], true)
  ON CONFLICT (country_id, code) DO UPDATE SET
    name = EXCLUDED.name,
    slug = EXCLUDED.slug,
    capital = EXCLUDED.capital,
    agricultural_focus = EXCLUDED.agricultural_focus,
    is_active = true;

  IF v_ccu_id IS NOT NULL THEN
    UPDATE public.provinces SET is_active = false WHERE id = v_ccu_id;
  END IF;
END $$;

-- Legacy alias table for normalizing historical references (free-text / old codes)
CREATE TABLE IF NOT EXISTS public.province_legacy_aliases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  legacy_code TEXT,
  legacy_name TEXT NOT NULL,
  province_id UUID NOT NULL REFERENCES public.provinces(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT uq_province_legacy_name UNIQUE (legacy_name)
);

INSERT INTO public.province_legacy_aliases (legacy_code, legacy_name, province_id)
SELECT 'CCU', 'Cuando Cubango', p.id
FROM public.provinces p
WHERE p.code = 'CUB'
ON CONFLICT (legacy_name) DO NOTHING;
