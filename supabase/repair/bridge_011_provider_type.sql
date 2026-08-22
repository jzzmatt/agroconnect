-- Paste this if 011 failed with:
--   new row for relation "provider_profiles" violates check constraint
--   "provider_profiles_provider_type_check"
-- Then re-run 011. The seed uses ON CONFLICT DO NOTHING.

ALTER TABLE public.provider_profiles DROP CONSTRAINT IF EXISTS provider_profiles_provider_type_check;
ALTER TABLE public.provider_profiles ADD CONSTRAINT provider_profiles_provider_type_check CHECK (
  provider_type IN (
    'individual',
    'company',
    'cooperative',
    'organization',
    'technician',
    'veterinarian',
    'agronomist',
    'instructor',
    'supplier',
    'agricultural_consultant'
  )
);
