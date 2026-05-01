REVOKE EXECUTE ON FUNCTION public.sim_post_forum_thread(uuid, text, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.sim_post_forum_reply(uuid, uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.sim_post_game_chat(uuid, text, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.sim_like(uuid, uuid, uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.sim_post_forum_thread(uuid, text, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sim_post_forum_reply(uuid, uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sim_post_game_chat(uuid, text, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sim_like(uuid, uuid, uuid) TO authenticated, service_role;