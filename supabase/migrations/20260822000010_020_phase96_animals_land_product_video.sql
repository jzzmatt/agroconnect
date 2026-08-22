-- ==============================================================================
-- AGROCONNECT — Phase 9.6
-- Animals + land categories, product metadata, product video (Bunny, separate quota)
-- ==============================================================================

-- 1. New AgriShopping categories (stable slugs, translated only in UI)
INSERT INTO public.categories (name, slug, category_type, pillar, description, icon, sort_order, metadata)
VALUES
  ('Animais', 'animals', 'product', 'agriShopping', 'Listagens de animais para venda', 'PawPrint', 7, '{"product_type":"animal"}'::jsonb),
  ('Terrenos', 'land', 'product', 'agriShopping', 'Terrenos e propriedades agrícolas para venda ou arrendamento', 'Map', 8, '{"product_type":"land"}'::jsonb),
  ('Produtos Agrícolas & Colheitas', 'produtos-agricolas', 'product', 'agriShopping', 'Colheitas e produtos agrícolas', 'Wheat', 9, '{"product_type":"standard"}'::jsonb),
  ('Alimentação & Saúde Animal', 'alimentacao-animal', 'product', 'agriShopping', 'Rações, suplementos e saúde animal', 'Heart', 10, '{"product_type":"standard"}'::jsonb)
ON CONFLICT (category_type, slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  pillar = EXCLUDED.pillar,
  metadata = EXCLUDED.metadata;

-- 2. Product type + video pointer (category-specific fields stay in metadata JSONB)
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS product_type TEXT NOT NULL DEFAULT 'standard';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'products_product_type_check'
  ) THEN
    ALTER TABLE public.products
      ADD CONSTRAINT products_product_type_check
      CHECK (product_type IN ('standard', 'animal', 'land'));
  END IF;
END $$;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS category_slug TEXT;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS product_video_id UUID;

CREATE INDEX IF NOT EXISTS idx_products_product_type ON public.products(product_type);
CREATE INDEX IF NOT EXISTS idx_products_category_slug ON public.products(category_slug);

-- 3. Product videos — Bunny metadata only; NOT counted against AgriAcademy quota
CREATE TABLE IF NOT EXISTS public.product_videos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  bunny_video_id TEXT,
  bunny_library_id TEXT,
  filename TEXT,
  mime_type TEXT NOT NULL CHECK (mime_type IN ('video/mp4', 'video/webm')),
  file_size BIGINT NOT NULL DEFAULT 0 CHECK (file_size >= 0 AND file_size <= 26214400),
  duration_seconds NUMERIC(6,2) NOT NULL CHECK (duration_seconds > 0 AND duration_seconds <= 30),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'uploading', 'processing', 'ready', 'failed', 'deleted')
  ),
  thumbnail_url TEXT,
  playback_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_product_videos_one_active
  ON public.product_videos(product_id)
  WHERE status <> 'deleted';

CREATE INDEX IF NOT EXISTS idx_product_videos_owner ON public.product_videos(owner_id);
CREATE INDEX IF NOT EXISTS idx_product_videos_status ON public.product_videos(status);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'products_product_video_id_fkey'
  ) THEN
    ALTER TABLE public.products
      ADD CONSTRAINT products_product_video_id_fkey
      FOREIGN KEY (product_video_id) REFERENCES public.product_videos(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 4. RLS — owner-only write; public can read ready videos of published products
ALTER TABLE public.product_videos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners manage own product videos" ON public.product_videos;
CREATE POLICY "Owners manage own product videos" ON public.product_videos
  FOR ALL
  USING (owner_id IN (SELECT id FROM public.profiles WHERE clerk_user_id = auth.jwt() ->> 'sub'))
  WITH CHECK (owner_id IN (SELECT id FROM public.profiles WHERE clerk_user_id = auth.jwt() ->> 'sub'));

DROP POLICY IF EXISTS "Public read ready product videos" ON public.product_videos;
CREATE POLICY "Public read ready product videos" ON public.product_videos
  FOR SELECT
  USING (
    status = 'ready'
    AND product_id IN (
      SELECT id FROM public.products WHERE status IN ('published', 'active')
    )
  );

-- 5. Public product read includes published (fixes marketplace visibility)
DROP POLICY IF EXISTS "Public read active products" ON public.products;
CREATE POLICY "Public read active products" ON public.products
  FOR SELECT
  USING (status IN ('active', 'published'));

-- 6. Animal subcategories (stable internal slugs)
DO $$
DECLARE
  v_parent_id UUID;
BEGIN
  SELECT id INTO v_parent_id FROM public.categories WHERE slug = 'animals' AND category_type = 'product' LIMIT 1;
  IF v_parent_id IS NOT NULL THEN
    INSERT INTO public.categories (parent_id, name, slug, category_type, pillar, sort_order, metadata) VALUES
      (v_parent_id, 'Suínos', 'pigs', 'product', 'agriShopping', 1, '{"species":"pigs"}'::jsonb),
      (v_parent_id, 'Aves', 'chickens', 'product', 'agriShopping', 2, '{"species":"chickens"}'::jsonb),
      (v_parent_id, 'Bovinos', 'cattle', 'product', 'agriShopping', 3, '{"species":"cattle"}'::jsonb),
      (v_parent_id, 'Caprinos', 'goats', 'product', 'agriShopping', 4, '{"species":"goats"}'::jsonb),
      (v_parent_id, 'Ovinos', 'sheep', 'product', 'agriShopping', 5, '{"species":"sheep"}'::jsonb),
      (v_parent_id, 'Outros', 'other-animals', 'product', 'agriShopping', 6, '{"species":"other"}'::jsonb)
    ON CONFLICT (category_type, slug) DO NOTHING;
  END IF;
END $$;
