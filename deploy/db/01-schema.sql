--
-- PostgreSQL database dump
--

\restrict iXHTheGXgjuuxta6Von405VGbdLYaPnYiurNzFz0Q4cstahnQZgGU85ccVCxQlY

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.9

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'admin',
    'user',
    'moderator',
    'staff',
    'active_user',
    'owner'
);


--
-- Name: football_bet_market; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.football_bet_market AS ENUM (
    'home',
    'draw',
    'away'
);


--
-- Name: football_match_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.football_match_status AS ENUM (
    'upcoming',
    'live',
    'finished',
    'cancelled'
);


--
-- Name: forum_prefix; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.forum_prefix AS ENUM (
    'tutorial',
    'question',
    'release',
    'issue',
    'discussion',
    'announcement',
    'guide',
    'trade',
    'offtopic',
    'strategy',
    'news'
);


--
-- Name: free_bet_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.free_bet_status AS ENUM (
    'pending',
    'qualified',
    'awarded',
    'expired'
);


--
-- Name: friendship_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.friendship_status AS ENUM (
    'pending',
    'accepted',
    'rejected'
);


--
-- Name: game_category; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.game_category AS ENUM (
    'slots',
    'table',
    'live',
    'scratch',
    'jackpot',
    'instant'
);


--
-- Name: moderation_action; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.moderation_action AS ENUM (
    'ban',
    'unban',
    'mute',
    'unmute',
    'warn',
    'kick',
    'delete_message'
);


--
-- Name: race_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.race_status AS ENUM (
    'upcoming',
    'live',
    'settled',
    'cancelled'
);


--
-- Name: race_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.race_type AS ENUM (
    'horse',
    'greyhound'
);


--
-- Name: sports_bet_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.sports_bet_status AS ENUM (
    'pending',
    'won',
    'lost',
    'void',
    'partial'
);


--
-- Name: sports_bet_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.sports_bet_type AS ENUM (
    'win',
    'place',
    'each_way',
    'forecast',
    'tricast'
);


--
-- Name: user_bonus_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.user_bonus_status AS ENUM (
    'active',
    'used',
    'expired'
);


--
-- Name: user_bonus_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.user_bonus_type AS ENUM (
    'free_spin'
);


--
-- Name: bump_free_bet_progress(uuid, numeric, numeric); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.bump_free_bet_progress(p_user_id uuid, p_deposit_amount numeric DEFAULT 0, p_wager_amount numeric DEFAULT 0) RETURNS public.free_bet_status
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $_$
DECLARE
  v_row public.free_bet_progress;
BEGIN
  SELECT * INTO v_row FROM public.free_bet_progress WHERE user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO public.free_bet_progress (user_id) VALUES (p_user_id)
    RETURNING * INTO v_row;
  END IF;

  -- Expire if deadline passed and not yet awarded
  IF v_row.status IN ('pending','qualified') AND v_row.expires_at < now() THEN
    UPDATE public.free_bet_progress SET status = 'expired' WHERE id = v_row.id;
    RETURN 'expired';
  END IF;

  -- Already done: nothing to do
  IF v_row.status IN ('awarded','expired') THEN
    RETURN v_row.status;
  END IF;

  UPDATE public.free_bet_progress
  SET deposit_progress = LEAST(deposit_required, deposit_progress + GREATEST(p_deposit_amount, 0)),
      wager_progress   = LEAST(wager_required,   wager_progress   + GREATEST(p_wager_amount, 0))
  WHERE id = v_row.id
  RETURNING * INTO v_row;

  -- Award if both thresholds met
  IF v_row.deposit_progress >= v_row.deposit_required AND v_row.wager_progress >= v_row.wager_required THEN
    UPDATE public.profiles
      SET balance = balance + v_row.award_amount
      WHERE user_id = p_user_id;

    INSERT INTO public.transactions (user_id, amount, type, description)
    VALUES (p_user_id, v_row.award_amount, 'bonus',
            format('Welcome free bet awarded: $%s', v_row.award_amount::text));

    UPDATE public.free_bet_progress
      SET status = 'awarded', awarded_at = now()
      WHERE id = v_row.id;

    RETURN 'awarded';
  END IF;

  RETURN v_row.status;
END;
$_$;


