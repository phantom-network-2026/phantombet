
CREATE TABLE public.daily_spins (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  prize_type text NOT NULL,
  prize_value numeric NOT NULL DEFAULT 0,
  prize_detail text,
  is_loyalty_spin boolean NOT NULL DEFAULT false,
  streak_count integer NOT NULL DEFAULT 1,
  spun_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.daily_spins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own spins" ON public.daily_spins
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own spins" ON public.daily_spins
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all spins" ON public.daily_spins
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_daily_spins_user_date ON public.daily_spins (user_id, spun_at DESC);
