import { useEffect, useMemo, useRef, useState } from "react";
import { Header } from "@/components/casino/Header";
import { BottomNav } from "@/components/casino/BottomNav";
import { AuthGuard } from "@/components/casino/AuthGuard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Clock, Trophy, Activity, Trash2, ChevronUp, ChevronDown, Minus, Search, ChevronRight, Flame, Star, Calendar, Globe2 } from "lucide-react";
import { Input } from "@/components/ui/input";

// Map competitions to a country/region flag emoji + group label.
const COMP_META: Record<string, { flag: string; group: string }> = {
  "Premier League": { flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", group: "England" },
  "Championship": { flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", group: "England" },
  "League One": { flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", group: "England" },
  "League Two": { flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", group: "England" },
  "FA Cup": { flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", group: "England" },
  "EFL Cup": { flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", group: "England" },
  "Scottish Premiership": { flag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", group: "Scotland" },
  "Scottish Championship": { flag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", group: "Scotland" },
  "Scottish League 1": { flag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", group: "Scotland" },
  "Scottish League 2": { flag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", group: "Scotland" },
  "Scottish Cup": { flag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", group: "Scotland" },
  "Champions League": { flag: "🏆", group: "European" },
  "Europa League": { flag: "🏆", group: "European" },
  "Europa Conference League": { flag: "🏆", group: "European" },
  "UEFA Champions League Women's": { flag: "🏆", group: "Women" },
  "UEFA Europa Cup - Women": { flag: "🏆", group: "Women" },
  "La Liga": { flag: "🇪🇸", group: "Spain" },
  "La Liga 2": { flag: "🇪🇸", group: "Spain" },
  "Bundesliga": { flag: "🇩🇪", group: "Germany" },
  "Bundesliga 2": { flag: "🇩🇪", group: "Germany" },
  "Serie A": { flag: "🇮🇹", group: "Italy" },
  "Serie B": { flag: "🇮🇹", group: "Italy" },
  "Ligue 1": { flag: "🇫🇷", group: "France" },
  "Eredivisie": { flag: "🇳🇱", group: "Netherlands" },
  "Primeira Liga": { flag: "🇵🇹", group: "Portugal" },
  "Belgian Pro League": { flag: "🇧🇪", group: "Belgium" },
  "MLS": { flag: "🇺🇸", group: "Americas" },
  "Liga MX": { flag: "🇲🇽", group: "Americas" },
  "Brasileirão": { flag: "🇧🇷", group: "Americas" },
  "Argentine Primera": { flag: "🇦🇷", group: "Americas" },
  "Saudi Pro League": { flag: "🇸🇦", group: "Asia / RoW" },
  "Turkish Süper Lig": { flag: "🇹🇷", group: "Asia / RoW" },
  "Greek Super League": { flag: "🇬🇷", group: "Europe (Other)" },
  "Australian A-League": { flag: "🇦🇺", group: "Asia / RoW" },
  "J1 League": { flag: "🇯🇵", group: "Asia / RoW" },
  "K League 1": { flag: "🇰🇷", group: "Asia / RoW" },
  "World Cup Qualifiers": { flag: "🌍", group: "International" },
  "Nations League": { flag: "🌍", group: "International" },
  "International Friendly": { flag: "🌍", group: "International" },
};
const compMeta = (c: string) => COMP_META[c] || { flag: "⚽", group: "Other" };

type Race = { id: string; race_type: "horse" | "greyhound"; venue: string; race_number: number; race_name: string; distance: string; going: string | null; off_time: string; status: "upcoming" | "live" | "settled"; winners: number[] | null };
type Runner = { id: string; race_id: string; number: number; name: string; jockey_trainer: string | null; win_odds: number; place_odds: number; finishing_position: number | null };
type BetType = "win" | "place" | "each_way" | "forecast" | "tricast";
type Selection = { raceId: string; runnerNumber: number; runnerName: string; odds: number; venue: string; betType: BetType; previousOdds?: number };

const STAKE_TIERS = [0.1, 0.2, 0.5, 1, 2, 5];
const BET_LABELS: Record<BetType, string> = { win: "Win", place: "Place", each_way: "Each-Way", forecast: "Forecast", tricast: "Tricast" };

type FootballMatch = {
  id: string; competition: string; home_team: string; away_team: string;
  kickoff_time: string; status: "upcoming" | "live" | "finished" | "cancelled";
  home_odds: number; draw_odds: number; away_odds: number;
  home_score: number; away_score: number; minute: number;
  result: "home" | "draw" | "away" | null;
};
type FootballMarket = "home" | "draw" | "away";

function formatCountdown(offIso: string) {
  const ms = new Date(offIso).getTime() - Date.now();
  if (ms <= 0) return "OFF";
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function Sportsbook() {
  const [tab, setTab] = useState<"horse" | "greyhound" | "football">("football");
  const [races, setRaces] = useState<Race[]>([]);
  const [runnersByRace, setRunnersByRace] = useState<Record<string, Runner[]>>({});
  const [activeRaceId, setActiveRaceId] = useState<string | null>(null);
  const [betType, setBetType] = useState<BetType>("win");
  const [selections, setSelections] = useState<number[]>([]);
  const [stake, setStake] = useState(1);
  const [placing, setPlacing] = useState(false);
  const [oddsHistory, setOddsHistory] = useState<Record<string, number>>({});
  const [now, setNow] = useState(Date.now());
  const tickRef = useRef<NodeJS.Timeout | null>(null);

  const loadRaces = async () => {
    const { data: r } = await supabase.from("races").select("*").in("status", ["upcoming", "live"]).order("off_time");
    setRaces((r || []) as Race[]);
    if (r?.length) {
      const ids = r.map((x: any) => x.id);
      const { data: rn } = await supabase.from("race_runners").select("*").in("race_id", ids).order("number");
      const grouped: Record<string, Runner[]> = {};
      (rn || []).forEach((row: any) => {
        grouped[row.race_id] = grouped[row.race_id] || [];
        grouped[row.race_id].push(row);
        // Track odds drift
        const key = `${row.race_id}-${row.number}`;
        setOddsHistory((prev) => ({ ...prev, [key]: prev[key] ?? row.win_odds }));
      });
      setRunnersByRace(grouped);
    }
  };

  // Initial load + tick the backend every 5s
  useEffect(() => {
    loadRaces();
    const tickAndLoad = async () => {
      try { await supabase.functions.invoke("sportsbook-tick"); } catch {}
      await loadRaces();
    };
    tickAndLoad();
    tickRef.current = setInterval(tickAndLoad, 5000);
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, []);

  // Countdown ticker
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);

  // Realtime updates for runners
  useEffect(() => {
    const channel = supabase.channel("sportsbook")
      .on("postgres_changes", { event: "*", schema: "public", table: "race_runners" }, () => loadRaces())
      .on("postgres_changes", { event: "*", schema: "public", table: "races" }, () => loadRaces())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const filteredRaces = useMemo(() => races.filter((r) => r.race_type === tab), [races, tab]);

  const activeRace = activeRaceId ? races.find((r) => r.id === activeRaceId) : null;
  const activeRunners = activeRaceId ? runnersByRace[activeRaceId] || [] : [];

  const requiredSel = betType === "forecast" ? 2 : betType === "tricast" ? 3 : 1;

  const computedOdds = useMemo(() => {
    if (!activeRace || selections.length === 0) return 0;
    const map = new Map(activeRunners.map((r) => [r.number, r]));
    if (betType === "win" || betType === "each_way") return map.get(selections[0])?.win_odds || 0;
    if (betType === "place") return map.get(selections[0])?.place_odds || 0;
    if (betType === "forecast" && selections.length === 2) return +((map.get(selections[0])!.win_odds * map.get(selections[1])!.win_odds * 0.4).toFixed(2));
    if (betType === "tricast" && selections.length === 3) return +((map.get(selections[0])!.win_odds * map.get(selections[1])!.win_odds * map.get(selections[2])!.win_odds * 0.15).toFixed(2));
    return 0;
  }, [activeRace, activeRunners, selections, betType]);

  const toggleSelection = (num: number) => {
    setSelections((prev) => {
      if (prev.includes(num)) return prev.filter((n) => n !== num);
      if (prev.length >= requiredSel) return [...prev.slice(1), num];
      return [...prev, num];
    });
  };

  const openRace = (raceId: string) => {
    setActiveRaceId(raceId);
    setSelections([]);
    setBetType("win");
  };

  const placeBet = async () => {
    if (!activeRaceId || selections.length !== requiredSel) {
      toast.error(`Select ${requiredSel} runner${requiredSel > 1 ? "s" : ""}`);
      return;
    }
    setPlacing(true);
    try {
      const { data, error } = await supabase.functions.invoke("sportsbook-place-bet", {
        body: { race_id: activeRaceId, bet_type: betType, selections, stake },
      });
      if (error || (data as any)?.error) throw new Error((data as any)?.error || error?.message || "Failed");
      toast.success(`Bet placed! Potential return £${(stake * computedOdds).toFixed(2)}`);
      setSelections([]);
    } catch (e: any) {
      toast.error(e.message || "Failed to place bet");
    } finally {
      setPlacing(false);
    }
  };

  const oddsTrend = (raceId: string, runnerNum: number, current: number) => {
    const key = `${raceId}-${runnerNum}`;
    const prev = oddsHistory[key];
    if (prev === undefined || Math.abs(prev - current) < 0.01) return "flat";
    return current > prev ? "up" : "down";
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background pb-24">
        <Header />
        <main className="container py-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-display font-bold text-casino-gold">Sports Betting</h1>
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Activity className="h-3 w-3 animate-pulse text-casino-green" /> Live UK Racing & Football • Updates every few seconds
              </p>
            </div>
            <Badge variant="outline" className="border-casino-gold text-casino-gold">
              {tab === "football" ? "Live" : `${filteredRaces.length} races`}
            </Badge>
          </div>

          <Tabs value={tab} onValueChange={(v) => { setTab(v as any); setActiveRaceId(null); }}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="football">⚽ Football</TabsTrigger>
              <TabsTrigger value="horse">🏇 Horse Racing</TabsTrigger>
              <TabsTrigger value="greyhound">🐕 Greyhounds</TabsTrigger>
            </TabsList>

            {(["horse", "greyhound"] as const).map((kind) => (
              <TabsContent key={kind} value={kind} className="space-y-3 mt-3">
                {filteredRaces.length === 0 && (
                  <Card className="p-6 text-center text-muted-foreground">Loading fixtures…</Card>
                )}
                {filteredRaces.map((race) => {
                  const isOpen = activeRaceId === race.id;
                  const runners = runnersByRace[race.id] || [];
                  const cd = formatCountdown(race.off_time);
                  const isLive = race.status === "live";
                  return (
                    <Card key={race.id} className={`overflow-hidden border-2 ${isLive ? "border-casino-pink shadow-[0_0_20px_hsl(var(--casino-pink)/0.4)]" : "border-border"} bg-gradient-to-br from-card to-card/50`}>
                      <button onClick={() => openRace(race.id)} className="w-full p-3 text-left hover:bg-secondary/40 transition-colors">
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-foreground truncate">{race.venue}</span>
                              <Badge variant="secondary" className="text-[10px]">R{race.race_number}</Badge>
                              {isLive && <Badge className="bg-casino-pink text-white text-[10px] animate-pulse">LIVE</Badge>}
                            </div>
                            <div className="text-[11px] text-muted-foreground flex items-center gap-2 mt-0.5">
                              <span>{race.distance}</span>
                              {race.going && <span>• {race.going}</span>}
                              <span>• {runners.length} runners</span>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className={`flex items-center gap-1 font-mono font-bold ${cd === "OFF" ? "text-casino-pink" : "text-casino-gold"}`}>
                              <Clock className="h-3.5 w-3.5" /> {cd}
                            </div>
                            <div className="text-[10px] text-muted-foreground">{new Date(race.off_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                          </div>
                        </div>
                      </button>

                      {isOpen && (
                        <div className="border-t border-border p-3 space-y-3 bg-background/30">
                          {/* Bet type tabs */}
                          <div className="flex gap-1 overflow-x-auto pb-1">
                            {(Object.keys(BET_LABELS) as BetType[]).map((bt) => (
                              <button
                                key={bt}
                                onClick={() => { setBetType(bt); setSelections([]); }}
                                className={`shrink-0 px-3 py-1 rounded-md text-xs font-semibold transition ${betType === bt ? "bg-casino-gold text-background" : "bg-secondary text-muted-foreground hover:bg-secondary/80"}`}
                              >
                                {BET_LABELS[bt]}
                              </button>
                            ))}
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            {betType === "win" && "Pick the winner."}
                            {betType === "place" && "Win if your selection finishes top 3."}
                            {betType === "each_way" && "Stake split: half on win, half on place (1/4 odds)."}
                            {betType === "forecast" && "Pick 1st & 2nd in correct order."}
                            {betType === "tricast" && "Pick 1st, 2nd & 3rd in correct order."}
                          </p>

                          {/* Runners */}
                          <div className="space-y-1.5">
                            {runners.map((rn) => {
                              const trend = oddsTrend(race.id, rn.number, rn.win_odds);
                              const isSelected = selections.includes(rn.number);
                              const selIdx = selections.indexOf(rn.number);
                              const odds = betType === "place" ? rn.place_odds : rn.win_odds;
                              return (
                                <button
                                  key={rn.id}
                                  disabled={!race || race.status !== "upcoming"}
                                  onClick={() => toggleSelection(rn.number)}
                                  className={`w-full flex items-center justify-between gap-2 p-2 rounded-md border transition ${isSelected ? "border-casino-gold bg-casino-gold/10" : "border-border bg-secondary/30 hover:bg-secondary/50"} ${race.status !== "upcoming" ? "opacity-60 cursor-not-allowed" : ""}`}
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <div className={`w-7 h-7 rounded flex items-center justify-center text-xs font-bold ${isSelected ? "bg-casino-gold text-background" : "bg-background text-foreground"}`}>
                                      {isSelected && requiredSel > 1 ? selIdx + 1 : rn.number}
                                    </div>
                                    <div className="min-w-0 text-left">
                                      <div className="text-sm font-semibold truncate">{rn.name}</div>
                                      {rn.jockey_trainer && <div className="text-[10px] text-muted-foreground truncate">{rn.jockey_trainer}</div>}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    {trend === "up" && <ChevronUp className="h-3 w-3 text-casino-green" />}
                                    {trend === "down" && <ChevronDown className="h-3 w-3 text-casino-pink" />}
                                    {trend === "flat" && <Minus className="h-3 w-3 text-muted-foreground" />}
                                    <span className="font-mono text-sm font-bold text-casino-gold tabular-nums min-w-[3.5rem] text-right">{odds.toFixed(2)}</span>
                                  </div>
                                </button>
                              );
                            })}
                          </div>

                          {/* Bet slip */}
                          {selections.length > 0 && (
                            <div className="rounded-lg border border-casino-gold/40 bg-casino-gold/5 p-3 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-casino-gold uppercase">Bet Slip</span>
                                <button onClick={() => setSelections([])} className="text-muted-foreground hover:text-casino-pink">
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                              <div className="text-xs">
                                <div className="text-muted-foreground">{BET_LABELS[betType]} • {selections.map((n) => `#${n}`).join(" → ")}</div>
                              </div>
                              <div className="grid grid-cols-6 gap-1">
                                {STAKE_TIERS.map((s) => (
                                  <button key={s} onClick={() => setStake(s)} className={`py-1 rounded text-[11px] font-semibold transition ${stake === s ? "bg-casino-gold text-background" : "bg-secondary text-muted-foreground"}`}>
                                    £{s.toFixed(2)}
                                  </button>
                                ))}
                              </div>
                              <div className="flex items-center justify-between text-xs">
                                <span>Odds: <span className="font-mono font-bold text-casino-gold">{computedOdds.toFixed(2)}</span></span>
                                <span>Returns: <span className="font-mono font-bold text-casino-green">£{(stake * computedOdds).toFixed(2)}</span></span>
                              </div>
                              <Button onClick={placeBet} disabled={placing || selections.length !== requiredSel || race.status !== "upcoming"} variant="gold" className="w-full">
                                {placing ? "Placing…" : `Place £${stake.toFixed(2)} ${BET_LABELS[betType]}`}
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </Card>
                  );
                })}
              </TabsContent>
            ))}

            <TabsContent value="football" className="space-y-3 mt-3">
              <FootballSection />
            </TabsContent>
          </Tabs>

          <MyBetsSection />
          <MyFootballBetsSection />
        </main>
        <BottomNav />
      </div>
    </AuthGuard>
  );
}


function MyFootballBetsSection() {
  const [bets, setBets] = useState<any[]>([]);
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("football_bets")
        .select("*, football_matches(home_team, away_team, status, result, home_score, away_score)")
        .order("placed_at", { ascending: false }).limit(15);
      setBets(data || []);
    };
    load();
    const i = setInterval(load, 5000);
    return () => clearInterval(i);
  }, []);
  if (!bets.length) return null;
  return (
    <Card className="p-3">
      <h3 className="font-bold text-sm mb-2 flex items-center gap-1.5"><Trophy className="h-4 w-4 text-casino-gold" /> My Football Bets</h3>
      <div className="space-y-1.5">
        {bets.map((b) => (
          <div key={b.id} className="flex items-center justify-between text-xs p-2 rounded bg-secondary/30">
            <div className="min-w-0">
              <div className="font-semibold truncate">
                {b.football_matches?.home_team} vs {b.football_matches?.away_team}
              </div>
              <div className="text-muted-foreground">
                {b.selection.toUpperCase()} • £{Number(b.stake).toFixed(2)} @ {Number(b.odds_taken).toFixed(2)}
              </div>
            </div>
            <Badge className={
              b.status === "won" ? "bg-casino-green text-white" :
              b.status === "lost" ? "bg-destructive text-white" :
              "bg-muted text-muted-foreground"
            }>
              {b.status === "pending" ? "Pending" : b.status === "won" ? `+£${Number(b.payout).toFixed(2)}` : "Lost"}
            </Badge>
          </div>
        ))}
      </div>
    </Card>
  );
}

function MyBetsSection() {
  const [bets, setBets] = useState<any[]>([]);
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("sports_bets").select("*, races(venue, race_name, status, winners)").order("placed_at", { ascending: false }).limit(15);
      setBets(data || []);
    };
    load();
    const i = setInterval(load, 5000);
    return () => clearInterval(i);
  }, []);
  if (!bets.length) return null;
  return (
    <Card className="p-3">
      <h3 className="font-bold text-sm mb-2 flex items-center gap-1.5"><Trophy className="h-4 w-4 text-casino-gold" /> My Recent Bets</h3>
      <div className="space-y-1.5">
        {bets.map((b) => (
          <div key={b.id} className="flex items-center justify-between text-xs p-2 rounded bg-secondary/30">
            <div className="min-w-0">
              <div className="font-semibold truncate">{b.races?.venue} • {b.bet_type.toUpperCase()} #{b.selections.join(",")}</div>
              <div className="text-muted-foreground">£{Number(b.stake).toFixed(2)} @ {Number(b.odds_taken).toFixed(2)}</div>
            </div>
            <Badge className={
              b.status === "won" ? "bg-casino-green text-white" :
              b.status === "lost" ? "bg-destructive text-white" :
              b.status === "partial" ? "bg-casino-gold text-background" :
              "bg-muted text-muted-foreground"
            }>
              {b.status === "pending" ? "Pending" : b.status === "won" || b.status === "partial" ? `+£${Number(b.payout).toFixed(2)}` : "Lost"}
            </Badge>
          </div>
        ))}
      </div>
    </Card>
  );
}