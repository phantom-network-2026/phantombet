
-- Public bucket for sports / promo banner images
INSERT INTO storage.buckets (id, name, public)
VALUES ('promo-banners', 'promo-banners', true)
ON CONFLICT (id) DO NOTHING;

-- Public read
CREATE POLICY "Promo banners are publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'promo-banners');

-- Admin/Owner can upload
CREATE POLICY "Admins can upload promo banners"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'promo-banners'
  AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'owner'::app_role))
);

-- Admin/Owner can update
CREATE POLICY "Admins can update promo banners"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'promo-banners'
  AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'owner'::app_role))
);

-- Admin/Owner can delete
CREATE POLICY "Admins can delete promo banners"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'promo-banners'
  AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'owner'::app_role))
);
