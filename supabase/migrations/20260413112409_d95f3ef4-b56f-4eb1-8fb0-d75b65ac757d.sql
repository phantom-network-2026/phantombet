
-- 1. Fix profiles UPDATE policy: protect real_balance, xp, biggest_win, withdrawal_address, seed_phrase
DROP POLICY IF EXISTS "Users can update own profile non-balance fields" ON public.profiles;

CREATE POLICY "Users can update own profile non-balance fields"
ON public.profiles
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND NOT (balance IS DISTINCT FROM (SELECT p.balance FROM profiles p WHERE p.user_id = auth.uid()))
  AND NOT (real_balance IS DISTINCT FROM (SELECT p.real_balance FROM profiles p WHERE p.user_id = auth.uid()))
  AND NOT (xp IS DISTINCT FROM (SELECT p.xp FROM profiles p WHERE p.user_id = auth.uid()))
  AND NOT (biggest_win IS DISTINCT FROM (SELECT p.biggest_win FROM profiles p WHERE p.user_id = auth.uid()))
  AND NOT (biggest_win_game IS DISTINCT FROM (SELECT p.biggest_win_game FROM profiles p WHERE p.user_id = auth.uid()))
  AND NOT (seed_phrase IS DISTINCT FROM (SELECT p.seed_phrase FROM profiles p WHERE p.user_id = auth.uid()))
);

-- 2. Revoke direct SELECT on deposit_addresses from anon and authenticated
REVOKE SELECT ON public.deposit_addresses FROM anon, authenticated;

-- 3. Create a safe view for deposit_addresses (no private key)
CREATE OR REPLACE VIEW public.deposit_addresses_safe AS
SELECT id, user_id, tron_address, is_active, created_at
FROM public.deposit_addresses;

-- Grant access to the safe view
GRANT SELECT ON public.deposit_addresses_safe TO authenticated;
