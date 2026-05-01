-- Coin listing applications
CREATE TABLE public.coin_listing_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  applicant_user_id uuid,
  email text NOT NULL,
  project_name text NOT NULL,
  symbol text NOT NULL,
  network text,
  contract_address text,
  website text,
  whitepaper_url text,
  description text,
  team_info text,
  social_links text,
  extra_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  admin_notes text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.coin_listing_applications ENABLE ROW LEVEL SECURITY;

-- Anyone (incl. anon guests) can submit a listing application
CREATE POLICY "Anyone can submit coin listing"
ON public.coin_listing_applications
FOR INSERT
TO public
WITH CHECK (true);

-- Admins/owners can view all
CREATE POLICY "Admins can view applications"
ON public.coin_listing_applications
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'owner'::app_role));

-- Applicants can view their own (when authed)
CREATE POLICY "Users view own applications"
ON public.coin_listing_applications
FOR SELECT
TO authenticated
USING (auth.uid() = applicant_user_id);

-- Admins/owners can update (approve/reject/notes)
CREATE POLICY "Admins update applications"
ON public.coin_listing_applications
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'owner'::app_role));

-- Admins/owners can delete
CREATE POLICY "Admins delete applications"
ON public.coin_listing_applications
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'owner'::app_role));

CREATE TRIGGER trg_coin_listing_apps_updated_at
BEFORE UPDATE ON public.coin_listing_applications
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Allow public (unauthenticated) to read the two specific config keys via a security-definer RPC
CREATE OR REPLACE FUNCTION public.get_public_setting(p_key text)
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT value FROM public.site_settings
  WHERE key = p_key
    AND p_key IN ('help_info_links', 'coin_listing_form_fields', 'coin_listing_banner')
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_setting(text) TO anon, authenticated;

-- Seed defaults (idempotent)
INSERT INTO public.site_settings (key, value)
VALUES (
  'help_info_links',
  '{"links":[
    {"id":"faq","label":"Frequently Asked Questions","url":"#","description":"Common questions and answers"},
    {"id":"terms","label":"Terms of Service","url":"#","description":"Platform rules and agreements"},
    {"id":"privacy","label":"Privacy Policy","url":"#","description":"How we protect your data"},
    {"id":"fees","label":"Fees & Limits","url":"#","description":"Trading and withdrawal fees"},
    {"id":"contact","label":"Contact Us","url":"#","description":"Reach our support team"},
    {"id":"status","label":"System Status","url":"#","description":"Live platform health"}
  ]}'::jsonb
)
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.site_settings (key, value)
VALUES (
  'coin_listing_form_fields',
  '{"fields":[
    {"id":"project_name","label":"Project Name","type":"text","required":true,"placeholder":"e.g. Phantom Token"},
    {"id":"symbol","label":"Symbol / Ticker","type":"text","required":true,"placeholder":"e.g. PHX"},
    {"id":"email","label":"Contact Email","type":"email","required":true,"placeholder":"team@yourproject.com"},
    {"id":"network","label":"Network / Chain","type":"text","required":false,"placeholder":"Ethereum, Solana, BNB Chain..."},
    {"id":"contract_address","label":"Contract Address","type":"text","required":false,"placeholder":"0x..."},
    {"id":"website","label":"Website","type":"url","required":false,"placeholder":"https://"},
    {"id":"whitepaper_url","label":"Whitepaper URL","type":"url","required":false,"placeholder":"https://"},
    {"id":"description","label":"Project Description","type":"textarea","required":true,"placeholder":"Tell us about your project..."},
    {"id":"team_info","label":"Team Information","type":"textarea","required":false,"placeholder":"Founders, team size, location..."},
    {"id":"social_links","label":"Social Links","type":"textarea","required":false,"placeholder":"Twitter, Telegram, Discord..."}
  ]}'::jsonb
)
ON CONFLICT (key) DO NOTHING;

-- Add unique constraint on key if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'site_settings_key_key'
  ) THEN
    BEGIN
      ALTER TABLE public.site_settings ADD CONSTRAINT site_settings_key_key UNIQUE (key);
    EXCEPTION WHEN duplicate_table THEN NULL;
    END;
  END IF;
END $$;