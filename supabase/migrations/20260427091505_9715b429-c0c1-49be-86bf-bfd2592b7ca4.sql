
-- Party lobbies
CREATE TABLE public.party_lobbies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  host_id UUID NOT NULL,
  password_hash TEXT,
  is_public BOOLEAN NOT NULL DEFAULT true,
  max_members INTEGER NOT NULL DEFAULT 8,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.party_lobbies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authed can view active lobbies"
  ON public.party_lobbies FOR SELECT TO authenticated
  USING (is_active = true);

CREATE POLICY "Authed users can create lobbies"
  ON public.party_lobbies FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Host can update own lobby"
  ON public.party_lobbies FOR UPDATE TO authenticated
  USING (auth.uid() = host_id);

CREATE POLICY "Host can delete own lobby"
  ON public.party_lobbies FOR DELETE TO authenticated
  USING (auth.uid() = host_id);

-- Party lobby members
CREATE TABLE public.party_lobby_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lobby_id UUID NOT NULL REFERENCES public.party_lobbies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  is_muted BOOLEAN NOT NULL DEFAULT false,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (lobby_id, user_id)
);

ALTER TABLE public.party_lobby_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authed can view members"
  ON public.party_lobby_members FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can join lobbies"
  ON public.party_lobby_members FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave lobbies"
  ON public.party_lobby_members FOR DELETE TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM public.party_lobbies l WHERE l.id = lobby_id AND l.host_id = auth.uid())
  );

CREATE POLICY "Host can update members"
  ON public.party_lobby_members FOR UPDATE TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM public.party_lobbies l WHERE l.id = lobby_id AND l.host_id = auth.uid())
  );

-- Party reports
CREATE TABLE public.party_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lobby_id UUID,
  reporter_id UUID NOT NULL,
  reported_user_id UUID NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.party_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authed users can submit reports"
  ON public.party_reports FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Staff can view reports"
  ON public.party_reports FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'moderator'::app_role)
    OR has_role(auth.uid(), 'staff'::app_role)
    OR has_role(auth.uid(), 'owner'::app_role)
  );

CREATE TRIGGER update_party_lobbies_updated_at
BEFORE UPDATE ON public.party_lobbies
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.party_lobbies;
ALTER PUBLICATION supabase_realtime ADD TABLE public.party_lobby_members;