--
-- Name: claim_random_scratch_card(numeric, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.claim_random_scratch_card(p_bet_tier numeric, p_user_id uuid) RETURNS TABLE(card_id uuid, is_winner boolean, payout_multiplier numeric, symbols text[])
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_card_id uuid;
  v_is_winner boolean;
  v_payout_multiplier numeric;
  v_symbols text[];
BEGIN
  -- Select a random unclaimed card for this tier
  SELECT sc.id, sc.is_winner, sc.payout_multiplier, sc.symbols
  INTO v_card_id, v_is_winner, v_payout_multiplier, v_symbols
  FROM scratch_card_pool sc
  WHERE sc.bet_tier = p_bet_tier AND sc.claimed_by IS NULL
  ORDER BY random()
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF v_card_id IS NULL THEN
    RETURN;
  END IF;

  -- Claim it
  UPDATE scratch_card_pool
  SET claimed_by = p_user_id, claimed_at = now()
  WHERE id = v_card_id;

  card_id := v_card_id;
  is_winner := v_is_winner;
  payout_multiplier := v_payout_multiplier;
  symbols := v_symbols;
  RETURN NEXT;
END;
$$;


--
-- Name: consume_free_spin(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.consume_free_spin(p_user_id uuid) RETURNS TABLE(success boolean, remaining_total integer, stake_value numeric)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_row public.user_bonuses;
  v_total INTEGER;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  PERFORM public.expire_old_bonuses(p_user_id);

  SELECT * INTO v_row
  FROM public.user_bonuses
  WHERE user_id = p_user_id
    AND status = 'active'
    AND remaining_count > 0
    AND expires_at > now()
    AND bonus_type = 'free_spin'
  ORDER BY expires_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF v_row.id IS NULL THEN
    RETURN QUERY SELECT false, 0, 0::numeric;
    RETURN;
  END IF;

  UPDATE public.user_bonuses
    SET remaining_count = remaining_count - 1,
        status = CASE WHEN remaining_count - 1 <= 0 THEN 'used' ELSE 'active' END,
        used_at = CASE WHEN remaining_count - 1 <= 0 THEN now() ELSE used_at END
  WHERE id = v_row.id;

  SELECT COALESCE(SUM(remaining_count), 0)::int INTO v_total
  FROM public.user_bonuses
  WHERE user_id = p_user_id
    AND status = 'active'
    AND expires_at > now()
    AND bonus_type = 'free_spin';

  RETURN QUERY SELECT true, v_total, v_row.stake_value;
END;
$$;


--
-- Name: deposit_address_for_user(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.deposit_address_for_user(p_user_id uuid) RETURNS TABLE(tron_address text, is_active boolean)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT da.tron_address, da.is_active 
  FROM deposit_addresses da 
  WHERE da.user_id = p_user_id AND p_user_id = auth.uid();
$$;


--
-- Name: expire_old_bonuses(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.expire_old_bonuses(p_user_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  UPDATE public.user_bonuses
    SET status = 'expired'
    WHERE user_id = p_user_id
      AND status = 'active'
      AND expires_at < now();
END;
$$;


--
-- Name: forum_increment_view(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.forum_increment_view(p_thread_id uuid) RETURNS void
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  UPDATE public.forum_threads SET view_count = view_count + 1 WHERE id = p_thread_id;
$$;


--
-- Name: forum_likes_after_change(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.forum_likes_after_change() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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


--
-- Name: forum_replies_after_change(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.forum_replies_after_change() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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


--
-- Name: get_public_setting(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_public_setting(p_key text) RETURNS jsonb
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT value FROM public.site_settings
  WHERE key = p_key
    AND p_key IN ('help_info_links', 'coin_listing_form_fields', 'coin_listing_banner')
  LIMIT 1;
$$;


--
-- Name: grant_xp(uuid, numeric); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.grant_xp(p_user_id uuid, p_amount numeric) RETURNS TABLE(new_xp numeric, new_level integer)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_xp numeric;
  v_level integer;
BEGIN
  -- Only service role or the user themselves can call this
  UPDATE profiles SET xp = xp + p_amount WHERE user_id = p_user_id
  RETURNING profiles.xp INTO v_xp;

  IF v_xp IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- Calculate level from XP: total_xp_for_level = 20*L + 1.5*L^2
  -- Solve: 1.5*L^2 + 20*L - xp = 0 => L = (-20 + sqrt(400 + 6*xp)) / 3
  v_level := LEAST(150, GREATEST(1, FLOOR((-20 + SQRT(400 + 6 * v_xp)) / 3)));

  new_xp := v_xp;
  new_level := v_level;
  RETURN NEXT;
END;
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_bonus numeric := 0;
  v_config jsonb;
  v_wallet_mode text;
BEGIN
  SELECT (value->>'mode') INTO v_wallet_mode FROM public.site_settings WHERE key = 'wallet_mode' LIMIT 1;

  IF v_wallet_mode IS NULL OR v_wallet_mode = 'mock' THEN
    SELECT value INTO v_config FROM public.site_settings WHERE key = 'welcome_bonus' LIMIT 1;
    IF v_config IS NULL OR (v_config->>'enabled')::boolean IS DISTINCT FROM false THEN
      v_bonus := COALESCE((v_config->>'amount')::numeric, 100);
    END IF;
  END IF;

  INSERT INTO public.profiles (user_id, username, balance, real_balance)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'username', NEW.email), v_bonus, 0.00);

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');

  -- Free bet enrollment
  INSERT INTO public.free_bet_progress (user_id) VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;


--
-- Name: has_role(uuid, public.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
      AND _user_id = auth.uid()
  )
$$;


--
-- Name: perform_daily_spin(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.perform_daily_spin(p_user_id uuid) RETURNS TABLE(spin_id uuid, prize_type text, prize_value numeric, prize_detail text, is_loyalty boolean, streak integer)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_last_spin timestamptz;
  v_hours_since numeric;
  v_streak integer := 0;
  v_is_loyalty boolean := false;
  v_prize_type text;
  v_prize_value numeric;
  v_prize_detail text;
  v_spin_id uuid;
  v_rand numeric;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT spun_at INTO v_last_spin
  FROM public.daily_spins
  WHERE user_id = p_user_id
  ORDER BY spun_at DESC
  LIMIT 1;

  IF v_last_spin IS NOT NULL THEN
    v_hours_since := EXTRACT(EPOCH FROM (now() - v_last_spin)) / 3600.0;
    IF v_hours_since < 24 THEN
      RAISE EXCEPTION 'Must wait 24 hours between spins. Hours remaining: %', ROUND((24 - v_hours_since)::numeric, 1);
    END IF;
  END IF;

  SELECT COUNT(*)::integer INTO v_streak
  FROM (
    SELECT spun_at,
           ROW_NUMBER() OVER (ORDER BY spun_at DESC) AS rn
    FROM public.daily_spins
    WHERE user_id = p_user_id
    ORDER BY spun_at DESC
    LIMIT 7
  ) recent
  WHERE DATE(spun_at) >= CURRENT_DATE - (rn || ' days')::interval;

  v_is_loyalty := v_streak >= 7;
  v_prize_type := 'free_spin';
  v_rand := random();

  IF v_is_loyalty THEN
    IF v_rand < 0.20 THEN v_prize_value := 5; v_prize_detail := '5 Free Spins';
    ELSIF v_rand < 0.45 THEN v_prize_value := 10; v_prize_detail := '10 Free Spins';
    ELSIF v_rand < 0.70 THEN v_prize_value := 15; v_prize_detail := '15 Free Spins';
    ELSIF v_rand < 0.90 THEN v_prize_value := 20; v_prize_detail := '20 Free Spins';
    ELSE v_prize_value := 25; v_prize_detail := '25 Free Spins';
    END IF;
  ELSE
    IF v_rand < 0.34 THEN v_prize_value := 1; v_prize_detail := '1 Free Spin';
    ELSIF v_rand < 0.58 THEN v_prize_value := 3; v_prize_detail := '3 Free Spins';
    ELSIF v_rand < 0.76 THEN v_prize_value := 5; v_prize_detail := '5 Free Spins';
    ELSIF v_rand < 0.90 THEN v_prize_value := 10; v_prize_detail := '10 Free Spins';
    ELSIF v_rand < 0.97 THEN v_prize_value := 15; v_prize_detail := '15 Free Spins';
    ELSIF v_rand < 0.995 THEN v_prize_value := 20; v_prize_detail := '20 Free Spins';
    ELSE v_prize_value := 25; v_prize_detail := '25 Free Spins';
    END IF;
  END IF;

  INSERT INTO public.daily_spins (user_id, prize_type, prize_value, prize_detail, is_loyalty_spin, streak_count)
  VALUES (p_user_id, v_prize_type, v_prize_value, v_prize_detail, v_is_loyalty, v_streak + 1)
  RETURNING id INTO v_spin_id;

  -- Deposit free spins into bonus inventory
  INSERT INTO public.user_bonuses (
    user_id, bonus_type, source, source_label, total_count, remaining_count, stake_value, expires_at
  ) VALUES (
    p_user_id, 'free_spin', 'prize_reel',
    CASE WHEN v_is_loyalty THEN 'Loyalty Daily Spin' ELSE 'Daily Prize Reel' END,
    v_prize_value::int, v_prize_value::int, 0.10, now() + INTERVAL '30 days'
  );

  spin_id := v_spin_id;
  prize_type := v_prize_type;
  prize_value := v_prize_value;
  prize_detail := v_prize_detail;
  is_loyalty := v_is_loyalty;
  streak := v_streak + 1;
  RETURN NEXT;
END;
$$;


--
-- Name: prevent_balance_self_update(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.prevent_balance_self_update() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.balance IS DISTINCT FROM OLD.balance THEN
    IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') THEN
      RAISE EXCEPTION 'Only admins can modify balance';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: sim_like(uuid, uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sim_like(p_user_id uuid, p_thread_id uuid DEFAULT NULL::uuid, p_reply_id uuid DEFAULT NULL::uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


--
-- Name: sim_post_forum_reply(uuid, uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sim_post_forum_reply(p_author_id uuid, p_thread_id uuid, p_body text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


--
-- Name: sim_post_forum_thread(uuid, text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sim_post_forum_thread(p_author_id uuid, p_title text, p_body text, p_prefix text DEFAULT 'discussion'::text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


--
-- Name: sim_post_game_chat(uuid, text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sim_post_game_chat(p_user_id uuid, p_username text, p_game_room text, p_content text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


--
-- Name: sync_real_balance_to_usdt(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_real_balance_to_usdt() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.real_balance IS DISTINCT FROM OLD.real_balance THEN
    INSERT INTO public.user_coin_balances (user_id, symbol, available, locked)
    VALUES (NEW.user_id, 'USDT', GREATEST(NEW.real_balance, 0), 0)
    ON CONFLICT (user_id, symbol) DO UPDATE
    SET available = GREATEST(EXCLUDED.available, 0);
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: sync_usdt_to_real_balance(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_usdt_to_real_balance() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.symbol = 'USDT' THEN
    UPDATE public.profiles
    SET real_balance = GREATEST(NEW.available, 0)
    WHERE user_id = NEW.user_id
      AND real_balance IS DISTINCT FROM GREATEST(NEW.available, 0);
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


SET default_table_access_method = heap;

--
-- Name: activity_feed; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.activity_feed (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    username text NOT NULL,
    activity_type text NOT NULL,
    title text NOT NULL,
    detail text,
    amount numeric,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: ai_agent_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_agent_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    prompt text NOT NULL,
    reply text,
    tool_results jsonb DEFAULT '[]'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: broadcast_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.broadcast_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    type text DEFAULT 'info'::text NOT NULL,
    sent_by uuid NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: broadcast_reads; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.broadcast_reads (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    broadcast_id uuid NOT NULL,
    user_id uuid NOT NULL,
    read_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: chat_bans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chat_bans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    banned_by uuid NOT NULL,
    reason text,
    game_room text,
    expires_at timestamp with time zone,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: coin_listing_applications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.coin_listing_applications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    applicant_user_id uuid,
    email text NOT NULL,
    project_name text NOT NULL,
    symbol text NOT NULL,
    network text,
    contract_address text,
    website text,
    whitepaper_url text,
    description text,
    team_info text,
    social_links text,
    extra_data jsonb DEFAULT '{}'::jsonb NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    admin_notes text,
    reviewed_by uuid,
    reviewed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: coin_price_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.coin_price_history (
    id bigint NOT NULL,
    symbol text NOT NULL,
    price_usd numeric NOT NULL,
    recorded_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: coin_price_history_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.coin_price_history_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: coin_price_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.coin_price_history_id_seq OWNED BY public.coin_price_history.id;


--
-- Name: coin_swaps; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.coin_swaps (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    from_symbol text NOT NULL,
    from_amount numeric NOT NULL,
    to_symbol text NOT NULL,
    to_amount numeric NOT NULL,
    rate numeric NOT NULL,
    fee_usd numeric DEFAULT 0 NOT NULL,
    status text DEFAULT 'completed'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: daily_spins; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.daily_spins (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    prize_type text NOT NULL,
    prize_value numeric DEFAULT 0 NOT NULL,
    prize_detail text,
    is_loyalty_spin boolean DEFAULT false NOT NULL,
    streak_count integer DEFAULT 1 NOT NULL,
    spun_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: deposit_addresses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.deposit_addresses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    tron_address text NOT NULL,
    private_key_encrypted text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: deposits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.deposits (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    amount_usd numeric NOT NULL,
    crypto_currency text DEFAULT 'btc'::text NOT NULL,
    payment_id text,
    payment_address text,
    payment_amount numeric,
    status text DEFAULT 'pending'::text NOT NULL,
    nowpayments_data jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: exchange_audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.exchange_audit_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    actor_id uuid NOT NULL,
    action text NOT NULL,
    target_type text NOT NULL,
    target_id text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: exchange_coins; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.exchange_coins (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    symbol text NOT NULL,
    name text NOT NULL,
    coingecko_id text,
    network text DEFAULT 'Ethereum'::text NOT NULL,
    sector text DEFAULT 'Majors'::text NOT NULL,
    logo_url text,
    fallback_icon text,
    price_usd numeric DEFAULT 0 NOT NULL,
    change_24h numeric DEFAULT 0 NOT NULL,
    volume_24h numeric DEFAULT 0 NOT NULL,
    market_cap numeric DEFAULT 0 NOT NULL,
    circulating_supply numeric DEFAULT 0 NOT NULL,
    max_supply numeric,
    risk_score integer DEFAULT 30 NOT NULL,
    status text DEFAULT 'listed'::text NOT NULL,
    is_featured boolean DEFAULT false NOT NULL,
    is_trading_enabled boolean DEFAULT true NOT NULL,
    is_deposit_enabled boolean DEFAULT true NOT NULL,
    is_withdraw_enabled boolean DEFAULT true NOT NULL,
    withdrawal_min numeric DEFAULT 0 NOT NULL,
    withdrawal_fee numeric DEFAULT 0 NOT NULL,
    daily_withdraw_limit numeric DEFAULT 0 NOT NULL,
    kyc_tier_required integer DEFAULT 0 NOT NULL,
    contract_address text,
    hot_wallet_address text,
    cold_wallet_address text,
    scheduled_listing_at timestamp with time zone,
    description text,
    whitepaper_url text,
    website_url text,
    display_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    last_price_sync_at timestamp with time zone
);


--
-- Name: exchange_watchlist; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.exchange_watchlist (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    symbol text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: football_bets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.football_bets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    match_id uuid NOT NULL,
    selection public.football_bet_market NOT NULL,
    stake numeric NOT NULL,
    odds_taken numeric NOT NULL,
    potential_payout numeric NOT NULL,
    status public.sports_bet_status DEFAULT 'pending'::public.sports_bet_status NOT NULL,
    payout numeric DEFAULT 0 NOT NULL,
    placed_at timestamp with time zone DEFAULT now() NOT NULL,
    settled_at timestamp with time zone
);


--
-- Name: football_matches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.football_matches (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    competition text NOT NULL,
    home_team text NOT NULL,
    away_team text NOT NULL,
    kickoff_time timestamp with time zone NOT NULL,
    status public.football_match_status DEFAULT 'upcoming'::public.football_match_status NOT NULL,
    home_odds numeric DEFAULT 2.0 NOT NULL,
    draw_odds numeric DEFAULT 3.2 NOT NULL,
    away_odds numeric DEFAULT 3.5 NOT NULL,
    home_score integer DEFAULT 0 NOT NULL,
    away_score integer DEFAULT 0 NOT NULL,
    minute integer DEFAULT 0 NOT NULL,
    result public.football_bet_market,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: forum_attachments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.forum_attachments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    thread_id uuid NOT NULL,
    uploaded_by uuid NOT NULL,
    url text NOT NULL,
    kind text DEFAULT 'image'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: forum_bookmarks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.forum_bookmarks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    thread_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: forum_likes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.forum_likes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    thread_id uuid,
    reply_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT forum_likes_target_chk CHECK (((thread_id IS NOT NULL) <> (reply_id IS NOT NULL)))
);


--
-- Name: forum_reactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.forum_reactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    thread_id uuid,
    reply_id uuid,
    reaction text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT forum_reactions_reaction_check CHECK ((reaction = ANY (ARRAY['like'::text, 'love'::text, 'fire'::text, 'target'::text, 'laugh'::text]))),
    CONSTRAINT forum_reactions_target_chk CHECK ((((thread_id IS NOT NULL) AND (reply_id IS NULL)) OR ((thread_id IS NULL) AND (reply_id IS NOT NULL))))
);


--
-- Name: forum_replies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.forum_replies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    thread_id uuid NOT NULL,
    author_id uuid NOT NULL,
    body text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    like_count integer DEFAULT 0 NOT NULL
);


--
-- Name: forum_threads; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.forum_threads (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    author_id uuid NOT NULL,
    title text NOT NULL,
    body text NOT NULL,
    prefix public.forum_prefix DEFAULT 'discussion'::public.forum_prefix NOT NULL,
    is_pinned boolean DEFAULT false NOT NULL,
    is_locked boolean DEFAULT false NOT NULL,
    reply_count integer DEFAULT 0 NOT NULL,
    last_activity_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    view_count integer DEFAULT 0 NOT NULL,
    like_count integer DEFAULT 0 NOT NULL
);


--
-- Name: free_bet_progress; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.free_bet_progress (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    status public.free_bet_status DEFAULT 'pending'::public.free_bet_status NOT NULL,
    deposit_progress numeric DEFAULT 0 NOT NULL,
    wager_progress numeric DEFAULT 0 NOT NULL,
    deposit_required numeric DEFAULT 10 NOT NULL,
    wager_required numeric DEFAULT 10 NOT NULL,
    award_amount numeric DEFAULT 5 NOT NULL,
    expires_at timestamp with time zone DEFAULT (now() + '30 days'::interval) NOT NULL,
    awarded_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: friendships; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.friendships (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    requester_id uuid NOT NULL,
    addressee_id uuid NOT NULL,
    status public.friendship_status DEFAULT 'pending'::public.friendship_status NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT friendships_check CHECK ((requester_id <> addressee_id))
);


--
-- Name: game_chat; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.game_chat (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    game_room text NOT NULL,
    username text,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: games; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.games (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    image_url text,
    category public.game_category DEFAULT 'slots'::public.game_category NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    is_featured boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    slug text,
    source text DEFAULT 'builtin'::text NOT NULL
);


--
-- Name: messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sender_id uuid NOT NULL,
    receiver_id uuid NOT NULL,
    content text NOT NULL,
    is_read boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT messages_check CHECK ((sender_id <> receiver_id))
);


--
-- Name: moderation_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.moderation_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    action_type public.moderation_action NOT NULL,
    target_user_id uuid NOT NULL,
    moderator_id uuid NOT NULL,
    reason text,
    game_room text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: party_lobbies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.party_lobbies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    host_id uuid NOT NULL,
    password_hash text,
    is_public boolean DEFAULT true NOT NULL,
    max_members integer DEFAULT 8 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: party_lobby_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.party_lobby_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lobby_id uuid NOT NULL,
    user_id uuid NOT NULL,
    is_muted boolean DEFAULT false NOT NULL,
    joined_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: party_reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.party_reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lobby_id uuid,
    reporter_id uuid NOT NULL,
    reported_user_id uuid NOT NULL,
    reason text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: password_reset_nonces; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.password_reset_nonces (
    nonce text NOT NULL,
    user_id uuid NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    used boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: price_alerts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.price_alerts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    symbol text NOT NULL,
    target_price numeric NOT NULL,
    direction text DEFAULT 'above'::text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    username text,
    avatar_url text,
    balance numeric(12,2) DEFAULT 0.00 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    crypto_address text,
    bio text DEFAULT ''::text,
    biggest_win numeric DEFAULT 0,
    biggest_win_game text DEFAULT ''::text,
    social_links jsonb DEFAULT '{}'::jsonb,
    has_animated_avatar boolean DEFAULT false,
    has_animated_border boolean DEFAULT false,
    border_style text DEFAULT 'none'::text,
    withdrawal_address text,
    xp numeric DEFAULT 0 NOT NULL,
    purchased_borders text[] DEFAULT '{}'::text[] NOT NULL,
    real_balance numeric DEFAULT 0.00 NOT NULL,
    has_high_roller boolean DEFAULT false,
    name_color text,
    status_message text DEFAULT ''::text,
    pinned_achievement text DEFAULT ''::text
);


--
-- Name: profiles_public; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.profiles_public WITH (security_invoker='on') AS
 SELECT user_id,
    username,
    avatar_url,
    bio,
    biggest_win,
    biggest_win_game,
    has_animated_avatar,
    has_animated_border,
    border_style,
    social_links,
    created_at,
    xp,
    has_high_roller,
    name_color,
    purchased_borders
   FROM public.profiles;


--
-- Name: race_runners; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.race_runners (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    race_id uuid NOT NULL,
    number integer NOT NULL,
    name text NOT NULL,
    jockey_trainer text,
    win_odds numeric DEFAULT 5.0 NOT NULL,
    place_odds numeric DEFAULT 2.0 NOT NULL,
    finishing_position integer,
    is_scratched boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: races; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.races (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    race_type public.race_type NOT NULL,
    venue text NOT NULL,
    race_number integer NOT NULL,
    race_name text NOT NULL,
    distance text NOT NULL,
    going text,
    off_time timestamp with time zone NOT NULL,
    status public.race_status DEFAULT 'upcoming'::public.race_status NOT NULL,
    winners integer[] DEFAULT '{}'::integer[],
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: scratch_card_pool; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.scratch_card_pool (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    bet_tier numeric NOT NULL,
    is_winner boolean DEFAULT false NOT NULL,
    payout_multiplier numeric DEFAULT 0 NOT NULL,
    symbols text[] DEFAULT '{}'::text[] NOT NULL,
    claimed_by uuid,
    claimed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: site_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.site_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    key text NOT NULL,
    value jsonb DEFAULT '{}'::jsonb NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: sports_bets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sports_bets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    race_id uuid NOT NULL,
    bet_type public.sports_bet_type NOT NULL,
    selections integer[] NOT NULL,
    stake numeric NOT NULL,
    odds_taken numeric NOT NULL,
    potential_payout numeric NOT NULL,
    status public.sports_bet_status DEFAULT 'pending'::public.sports_bet_status NOT NULL,
    payout numeric DEFAULT 0 NOT NULL,
    placed_at timestamp with time zone DEFAULT now() NOT NULL,
    settled_at timestamp with time zone,
    CONSTRAINT sports_bets_stake_check CHECK ((stake > (0)::numeric))
);


--
-- Name: staff_tasks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.staff_tasks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    description text,
    assigned_to uuid,
    assigned_by uuid NOT NULL,
    priority text DEFAULT 'medium'::text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    due_date timestamp with time zone,
    category text DEFAULT 'general'::text NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    amount numeric(12,2) NOT NULL,
    type text NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT transactions_type_check CHECK ((type = ANY (ARRAY['deposit'::text, 'withdrawal'::text, 'bet'::text, 'win'::text, 'adjustment'::text])))
);


--
-- Name: user_bonuses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_bonuses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    bonus_type public.user_bonus_type DEFAULT 'free_spin'::public.user_bonus_type NOT NULL,
    source text DEFAULT 'prize_reel'::text NOT NULL,
    source_label text,
    total_count integer DEFAULT 1 NOT NULL,
    remaining_count integer DEFAULT 1 NOT NULL,
    stake_value numeric DEFAULT 0.10 NOT NULL,
    status public.user_bonus_status DEFAULT 'active'::public.user_bonus_status NOT NULL,
    awarded_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone DEFAULT (now() + '30 days'::interval) NOT NULL,
    used_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_coin_balances; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_coin_balances (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    symbol text NOT NULL,
    available numeric DEFAULT 0 NOT NULL,
    locked numeric DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_gifts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_gifts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sender_id uuid NOT NULL,
    receiver_id uuid NOT NULL,
    gift_type text NOT NULL,
    amount numeric DEFAULT 0 NOT NULL,
    message text DEFAULT ''::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_presence; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_presence (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    last_seen timestamp with time zone DEFAULT now() NOT NULL,
    is_online boolean DEFAULT false NOT NULL,
    appearance_status text DEFAULT 'online'::text NOT NULL
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role DEFAULT 'user'::public.app_role NOT NULL
);


--
-- Name: withdrawals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.withdrawals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    amount numeric NOT NULL,
    destination_address text NOT NULL,
    tx_hash text,
    status text DEFAULT 'pending'::text NOT NULL,
    error_message text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: coin_price_history id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coin_price_history ALTER COLUMN id SET DEFAULT nextval('public.coin_price_history_id_seq'::regclass);


--
-- Name: activity_feed activity_feed_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_feed
    ADD CONSTRAINT activity_feed_pkey PRIMARY KEY (id);


--
-- Name: ai_agent_log ai_agent_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_agent_log
    ADD CONSTRAINT ai_agent_log_pkey PRIMARY KEY (id);


--
-- Name: broadcast_messages broadcast_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.broadcast_messages
    ADD CONSTRAINT broadcast_messages_pkey PRIMARY KEY (id);


--
-- Name: broadcast_reads broadcast_reads_broadcast_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.broadcast_reads
    ADD CONSTRAINT broadcast_reads_broadcast_id_user_id_key UNIQUE (broadcast_id, user_id);


--
-- Name: broadcast_reads broadcast_reads_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.broadcast_reads
    ADD CONSTRAINT broadcast_reads_pkey PRIMARY KEY (id);


--
-- Name: chat_bans chat_bans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_bans
    ADD CONSTRAINT chat_bans_pkey PRIMARY KEY (id);


--
-- Name: coin_listing_applications coin_listing_applications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coin_listing_applications
    ADD CONSTRAINT coin_listing_applications_pkey PRIMARY KEY (id);


--
-- Name: coin_price_history coin_price_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coin_price_history
    ADD CONSTRAINT coin_price_history_pkey PRIMARY KEY (id);


--
-- Name: coin_swaps coin_swaps_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coin_swaps
    ADD CONSTRAINT coin_swaps_pkey PRIMARY KEY (id);


--
-- Name: daily_spins daily_spins_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_spins
    ADD CONSTRAINT daily_spins_pkey PRIMARY KEY (id);


--
-- Name: deposit_addresses deposit_addresses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deposit_addresses
    ADD CONSTRAINT deposit_addresses_pkey PRIMARY KEY (id);


--
-- Name: deposit_addresses deposit_addresses_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deposit_addresses
    ADD CONSTRAINT deposit_addresses_user_id_key UNIQUE (user_id);


--
-- Name: deposits deposits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deposits
    ADD CONSTRAINT deposits_pkey PRIMARY KEY (id);


--
-- Name: exchange_audit_log exchange_audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exchange_audit_log
    ADD CONSTRAINT exchange_audit_log_pkey PRIMARY KEY (id);


--
-- Name: exchange_coins exchange_coins_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exchange_coins
    ADD CONSTRAINT exchange_coins_pkey PRIMARY KEY (id);


--
-- Name: exchange_coins exchange_coins_symbol_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exchange_coins
    ADD CONSTRAINT exchange_coins_symbol_key UNIQUE (symbol);


--
-- Name: exchange_watchlist exchange_watchlist_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exchange_watchlist
    ADD CONSTRAINT exchange_watchlist_pkey PRIMARY KEY (id);


--
-- Name: exchange_watchlist exchange_watchlist_user_id_symbol_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exchange_watchlist
    ADD CONSTRAINT exchange_watchlist_user_id_symbol_key UNIQUE (user_id, symbol);


--
-- Name: football_bets football_bets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.football_bets
    ADD CONSTRAINT football_bets_pkey PRIMARY KEY (id);


--
-- Name: football_matches football_matches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.football_matches
    ADD CONSTRAINT football_matches_pkey PRIMARY KEY (id);


--
-- Name: forum_attachments forum_attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forum_attachments
    ADD CONSTRAINT forum_attachments_pkey PRIMARY KEY (id);


--
-- Name: forum_bookmarks forum_bookmarks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forum_bookmarks
    ADD CONSTRAINT forum_bookmarks_pkey PRIMARY KEY (id);


--
-- Name: forum_bookmarks forum_bookmarks_user_id_thread_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forum_bookmarks
    ADD CONSTRAINT forum_bookmarks_user_id_thread_id_key UNIQUE (user_id, thread_id);


--
-- Name: forum_likes forum_likes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forum_likes
    ADD CONSTRAINT forum_likes_pkey PRIMARY KEY (id);


--
-- Name: forum_reactions forum_reactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forum_reactions
    ADD CONSTRAINT forum_reactions_pkey PRIMARY KEY (id);


--
-- Name: forum_reactions forum_reactions_unique_user_target_reaction; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forum_reactions
    ADD CONSTRAINT forum_reactions_unique_user_target_reaction UNIQUE (user_id, thread_id, reply_id, reaction);


--
-- Name: forum_replies forum_replies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forum_replies
    ADD CONSTRAINT forum_replies_pkey PRIMARY KEY (id);


--
-- Name: forum_threads forum_threads_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forum_threads
    ADD CONSTRAINT forum_threads_pkey PRIMARY KEY (id);


--
-- Name: free_bet_progress free_bet_progress_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.free_bet_progress
    ADD CONSTRAINT free_bet_progress_pkey PRIMARY KEY (id);


--
-- Name: free_bet_progress free_bet_progress_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.free_bet_progress
    ADD CONSTRAINT free_bet_progress_user_id_key UNIQUE (user_id);


--
-- Name: friendships friendships_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.friendships
    ADD CONSTRAINT friendships_pkey PRIMARY KEY (id);


--
-- Name: friendships friendships_requester_id_addressee_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.friendships
    ADD CONSTRAINT friendships_requester_id_addressee_id_key UNIQUE (requester_id, addressee_id);


--
-- Name: game_chat game_chat_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.game_chat
    ADD CONSTRAINT game_chat_pkey PRIMARY KEY (id);


--
-- Name: games games_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.games
    ADD CONSTRAINT games_pkey PRIMARY KEY (id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: moderation_log moderation_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.moderation_log
    ADD CONSTRAINT moderation_log_pkey PRIMARY KEY (id);


--
-- Name: party_lobbies party_lobbies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.party_lobbies
    ADD CONSTRAINT party_lobbies_pkey PRIMARY KEY (id);


--
-- Name: party_lobby_members party_lobby_members_lobby_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.party_lobby_members
    ADD CONSTRAINT party_lobby_members_lobby_id_user_id_key UNIQUE (lobby_id, user_id);


--
-- Name: party_lobby_members party_lobby_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.party_lobby_members
    ADD CONSTRAINT party_lobby_members_pkey PRIMARY KEY (id);


--
-- Name: party_reports party_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.party_reports
    ADD CONSTRAINT party_reports_pkey PRIMARY KEY (id);


--
-- Name: password_reset_nonces password_reset_nonces_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_nonces
    ADD CONSTRAINT password_reset_nonces_pkey PRIMARY KEY (nonce);


--
-- Name: price_alerts price_alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.price_alerts
    ADD CONSTRAINT price_alerts_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_user_id_key UNIQUE (user_id);


--
-- Name: race_runners race_runners_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.race_runners
    ADD CONSTRAINT race_runners_pkey PRIMARY KEY (id);


--
-- Name: race_runners race_runners_race_id_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.race_runners
    ADD CONSTRAINT race_runners_race_id_number_key UNIQUE (race_id, number);


--
-- Name: races races_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.races
    ADD CONSTRAINT races_pkey PRIMARY KEY (id);


--
-- Name: scratch_card_pool scratch_card_pool_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scratch_card_pool
    ADD CONSTRAINT scratch_card_pool_pkey PRIMARY KEY (id);


--
-- Name: site_settings site_settings_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.site_settings
    ADD CONSTRAINT site_settings_key_key UNIQUE (key);


--
-- Name: site_settings site_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.site_settings
    ADD CONSTRAINT site_settings_pkey PRIMARY KEY (id);


--
-- Name: sports_bets sports_bets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sports_bets
    ADD CONSTRAINT sports_bets_pkey PRIMARY KEY (id);


--
-- Name: staff_tasks staff_tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_tasks
    ADD CONSTRAINT staff_tasks_pkey PRIMARY KEY (id);


--
-- Name: transactions transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_pkey PRIMARY KEY (id);


--
-- Name: user_bonuses user_bonuses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_bonuses
    ADD CONSTRAINT user_bonuses_pkey PRIMARY KEY (id);


--
-- Name: user_coin_balances user_coin_balances_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_coin_balances
    ADD CONSTRAINT user_coin_balances_pkey PRIMARY KEY (id);


--
-- Name: user_coin_balances user_coin_balances_user_id_symbol_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_coin_balances
    ADD CONSTRAINT user_coin_balances_user_id_symbol_key UNIQUE (user_id, symbol);


--
-- Name: user_gifts user_gifts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_gifts
    ADD CONSTRAINT user_gifts_pkey PRIMARY KEY (id);


--
-- Name: user_presence user_presence_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_presence
    ADD CONSTRAINT user_presence_pkey PRIMARY KEY (id);


--
-- Name: user_presence user_presence_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_presence
    ADD CONSTRAINT user_presence_user_id_key UNIQUE (user_id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);


--
-- Name: withdrawals withdrawals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.withdrawals
    ADD CONSTRAINT withdrawals_pkey PRIMARY KEY (id);


--
-- Name: ai_agent_log_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ai_agent_log_created_at_idx ON public.ai_agent_log USING btree (created_at DESC);


--
-- Name: forum_likes_user_reply_uniq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX forum_likes_user_reply_uniq ON public.forum_likes USING btree (user_id, reply_id) WHERE (reply_id IS NOT NULL);


--
-- Name: forum_likes_user_thread_uniq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX forum_likes_user_thread_uniq ON public.forum_likes USING btree (user_id, thread_id) WHERE (thread_id IS NOT NULL);


--
-- Name: games_slug_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX games_slug_unique ON public.games USING btree (slug) WHERE (slug IS NOT NULL);


--
-- Name: idx_activity_feed_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_feed_created ON public.activity_feed USING btree (created_at DESC);


--
-- Name: idx_bets_race; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bets_race ON public.sports_bets USING btree (race_id);


--
-- Name: idx_bets_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bets_status ON public.sports_bets USING btree (status);


--
-- Name: idx_bets_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bets_user ON public.sports_bets USING btree (user_id);


--
-- Name: idx_coin_price_history_symbol_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_coin_price_history_symbol_time ON public.coin_price_history USING btree (symbol, recorded_at DESC);


--
-- Name: idx_coin_swaps_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_coin_swaps_user ON public.coin_swaps USING btree (user_id, created_at DESC);


--
-- Name: idx_daily_spins_user_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_daily_spins_user_date ON public.daily_spins USING btree (user_id, spun_at DESC);


--
-- Name: idx_exchange_coins_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_exchange_coins_order ON public.exchange_coins USING btree (display_order);


--
-- Name: idx_exchange_coins_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_exchange_coins_status ON public.exchange_coins USING btree (status);


--
-- Name: idx_forum_attachments_thread; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_forum_attachments_thread ON public.forum_attachments USING btree (thread_id);


--
-- Name: idx_forum_bookmarks_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_forum_bookmarks_user ON public.forum_bookmarks USING btree (user_id);


--
-- Name: idx_forum_reactions_reply; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_forum_reactions_reply ON public.forum_reactions USING btree (reply_id);


--
-- Name: idx_forum_reactions_thread; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_forum_reactions_thread ON public.forum_reactions USING btree (thread_id);


--
-- Name: idx_forum_replies_thread; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_forum_replies_thread ON public.forum_replies USING btree (thread_id, created_at);


--
-- Name: idx_forum_threads_activity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_forum_threads_activity ON public.forum_threads USING btree (last_activity_at DESC);


--
-- Name: idx_forum_threads_prefix; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_forum_threads_prefix ON public.forum_threads USING btree (prefix);


--
-- Name: idx_friendships_addressee; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_friendships_addressee ON public.friendships USING btree (addressee_id);


--
-- Name: idx_friendships_requester; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_friendships_requester ON public.friendships USING btree (requester_id);


--
-- Name: idx_friendships_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_friendships_status ON public.friendships USING btree (status);


--
-- Name: idx_messages_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_created ON public.messages USING btree (created_at);


--
-- Name: idx_messages_receiver; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_receiver ON public.messages USING btree (receiver_id);


--
-- Name: idx_messages_sender; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_sender ON public.messages USING btree (sender_id);


--
-- Name: idx_password_reset_nonces_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_password_reset_nonces_expires ON public.password_reset_nonces USING btree (expires_at);


--
-- Name: idx_races_off_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_races_off_time ON public.races USING btree (off_time);


--
-- Name: idx_races_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_races_status ON public.races USING btree (status);


--
-- Name: idx_races_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_races_type ON public.races USING btree (race_type);


--
-- Name: idx_runners_race; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_runners_race ON public.race_runners USING btree (race_id);


--
-- Name: idx_user_bonuses_user_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_bonuses_user_status ON public.user_bonuses USING btree (user_id, status, expires_at);


--
-- Name: idx_user_coin_balances_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_coin_balances_user ON public.user_coin_balances USING btree (user_id);


--
-- Name: profiles enforce_balance_admin_only; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER enforce_balance_admin_only BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.prevent_balance_self_update();


--
-- Name: football_matches football_matches_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER football_matches_updated_at BEFORE UPDATE ON public.football_matches FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: coin_listing_applications trg_coin_listing_apps_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_coin_listing_apps_updated_at BEFORE UPDATE ON public.coin_listing_applications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: exchange_coins trg_exchange_coins_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_exchange_coins_updated_at BEFORE UPDATE ON public.exchange_coins FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: forum_likes trg_forum_likes_change; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_forum_likes_change AFTER INSERT OR DELETE ON public.forum_likes FOR EACH ROW EXECUTE FUNCTION public.forum_likes_after_change();


--
-- Name: forum_replies trg_forum_replies_change; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_forum_replies_change AFTER INSERT OR DELETE ON public.forum_replies FOR EACH ROW EXECUTE FUNCTION public.forum_replies_after_change();


--
-- Name: free_bet_progress trg_free_bet_progress_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_free_bet_progress_updated_at BEFORE UPDATE ON public.free_bet_progress FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: profiles trg_sync_real_balance_to_usdt; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_sync_real_balance_to_usdt AFTER UPDATE OF real_balance ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.sync_real_balance_to_usdt();


--
-- Name: user_coin_balances trg_sync_usdt_to_real_balance; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_sync_usdt_to_real_balance AFTER INSERT OR UPDATE OF available ON public.user_coin_balances FOR EACH ROW EXECUTE FUNCTION public.sync_usdt_to_real_balance();


--
-- Name: user_bonuses trg_user_bonuses_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_user_bonuses_updated_at BEFORE UPDATE ON public.user_bonuses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: chat_bans update_chat_bans_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_chat_bans_updated_at BEFORE UPDATE ON public.chat_bans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: deposits update_deposits_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_deposits_updated_at BEFORE UPDATE ON public.deposits FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: friendships update_friendships_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_friendships_updated_at BEFORE UPDATE ON public.friendships FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: party_lobbies update_party_lobbies_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_party_lobbies_updated_at BEFORE UPDATE ON public.party_lobbies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: profiles update_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: races update_races_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_races_updated_at BEFORE UPDATE ON public.races FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: race_runners update_runners_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_runners_updated_at BEFORE UPDATE ON public.race_runners FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: site_settings update_site_settings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_site_settings_updated_at BEFORE UPDATE ON public.site_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: staff_tasks update_staff_tasks_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_staff_tasks_updated_at BEFORE UPDATE ON public.staff_tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: user_coin_balances update_user_coin_balances_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_user_coin_balances_updated_at BEFORE UPDATE ON public.user_coin_balances FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: withdrawals update_withdrawals_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_withdrawals_updated_at BEFORE UPDATE ON public.withdrawals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: broadcast_reads broadcast_reads_broadcast_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.broadcast_reads
    ADD CONSTRAINT broadcast_reads_broadcast_id_fkey FOREIGN KEY (broadcast_id) REFERENCES public.broadcast_messages(id) ON DELETE CASCADE;


--
-- Name: forum_attachments forum_attachments_thread_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forum_attachments
    ADD CONSTRAINT forum_attachments_thread_id_fkey FOREIGN KEY (thread_id) REFERENCES public.forum_threads(id) ON DELETE CASCADE;


--
-- Name: forum_bookmarks forum_bookmarks_thread_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forum_bookmarks
    ADD CONSTRAINT forum_bookmarks_thread_id_fkey FOREIGN KEY (thread_id) REFERENCES public.forum_threads(id) ON DELETE CASCADE;


--
-- Name: forum_likes forum_likes_reply_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forum_likes
    ADD CONSTRAINT forum_likes_reply_id_fkey FOREIGN KEY (reply_id) REFERENCES public.forum_replies(id) ON DELETE CASCADE;


--
-- Name: forum_likes forum_likes_thread_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forum_likes
    ADD CONSTRAINT forum_likes_thread_id_fkey FOREIGN KEY (thread_id) REFERENCES public.forum_threads(id) ON DELETE CASCADE;


--
-- Name: forum_reactions forum_reactions_reply_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forum_reactions
    ADD CONSTRAINT forum_reactions_reply_id_fkey FOREIGN KEY (reply_id) REFERENCES public.forum_replies(id) ON DELETE CASCADE;


--
-- Name: forum_reactions forum_reactions_thread_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forum_reactions
    ADD CONSTRAINT forum_reactions_thread_id_fkey FOREIGN KEY (thread_id) REFERENCES public.forum_threads(id) ON DELETE CASCADE;


--
-- Name: forum_replies forum_replies_thread_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forum_replies
    ADD CONSTRAINT forum_replies_thread_id_fkey FOREIGN KEY (thread_id) REFERENCES public.forum_threads(id) ON DELETE CASCADE;


--
-- Name: friendships friendships_addressee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.friendships
    ADD CONSTRAINT friendships_addressee_id_fkey FOREIGN KEY (addressee_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: friendships friendships_requester_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.friendships
    ADD CONSTRAINT friendships_requester_id_fkey FOREIGN KEY (requester_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: messages messages_receiver_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_receiver_id_fkey FOREIGN KEY (receiver_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: messages messages_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: party_lobby_members party_lobby_members_lobby_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.party_lobby_members
    ADD CONSTRAINT party_lobby_members_lobby_id_fkey FOREIGN KEY (lobby_id) REFERENCES public.party_lobbies(id) ON DELETE CASCADE;


--
-- Name: race_runners race_runners_race_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.race_runners
    ADD CONSTRAINT race_runners_race_id_fkey FOREIGN KEY (race_id) REFERENCES public.races(id) ON DELETE CASCADE;


--
-- Name: scratch_card_pool scratch_card_pool_claimed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scratch_card_pool
    ADD CONSTRAINT scratch_card_pool_claimed_by_fkey FOREIGN KEY (claimed_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: sports_bets sports_bets_race_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sports_bets
    ADD CONSTRAINT sports_bets_race_id_fkey FOREIGN KEY (race_id) REFERENCES public.races(id) ON DELETE CASCADE;


--
-- Name: transactions transactions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: friendships Addressee can update friendship status; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Addressee can update friendship status" ON public.friendships FOR UPDATE USING ((auth.uid() = addressee_id));


--
-- Name: ai_agent_log Admins and owners can view ai agent log; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and owners can view ai agent log" ON public.ai_agent_log FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'owner'::public.app_role)));


--
-- Name: staff_tasks Admins can create tasks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can create tasks" ON public.staff_tasks FOR INSERT TO authenticated WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'owner'::public.app_role)));


--
-- Name: exchange_coins Admins can delete coins; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete coins" ON public.exchange_coins FOR DELETE TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'owner'::public.app_role)));


--
-- Name: games Admins can delete games; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete games" ON public.games FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_presence Admins can delete presence; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete presence" ON public.user_presence FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_roles Admins can delete roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete roles" ON public.user_roles FOR DELETE USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'owner'::public.app_role)));


--
-- Name: site_settings Admins can delete site settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete site settings" ON public.site_settings FOR DELETE TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'owner'::public.app_role)));


--
-- Name: staff_tasks Admins can delete tasks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete tasks" ON public.staff_tasks FOR DELETE TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'owner'::public.app_role)));


--
-- Name: exchange_coins Admins can insert coins; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert coins" ON public.exchange_coins FOR INSERT TO authenticated WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'owner'::public.app_role)));


--
-- Name: games Admins can insert games; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert games" ON public.games FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_roles Admins can insert roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'owner'::public.app_role)));


--
-- Name: site_settings Admins can insert site settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert site settings" ON public.site_settings FOR INSERT TO authenticated WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'owner'::public.app_role)));


--
-- Name: transactions Admins can insert transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert transactions" ON public.transactions FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: broadcast_messages Admins can manage broadcasts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage broadcasts" ON public.broadcast_messages TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'owner'::public.app_role) OR public.has_role(auth.uid(), 'staff'::public.app_role))) WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'owner'::public.app_role) OR public.has_role(auth.uid(), 'staff'::public.app_role)));


--
-- Name: profiles Admins can update all profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update all profiles" ON public.profiles FOR UPDATE USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'owner'::public.app_role)));


--
-- Name: exchange_coins Admins can update coins; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update coins" ON public.exchange_coins FOR UPDATE TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'owner'::public.app_role)));


--
-- Name: games Admins can update games; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update games" ON public.games FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: site_settings Admins can update site settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update site settings" ON public.site_settings FOR UPDATE TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'owner'::public.app_role)));


--
-- Name: withdrawals Admins can update withdrawals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update withdrawals" ON public.withdrawals FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: deposits Admins can view all deposits; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all deposits" ON public.deposits FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: profiles Admins can view all profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'owner'::public.app_role)));


--
-- Name: user_roles Admins can view all roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'owner'::public.app_role)));


--
-- Name: daily_spins Admins can view all spins; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all spins" ON public.daily_spins FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: transactions Admins can view all transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all transactions" ON public.transactions FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: withdrawals Admins can view all withdrawals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all withdrawals" ON public.withdrawals FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: coin_listing_applications Admins can view applications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view applications" ON public.coin_listing_applications FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'owner'::public.app_role)));


--
-- Name: coin_listing_applications Admins delete applications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins delete applications" ON public.coin_listing_applications FOR DELETE TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'owner'::public.app_role)));


--
-- Name: exchange_audit_log Admins insert exchange audit; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins insert exchange audit" ON public.exchange_audit_log FOR INSERT TO authenticated WITH CHECK (((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'owner'::public.app_role)) AND (auth.uid() = actor_id)));


--
-- Name: coin_listing_applications Admins update applications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins update applications" ON public.coin_listing_applications FOR UPDATE TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'owner'::public.app_role)));


--
-- Name: user_bonuses Admins view all bonuses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins view all bonuses" ON public.user_bonuses FOR SELECT USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'owner'::public.app_role)));


--
-- Name: user_coin_balances Admins view all coin balances; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins view all coin balances" ON public.user_coin_balances FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'owner'::public.app_role)));


--
-- Name: free_bet_progress Admins view all free bet progress; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins view all free bet progress" ON public.free_bet_progress FOR SELECT USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'owner'::public.app_role)));


--
-- Name: coin_swaps Admins view all swaps; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins view all swaps" ON public.coin_swaps FOR SELECT USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'owner'::public.app_role)));


--
-- Name: exchange_audit_log Admins view exchange audit; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins view exchange audit" ON public.exchange_audit_log FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'owner'::public.app_role)));


--
-- Name: broadcast_messages All authenticated users can view active broadcasts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "All authenticated users can view active broadcasts" ON public.broadcast_messages FOR SELECT TO authenticated USING ((is_active = true));


--
-- Name: party_lobbies Anyone authed can view active lobbies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone authed can view active lobbies" ON public.party_lobbies FOR SELECT TO authenticated USING ((is_active = true));


--
-- Name: party_lobby_members Anyone authed can view members; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone authed can view members" ON public.party_lobby_members FOR SELECT TO authenticated USING (true);


--
-- Name: game_chat Anyone authenticated can view game chat; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone authenticated can view game chat" ON public.game_chat FOR SELECT TO authenticated USING (true);


--
-- Name: user_presence Anyone authenticated can view presence; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone authenticated can view presence" ON public.user_presence FOR SELECT TO authenticated USING (true);


--
-- Name: coin_listing_applications Anyone can submit coin listing; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can submit coin listing" ON public.coin_listing_applications FOR INSERT WITH CHECK (true);


--
-- Name: games Anyone can view active games; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view active games" ON public.games FOR SELECT USING (((is_active = true) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: football_matches Anyone can view football matches; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view football matches" ON public.football_matches FOR SELECT USING (true);


--
-- Name: exchange_coins Anyone can view non-delisted coins; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view non-delisted coins" ON public.exchange_coins FOR SELECT USING (((status <> 'delisted'::text) OR public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'owner'::public.app_role)));


--
-- Name: coin_price_history Anyone can view price history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view price history" ON public.coin_price_history FOR SELECT USING (true);


--
-- Name: races Anyone can view races; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view races" ON public.races FOR SELECT USING (true);


--
-- Name: race_runners Anyone can view runners; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view runners" ON public.race_runners FOR SELECT USING (true);


--
-- Name: party_lobbies Authed users can create lobbies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authed users can create lobbies" ON public.party_lobbies FOR INSERT TO authenticated WITH CHECK ((auth.uid() = host_id));


--
-- Name: party_reports Authed users can submit reports; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authed users can submit reports" ON public.party_reports FOR INSERT TO authenticated WITH CHECK ((auth.uid() = reporter_id));


--
-- Name: game_chat Authenticated users can send messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can send messages" ON public.game_chat FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
-- Name: profiles Authenticated users can view public profiles via view; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view public profiles via view" ON public.profiles FOR SELECT TO authenticated USING (((auth.uid() = user_id) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: user_roles Deny non-admin role inserts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Deny non-admin role inserts" ON public.user_roles AS RESTRICTIVE FOR INSERT WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'owner'::public.app_role)));


--
-- Name: party_lobbies Host can delete own lobby; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Host can delete own lobby" ON public.party_lobbies FOR DELETE TO authenticated USING ((auth.uid() = host_id));


--
-- Name: party_lobby_members Host can update members; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Host can update members" ON public.party_lobby_members FOR UPDATE TO authenticated USING (((auth.uid() = user_id) OR (EXISTS ( SELECT 1
   FROM public.party_lobbies l
  WHERE ((l.id = party_lobby_members.lobby_id) AND (l.host_id = auth.uid()))))));


--
-- Name: party_lobbies Host can update own lobby; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Host can update own lobby" ON public.party_lobbies FOR UPDATE TO authenticated USING ((auth.uid() = host_id));


--
-- Name: site_settings Only admins can read site settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can read site settings" ON public.site_settings FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'owner'::public.app_role)));


--
-- Name: daily_spins Only service role can insert spins; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only service role can insert spins" ON public.daily_spins FOR INSERT TO service_role WITH CHECK (true);


--
-- Name: scratch_card_pool Only service role can manage cards; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only service role can manage cards" ON public.scratch_card_pool TO service_role USING (true) WITH CHECK (true);


--
-- Name: messages Receiver can update message read status; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Receiver can update message read status" ON public.messages FOR UPDATE USING ((auth.uid() = receiver_id));


--
-- Name: ai_agent_log Service role can insert ai agent log; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can insert ai agent log" ON public.ai_agent_log FOR INSERT TO service_role WITH CHECK (true);


--
-- Name: deposits Service role full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role full access" ON public.deposits TO service_role USING (true) WITH CHECK (true);


--
-- Name: sports_bets Service role manages bets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role manages bets" ON public.sports_bets TO service_role USING (true) WITH CHECK (true);


--
-- Name: user_bonuses Service role manages bonuses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role manages bonuses" ON public.user_bonuses TO service_role USING (true) WITH CHECK (true);


--
-- Name: user_coin_balances Service role manages coin balances; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role manages coin balances" ON public.user_coin_balances TO service_role USING (true) WITH CHECK (true);


--
-- Name: deposit_addresses Service role manages deposit addresses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role manages deposit addresses" ON public.deposit_addresses TO service_role USING (true) WITH CHECK (true);


--
-- Name: football_bets Service role manages football bets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role manages football bets" ON public.football_bets TO service_role USING (true) WITH CHECK (true);


--
-- Name: football_matches Service role manages football matches; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role manages football matches" ON public.football_matches TO service_role USING (true) WITH CHECK (true);


--
-- Name: free_bet_progress Service role manages free bet progress; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role manages free bet progress" ON public.free_bet_progress TO service_role USING (true) WITH CHECK (true);


--
-- Name: coin_price_history Service role manages price history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role manages price history" ON public.coin_price_history TO service_role USING (true) WITH CHECK (true);


--
-- Name: races Service role manages races; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role manages races" ON public.races TO service_role USING (true) WITH CHECK (true);


--
-- Name: password_reset_nonces Service role manages reset nonces; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role manages reset nonces" ON public.password_reset_nonces TO service_role USING (true) WITH CHECK (true);


--
-- Name: race_runners Service role manages runners; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role manages runners" ON public.race_runners TO service_role USING (true) WITH CHECK (true);


--
-- Name: coin_swaps Service role manages swaps; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role manages swaps" ON public.coin_swaps TO service_role USING (true) WITH CHECK (true);


--
-- Name: withdrawals Service role manages withdrawals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role manages withdrawals" ON public.withdrawals TO service_role USING (true) WITH CHECK (true);


--
-- Name: staff_tasks Staff and admins can update tasks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff and admins can update tasks" ON public.staff_tasks FOR UPDATE TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'owner'::public.app_role) OR ((assigned_to = auth.uid()) AND public.has_role(auth.uid(), 'staff'::public.app_role))));


--
-- Name: chat_bans Staff can create bans; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can create bans" ON public.chat_bans FOR INSERT TO authenticated WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'moderator'::public.app_role) OR public.has_role(auth.uid(), 'staff'::public.app_role)));


--
-- Name: game_chat Staff can delete chat messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can delete chat messages" ON public.game_chat FOR DELETE TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'moderator'::public.app_role) OR public.has_role(auth.uid(), 'staff'::public.app_role)));


--
-- Name: moderation_log Staff can insert moderation logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can insert moderation logs" ON public.moderation_log FOR INSERT TO authenticated WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'moderator'::public.app_role) OR public.has_role(auth.uid(), 'staff'::public.app_role)));


--
-- Name: chat_bans Staff can update bans; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can update bans" ON public.chat_bans FOR UPDATE TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'moderator'::public.app_role) OR public.has_role(auth.uid(), 'staff'::public.app_role)));


--
-- Name: chat_bans Staff can view all bans; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can view all bans" ON public.chat_bans FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'moderator'::public.app_role) OR public.has_role(auth.uid(), 'staff'::public.app_role)));


--
-- Name: staff_tasks Staff can view assigned tasks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can view assigned tasks" ON public.staff_tasks FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'owner'::public.app_role) OR ((assigned_to = auth.uid()) AND public.has_role(auth.uid(), 'staff'::public.app_role))));


--
-- Name: moderation_log Staff can view moderation logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can view moderation logs" ON public.moderation_log FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'moderator'::public.app_role) OR public.has_role(auth.uid(), 'staff'::public.app_role)));


--
-- Name: party_reports Staff can view reports; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can view reports" ON public.party_reports FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'moderator'::public.app_role) OR public.has_role(auth.uid(), 'staff'::public.app_role) OR public.has_role(auth.uid(), 'owner'::public.app_role)));


--
-- Name: sports_bets Staff view all bets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff view all bets" ON public.sports_bets FOR SELECT USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'owner'::public.app_role) OR public.has_role(auth.uid(), 'staff'::public.app_role)));


--
-- Name: football_bets Staff view all football bets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff view all football bets" ON public.football_bets FOR SELECT USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'owner'::public.app_role) OR public.has_role(auth.uid(), 'staff'::public.app_role)));


--
-- Name: friendships Users can delete their own friendships; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own friendships" ON public.friendships FOR DELETE USING (((auth.uid() = requester_id) OR (auth.uid() = addressee_id)));


--
-- Name: user_presence Users can insert their own presence; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own presence" ON public.user_presence FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
-- Name: profiles Users can insert their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: party_lobby_members Users can join lobbies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can join lobbies" ON public.party_lobby_members FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
-- Name: party_lobby_members Users can leave lobbies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can leave lobbies" ON public.party_lobby_members FOR DELETE TO authenticated USING (((auth.uid() = user_id) OR (EXISTS ( SELECT 1
   FROM public.party_lobbies l
  WHERE ((l.id = party_lobby_members.lobby_id) AND (l.host_id = auth.uid()))))));


--
-- Name: broadcast_reads Users can mark as read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can mark as read" ON public.broadcast_reads FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
-- Name: withdrawals Users can request withdrawals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can request withdrawals" ON public.withdrawals FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: friendships Users can send friend requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can send friend requests" ON public.friendships FOR INSERT WITH CHECK ((auth.uid() = requester_id));


--
-- Name: messages Users can send messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can send messages" ON public.messages FOR INSERT WITH CHECK ((auth.uid() = sender_id));


--
-- Name: profiles Users can update own profile non-balance fields; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own profile non-balance fields" ON public.profiles FOR UPDATE USING ((auth.uid() = user_id)) WITH CHECK (((auth.uid() = user_id) AND (NOT (balance IS DISTINCT FROM ( SELECT p.balance
   FROM public.profiles p
  WHERE (p.user_id = auth.uid())))) AND (NOT (real_balance IS DISTINCT FROM ( SELECT p.real_balance
   FROM public.profiles p
  WHERE (p.user_id = auth.uid())))) AND (NOT (xp IS DISTINCT FROM ( SELECT p.xp
   FROM public.profiles p
  WHERE (p.user_id = auth.uid())))) AND (NOT (biggest_win IS DISTINCT FROM ( SELECT p.biggest_win
   FROM public.profiles p
  WHERE (p.user_id = auth.uid())))) AND (NOT (biggest_win_game IS DISTINCT FROM ( SELECT p.biggest_win_game
   FROM public.profiles p
  WHERE (p.user_id = auth.uid()))))));


