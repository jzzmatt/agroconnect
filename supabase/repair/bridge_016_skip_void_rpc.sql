-- Finish 016 without replacing the existing TEXT RPC.
-- You already have activate_user_subscription_plan(text) RETURNS TEXT from 022.
-- Do NOT recreate it as RETURNS VOID. Then continue with 017.

ALTER TABLE public.profiles ALTER COLUMN subscription_plan DROP DEFAULT;
ALTER TABLE public.profiles ALTER COLUMN subscription_plan DROP NOT NULL;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_subscription_plan_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_subscription_plan_check CHECK (
  subscription_plan IS NULL OR
  subscription_plan IN ('basic', 'professional', 'business', 'enterprise', 'free', 'premium')
);
