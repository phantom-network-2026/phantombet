
-- Create moderation action type enum
CREATE TYPE public.moderation_action AS ENUM ('ban', 'unban', 'mute', 'unmute', 'warn', 'kick', 'delete_message');

-- Chat bans table
CREATE TABLE public.chat_bans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  banned_by UUID NOT NULL,
  reason TEXT,
  game_room TEXT, -- null = global ban across all chats
  expires_at TIMESTAMP WITH TIME ZONE, -- null = permanent
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_bans ENABLE ROW LEVEL SECURITY;

-- Staff+ can view all bans
CREATE POLICY "Staff can view all bans"
ON public.chat_bans FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'moderator') OR
  public.has_role(auth.uid(), 'staff')
);

-- Users can see their own bans
CREATE POLICY "Users can view own bans"
ON public.chat_bans FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Staff+ can create bans
CREATE POLICY "Staff can create bans"
ON public.chat_bans FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'moderator') OR
  public.has_role(auth.uid(), 'staff')
);

-- Staff+ can update bans (deactivate)
CREATE POLICY "Staff can update bans"
ON public.chat_bans FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'moderator') OR
  public.has_role(auth.uid(), 'staff')
);

-- Moderation log table (audit trail)
CREATE TABLE public.moderation_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  action_type public.moderation_action NOT NULL,
  target_user_id UUID NOT NULL,
  moderator_id UUID NOT NULL,
  reason TEXT,
  game_room TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.moderation_log ENABLE ROW LEVEL SECURITY;

-- Staff+ can view all moderation logs
CREATE POLICY "Staff can view moderation logs"
ON public.moderation_log FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'moderator') OR
  public.has_role(auth.uid(), 'staff')
);

-- Staff+ can insert moderation logs
CREATE POLICY "Staff can insert moderation logs"
ON public.moderation_log FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'moderator') OR
  public.has_role(auth.uid(), 'staff')
);

-- Timestamp trigger for chat_bans
CREATE TRIGGER update_chat_bans_updated_at
BEFORE UPDATE ON public.chat_bans
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add delete policy for game_chat so staff can delete messages
CREATE POLICY "Staff can delete chat messages"
ON public.game_chat FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'moderator') OR
  public.has_role(auth.uid(), 'staff')
);
