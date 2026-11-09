-- A paid course uses the existing cart and order tables. product_id stays for products.

ALTER TABLE public.cart_items
  ALTER COLUMN product_id DROP NOT NULL;

ALTER TABLE public.cart_items
  ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE;

ALTER TABLE public.cart_items
  DROP CONSTRAINT IF EXISTS ck_cart_items_product_or_course;

ALTER TABLE public.cart_items
  ADD CONSTRAINT ck_cart_items_product_or_course CHECK (
    (product_id IS NOT NULL AND course_id IS NULL)
    OR (product_id IS NULL AND course_id IS NOT NULL)
  );

CREATE UNIQUE INDEX IF NOT EXISTS uq_cart_course
  ON public.cart_items (cart_id, course_id)
  WHERE course_id IS NOT NULL;

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_order_items_course ON public.order_items (course_id);
