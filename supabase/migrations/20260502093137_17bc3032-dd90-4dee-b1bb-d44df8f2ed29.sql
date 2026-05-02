
-- Per-coin balances
CREATE TABLE IF NOT EXISTS public.user_coin_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  symbol text NOT NULL,
  available numeric NOT NULL DEFAULT 0,
  locked numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, symbol)
);

CREATE INDEX IF NOT EXISTS idx_user_coin_balances_user ON public.user_coin_balances(user_id);

ALTER TABLE public.user_coin_balances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own coin balances"
  ON public.user_coin_balances FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins view all coin balances"
  ON public.user_coin_balances FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'owner'::app_role));

CREATE POLICY "Service role manages coin balances"
  ON public.user_coin_balances FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE TRIGGER update_user_coin_balances_updated_at
  BEFORE UPDATE ON public.user_coin_balances
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Historical prices for real charts
CREATE TABLE IF NOT EXISTS public.coin_price_history (
  id bigserial PRIMARY KEY,
  symbol text NOT NULL,
  price_usd numeric NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_coin_price_history_symbol_time
  ON public.coin_price_history(symbol, recorded_at DESC);

ALTER TABLE public.coin_price_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view price history"
  ON public.coin_price_history FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Service role manages price history"
  ON public.coin_price_history FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- Track price sync freshness
ALTER TABLE public.exchange_coins
  ADD COLUMN IF NOT EXISTS last_price_sync_at timestamptz;
