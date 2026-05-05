
CREATE TABLE public.marketplace_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'general',
  listing_type text NOT NULL DEFAULT 'good',
  price_usd numeric NOT NULL DEFAULT 0,
  accepted_currencies text[] NOT NULL DEFAULT ARRAY['USDT','ETH'],
  images text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'active',
  like_count integer NOT NULL DEFAULT 0,
  view_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.marketplace_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authed views active listings" ON public.marketplace_listings
  FOR SELECT TO authenticated
  USING (status = 'active' OR seller_id = auth.uid() OR has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'owner'::app_role));

CREATE POLICY "Sellers create own listings" ON public.marketplace_listings
  FOR INSERT TO authenticated
  WITH CHECK (seller_id = auth.uid());

CREATE POLICY "Sellers update own listings" ON public.marketplace_listings
  FOR UPDATE TO authenticated
  USING (seller_id = auth.uid() OR has_role(auth.uid(),'admin'::app_role));

CREATE POLICY "Sellers delete own listings" ON public.marketplace_listings
  FOR DELETE TO authenticated
  USING (seller_id = auth.uid() OR has_role(auth.uid(),'admin'::app_role));

CREATE TABLE public.marketplace_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  listing_id uuid,
  liked_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, listing_id),
  UNIQUE (user_id, liked_user_id)
);
ALTER TABLE public.marketplace_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authed reads likes" ON public.marketplace_likes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users add own likes" ON public.marketplace_likes FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users remove own likes" ON public.marketplace_likes FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TABLE public.marketplace_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL,
  reviewer_id uuid NOT NULL,
  reviewed_user_id uuid NOT NULL,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.marketplace_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authed reads reviews" ON public.marketplace_reviews FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users add own reviews" ON public.marketplace_reviews FOR INSERT TO authenticated WITH CHECK (reviewer_id = auth.uid() AND reviewer_id <> reviewed_user_id);
CREATE POLICY "Users delete own reviews" ON public.marketplace_reviews FOR DELETE TO authenticated USING (reviewer_id = auth.uid());

CREATE TABLE public.marketplace_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL,
  buyer_id uuid NOT NULL,
  seller_id uuid NOT NULL,
  amount_usd numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USDT',
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.marketplace_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Parties view orders" ON public.marketplace_orders FOR SELECT TO authenticated USING (buyer_id = auth.uid() OR seller_id = auth.uid() OR has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Buyers create orders" ON public.marketplace_orders FOR INSERT TO authenticated WITH CHECK (buyer_id = auth.uid());
CREATE POLICY "Parties update orders" ON public.marketplace_orders FOR UPDATE TO authenticated USING (buyer_id = auth.uid() OR seller_id = auth.uid() OR has_role(auth.uid(),'admin'::app_role));
