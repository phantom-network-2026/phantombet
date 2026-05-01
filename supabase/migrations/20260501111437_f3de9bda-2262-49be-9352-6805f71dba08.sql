
-- 1. Remove sensitive tables from Realtime publication
ALTER PUBLICATION supabase_realtime DROP TABLE public.messages;
ALTER PUBLICATION supabase_realtime DROP TABLE public.sports_bets;
ALTER PUBLICATION supabase_realtime DROP TABLE public.football_bets;

-- 2. Restrict party_lobbies.password_hash to service_role only (column-level)
REVOKE SELECT (password_hash) ON public.party_lobbies FROM anon, authenticated;

-- 3. Password reset nonces table (short-lived, single-use)
CREATE TABLE IF NOT EXISTS public.password_reset_nonces (
  nonce text PRIMARY KEY,
  user_id uuid NOT NULL,
  expires_at timestamptz NOT NULL,
  used boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.password_reset_nonces ENABLE ROW LEVEL SECURITY;

-- Only service_role can access (no policies for authenticated/anon = denied)
CREATE POLICY "Service role manages reset nonces"
  ON public.password_reset_nonces
  AS PERMISSIVE
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_password_reset_nonces_expires
  ON public.password_reset_nonces(expires_at);
