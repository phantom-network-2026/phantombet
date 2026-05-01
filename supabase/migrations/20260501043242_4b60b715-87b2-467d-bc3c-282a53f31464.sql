
-- Prefix enum
DO $$ BEGIN
  CREATE TYPE public.forum_prefix AS ENUM ('tutorial','question','release','issue','discussion');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS public.forum_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL,
  prefix public.forum_prefix NOT NULL DEFAULT 'discussion',
  is_pinned boolean NOT NULL DEFAULT false,
  is_locked boolean NOT NULL DEFAULT false,
  reply_count integer NOT NULL DEFAULT 0,
  last_activity_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.forum_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.forum_threads(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_forum_threads_activity ON public.forum_threads(last_activity_at DESC);
CREATE INDEX IF NOT EXISTS idx_forum_threads_prefix ON public.forum_threads(prefix);
CREATE INDEX IF NOT EXISTS idx_forum_replies_thread ON public.forum_replies(thread_id, created_at);

ALTER TABLE public.forum_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_replies ENABLE ROW LEVEL SECURITY;

-- Threads policies
CREATE POLICY "anyone authed can read threads" ON public.forum_threads
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "users create own threads" ON public.forum_threads
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);
CREATE POLICY "users update own threads" ON public.forum_threads
  FOR UPDATE TO authenticated USING (auth.uid() = author_id);
CREATE POLICY "users delete own threads" ON public.forum_threads
  FOR DELETE TO authenticated USING (auth.uid() = author_id);

-- Replies policies
CREATE POLICY "anyone authed can read replies" ON public.forum_replies
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "users create own replies" ON public.forum_replies
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);
CREATE POLICY "users update own replies" ON public.forum_replies
  FOR UPDATE TO authenticated USING (auth.uid() = author_id);
CREATE POLICY "users delete own replies" ON public.forum_replies
  FOR DELETE TO authenticated USING (auth.uid() = author_id);

-- Maintain reply_count + last_activity_at
CREATE OR REPLACE FUNCTION public.forum_replies_after_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.forum_threads
      SET reply_count = reply_count + 1,
          last_activity_at = now()
      WHERE id = NEW.thread_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.forum_threads
      SET reply_count = GREATEST(reply_count - 1, 0)
      WHERE id = OLD.thread_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS trg_forum_replies_change ON public.forum_replies;
CREATE TRIGGER trg_forum_replies_change
AFTER INSERT OR DELETE ON public.forum_replies
FOR EACH ROW EXECUTE FUNCTION public.forum_replies_after_change();