--
-- Name: user_presence Users can update their own presence; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own presence" ON public.user_presence FOR UPDATE TO authenticated USING ((auth.uid() = user_id));


--
-- Name: chat_bans Users can view own bans; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own bans" ON public.chat_bans FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: deposits Users can view own deposits; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own deposits" ON public.deposits FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: broadcast_reads Users can view own reads; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own reads" ON public.broadcast_reads FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: daily_spins Users can view own spins; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own spins" ON public.daily_spins FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: withdrawals Users can view own withdrawals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own withdrawals" ON public.withdrawals FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: scratch_card_pool Users can view their own claimed cards; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own claimed cards" ON public.scratch_card_pool FOR SELECT TO authenticated USING ((claimed_by = auth.uid()));


--
-- Name: friendships Users can view their own friendships; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own friendships" ON public.friendships FOR SELECT USING (((auth.uid() = requester_id) OR (auth.uid() = addressee_id)));


--
-- Name: messages Users can view their own messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own messages" ON public.messages FOR SELECT USING (((auth.uid() = sender_id) OR (auth.uid() = receiver_id)));


--
-- Name: profiles Users can view their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: user_roles Users can view their own roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: transactions Users can view their own transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own transactions" ON public.transactions FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: coin_listing_applications Users view own applications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users view own applications" ON public.coin_listing_applications FOR SELECT TO authenticated USING ((auth.uid() = applicant_user_id));


