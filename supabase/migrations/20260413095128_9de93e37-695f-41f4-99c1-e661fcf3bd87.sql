
-- Add seed phrase column for account recovery
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS seed_phrase text DEFAULT NULL;

-- Add HIGH ROLLER columns
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS has_high_roller boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS name_color text DEFAULT NULL;
