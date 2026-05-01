-- Enable extensions for cron-driven simulation
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ── Ghost author identity helpers ───────────────────────────────
-- Reserved sentinel UUID namespace for ghost forum authors.
-- We DON'T touch auth.users; ghost authors are virtual.
-- forum_threads.author_id is plain uuid (no FK), so this works.

-- ── RPC: post a simulated forum thread ──────────────────────────
CREATE OR REPLACE FUNCTION public.sim_post_forum_thread(
  p_author_id uuid,
  p_title text,
  p_body text,
  p_prefix text DEFAULT 'discussion'
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_prefix forum_prefix;
BEGIN
  -- Only admins/owners can call (or service_role bypasses RLS anyway)
  IF auth.uid() IS NOT NULL
     AND NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner')) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  v_prefix := p_prefix::forum_prefix;

  INSERT INTO public.forum_threads (author_id, title, body, prefix)
  VALUES (p_author_id, p_title, p_body, v_prefix)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- ── RPC: post a simulated forum reply ───────────────────────────
CREATE OR REPLACE FUNCTION public.sim_post_forum_reply(
  p_author_id uuid,
  p_thread_id uuid,
  p_body text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF auth.uid() IS NOT NULL
     AND NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner')) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  INSERT INTO public.forum_replies (author_id, thread_id, body)
  VALUES (p_author_id, p_thread_id, p_body)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- ── RPC: post a simulated game chat message ─────────────────────
CREATE OR REPLACE FUNCTION public.sim_post_game_chat(
  p_user_id uuid,
  p_username text,
  p_game_room text,
  p_content text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF auth.uid() IS NOT NULL
     AND NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner')) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  INSERT INTO public.game_chat (user_id, username, game_room, content)
  VALUES (p_user_id, p_username, p_game_room, p_content)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- ── RPC: like a thread/reply as a ghost ─────────────────────────
CREATE OR REPLACE FUNCTION public.sim_like(
  p_user_id uuid,
  p_thread_id uuid DEFAULT NULL,
  p_reply_id uuid DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL
     AND NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner')) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  INSERT INTO public.forum_likes (user_id, thread_id, reply_id)
  VALUES (p_user_id, p_thread_id, p_reply_id)
  ON CONFLICT DO NOTHING;
END;
$$;