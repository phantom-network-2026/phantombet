
-- Drop policy first (it depends on seed_phrase column)
DROP POLICY IF EXISTS "Users can update own profile non-balance fields" ON public.profiles;

-- Now drop the column
ALTER TABLE public.profiles DROP COLUMN seed_phrase;

-- Recreate the user update policy without seed_phrase check
CREATE POLICY "Users can update own profile non-balance fields"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND NOT (balance IS DISTINCT FROM (SELECT p.balance FROM profiles p WHERE p.user_id = auth.uid()))
    AND NOT (real_balance IS DISTINCT FROM (SELECT p.real_balance FROM profiles p WHERE p.user_id = auth.uid()))
    AND NOT (xp IS DISTINCT FROM (SELECT p.xp FROM profiles p WHERE p.user_id = auth.uid()))
    AND NOT (biggest_win IS DISTINCT FROM (SELECT p.biggest_win FROM profiles p WHERE p.user_id = auth.uid()))
    AND NOT (biggest_win_game IS DISTINCT FROM (SELECT p.biggest_win_game FROM profiles p WHERE p.user_id = auth.uid()))
  );
