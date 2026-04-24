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
    IF v_rand < 0.20 THEN
      v_prize_value := 5; v_prize_detail := '5 Free Spins';
    ELSIF v_rand < 0.45 THEN
      v_prize_value := 10; v_prize_detail := '10 Free Spins';
    ELSIF v_rand < 0.70 THEN
      v_prize_value := 15; v_prize_detail := '15 Free Spins';
    ELSIF v_rand < 0.90 THEN
      v_prize_value := 20; v_prize_detail := '20 Free Spins';
    ELSE
      v_prize_value := 25; v_prize_detail := '25 Free Spins';
    END IF;
  ELSE
    IF v_rand < 0.34 THEN
      v_prize_value := 1; v_prize_detail := '1 Free Spin';
    ELSIF v_rand < 0.58 THEN
      v_prize_value := 3; v_prize_detail := '3 Free Spins';
    ELSIF v_rand < 0.76 THEN
      v_prize_value := 5; v_prize_detail := '5 Free Spins';
    ELSIF v_rand < 0.90 THEN
      v_prize_value := 10; v_prize_detail := '10 Free Spins';
    ELSIF v_rand < 0.97 THEN
      v_prize_value := 15; v_prize_detail := '15 Free Spins';
    ELSIF v_rand < 0.995 THEN
      v_prize_value := 20; v_prize_detail := '20 Free Spins';
    ELSE
      v_prize_value := 25; v_prize_detail := '25 Free Spins';
    END IF;
  END IF;

  INSERT INTO public.daily_spins (user_id, prize_type, prize_value, prize_detail, is_loyalty_spin, streak_count)
  VALUES (p_user_id, v_prize_type, v_prize_value, v_prize_detail, v_is_loyalty, v_streak + 1)
  RETURNING id INTO v_spin_id;

  spin_id := v_spin_id;
  prize_type := v_prize_type;
  prize_value := v_prize_value;
  prize_detail := v_prize_detail;
  is_loyalty := v_is_loyalty;
  streak := v_streak + 1;
  RETURN NEXT;
END;
$function$;