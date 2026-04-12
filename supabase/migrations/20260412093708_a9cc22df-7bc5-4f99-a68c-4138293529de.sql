
-- Add XP column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS xp numeric NOT NULL DEFAULT 0;

-- Function to grant XP and return new totals
CREATE OR REPLACE FUNCTION public.grant_xp(p_user_id uuid, p_amount numeric)
RETURNS TABLE(new_xp numeric, new_level integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_xp numeric;
  v_level integer;
BEGIN
  -- Only service role or the user themselves can call this
  UPDATE profiles SET xp = xp + p_amount WHERE user_id = p_user_id
  RETURNING profiles.xp INTO v_xp;

  IF v_xp IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- Calculate level from XP: total_xp_for_level = 20*L + 1.5*L^2
  -- Solve: 1.5*L^2 + 20*L - xp = 0 => L = (-20 + sqrt(400 + 6*xp)) / 3
  v_level := LEAST(150, GREATEST(1, FLOOR((-20 + SQRT(400 + 6 * v_xp)) / 3)));

  new_xp := v_xp;
  new_level := v_level;
  RETURN NEXT;
END;
$$;
