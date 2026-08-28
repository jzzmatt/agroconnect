-- Live databases that skipped 011 reject service inserts with:
-- Could not find the 'contact_preference' column of 'services' in the schema cache
-- (PostgREST PGRST204). Re-assert the optional marketplace columns and reload
-- the API schema cache. Safe to run when 011 already applied.

ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS location_type TEXT DEFAULT 'service_area';

ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS contact_preference TEXT DEFAULT 'platform';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'services_location_type_check'
      AND conrelid = 'public.services'::regclass
  ) THEN
    ALTER TABLE public.services
      ADD CONSTRAINT services_location_type_check
      CHECK (location_type IN ('physical_location', 'service_area', 'remote'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'services_contact_preference_check'
      AND conrelid = 'public.services'::regclass
  ) THEN
    ALTER TABLE public.services
      ADD CONSTRAINT services_contact_preference_check
      CHECK (contact_preference IN ('platform', 'phone', 'whatsapp', 'email'));
  END IF;
END $$;

ALTER TABLE public.services DROP CONSTRAINT IF EXISTS services_status_check;
ALTER TABLE public.services ADD CONSTRAINT services_status_check CHECK (
  status IN ('draft', 'published', 'active', 'paused', 'archived')
);

NOTIFY pgrst, 'reload schema';
