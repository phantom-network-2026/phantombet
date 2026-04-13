
DROP POLICY IF EXISTS "Deny non-admin role inserts" ON public.user_roles;
CREATE POLICY "Deny non-admin role inserts" ON public.user_roles
  AS RESTRICTIVE
  FOR INSERT TO public
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'owner'::app_role));
