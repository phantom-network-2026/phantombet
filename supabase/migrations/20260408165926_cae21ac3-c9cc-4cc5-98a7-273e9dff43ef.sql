-- Add new profile customisation columns
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS bio text DEFAULT '',
  ADD COLUMN IF NOT EXISTS biggest_win numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS biggest_win_game text DEFAULT '',
  ADD COLUMN IF NOT EXISTS social_links jsonb DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS has_animated_avatar boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_animated_border boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS border_style text DEFAULT 'none';

-- Allow any authenticated user to view any profile (for public profiles)
CREATE POLICY "Authenticated users can view all profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (true);