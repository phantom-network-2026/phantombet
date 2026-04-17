ALTER TABLE public.games 
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'builtin';

CREATE UNIQUE INDEX IF NOT EXISTS games_slug_unique ON public.games(slug) WHERE slug IS NOT NULL;