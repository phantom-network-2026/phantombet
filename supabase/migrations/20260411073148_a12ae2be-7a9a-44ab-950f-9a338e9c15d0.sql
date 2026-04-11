
-- Create deposits table
CREATE TABLE public.deposits (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  amount_usd numeric NOT NULL,
  crypto_currency text NOT NULL DEFAULT 'btc',
  payment_id text,
  payment_address text,
  payment_amount numeric,
  status text NOT NULL DEFAULT 'pending',
  nowpayments_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.deposits ENABLE ROW LEVEL SECURITY;

-- Users can view their own deposits
CREATE POLICY "Users can view own deposits"
ON public.deposits FOR SELECT
USING (auth.uid() = user_id);

-- Admins can view all deposits
CREATE POLICY "Admins can view all deposits"
ON public.deposits FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Service role can do everything (for edge functions)
CREATE POLICY "Service role full access"
ON public.deposits FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER update_deposits_updated_at
BEFORE UPDATE ON public.deposits
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
