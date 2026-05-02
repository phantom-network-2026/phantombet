
-- 1) Move password_hash off party_lobbies into a server-only table
CREATE TABLE IF NOT EXISTS public.party_lobby_passwords (
  lobby_id uuid PRIMARY KEY REFERENCES public.party_lobbies(id) ON DELETE CASCADE,
  password_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.party_lobby_passwords ENABLE ROW LEVEL SECURITY;
-- No anon/authenticated policies => only service_role/SECURITY DEFINER functions can touch it.

-- Migrate any existing hashes
INSERT INTO public.party_lobby_passwords (lobby_id, password_hash)
SELECT id, password_hash FROM public.party_lobbies
WHERE password_hash IS NOT NULL
ON CONFLICT (lobby_id) DO NOTHING;

-- Drop the old column entirely so it can never be exposed via SELECT or Realtime
ALTER TABLE public.party_lobbies DROP COLUMN IF EXISTS password_hash;

-- Helper: indicate whether a lobby is password protected (no hash exposed)
CREATE OR REPLACE FUNCTION public.party_lobby_has_password(p_lobby_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.party_lobby_passwords WHERE lobby_id = p_lobby_id);
$$;

-- Server-side create lobby with optional password (hash never leaves server)
CREATE OR REPLACE FUNCTION public.party_create_lobby(
  p_name text, p_is_public boolean, p_max_members integer, p_password_hash text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  INSERT INTO public.party_lobbies (name, host_id, is_public, max_members)
  VALUES (p_name, v_uid, COALESCE(p_is_public, true), COALESCE(p_max_members, 8))
  RETURNING id INTO v_id;

  IF p_password_hash IS NOT NULL AND length(p_password_hash) > 0 THEN
    INSERT INTO public.party_lobby_passwords (lobby_id, password_hash) VALUES (v_id, p_password_hash);
  END IF;

  INSERT INTO public.party_lobby_members (lobby_id, user_id) VALUES (v_id, v_uid);
  RETURN v_id;
END;
$$;

-- Server-side join with password verification
CREATE OR REPLACE FUNCTION public.party_join_lobby(p_lobby_id uuid, p_password_hash text DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_required text;
  v_count int;
  v_max int;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;

  SELECT max_members INTO v_max FROM public.party_lobbies WHERE id = p_lobby_id AND is_active = true;
  IF v_max IS NULL THEN RAISE EXCEPTION 'Lobby not found'; END IF;

  SELECT password_hash INTO v_required FROM public.party_lobby_passwords WHERE lobby_id = p_lobby_id;
  IF v_required IS NOT NULL THEN
    IF p_password_hash IS NULL OR p_password_hash <> v_required THEN
      RAISE EXCEPTION 'Wrong password';
    END IF;
  END IF;

  SELECT count(*) INTO v_count FROM public.party_lobby_members WHERE lobby_id = p_lobby_id;
  IF v_count >= v_max THEN RAISE EXCEPTION 'Lobby full'; END IF;

  INSERT INTO public.party_lobby_members (lobby_id, user_id) VALUES (p_lobby_id, v_uid)
  ON CONFLICT DO NOTHING;
  RETURN true;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.party_lobby_has_password(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.party_lobby_has_password(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.party_create_lobby(text, boolean, integer, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.party_create_lobby(text, boolean, integer, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.party_join_lobby(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.party_join_lobby(uuid, text) TO authenticated;

-- 2) Realtime.messages RLS — restrict who can subscribe to which topics
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to subscribe to a curated set of public/shared topics,
-- plus their own user-scoped topics (topic prefixed with their auth.uid()).
DROP POLICY IF EXISTS "authenticated_can_read_allowed_topics" ON realtime.messages;
CREATE POLICY "authenticated_can_read_allowed_topics"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  -- User-specific topics must be prefixed with the user's id, e.g. "user:<uid>" or "<uid>:notifications"
  (topic LIKE auth.uid()::text || '%')
  OR (topic LIKE 'user:' || auth.uid()::text || '%')
  -- Shared topics that are intentionally public to all signed-in users
  OR topic LIKE 'game-chat:%'
  OR topic LIKE 'roulette:%'
  OR topic LIKE 'forum:%'
  OR topic LIKE 'party:%'
  OR topic LIKE 'presence:%'
  OR topic LIKE 'broadcast%'
  OR topic LIKE 'activity%'
);

-- Allow broadcast/presence sends from authenticated users (Realtime requires INSERT)
DROP POLICY IF EXISTS "authenticated_can_send_allowed_topics" ON realtime.messages;
CREATE POLICY "authenticated_can_send_allowed_topics"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
  (topic LIKE auth.uid()::text || '%')
  OR (topic LIKE 'user:' || auth.uid()::text || '%')
  OR topic LIKE 'game-chat:%'
  OR topic LIKE 'roulette:%'
  OR topic LIKE 'forum:%'
  OR topic LIKE 'party:%'
  OR topic LIKE 'presence:%'
);

-- 3) Tighten the coin listing INSERT policy (was WITH CHECK true to anon)
DROP POLICY IF EXISTS "Anyone can submit coin listing" ON public.coin_listing_applications;
CREATE POLICY "Authenticated users can submit own coin listing"
ON public.coin_listing_applications
FOR INSERT
TO authenticated
WITH CHECK (applicant_user_id = auth.uid());

-- 4) Lock down internal SECURITY DEFINER functions: remove EXECUTE from PUBLIC
-- These are called from edge functions using the service role, never directly by clients.
REVOKE EXECUTE ON FUNCTION public.claim_random_scratch_card(numeric, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.bump_free_bet_progress(uuid, numeric, numeric) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.expire_old_bonuses(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.grant_xp(uuid, numeric) FROM PUBLIC, anon, authenticated;

-- Trigger functions never need direct EXECUTE from clients
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prevent_balance_self_update() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_real_balance_to_usdt() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_usdt_to_real_balance() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.forum_likes_after_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.forum_replies_after_change() FROM PUBLIC, anon, authenticated;
