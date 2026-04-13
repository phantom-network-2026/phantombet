
-- Fix user_roles INSERT policy to include owner
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
CREATE POLICY "Admins can insert roles" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'owner'::app_role));

-- Fix user_roles DELETE policy to include owner
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;
CREATE POLICY "Admins can delete roles" ON public.user_roles
  FOR DELETE TO public
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'owner'::app_role));

-- Fix user_roles SELECT policy to include owner
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
CREATE POLICY "Admins can view all roles" ON public.user_roles
  FOR SELECT TO public
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'owner'::app_role));

-- Fix site_settings policies to include owner
DROP POLICY IF EXISTS "Only admins can read site settings" ON public.site_settings;
CREATE POLICY "Only admins can read site settings" ON public.site_settings
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'owner'::app_role));

DROP POLICY IF EXISTS "Admins can insert site settings" ON public.site_settings;
CREATE POLICY "Admins can insert site settings" ON public.site_settings
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'owner'::app_role));

DROP POLICY IF EXISTS "Admins can update site settings" ON public.site_settings;
CREATE POLICY "Admins can update site settings" ON public.site_settings
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'owner'::app_role));

DROP POLICY IF EXISTS "Admins can delete site settings" ON public.site_settings;
CREATE POLICY "Admins can delete site settings" ON public.site_settings
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'owner'::app_role));

-- Fix profiles UPDATE policy to include owner
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins can update all profiles" ON public.profiles
  FOR UPDATE TO public
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'owner'::app_role));

-- Fix profiles SELECT policy to include owner
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT TO public
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'owner'::app_role));
