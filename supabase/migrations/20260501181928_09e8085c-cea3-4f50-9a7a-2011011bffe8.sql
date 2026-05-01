
-- ── Reactions (multi-emoji) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.forum_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  thread_id UUID REFERENCES public.forum_threads(id) ON DELETE CASCADE,
  reply_id UUID REFERENCES public.forum_replies(id) ON DELETE CASCADE,
  reaction TEXT NOT NULL CHECK (reaction IN ('like','love','fire','target','laugh')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT forum_reactions_target_chk CHECK (
    (thread_id IS NOT NULL AND reply_id IS NULL) OR
    (thread_id IS NULL AND reply_id IS NOT NULL)
  ),
  CONSTRAINT forum_reactions_unique_user_target_reaction UNIQUE (user_id, thread_id, reply_id, reaction)
);

CREATE INDEX IF NOT EXISTS idx_forum_reactions_thread ON public.forum_reactions(thread_id);
CREATE INDEX IF NOT EXISTS idx_forum_reactions_reply ON public.forum_reactions(reply_id);

ALTER TABLE public.forum_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone authed can read reactions"
ON public.forum_reactions FOR SELECT TO authenticated USING (true);

CREATE POLICY "users insert own reactions"
ON public.forum_reactions FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users delete own reactions"
ON public.forum_reactions FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- ── Bookmarks ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.forum_bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  thread_id UUID NOT NULL REFERENCES public.forum_threads(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, thread_id)
);

CREATE INDEX IF NOT EXISTS idx_forum_bookmarks_user ON public.forum_bookmarks(user_id);

ALTER TABLE public.forum_bookmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users read own bookmarks"
ON public.forum_bookmarks FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "users add own bookmarks"
ON public.forum_bookmarks FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users delete own bookmarks"
ON public.forum_bookmarks FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- ── Thread attachments (image URLs) ───────────────────────────
CREATE TABLE IF NOT EXISTS public.forum_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES public.forum_threads(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL,
  url TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'image',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_forum_attachments_thread ON public.forum_attachments(thread_id);

ALTER TABLE public.forum_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone authed can read attachments"
ON public.forum_attachments FOR SELECT TO authenticated USING (true);

CREATE POLICY "uploader inserts attachment"
ON public.forum_attachments FOR INSERT TO authenticated
WITH CHECK (auth.uid() = uploaded_by);

CREATE POLICY "uploader deletes own attachment"
ON public.forum_attachments FOR DELETE TO authenticated
USING (auth.uid() = uploaded_by);

-- ── Storage policy: allow uploads/reads to a forum/ subfolder of the public avatars bucket ──
-- (avatars bucket is already public, so reads are fine; we just need INSERT policy)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Authed users can upload forum images') THEN
    CREATE POLICY "Authed users can upload forum images"
      ON storage.objects FOR INSERT TO authenticated
      WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = 'forum');
  END IF;
END $$;
