-- Football match status enum
CREATE TYPE football_match_status AS ENUM ('upcoming', 'live', 'finished', 'cancelled');
CREATE TYPE football_bet_market AS ENUM ('home', 'draw', 'away');

CREATE TABLE public.football_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competition text NOT NULL,
  home_team text NOT NULL,
  away_team text NOT NULL,
  kickoff_time timestamptz NOT NULL,
  status football_match_status NOT NULL DEFAULT 'upcoming',
  home_odds numeric NOT NULL DEFAULT 2.0,
  draw_odds numeric NOT NULL DEFAULT 3.2,
  away_odds numeric NOT NULL DEFAULT 3.5,
  home_score integer NOT NULL DEFAULT 0,
  away_score integer NOT NULL DEFAULT 0,
  minute integer NOT NULL DEFAULT 0,
  result football_bet_market,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.football_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view football matches" ON public.football_matches
  FOR SELECT USING (true);

CREATE POLICY "Service role manages football matches" ON public.football_matches
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TABLE public.football_bets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  match_id uuid NOT NULL,
  selection football_bet_market NOT NULL,
  stake numeric NOT NULL,
  odds_taken numeric NOT NULL,
  potential_payout numeric NOT NULL,
  status sports_bet_status NOT NULL DEFAULT 'pending',
  payout numeric NOT NULL DEFAULT 0,
  placed_at timestamptz NOT NULL DEFAULT now(),
  settled_at timestamptz
);

ALTER TABLE public.football_bets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own football bets" ON public.football_bets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Staff view all football bets" ON public.football_bets
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

CREATE POLICY "Service role manages football bets" ON public.football_bets
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TRIGGER football_matches_updated_at BEFORE UPDATE ON public.football_matches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.football_matches;
ALTER PUBLICATION supabase_realtime ADD TABLE public.football_bets;