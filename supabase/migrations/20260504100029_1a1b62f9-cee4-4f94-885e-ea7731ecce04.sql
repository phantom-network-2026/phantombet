
-- 1. Create admin-only table for sensitive wallet addresses
CREATE TABLE IF NOT EXISTS public.exchange_coin_wallets (
  coin_id uuid PRIMARY KEY REFERENCES public.exchange_coins(id) ON DELETE CASCADE,
  hot_wallet_address text,
  cold_wallet_address text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.exchange_coin_wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read wallets"
  ON public.exchange_coin_wallets FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

CREATE POLICY "Admins insert wallets"
  ON public.exchange_coin_wallets FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

CREATE POLICY "Admins update wallets"
  ON public.exchange_coin_wallets FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

CREATE POLICY "Admins delete wallets"
  ON public.exchange_coin_wallets FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

-- 2. Migrate existing wallet data
INSERT INTO public.exchange_coin_wallets (coin_id, hot_wallet_address, cold_wallet_address)
SELECT id, hot_wallet_address, cold_wallet_address
FROM public.exchange_coins
WHERE hot_wallet_address IS NOT NULL OR cold_wallet_address IS NOT NULL
ON CONFLICT (coin_id) DO NOTHING;

-- 3. Drop the sensitive columns from the public table
ALTER TABLE public.exchange_coins DROP COLUMN IF EXISTS hot_wallet_address;
ALTER TABLE public.exchange_coins DROP COLUMN IF EXISTS cold_wallet_address;

-- 4. Tighten exchange_coins SELECT policy to authenticated users only
DROP POLICY IF EXISTS "Anyone can view non-delisted coins" ON public.exchange_coins;
CREATE POLICY "Authenticated users view non-delisted coins"
  ON public.exchange_coins FOR SELECT
  TO authenticated
  USING (status <> 'delisted' OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));
