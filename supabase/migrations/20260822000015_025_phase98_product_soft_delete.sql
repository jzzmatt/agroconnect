-- Phase 9.8: soft-delete support for marketplace products

ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_status_check;
ALTER TABLE public.products ADD CONSTRAINT products_status_check CHECK (
  status IN (
    'draft',
    'published',
    'active',
    'paused',
    'out_of_stock',
    'archived',
    'rejected',
    'deleted'
  )
);

COMMENT ON COLUMN public.products.status IS 'Catalog lifecycle. deleted = soft delete; hidden from marketplace but preserved for historical orders.';
