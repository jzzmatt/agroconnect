-- Phase 9.8: Product soft delete support
-- Adds deleted status and deleted_at timestamp for safe product removal
-- while preserving historical order references.

ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_status_check;
ALTER TABLE public.products ADD CONSTRAINT products_status_check CHECK (
  status IN ('draft', 'published', 'active', 'paused', 'out_of_stock', 'archived', 'rejected', 'deleted')
);

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_products_deleted_at
  ON public.products(deleted_at)
  WHERE deleted_at IS NOT NULL;

-- Ensure marketplace queries exclude deleted products
DROP POLICY IF EXISTS "Public read active products" ON public.products;
CREATE POLICY "Public read active products" ON public.products
  FOR SELECT
  USING (status IN ('active', 'published'));
