
-- 1. Prevent users from updating their own balance via a trigger
CREATE OR REPLACE FUNCTION public.prevent_balance_self_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- If balance is being changed and the caller is not a service_role or admin
  IF NEW.balance IS DISTINCT FROM OLD.balance THEN
    IF NOT public.has_role(auth.uid(), 'admin') THEN
      RAISE EXCEPTION 'Only admins can modify balance';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_balance_admin_only
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_balance_self_update();

-- 2. Add restrictive policy on user_roles to prevent non-admin INSERT
CREATE POLICY "Deny non-admin role inserts"
  ON public.user_roles
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 3. Fix games SELECT policy to only show active games to public
DROP POLICY IF EXISTS "Anyone can view active games" ON public.games;
CREATE POLICY "Anyone can view active games"
  ON public.games
  FOR SELECT
  USING (is_active = true OR public.has_role(auth.uid(), 'admin'));
