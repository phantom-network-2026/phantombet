
-- 1. Fix user_roles INSERT privilege escalation
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
CREATE POLICY "Admins can insert roles"
ON public.user_roles FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Also scope the restrictive deny to include anon by re-creating for public
DROP POLICY IF EXISTS "Deny non-admin role inserts" ON public.user_roles;
CREATE POLICY "Deny non-admin role inserts"
ON public.user_roles AS RESTRICTIVE FOR INSERT
TO public
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 2. Remove user SELECT on deposit_addresses (private keys must never reach client)
DROP POLICY IF EXISTS "Users can view own deposit address" ON public.deposit_addresses;

-- 3. Make admin-files bucket private
UPDATE storage.buckets SET public = false WHERE id = 'admin-files';

-- Drop any overly permissive storage policies on admin-files
DROP POLICY IF EXISTS "Admin files are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view admin files" ON storage.objects;
DROP POLICY IF EXISTS "Public read access for admin-files" ON storage.objects;

-- Add admin-only read policy
CREATE POLICY "Only admins can read admin files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'admin-files' AND has_role(auth.uid(), 'admin'::app_role));

-- Add admin-only write policy
CREATE POLICY "Only admins can upload admin files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'admin-files' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can update admin files"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'admin-files' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can delete admin files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'admin-files' AND has_role(auth.uid(), 'admin'::app_role));
