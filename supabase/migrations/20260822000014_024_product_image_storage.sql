-- Public bucket for AgriProduct photos. Binaries stay out of Postgres rows.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'storage') THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('product-images', 'product-images', true)
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;