--
-- Name: sports_bets Users view own bets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users view own bets" ON public.sports_bets FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: user_bonuses Users view own bonuses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users view own bonuses" ON public.user_bonuses FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: user_coin_balances Users view own coin balances; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users view own coin balances" ON public.user_coin_balances FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: football_bets Users view own football bets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users view own football bets" ON public.football_bets FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: free_bet_progress Users view own free bet progress; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users view own free bet progress" ON public.free_bet_progress FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: coin_swaps Users view own swaps; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users view own swaps" ON public.coin_swaps FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: activity_feed; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.activity_feed ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_agent_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_agent_log ENABLE ROW LEVEL SECURITY;

--
-- Name: forum_attachments anyone authed can read attachments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "anyone authed can read attachments" ON public.forum_attachments FOR SELECT TO authenticated USING (true);


--
-- Name: forum_likes anyone authed can read likes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "anyone authed can read likes" ON public.forum_likes FOR SELECT TO authenticated USING (true);


--
-- Name: forum_reactions anyone authed can read reactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "anyone authed can read reactions" ON public.forum_reactions FOR SELECT TO authenticated USING (true);


--
-- Name: forum_replies anyone authed can read replies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "anyone authed can read replies" ON public.forum_replies FOR SELECT TO authenticated USING (true);


