
CREATE TABLE public.user_presence (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  last_seen TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_online BOOLEAN NOT NULL DEFAULT false
);

ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view presence"
ON public.user_presence FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can insert their own presence"
ON public.user_presence FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own presence"
ON public.user_presence FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can delete presence"
ON public.user_presence FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));
