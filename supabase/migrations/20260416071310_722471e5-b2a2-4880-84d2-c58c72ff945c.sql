INSERT INTO storage.buckets (id, name, public)
VALUES ('game-files', 'game-files', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Admins can manage game files"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'game-files' AND (
    public.has_role(auth.uid(), 'admin'::public.app_role) OR
    public.has_role(auth.uid(), 'owner'::public.app_role)
  )
)
WITH CHECK (
  bucket_id = 'game-files' AND (
    public.has_role(auth.uid(), 'admin'::public.app_role) OR
    public.has_role(auth.uid(), 'owner'::public.app_role)
  )
);

CREATE POLICY "Public can read game files"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'game-files');