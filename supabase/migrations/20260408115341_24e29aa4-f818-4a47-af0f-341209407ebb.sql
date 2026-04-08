
CREATE TABLE public.game_chat (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  game_room text NOT NULL,
  username text,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.game_chat ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view game chat" ON public.game_chat
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can send messages" ON public.game_chat
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.game_chat;
