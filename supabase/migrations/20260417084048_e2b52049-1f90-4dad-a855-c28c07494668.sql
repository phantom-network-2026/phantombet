CREATE TABLE IF NOT EXISTS public.ai_agent_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  prompt text not null,
  reply text,
  tool_results jsonb default '[]'::jsonb,
  created_at timestamptz not null default now()
);

ALTER TABLE public.ai_agent_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and owners can view ai agent log"
ON public.ai_agent_log FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'owner'::app_role));

CREATE POLICY "Service role can insert ai agent log"
ON public.ai_agent_log FOR INSERT
TO service_role
WITH CHECK (true);

CREATE INDEX IF NOT EXISTS ai_agent_log_created_at_idx ON public.ai_agent_log (created_at DESC);