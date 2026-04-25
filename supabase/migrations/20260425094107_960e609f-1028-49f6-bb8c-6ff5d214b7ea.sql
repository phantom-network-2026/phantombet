-- Bonus status enum
DO $$ BEGIN
  CREATE TYPE public.user_bonus_status AS ENUM ('active', 'used', 'expired');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Bonus type enum (extensible)
DO $$ BEGIN
  CREATE TYPE public.user_bonus_type AS ENUM ('free_spin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Inventory table
CREATE TABLE IF NOT EXISTS public.user_bonuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  bonus_type public.user_bonus_type NOT NULL DEFAULT 'free_spin',
  source TEXT NOT NULL DEFAULT 'prize_reel',
  source_label TEXT,
  total_count INTEGER NOT NULL DEFAULT 1,
  remaining_count INTEGER NOT NULL DEFAULT 1,
  stake_value NUMERIC NOT NULL DEFAULT 0.10,
  status public.user_bonus_status NOT NULL DEFAULT 'active',
  awarded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '30 days'),
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_bonuses_user_status ON public.user_bonuses(user_id, status, expires_at);

ALTER TABLE public.user_bonuses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own bonuses" ON public.user_bonuses;
CREATE POLICY "Users view own bonuses" ON public.user_bonuses
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins view all bonuses" ON public.user_bonuses;
CREATE POLICY "Admins view all bonuses" ON public.user_bonuses
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'owner'::app_role));

DROP POLICY IF EXISTS "Service role manages bonuses" ON public.user_bonuses;
CREATE POLICY "Service role manages bonuses" ON public.user_bonuses
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TRIGGER trg_user_bonuses_updated_at
  BEFORE UPDATE ON public.user_bonuses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Expire old bonuses (called opportunistically)
CREATE OR REPLACE FUNCTION public.expire_old_bonuses(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  UPDATE public.user_bonuses
    SET status = 'expired'
    WHERE user_id = p_user_id
      AND status = 'active'
      AND expires_at < now();
END;
$fn$;

-- Consume one free spin from oldest active stack
CREATE OR REPLACE FUNCTION public.consume_free_spin(p_user_id UUID)
RETURNS TABLE(success BOOLEAN, remaining_total INTEGER, stake_value NUMERIC)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_row public.user_bonuses;
  v_total INTEGER;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  PERFORM public.expire_old_bonuses(p_user_id);

  SELECT * INTO v_row
  FROM public.user_bonuses
  WHERE user_id = p_user_id
    AND status = 'active'
    AND remaining_count > 0
    AND expires_at > now()
    AND bonus_type = 'free_spin'
  ORDER BY expires_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF v_row.id IS NULL THEN
    RETURN QUERY SELECT false, 0, 0::numeric;
    RETURN;
  END IF;

  UPDATE public.user_bonuses
    SET remaining_count = remaining_count - 1,
        status = CASE WHEN remaining_count - 1 <= 0 THEN 'used' ELSE 'active' END,
        used_at = CASE WHEN remaining_count - 1 <= 0 THEN now() ELSE used_at END
  WHERE id = v_row.id;

  SELECT COALESCE(SUM(remaining_count), 0)::int INTO v_total
  FROM public.user_bonuses
  WHERE user_id = p_user_id
    AND status = 'active'
    AND expires_at > now()
    AND bonus_type = 'free_spin';

  RETURN QUERY SELECT true, v_total, v_row.stake_value;
END;
$fn$;

-- Hook free spin awards into perform_daily_spin
CREATE OR REPLACE FUNCTION public.perform_daily_spin(p_user_id uuid)
 RETURNS TABLE(spin_id uuid, prize_type text, prize_value numeric, prize_detail text, is_loyalty boolean, streak integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_last_spin timestamptz;
  v_hours_since numeric;
  v_streak integer := 0;
  v_is_loyalty boolean := false;
  v_prize_type text;
  v_prize_value numeric;
  v_prize_detail text;
  v_spin_id uuid;
  v_rand numeric;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT spun_at INTO v_last_spin
  FROM public.daily_spins
  WHERE user_id = p_user_id
  ORDER BY spun_at DESC
  LIMIT 1;

  IF v_last_spin IS NOT NULL THEN
    v_hours_since := EXTRACT(EPOCH FROM (now() - v_last_spin)) / 3600.0;
    IF v_hours_since < 24 THEN
      RAISE EXCEPTION 'Must wait 24 hours between spins. Hours remaining: %', ROUND((24 - v_hours_since)::numeric, 1);
    END IF;
  END IF;

  SELECT COUNT(*)::integer INTO v_streak
  FROM (
    SELECT spun_at,
           ROW_NUMBER() OVER (ORDER BY spun_at DESC) AS rn
    FROM public.daily_spins
    WHERE user_id = p_user_id
    ORDER BY spun_at DESC
    LIMIT 7
  ) recent
  WHERE DATE(spun_at) >= CURRENT_DATE - (rn || ' days')::interval;

  v_is_loyalty := v_streak >= 7;
  v_prize_type := 'free_spin';
  v_rand := random();

  IF v_is_loyalty THEN
    IF v_rand < 0.20 THEN v_prize_value := 5; v_prize_detail := '5 Free Spins';
    ELSIF v_rand < 0.45 THEN v_prize_value := 10; v_prize_detail := '10 Free Spins';
    ELSIF v_rand < 0.70 THEN v_prize_value := 15; v_prize_detail := '15 Free Spins';
    ELSIF v_rand < 0.90 THEN v_prize_value := 20; v_prize_detail := '20 Free Spins';
    ELSE v_prize_value := 25; v_prize_detail := '25 Free Spins';
    END IF;
  ELSE
    IF v_rand < 0.34 THEN v_prize_value := 1; v_prize_detail := '1 Free Spin';
    ELSIF v_rand < 0.58 THEN v_prize_value := 3; v_prize_detail := '3 Free Spins';
    ELSIF v_rand < 0.76 THEN v_prize_value := 5; v_prize_detail := '5 Free Spins';
    ELSIF v_rand < 0.90 THEN v_prize_value := 10; v_prize_detail := '10 Free Spins';
    ELSIF v_rand < 0.97 THEN v_prize_value := 15; v_prize_detail := '15 Free Spins';
    ELSIF v_rand < 0.995 THEN v_prize_value := 20; v_prize_detail := '20 Free Spins';
    ELSE v_prize_value := 25; v_prize_detail := '25 Free Spins';
    END IF;
  END IF;

  INSERT INTO public.daily_spins (user_id, prize_type, prize_value, prize_detail, is_loyalty_spin, streak_count)
  VALUES (p_user_id, v_prize_type, v_prize_value, v_prize_detail, v_is_loyalty, v_streak + 1)
  RETURNING id INTO v_spin_id;

  -- Deposit free spins into bonus inventory
  INSERT INTO public.user_bonuses (
    user_id, bonus_type, source, source_label, total_count, remaining_count, stake_value, expires_at
  ) VALUES (
    p_user_id, 'free_spin', 'prize_reel',
    CASE WHEN v_is_loyalty THEN 'Loyalty Daily Spin' ELSE 'Daily Prize Reel' END,
    v_prize_value::int, v_prize_value::int, 0.10, now() + INTERVAL '30 days'
  );

  spin_id := v_spin_id;
  prize_type := v_prize_type;
  prize_value := v_prize_value;
  prize_detail := v_prize_detail;
  is_loyalty := v_is_loyalty;
  streak := v_streak + 1;
  RETURN NEXT;
END;
$function$;