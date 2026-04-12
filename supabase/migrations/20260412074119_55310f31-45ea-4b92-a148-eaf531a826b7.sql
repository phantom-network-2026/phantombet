
-- Add withdrawal_address to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS withdrawal_address text;

-- Deposit addresses table (one per user)
CREATE TABLE public.deposit_addresses (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  tron_address text NOT NULL,
  private_key_encrypted text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.deposit_addresses ENABLE ROW LEVEL SECURITY;

-- Users can see their own address (but we'll exclude private key in queries)
CREATE POLICY "Users can view own deposit address"
  ON public.deposit_addresses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role manages deposit addresses"
  ON public.deposit_addresses FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- Withdrawals table
CREATE TABLE public.withdrawals (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  amount numeric NOT NULL,
  destination_address text NOT NULL,
  tx_hash text,
  status text NOT NULL DEFAULT 'pending',
  error_message text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own withdrawals"
  ON public.withdrawals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can request withdrawals"
  ON public.withdrawals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all withdrawals"
  ON public.withdrawals FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update withdrawals"
  ON public.withdrawals FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role manages withdrawals"
  ON public.withdrawals FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE TRIGGER update_withdrawals_updated_at
  BEFORE UPDATE ON public.withdrawals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
