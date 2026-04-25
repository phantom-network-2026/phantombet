
-- Race type enum
CREATE TYPE public.race_type AS ENUM ('horse', 'greyhound');
CREATE TYPE public.race_status AS ENUM ('upcoming', 'live', 'settled', 'cancelled');
CREATE TYPE public.sports_bet_type AS ENUM ('win', 'place', 'each_way', 'forecast', 'tricast');
CREATE TYPE public.sports_bet_status AS ENUM ('pending', 'won', 'lost', 'void', 'partial');

-- Races
CREATE TABLE public.races (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  race_type public.race_type NOT NULL,
  venue text NOT NULL,
  race_number integer NOT NULL,
  race_name text NOT NULL,
  distance text NOT NULL,
  going text,
  off_time timestamptz NOT NULL,
  status public.race_status NOT NULL DEFAULT 'upcoming',
  winners integer[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_races_off_time ON public.races(off_time);
CREATE INDEX idx_races_status ON public.races(status);
CREATE INDEX idx_races_type ON public.races(race_type);

ALTER TABLE public.races ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view races" ON public.races FOR SELECT USING (true);
CREATE POLICY "Service role manages races" ON public.races FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Runners
CREATE TABLE public.race_runners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  race_id uuid NOT NULL REFERENCES public.races(id) ON DELETE CASCADE,
  number integer NOT NULL,
  name text NOT NULL,
  jockey_trainer text,
  win_odds numeric NOT NULL DEFAULT 5.0,
  place_odds numeric NOT NULL DEFAULT 2.0,
  finishing_position integer,
  is_scratched boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (race_id, number)
);
CREATE INDEX idx_runners_race ON public.race_runners(race_id);

ALTER TABLE public.race_runners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view runners" ON public.race_runners FOR SELECT USING (true);
CREATE POLICY "Service role manages runners" ON public.race_runners FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Bets
CREATE TABLE public.sports_bets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  race_id uuid NOT NULL REFERENCES public.races(id) ON DELETE CASCADE,
  bet_type public.sports_bet_type NOT NULL,
  selections integer[] NOT NULL,
  stake numeric NOT NULL CHECK (stake > 0),
  odds_taken numeric NOT NULL,
  potential_payout numeric NOT NULL,
  status public.sports_bet_status NOT NULL DEFAULT 'pending',
  payout numeric NOT NULL DEFAULT 0,
  placed_at timestamptz NOT NULL DEFAULT now(),
  settled_at timestamptz
);
CREATE INDEX idx_bets_user ON public.sports_bets(user_id);
CREATE INDEX idx_bets_race ON public.sports_bets(race_id);
CREATE INDEX idx_bets_status ON public.sports_bets(status);

ALTER TABLE public.sports_bets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own bets" ON public.sports_bets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Staff view all bets" ON public.sports_bets FOR SELECT USING (
  has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'staff'::app_role)
);
CREATE POLICY "Service role manages bets" ON public.sports_bets FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Updated_at trigger
CREATE TRIGGER update_races_updated_at BEFORE UPDATE ON public.races
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_runners_updated_at BEFORE UPDATE ON public.race_runners
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.races;
ALTER PUBLICATION supabase_realtime ADD TABLE public.race_runners;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sports_bets;
