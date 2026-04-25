
-- Status enum
DO $$ BEGIN
  CREATE TYPE public.free_bet_status AS ENUM ('pending', 'qualified', 'awarded', 'expired');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.free_bet_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  status public.free_bet_status NOT NULL DEFAULT 'pending',
  deposit_progress numeric NOT NULL DEFAULT 0,
  wager_progress numeric NOT NULL DEFAULT 0,
  deposit_required numeric NOT NULL DEFAULT 10,
  wager_required numeric NOT NULL DEFAULT 10,
  award_amount numeric NOT NULL DEFAULT 5,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  awarded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.free_bet_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own free bet progress"
ON public.free_bet_progress FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Service role manages free bet progress"
ON public.free_bet_progress FOR ALL
TO service_role
USING (true) WITH CHECK (true);

CREATE POLICY "Admins view all free bet progress"
ON public.free_bet_progress FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'owner'::app_role));

CREATE TRIGGER trg_free_bet_progress_updated_at
BEFORE UPDATE ON public.free_bet_progress
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Extend signup trigger to insert the free bet row
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_bonus numeric := 0;
  v_config jsonb;
  v_wallet_mode text;
BEGIN
  SELECT (value->>'mode') INTO v_wallet_mode FROM public.site_settings WHERE key = 'wallet_mode' LIMIT 1;

  IF v_wallet_mode IS NULL OR v_wallet_mode = 'mock' THEN
    SELECT value INTO v_config FROM public.site_settings WHERE key = 'welcome_bonus' LIMIT 1;
    IF v_config IS NULL OR (v_config->>'enabled')::boolean IS DISTINCT FROM false THEN
      v_bonus := COALESCE((v_config->>'amount')::numeric, 100);
    END IF;
  END IF;

  INSERT INTO public.profiles (user_id, username, balance, real_balance)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'username', NEW.email), v_bonus, 0.00);

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');

  -- Free bet enrollment
  INSERT INTO public.free_bet_progress (user_id) VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$function$;

-- Helper function: increment progress, auto-award when met
CREATE OR REPLACE FUNCTION public.bump_free_bet_progress(
  p_user_id uuid,
  p_deposit_amount numeric DEFAULT 0,
  p_wager_amount numeric DEFAULT 0
) RETURNS public.free_bet_status
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.free_bet_progress;
BEGIN
  SELECT * INTO v_row FROM public.free_bet_progress WHERE user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO public.free_bet_progress (user_id) VALUES (p_user_id)
    RETURNING * INTO v_row;
  END IF;

  -- Expire if deadline passed and not yet awarded
  IF v_row.status IN ('pending','qualified') AND v_row.expires_at < now() THEN
    UPDATE public.free_bet_progress SET status = 'expired' WHERE id = v_row.id;
    RETURN 'expired';
  END IF;

  -- Already done: nothing to do
  IF v_row.status IN ('awarded','expired') THEN
    RETURN v_row.status;
  END IF;

  UPDATE public.free_bet_progress
  SET deposit_progress = LEAST(deposit_required, deposit_progress + GREATEST(p_deposit_amount, 0)),
      wager_progress   = LEAST(wager_required,   wager_progress   + GREATEST(p_wager_amount, 0))
  WHERE id = v_row.id
  RETURNING * INTO v_row;

  -- Award if both thresholds met
  IF v_row.deposit_progress >= v_row.deposit_required AND v_row.wager_progress >= v_row.wager_required THEN
    UPDATE public.profiles
      SET balance = balance + v_row.award_amount
      WHERE user_id = p_user_id;

    INSERT INTO public.transactions (user_id, amount, type, description)
    VALUES (p_user_id, v_row.award_amount, 'bonus',
            format('Welcome free bet awarded: $%s', v_row.award_amount::text));

    UPDATE public.free_bet_progress
      SET status = 'awarded', awarded_at = now()
      WHERE id = v_row.id;

    RETURN 'awarded';
  END IF;

  RETURN v_row.status;
END;
$$;

-- Backfill existing users
INSERT INTO public.free_bet_progress (user_id)
SELECT user_id FROM public.profiles
ON CONFLICT (user_id) DO NOTHING;