--
-- Name: forum_threads anyone authed can read threads; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "anyone authed can read threads" ON public.forum_threads FOR SELECT TO authenticated USING (true);


--
-- Name: activity_feed anyone authed reads activity; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "anyone authed reads activity" ON public.activity_feed FOR SELECT TO authenticated USING (true);


--
-- Name: broadcast_messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.broadcast_messages ENABLE ROW LEVEL SECURITY;

--
-- Name: broadcast_reads; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.broadcast_reads ENABLE ROW LEVEL SECURITY;

--
-- Name: chat_bans; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.chat_bans ENABLE ROW LEVEL SECURITY;

--
-- Name: coin_listing_applications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.coin_listing_applications ENABLE ROW LEVEL SECURITY;

--
-- Name: coin_price_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.coin_price_history ENABLE ROW LEVEL SECURITY;

--
-- Name: coin_swaps; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.coin_swaps ENABLE ROW LEVEL SECURITY;

--
-- Name: daily_spins; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.daily_spins ENABLE ROW LEVEL SECURITY;

--
-- Name: deposit_addresses; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.deposit_addresses ENABLE ROW LEVEL SECURITY;

--
-- Name: deposits; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.deposits ENABLE ROW LEVEL SECURITY;

--
-- Name: exchange_audit_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.exchange_audit_log ENABLE ROW LEVEL SECURITY;

