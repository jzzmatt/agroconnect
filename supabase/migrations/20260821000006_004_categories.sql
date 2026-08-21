-- ==============================================================================
-- AGROCONNECT — Phase 3: Migration 004 - Marketplace Categories
-- Supports hierarchical categories across services, products & agricultural resources
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  category_type TEXT NOT NULL DEFAULT 'universal' CHECK (
    category_type IN ('service', 'product', 'agricultural_resource', 'academy_course', 'universal')
  ),
  pillar TEXT NOT NULL DEFAULT 'general' CHECK (
    pillar IN ('agriExpert', 'agriAcademy', 'agriShopping', 'agriLocalizacao', 'general')
  ),
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT uq_category_type_slug UNIQUE (category_type, slug)
);

CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON public.categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_slug ON public.categories(slug);
CREATE INDEX IF NOT EXISTS idx_categories_type ON public.categories(category_type);
CREATE INDEX IF NOT EXISTS idx_categories_pillar ON public.categories(pillar);
CREATE INDEX IF NOT EXISTS idx_categories_is_active ON public.categories(is_active);

DROP TRIGGER IF EXISTS tr_categories_updated_at ON public.categories;
CREATE TRIGGER tr_categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
