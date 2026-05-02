-- ============ EXCHANGE: Watchlist + Price Alerts ============
CREATE TABLE public.exchange_watchlist (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  symbol text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, symbol)
);
ALTER TABLE public.exchange_watchlist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users manage own watchlist" ON public.exchange_watchlist
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.price_alerts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  symbol text NOT NULL,
  target_price numeric NOT NULL,
  direction text NOT NULL DEFAULT 'above',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.price_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users manage own alerts" ON public.price_alerts
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ SOCIAL: Activity Feed + Status + Gifts ============
CREATE TABLE public.activity_feed (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  username text NOT NULL,
  activity_type text NOT NULL, -- 'win', 'level_up', 'forum_post', 'achievement', 'gift'
  title text NOT NULL,
  detail text,
  amount numeric,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.activity_feed ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone authed reads activity" ON public.activity_feed
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "users post own activity" ON public.activity_feed
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_activity_feed_created ON public.activity_feed (created_at DESC);

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status_message text DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pinned_achievement text DEFAULT '';

CREATE TABLE public.user_gifts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id uuid NOT NULL,
  receiver_id uuid NOT NULL,
  gift_type text NOT NULL, -- 'tip', 'sticker', 'badge'
  amount numeric NOT NULL DEFAULT 0,
  message text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.user_gifts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users see gifts they sent or got" ON public.user_gifts
  FOR SELECT TO authenticated USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "users send gifts as themselves" ON public.user_gifts
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = sender_id);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_feed;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_gifts;