--
-- Name: exchange_coins; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.exchange_coins ENABLE ROW LEVEL SECURITY;

--
-- Name: exchange_watchlist; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.exchange_watchlist ENABLE ROW LEVEL SECURITY;

--
-- Name: football_bets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.football_bets ENABLE ROW LEVEL SECURITY;

--
-- Name: football_matches; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.football_matches ENABLE ROW LEVEL SECURITY;

--
-- Name: forum_attachments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.forum_attachments ENABLE ROW LEVEL SECURITY;

--
-- Name: forum_bookmarks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.forum_bookmarks ENABLE ROW LEVEL SECURITY;

--
-- Name: forum_likes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.forum_likes ENABLE ROW LEVEL SECURITY;

--
-- Name: forum_reactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.forum_reactions ENABLE ROW LEVEL SECURITY;

--
-- Name: forum_replies; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.forum_replies ENABLE ROW LEVEL SECURITY;

--
-- Name: forum_threads; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.forum_threads ENABLE ROW LEVEL SECURITY;

--
-- Name: free_bet_progress; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.free_bet_progress ENABLE ROW LEVEL SECURITY;

--
-- Name: friendships; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

--
-- Name: game_chat; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.game_chat ENABLE ROW LEVEL SECURITY;

--
-- Name: games; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;

