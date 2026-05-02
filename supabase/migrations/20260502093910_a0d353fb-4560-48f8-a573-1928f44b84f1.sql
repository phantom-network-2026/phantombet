CREATE TABLE public.coin_swaps (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  from_symbol text NOT NULL,
  from_amount numeric NOT NULL,
  to_symbol text NOT NULL,
  to_amount numeric NOT NULL,
  rate numeric NOT NULL,
  fee_usd numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'completed',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_coin_swaps_user ON public.coin_swaps(user_id, created_at DESC);

ALTER TABLE public.coin_swaps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own swaps"
ON public.coin_swaps FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins view all swaps"
ON public.coin_swaps FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'owner'::app_role));

CREATE POLICY "Service role manages swaps"
ON public.coin_swaps FOR ALL
TO service_role
USING (true) WITH CHECK (true);