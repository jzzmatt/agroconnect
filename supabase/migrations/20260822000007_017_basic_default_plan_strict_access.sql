-- ==============================================================================
-- AGROCONNECT — Phase 8.5 Revision v4: Migration 017
-- Basic Default Plan & Strict Authorization Engine
-- 1. Sets DEFAULT 'basic' on profiles.subscription_plan for all new users
-- 2. Backfills any legacy profiles with NULL or invalid plan to 'basic'
-- 3. Updates constraint to guarantee non-null 'basic' starting state
-- ==============================================================================

-- 1. Backfill any existing profiles with NULL or invalid plan to 'basic'
UPDATE public.profiles
SET subscription_plan = 'basic'
WHERE subscription_plan IS NULL
   OR subscription_plan NOT IN ('basic', 'professional', 'business', 'enterprise');

-- 2. Alter column to have DEFAULT 'basic' and NOT NULL constraint
ALTER TABLE public.profiles ALTER COLUMN subscription_plan SET DEFAULT 'basic';
ALTER TABLE public.profiles ALTER COLUMN subscription_plan SET NOT NULL;

-- 3. Update check constraint on subscription_plan
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_subscription_plan_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_subscription_plan_check CHECK (
  subscription_plan IN ('basic', 'professional', 'business', 'enterprise')
);
