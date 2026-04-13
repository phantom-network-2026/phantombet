
CREATE OR REPLACE VIEW public.profiles_public
WITH (security_invoker=on) AS
  SELECT user_id, username, avatar_url, bio, biggest_win, biggest_win_game,
         has_animated_avatar, has_animated_border, border_style, social_links, created_at,
         xp, has_high_roller, name_color, purchased_borders
  FROM public.profiles;
