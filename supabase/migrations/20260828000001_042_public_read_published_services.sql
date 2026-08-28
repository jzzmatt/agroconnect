-- Public AgriService discovery must show published services, not only legacy `active` rows.
-- Mirrors products policy in 020_phase96_animals_land_product_video.sql.

DROP POLICY IF EXISTS "Public read active services" ON public.services;
DROP POLICY IF EXISTS "Public read published services" ON public.services;

CREATE POLICY "Public read published services"
  ON public.services
  FOR SELECT
  USING (status IN ('active', 'published'));
