
-- 1. site_settings: restrict SELECT to admins only
DROP POLICY IF EXISTS "Anyone can read site settings" ON public.site_settings;

CREATE POLICY "Only admins can read site settings"
ON public.site_settings
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 2. scratch_card_pool: fix SELECT to only show user's own claimed cards
DROP POLICY IF EXISTS "Users can view their own cards" ON public.scratch_card_pool;

CREATE POLICY "Users can view their own claimed cards"
ON public.scratch_card_pool
FOR SELECT
TO authenticated
USING (claimed_by = auth.uid());

-- 3. profiles: remove overly permissive SELECT, create public view
DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON public.profiles;

CREATE VIEW public.profiles_public
WITH (security_invoker = on) AS
SELECT
  user_id,
  username,
  avatar_url,
  bio,
  biggest_win,
  biggest_win_game,
  has_animated_avatar,
  has_animated_border,
  border_style,
  social_links,
  created_at
FROM public.profiles;

-- Allow all authenticated users to read the public view
CREATE POLICY "Authenticated users can view public profiles via view"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR public.has_role(auth.uid(), 'admin')
);

-- Note: This replaces the broad authenticated SELECT. Users see their own full profile,
-- admins see all. For other-user lookups, code will use profiles_public view.

-- 4. daily_spins: move to server-side RPC
-- Remove direct INSERT policy
DROP POLICY IF EXISTS "Users can insert own spins" ON public.daily_spins;

-- Only service_role/RPC can insert
CREATE POLICY "Only service role can insert spins"
ON public.daily_spins
FOR INSERT
TO service_role
WITH CHECK (true);

-- Create the server-side spin function
CREATE OR REPLACE FUNCTION public.perform_daily_spin(p_user_id uuid)
RETURNS TABLE(
  spin_id uuid,
  prize_type text,
  prize_value numeric,
  prize_detail text,
  is_loyalty boolean,
  streak integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  -- Verify caller is the user
  IF auth.uid() IS NULL OR auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Check last spin
  SELECT spun_at INTO v_last_spin
  FROM daily_spins
  WHERE user_id = p_user_id
  ORDER BY spun_at DESC
  LIMIT 1;

  IF v_last_spin IS NOT NULL THEN
    v_hours_since := EXTRACT(EPOCH FROM (now() - v_last_spin)) / 3600.0;
    IF v_hours_since < 24 THEN
      RAISE EXCEPTION 'Must wait 24 hours between spins. Hours remaining: %', ROUND((24 - v_hours_since)::numeric, 1);
    END IF;
  END IF;

  -- Calculate streak
  SELECT COUNT(*)::integer INTO v_streak
  FROM (
    SELECT spun_at,
           ROW_NUMBER() OVER (ORDER BY spun_at DESC) as rn
    FROM daily_spins
    WHERE user_id = p_user_id
    ORDER BY spun_at DESC
    LIMIT 7
  ) recent
  WHERE DATE(spun_at) >= CURRENT_DATE - (rn || ' days')::interval;

  v_is_loyalty := v_streak >= 7;

  -- Server-side prize determination using random()
  v_rand := random();
  IF v_rand < 0.30 THEN
    v_prize_type := 'coins'; v_prize_value := 5; v_prize_detail := '$5 Coins';
  ELSIF v_rand < 0.55 THEN
    v_prize_type := 'coins'; v_prize_value := 10; v_prize_detail := '$10 Coins';
  ELSIF v_rand < 0.70 THEN
    v_prize_type := 'coins'; v_prize_value := 25; v_prize_detail := '$25 Coins';
  ELSIF v_rand < 0.82 THEN
    v_prize_type := 'coins'; v_prize_value := 50; v_prize_detail := '$50 Coins';
  ELSIF v_rand < 0.90 THEN
    v_prize_type := 'coins'; v_prize_value := 100; v_prize_detail := '$100 Coins';
  ELSIF v_rand < 0.95 THEN
    v_prize_type := 'coins'; v_prize_value := 250; v_prize_detail := '$250 Coins';
  ELSIF v_rand < 0.98 THEN
    v_prize_type := 'coins'; v_prize_value := 500; v_prize_detail := '$500 Coins';
  ELSE
    v_prize_type := 'coins'; v_prize_value := 1000; v_prize_detail := '$1000 Jackpot';
  END IF;

  -- Double for loyalty
  IF v_is_loyalty THEN
    v_prize_value := v_prize_value * 2;
    v_prize_detail := v_prize_detail || ' (x2 Loyalty)';
  END IF;

  -- Insert spin record
  INSERT INTO daily_spins (user_id, prize_type, prize_value, prize_detail, is_loyalty_spin, streak_count)
  VALUES (p_user_id, v_prize_type, v_prize_value, v_prize_detail, v_is_loyalty, v_streak + 1)
  RETURNING id INTO v_spin_id;

  -- Credit balance
  UPDATE profiles SET balance = balance + v_prize_value WHERE user_id = p_user_id;

  spin_id := v_spin_id;
  prize_type := v_prize_type;
  prize_value := v_prize_value;
  prize_detail := v_prize_detail;
  is_loyalty := v_is_loyalty;
  streak := v_streak + 1;
  RETURN NEXT;
END;
$$;
