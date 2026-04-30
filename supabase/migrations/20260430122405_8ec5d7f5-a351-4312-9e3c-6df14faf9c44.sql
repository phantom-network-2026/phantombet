-- Exchange admin: dedicated tables for full management
CREATE TABLE IF NOT EXISTS public.exchange_coins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol text NOT NULL UNIQUE,
  name text NOT NULL,
  coingecko_id text,
  network text NOT NULL DEFAULT 'Ethereum',
  sector text NOT NULL DEFAULT 'Majors',
  logo_url text,
  fallback_icon text,
  price_usd numeric NOT NULL DEFAULT 0,
  change_24h numeric NOT NULL DEFAULT 0,
  volume_24h numeric NOT NULL DEFAULT 0,
  market_cap numeric NOT NULL DEFAULT 0,
  circulating_supply numeric NOT NULL DEFAULT 0,
  max_supply numeric,
  risk_score integer NOT NULL DEFAULT 30,
  status text NOT NULL DEFAULT 'listed', -- listed | watch | incubating | delisted | maintenance | scheduled
  is_featured boolean NOT NULL DEFAULT false,
  is_trading_enabled boolean NOT NULL DEFAULT true,
  is_deposit_enabled boolean NOT NULL DEFAULT true,
  is_withdraw_enabled boolean NOT NULL DEFAULT true,
  withdrawal_min numeric NOT NULL DEFAULT 0,
  withdrawal_fee numeric NOT NULL DEFAULT 0,
  daily_withdraw_limit numeric NOT NULL DEFAULT 0,
  kyc_tier_required integer NOT NULL DEFAULT 0,
  contract_address text,
  hot_wallet_address text,
  cold_wallet_address text,
  scheduled_listing_at timestamptz,
  description text,
  whitepaper_url text,
  website_url text,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_exchange_coins_order ON public.exchange_coins(display_order);
CREATE INDEX IF NOT EXISTS idx_exchange_coins_status ON public.exchange_coins(status);

ALTER TABLE public.exchange_coins ENABLE ROW LEVEL SECURITY;

-- Public can view non-delisted coins; admins/owners full access
CREATE POLICY "Anyone can view non-delisted coins"
ON public.exchange_coins FOR SELECT
USING (status <> 'delisted' OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'owner'::app_role));

CREATE POLICY "Admins can insert coins"
ON public.exchange_coins FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'owner'::app_role));

CREATE POLICY "Admins can update coins"
ON public.exchange_coins FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'owner'::app_role));

CREATE POLICY "Admins can delete coins"
ON public.exchange_coins FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'owner'::app_role));

CREATE TRIGGER trg_exchange_coins_updated_at
BEFORE UPDATE ON public.exchange_coins
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Audit log for admin changes to exchange
CREATE TABLE IF NOT EXISTS public.exchange_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL,
  action text NOT NULL,
  target_type text NOT NULL,
  target_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.exchange_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view exchange audit"
ON public.exchange_audit_log FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'owner'::app_role));

CREATE POLICY "Admins insert exchange audit"
ON public.exchange_audit_log FOR INSERT TO authenticated
WITH CHECK ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'owner'::app_role)) AND auth.uid() = actor_id);

-- Storage bucket for coin logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('exchange-assets', 'exchange-assets', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public can view exchange assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'exchange-assets');

CREATE POLICY "Admins can upload exchange assets"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'exchange-assets' AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'owner'::app_role)));

CREATE POLICY "Admins can update exchange assets"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'exchange-assets' AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'owner'::app_role)));

CREATE POLICY "Admins can delete exchange assets"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'exchange-assets' AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'owner'::app_role)));