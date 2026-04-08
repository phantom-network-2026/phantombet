DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can update own profile non-balance fields"
ON public.profiles
FOR UPDATE
TO public
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND balance IS NOT DISTINCT FROM (SELECT p.balance FROM public.profiles p WHERE p.user_id = auth.uid())
);