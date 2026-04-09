
-- Create a storage bucket for admin file management
INSERT INTO storage.buckets (id, name, public)
VALUES ('admin-files', 'admin-files', true)
ON CONFLICT (id) DO NOTHING;

-- Policies for admin-files bucket
CREATE POLICY "Anyone can view admin files"
ON storage.objects FOR SELECT
USING (bucket_id = 'admin-files');

CREATE POLICY "Admins can upload admin files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'admin-files' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update admin files"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'admin-files' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete admin files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'admin-files' AND public.has_role(auth.uid(), 'admin'));
