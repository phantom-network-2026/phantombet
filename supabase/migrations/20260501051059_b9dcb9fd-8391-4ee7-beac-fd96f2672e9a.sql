
-- Expand forum_prefix enum with new categories
ALTER TYPE public.forum_prefix ADD VALUE IF NOT EXISTS 'announcement';
ALTER TYPE public.forum_prefix ADD VALUE IF NOT EXISTS 'guide';
ALTER TYPE public.forum_prefix ADD VALUE IF NOT EXISTS 'trade';
ALTER TYPE public.forum_prefix ADD VALUE IF NOT EXISTS 'offtopic';
ALTER TYPE public.forum_prefix ADD VALUE IF NOT EXISTS 'strategy';
ALTER TYPE public.forum_prefix ADD VALUE IF NOT EXISTS 'news';

-- Track view count
ALTER TABLE public.forum_threads
  ADD COLUMN IF NOT EXISTS view_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS like_count integer NOT NULL DEFAULT 0;

ALTER TABLE public.forum_replies
  ADD COLUMN IF NOT EXISTS like_count integer NOT NULL DEFAULT 0;

-- Likes table
CREATE TABLE IF NOT EXISTS public.forum_likes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  thread_id uuid REFERENCES public.forum_threads(id) ON DELETE CASCADE,
  reply_id uuid REFERENCES public.forum_replies(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT forum_likes_target_chk CHECK ((thread_id IS NOT NULL) <> (reply_id IS NOT NULL))
);

CREATE UNIQUE INDEX IF NOT EXISTS forum_likes_user_thread_uniq
  ON public.forum_likes(user_id, thread_id) WHERE thread_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS forum_likes_user_reply_uniq
  ON public.forum_likes(user_id, reply_id) WHERE reply_id IS NOT NULL;

ALTER TABLE public.forum_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anyone authed can read likes" ON public.forum_likes;
CREATE POLICY "anyone authed can read likes" ON public.forum_likes
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "users insert own likes" ON public.forum_likes;
CREATE POLICY "users insert own likes" ON public.forum_likes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "users delete own likes" ON public.forum_likes;
CREATE POLICY "users delete own likes" ON public.forum_likes
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Trigger to keep counts in sync
CREATE OR REPLACE FUNCTION public.forum_likes_after_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.thread_id IS NOT NULL THEN
      UPDATE public.forum_threads SET like_count = like_count + 1 WHERE id = NEW.thread_id;
    ELSE
      UPDATE public.forum_replies SET like_count = like_count + 1 WHERE id = NEW.reply_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.thread_id IS NOT NULL THEN
      UPDATE public.forum_threads SET like_count = GREATEST(like_count - 1, 0) WHERE id = OLD.thread_id;
    ELSE
      UPDATE public.forum_replies SET like_count = GREATEST(like_count - 1, 0) WHERE id = OLD.reply_id;
    END IF;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_forum_likes_change ON public.forum_likes;
CREATE TRIGGER trg_forum_likes_change
  AFTER INSERT OR DELETE ON public.forum_likes
  FOR EACH ROW EXECUTE FUNCTION public.forum_likes_after_change();

-- View increment function (security definer so anyone can increment)
CREATE OR REPLACE FUNCTION public.forum_increment_view(p_thread_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.forum_threads SET view_count = view_count + 1 WHERE id = p_thread_id;
$$;