--
-- Name: messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

--
-- Name: moderation_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.moderation_log ENABLE ROW LEVEL SECURITY;

--
-- Name: party_lobbies; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.party_lobbies ENABLE ROW LEVEL SECURITY;

--
-- Name: party_lobby_members; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.party_lobby_members ENABLE ROW LEVEL SECURITY;

--
-- Name: party_reports; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.party_reports ENABLE ROW LEVEL SECURITY;

--
-- Name: password_reset_nonces; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.password_reset_nonces ENABLE ROW LEVEL SECURITY;

--
-- Name: price_alerts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.price_alerts ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: race_runners; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.race_runners ENABLE ROW LEVEL SECURITY;

--
-- Name: races; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.races ENABLE ROW LEVEL SECURITY;

--
-- Name: scratch_card_pool; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.scratch_card_pool ENABLE ROW LEVEL SECURITY;

--
-- Name: site_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: sports_bets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sports_bets ENABLE ROW LEVEL SECURITY;

--
-- Name: staff_tasks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.staff_tasks ENABLE ROW LEVEL SECURITY;

--
-- Name: transactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

--
-- Name: forum_attachments uploader deletes own attachment; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "uploader deletes own attachment" ON public.forum_attachments FOR DELETE TO authenticated USING ((auth.uid() = uploaded_by));


