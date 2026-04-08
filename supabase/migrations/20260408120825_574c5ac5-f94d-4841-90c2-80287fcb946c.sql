
-- Scratch card pool: 2000 cards, 1 in 5 is a winner
CREATE TABLE public.scratch_card_pool (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bet_tier numeric NOT NULL,
  is_winner boolean NOT NULL DEFAULT false,
  payout_multiplier numeric NOT NULL DEFAULT 0,
  symbols text[] NOT NULL DEFAULT '{}',
  claimed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  claimed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.scratch_card_pool ENABLE ROW LEVEL SECURITY;

-- Users can only see their own claimed cards
CREATE POLICY "Users can view their own cards"
  ON public.scratch_card_pool FOR SELECT
  TO authenticated
  USING (claimed_by = auth.uid() OR claimed_by IS NULL);

-- No direct insert/update/delete by users
CREATE POLICY "Only service role can manage cards"
  ON public.scratch_card_pool FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Seed 2000 cards per bet tier ($1, $5, $10, $25, $50, $100, $500)
-- 400 winners (1 in 5) and 1600 losers per tier
-- Winners pay 2x the bet
DO $$
DECLARE
  tiers numeric[] := ARRAY[1, 5, 10, 25, 50, 100, 500];
  t numeric;
  i int;
  total_per_tier int := 2000;
  winners_per_tier int := 400;
BEGIN
  FOREACH t IN ARRAY tiers LOOP
    -- Insert winners
    FOR i IN 1..winners_per_tier LOOP
      INSERT INTO public.scratch_card_pool (bet_tier, is_winner, payout_multiplier, symbols)
      VALUES (t, true, 2, ARRAY['💰','💰','💰','🎰','⭐','🔔','🍒','💎','👑']);
    END LOOP;
    -- Insert losers
    FOR i IN 1..(total_per_tier - winners_per_tier) LOOP
      INSERT INTO public.scratch_card_pool (bet_tier, is_winner, payout_multiplier, symbols)
      VALUES (t, false, 0, ARRAY['🍒','⭐','🔔','7️⃣','🍀','💰','🎰','👑','💎']);
    END LOOP;
  END LOOP;
END $$;
