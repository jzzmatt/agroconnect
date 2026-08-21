-- ==============================================================================
-- AGROCONNECT — Phase 2B Migration: Add Theme Preference to Profiles
-- Allowed values: 'light', 'dark' (Default: 'light')
-- Security: Maintained under existing profiles RLS (users only update their own)
-- ==============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'theme_preference'
  ) THEN
    ALTER TABLE public.profiles
    ADD COLUMN theme_preference TEXT DEFAULT 'light' NOT NULL
    CHECK (theme_preference IN ('light', 'dark'));
  END IF;
END $$;