--
-- Name: forum_attachments uploader inserts attachment; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "uploader inserts attachment" ON public.forum_attachments FOR INSERT TO authenticated WITH CHECK ((auth.uid() = uploaded_by));


--
-- Name: user_bonuses; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_bonuses ENABLE ROW LEVEL SECURITY;

--
-- Name: user_coin_balances; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_coin_balances ENABLE ROW LEVEL SECURITY;

--
-- Name: user_gifts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_gifts ENABLE ROW LEVEL SECURITY;

--
-- Name: user_presence; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- Name: forum_bookmarks users add own bookmarks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "users add own bookmarks" ON public.forum_bookmarks FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
-- Name: forum_replies users create own replies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "users create own replies" ON public.forum_replies FOR INSERT TO authenticated WITH CHECK ((auth.uid() = author_id));


--
-- Name: forum_threads users create own threads; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "users create own threads" ON public.forum_threads FOR INSERT TO authenticated WITH CHECK ((auth.uid() = author_id));


--
-- Name: forum_bookmarks users delete own bookmarks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "users delete own bookmarks" ON public.forum_bookmarks FOR DELETE TO authenticated USING ((auth.uid() = user_id));


--
-- Name: forum_likes users delete own likes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "users delete own likes" ON public.forum_likes FOR DELETE TO authenticated USING ((auth.uid() = user_id));


--
-- Name: forum_reactions users delete own reactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "users delete own reactions" ON public.forum_reactions FOR DELETE TO authenticated USING ((auth.uid() = user_id));


--
-- Name: forum_replies users delete own replies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "users delete own replies" ON public.forum_replies FOR DELETE TO authenticated USING ((auth.uid() = author_id));


--
-- Name: forum_threads users delete own threads; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "users delete own threads" ON public.forum_threads FOR DELETE TO authenticated USING ((auth.uid() = author_id));


--
-- Name: forum_likes users insert own likes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "users insert own likes" ON public.forum_likes FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
-- Name: forum_reactions users insert own reactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "users insert own reactions" ON public.forum_reactions FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
-- Name: price_alerts users manage own alerts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "users manage own alerts" ON public.price_alerts TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: exchange_watchlist users manage own watchlist; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "users manage own watchlist" ON public.exchange_watchlist TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: activity_feed users post own activity; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "users post own activity" ON public.activity_feed FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
-- Name: forum_bookmarks users read own bookmarks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "users read own bookmarks" ON public.forum_bookmarks FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: user_gifts users see gifts they sent or got; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "users see gifts they sent or got" ON public.user_gifts FOR SELECT TO authenticated USING (((auth.uid() = sender_id) OR (auth.uid() = receiver_id)));


--
-- Name: user_gifts users send gifts as themselves; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "users send gifts as themselves" ON public.user_gifts FOR INSERT TO authenticated WITH CHECK ((auth.uid() = sender_id));


--
-- Name: forum_replies users update own replies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "users update own replies" ON public.forum_replies FOR UPDATE TO authenticated USING ((auth.uid() = author_id));


--
-- Name: forum_threads users update own threads; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "users update own threads" ON public.forum_threads FOR UPDATE TO authenticated USING ((auth.uid() = author_id));


--
-- Name: withdrawals; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--

\unrestrict iXHTheGXgjuuxta6Von405VGbdLYaPnYiurNzFz0Q4cstahnQZgGU85ccVCxQlY

