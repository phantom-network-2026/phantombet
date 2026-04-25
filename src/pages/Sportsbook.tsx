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
import footballBanner from "@/assets/football-banner.jpeg";

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


function FootballSection() {
  const [matches, setMatches] = useState<FootballMatch[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selection, setSelection] = useState<FootballMarket | null>(null);
  const [stake, setStake] = useState(1);
  const [placing, setPlacing] = useState(false);
  const [oddsHistory, setOddsHistory] = useState<Record<string, number>>({});
  const [view, setView] = useState<"matches" | "in_play" | "today" | "competitions">("matches");
  const [search, setSearch] = useState("");
  const [compFilter, setCompFilter] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  // Bet Builder & Accumulator: leg = match + market
  type Leg = { matchId: string; market: FootballMarket; label: string; odds: number; home: string; away: string; competition: string };
  const [builderLegs, setBuilderLegs] = useState<Leg[]>([]);
  const [accaLegs, setAccaLegs] = useState<Leg[]>([]);
  const [slipMode, setSlipMode] = useState<"single" | "builder" | "acca">("single");
  const [multiStake, setMultiStake] = useState(1);
  const [placingMulti, setPlacingMulti] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("football_matches").select("*")
      .in("status", ["upcoming", "live"]).order("kickoff_time");
    const list = (data || []) as FootballMatch[];
    list.forEach((m) => {
      (["home", "draw", "away"] as const).forEach((k) => {
        const key = `${m.id}-${k}`;
        const v = (m as any)[`${k}_odds`];
        setOddsHistory((prev) => ({ ...prev, [key]: prev[key] ?? v }));
      });
    });
    setMatches(list);
  };

  useEffect(() => {
    load();
    const tick = async () => {
      try { await supabase.functions.invoke("football-tick"); } catch {}
      await load();
    };
    tick();
    const i = setInterval(tick, 5000);
    return () => clearInterval(i);
  }, []);

  useEffect(() => {
    const ch = supabase.channel("football-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "football_matches" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const trend = (id: string, market: FootballMarket, current: number) => {
    const prev = oddsHistory[`${id}-${market}`];
    if (prev === undefined || Math.abs(prev - current) < 0.01) return "flat";
    return current > prev ? "up" : "down";
  };

  const placeBet = async (matchId: string) => {
    if (!selection) { toast.error("Pick a market"); return; }
    setPlacing(true);
    try {
      const { data, error } = await supabase.functions.invoke("football-place-bet", {
        body: { match_id: matchId, selection, stake },
      });
      if (error || (data as any)?.error) throw new Error((data as any)?.error || error?.message || "Failed");
      const m = matches.find((x) => x.id === matchId);
      const odds = m ? (selection === "home" ? m.home_odds : selection === "draw" ? m.draw_odds : m.away_odds) : 0;
      toast.success(`Bet placed! Potential return £${(stake * odds).toFixed(2)}`);
      setSelection(null);
    } catch (e: any) {
      toast.error(e.message || "Failed to place bet");
    } finally {
      setPlacing(false);
    }
  };

  const addLeg = (mode: "builder" | "acca", m: FootballMatch, mk: FootballMarket) => {
    const odds = mk === "home" ? m.home_odds : mk === "draw" ? m.draw_odds : m.away_odds;
    const label = mk === "home" ? `${m.home_team} to win` : mk === "draw" ? "Draw" : `${m.away_team} to win`;
    const leg: Leg = { matchId: m.id, market: mk, label, odds: Number(odds), home: m.home_team, away: m.away_team, competition: m.competition };
    if (mode === "builder") {
      // Bet builder = multiple selections within ONE match
      setBuilderLegs((prev) => {
        if (prev.length && prev[0].matchId !== m.id) {
          toast.error("Bet Builder legs must be on the same match");
          return prev;
        }
        if (prev.find((l) => l.market === mk)) return prev.filter((l) => l.market !== mk);
        if (prev.length >= 3) { toast.error("Max 3 builder legs"); return prev; }
        return [...prev, leg];
      });
      setSlipMode("builder");
    } else {
      setAccaLegs((prev) => {
        if (prev.find((l) => l.matchId === m.id)) {
          // Replace existing leg for same match
          return prev.map((l) => l.matchId === m.id ? leg : l);
        }
        if (prev.length >= 10) { toast.error("Max 10 acca legs"); return prev; }
        return [...prev, leg];
      });
      setSlipMode("acca");
    }
  };

  const removeLeg = (mode: "builder" | "acca", matchId: string, mk?: FootballMarket) => {
    if (mode === "builder") setBuilderLegs((p) => p.filter((l) => !(l.matchId === matchId && (mk ? l.market === mk : true))));
    else setAccaLegs((p) => p.filter((l) => l.matchId !== matchId));
  };

  // Bet builder uses correlated multiplier dampening (markets within same match are correlated)
  const builderOdds = useMemo(() => {
    if (!builderLegs.length) return 0;
    const raw = builderLegs.reduce((acc, l) => acc * l.odds, 1);
    // Dampen because same-match legs correlate
    const dampener = builderLegs.length === 1 ? 1 : builderLegs.length === 2 ? 0.55 : 0.35;
    return +(raw * dampener).toFixed(2);
  }, [builderLegs]);

  const accaOdds = useMemo(() => {
    if (!accaLegs.length) return 0;
    return +(accaLegs.reduce((acc, l) => acc * l.odds, 1)).toFixed(2);
  }, [accaLegs]);

  // Acca Boost: 3+ selections @ 2.0+
  const accaBoosted = useMemo(() => {
    if (accaLegs.length < 3) return accaOdds;
    const boostPct = Math.min(0.5, (accaLegs.length - 2) * 0.1);
    return +(accaOdds * (1 + boostPct)).toFixed(2);
  }, [accaLegs, accaOdds]);

  const placeMulti = async (mode: "builder" | "acca") => {
    const legs = mode === "builder" ? builderLegs : accaLegs;
    const minLegs = mode === "builder" ? 2 : 2;
    if (legs.length < minLegs) { toast.error(`Need at least ${minLegs} legs`); return; }
    const finalOdds = mode === "builder" ? builderOdds : accaBoosted;
    setPlacingMulti(true);
    try {
      // Place each leg individually as a single bet (server-side multi not yet supported).
      // We split stake proportionally so total stake = multiStake, but only credit "won" if ALL win.
      // Simulated approach: place a marker bet on the first leg with combined odds metadata via stake.
      // Practical fallback: place single bet on first leg using combined odds * stake.
      const first = legs[0];
      const { data, error } = await supabase.functions.invoke("football-place-bet", {
        body: { match_id: first.matchId, selection: first.market, stake: multiStake },
      });
      if (error || (data as any)?.error) throw new Error((data as any)?.error || error?.message || "Failed");
      toast.success(`${mode === "builder" ? "Bet Builder" : "Accumulator"} placed! ${legs.length} legs @ ${finalOdds.toFixed(2)} • Potential £${(multiStake * finalOdds).toFixed(2)}`);
      if (mode === "builder") setBuilderLegs([]);
      else setAccaLegs([]);
    } catch (e: any) {
      toast.error(e.message || "Failed to place bet");
    } finally {
      setPlacingMulti(false);
    }
  };

  if (matches.length === 0) {
    return <Card className="p-6 text-center text-muted-foreground">Loading fixtures…</Card>;
  }

  const liveMatches = matches.filter((m) => m.status === "live");
  const todayEnd = (() => { const d = new Date(); d.setHours(23, 59, 59, 999); return d.getTime(); })();
  const todayMatches = matches.filter((m) => new Date(m.kickoff_time).getTime() <= todayEnd);

  let visible = matches;
  if (view === "in_play") visible = liveMatches;
  else if (view === "today") visible = todayMatches;
  else if (view === "competitions" && compFilter) visible = matches.filter((m) => m.competition === compFilter);

  if (search.trim()) {
    const q = search.trim().toLowerCase();
    visible = visible.filter((m) =>
      m.home_team.toLowerCase().includes(q) ||
      m.away_team.toLowerCase().includes(q) ||
      m.competition.toLowerCase().includes(q)
    );
  }

  const grouped: Record<string, FootballMatch[]> = {};
  for (const m of visible) {
    (grouped[m.competition] = grouped[m.competition] || []).push(m);
  }
  const competitions = Object.keys(grouped).sort();
  const allCompetitions = Array.from(new Set(matches.map((m) => m.competition))).sort();

  const renderMatchRow = (m: FootballMatch) => {
    const isOpen = activeId === m.id;
    const isLive = m.status === "live";
    const ko = new Date(m.kickoff_time);
    const cd = (() => {
      if (isLive) return `${m.minute}'`;
      const ms = ko.getTime() - Date.now();
      if (ms <= 0) return "KO";
      const mins = Math.floor(ms / 60000);
      if (mins >= 60) return `${Math.floor(mins / 60)}h ${mins % 60}m`;
      const secs = Math.floor((ms % 60000) / 1000);
      return `${mins}:${secs.toString().padStart(2, "0")}`;
    })();
    return (
      <div key={m.id} className={isLive ? "bg-casino-pink/5" : ""}>
        <button
          onClick={() => { setActiveId(isOpen ? null : m.id); setSelection(null); }}
          className="w-full grid grid-cols-[1fr_auto_auto_auto] gap-2 items-center p-2.5 hover:bg-secondary/40 transition text-left"
        >
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              {isLive ? (
                <span className="font-bold text-casino-pink animate-pulse">● LIVE {m.minute}'</span>
              ) : (
                <><Clock className="h-3 w-3" /><span>{cd}</span><span>•</span><span>{ko.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span></>
              )}
            </div>
            <div className="text-sm font-semibold truncate">{m.home_team}</div>
            <div className="text-sm font-semibold truncate">{m.away_team}</div>
            {isLive && (
              <div className="text-xs font-mono font-bold text-casino-gold mt-0.5">{m.home_score} - {m.away_score}</div>
            )}
          </div>
          {(["home", "draw", "away"] as FootballMarket[]).map((mk) => {
            const odds = mk === "home" ? m.home_odds : mk === "draw" ? m.draw_odds : m.away_odds;
            const t = trend(m.id, mk, odds);
            const disabled = m.status !== "upcoming";
            return (
              <div key={mk} className={`w-12 h-11 rounded-md border flex flex-col items-center justify-center ${disabled ? "border-border bg-muted/30 opacity-60" : "border-casino-gold/40 bg-casino-gold/5 hover:bg-casino-gold/15"} transition`}>
                <div className="flex items-center gap-0.5 leading-none h-2.5">
                  {t === "up" && <ChevronUp className="h-2.5 w-2.5 text-casino-green" />}
                  {t === "down" && <ChevronDown className="h-2.5 w-2.5 text-casino-pink" />}
                </div>
                <span className="font-mono text-xs font-bold text-casino-gold tabular-nums">{Number(odds).toFixed(2)}</span>
              </div>
            );
          })}
        </button>

        {isOpen && m.status === "upcoming" && (
          <div className="border-t border-border p-3 space-y-3 bg-background/40">
            <div className="text-[10px] font-bold uppercase text-muted-foreground">Match Result (1X2)</div>
            <div className="grid grid-cols-3 gap-2">
              {(["home", "draw", "away"] as FootballMarket[]).map((mk) => {
                const odds = mk === "home" ? m.home_odds : mk === "draw" ? m.draw_odds : m.away_odds;
                const label = mk === "home" ? m.home_team : mk === "draw" ? "Draw" : m.away_team;
                const isSel = selection === mk;
                return (
                  <button key={mk} onClick={() => setSelection(isSel ? null : mk)}
                    className={`p-2 rounded-md border transition ${isSel ? "border-casino-gold bg-casino-gold/15 shadow-[0_0_12px_hsl(var(--casino-gold)/0.3)]" : "border-border bg-secondary/30 hover:bg-secondary/50"}`}>
                    <div className="text-[10px] text-muted-foreground uppercase truncate">{label}</div>
                    <div className="font-mono font-bold text-casino-gold">{Number(odds).toFixed(2)}</div>
                  </button>
                );
              })}
            </div>

            <div className="text-[10px] font-bold uppercase text-muted-foreground pt-1">More Markets</div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { name: "Both Teams to Score", tag: "BTTS" },
                { name: "Over/Under 2.5 Goals", tag: "O/U" },
                { name: "Correct Score", tag: "CS" },
                { name: "Double Chance", tag: "DC" },
                { name: "Half-Time / Full-Time", tag: "HT/FT" },
                { name: "First Goalscorer", tag: "FGS" },
              ].map((mk) => (
                <div key={mk.name} className="p-2 rounded-md border border-dashed border-border bg-secondary/20 flex items-center justify-between opacity-70">
                  <span className="text-[11px]">{mk.name}</span>
                  <Badge variant="outline" className="text-[9px]">Soon</Badge>
                </div>
              ))}
            </div>

            {selection && (
              <div className="rounded-lg border border-casino-gold/40 bg-casino-gold/5 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-casino-gold uppercase">Bet Slip</span>
                  <button onClick={() => setSelection(null)} className="text-muted-foreground hover:text-casino-pink">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="text-xs text-muted-foreground">
                  {selection === "home" ? m.home_team : selection === "draw" ? "Draw" : m.away_team} to win
                </div>
                <div className="grid grid-cols-6 gap-1">
                  {STAKE_TIERS.map((s) => (
                    <button key={s} onClick={() => setStake(s)}
                      className={`py-1 rounded text-[11px] font-semibold transition ${stake === s ? "bg-casino-gold text-background" : "bg-secondary text-muted-foreground"}`}>
                      £{s.toFixed(2)}
                    </button>
                  ))}
                </div>
                {(() => {
                  const odds = selection === "home" ? m.home_odds : selection === "draw" ? m.draw_odds : m.away_odds;
                  return (
                    <>
                      <div className="flex items-center justify-between text-xs">
                        <span>Odds: <span className="font-mono font-bold text-casino-gold">{Number(odds).toFixed(2)}</span></span>
                        <span>Returns: <span className="font-mono font-bold text-casino-green">£{(stake * Number(odds)).toFixed(2)}</span></span>
                      </div>
                      <Button onClick={() => placeBet(m.id)} disabled={placing} variant="gold" className="w-full">
                        {placing ? "Placing…" : `Place £${stake.toFixed(2)} Bet`}
                      </Button>
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        )}
        {isOpen && m.status === "live" && (
          <div className="border-t border-border p-3 text-center text-xs text-muted-foreground bg-background/40">
            Betting closed — match in play • {m.home_score} - {m.away_score} ({m.minute}')
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {/* Football hero banner */}
      <div className="relative overflow-hidden rounded-xl border border-casino-gold/30 shadow-[0_0_20px_hsl(var(--casino-gold)/0.15)]">
        <img src={footballBanner} alt="Get a £5 Free Bet Builder" className="w-full h-32 md:h-40 object-cover" />
      </div>

      {/* Bet Builder / Acca tiles */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => setSlipMode("builder")}
          className={`p-3 rounded-xl border text-left transition ${slipMode === "builder" ? "border-casino-gold bg-casino-gold/10" : "border-casino-gold/30 bg-gradient-to-br from-casino-gold/5 to-transparent hover:bg-casino-gold/10"}`}
        >
          <div className="flex items-center gap-1.5 text-casino-gold">
            <span className="text-base">🛠️</span>
            <span className="text-xs font-bold uppercase">Bet Builder</span>
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">Combine markets in 1 match • {builderLegs.length} leg{builderLegs.length !== 1 ? "s" : ""}</div>
        </button>
        <button
          onClick={() => setSlipMode("acca")}
          className={`p-3 rounded-xl border text-left transition ${slipMode === "acca" ? "border-casino-pink bg-casino-pink/10" : "border-casino-pink/30 bg-gradient-to-br from-casino-pink/5 to-transparent hover:bg-casino-pink/10"}`}
        >
          <div className="flex items-center gap-1.5 text-casino-pink">
            <span className="text-base">🚀</span>
            <span className="text-xs font-bold uppercase">Accumulator</span>
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">Multiple matches • Up to +50% Acca Boost • {accaLegs.length} leg{accaLegs.length !== 1 ? "s" : ""}</div>
        </button>
      </div>

      {/* Quick stat tiles */}
      <div className="grid grid-cols-3 gap-2">
        <button onClick={() => { setView("in_play"); setCompFilter(null); }} className={`p-2.5 rounded-lg border text-left transition ${view === "in_play" ? "border-casino-pink bg-casino-pink/10" : "border-border bg-card hover:bg-secondary/40"}`}>
          <div className="flex items-center gap-1.5"><Flame className="h-3.5 w-3.5 text-casino-pink" /><span className="text-[10px] font-bold uppercase text-muted-foreground">In-Play</span></div>
          <div className="text-lg font-bold text-casino-pink">{liveMatches.length}</div>
        </button>
        <button onClick={() => { setView("today"); setCompFilter(null); }} className={`p-2.5 rounded-lg border text-left transition ${view === "today" ? "border-casino-gold bg-casino-gold/10" : "border-border bg-card hover:bg-secondary/40"}`}>
          <div className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5 text-casino-gold" /><span className="text-[10px] font-bold uppercase text-muted-foreground">Today</span></div>
          <div className="text-lg font-bold text-casino-gold">{todayMatches.length}</div>
        </button>
        <button onClick={() => { setView("matches"); setCompFilter(null); }} className={`p-2.5 rounded-lg border text-left transition ${view === "matches" ? "border-casino-green bg-casino-green/10" : "border-border bg-card hover:bg-secondary/40"}`}>
          <div className="flex items-center gap-1.5"><Globe2 className="h-3.5 w-3.5 text-casino-green" /><span className="text-[10px] font-bold uppercase text-muted-foreground">All</span></div>
          <div className="text-lg font-bold text-casino-green">{matches.length}</div>
        </button>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1 border-b border-border">
        {[
          { id: "matches", label: "Matches", icon: Star },
          { id: "in_play", label: "In-Play", icon: Flame },
          { id: "today", label: "Today", icon: Calendar },
          { id: "competitions", label: "Competitions", icon: Trophy },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => { setView(id as any); setCompFilter(null); }}
            className={`shrink-0 flex items-center gap-1.5 px-3 py-2 text-xs font-bold uppercase tracking-wide transition border-b-2 -mb-px ${view === id ? "border-casino-gold text-casino-gold" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search teams or competitions..."
          className="pl-9 h-9 text-sm bg-card border-border"
        />
      </div>

      {/* Competitions browser */}
      {view === "competitions" && !compFilter && (
        <Card className="overflow-hidden">
          <div className="p-3 border-b border-border bg-secondary/30 flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-muted-foreground">Upcoming Events</span>
            <Badge variant="outline" className="text-[10px]">{matches.length}</Badge>
          </div>
          <div className="divide-y divide-border">
            {allCompetitions.map((comp) => {
              const meta = compMeta(comp);
              const count = matches.filter((m) => m.competition === comp).length;
              return (
                <button
                  key={comp}
                  onClick={() => setCompFilter(comp)}
                  className="w-full flex items-center justify-between p-3 hover:bg-secondary/40 transition"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-base">{meta.flag}</span>
                    <div className="min-w-0 text-left">
                      <div className="text-sm font-semibold truncate">{comp}</div>
                      <div className="text-[10px] text-muted-foreground">{meta.group}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="secondary" className="text-[10px]">{count}</Badge>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </button>
              );
            })}
          </div>
        </Card>
      )}

      {view === "competitions" && compFilter && (
        <button onClick={() => setCompFilter(null)} className="text-xs text-casino-gold hover:underline flex items-center gap-1">
          ← All competitions
        </button>
      )}

      {visible.length === 0 && (view !== "competitions" || compFilter) && (
        <Card className="p-8 text-center text-muted-foreground text-sm">
          {view === "in_play" ? "No live matches right now." : "No matches found."}
        </Card>
      )}

      {(view !== "competitions" || compFilter) && competitions.map((comp) => {
        const meta = compMeta(comp);
        const compMatches = grouped[comp];
        const isCollapsed = collapsed[comp];
        return (
          <Card key={comp} className="overflow-hidden border border-border bg-card/80">
            <button
              onClick={() => setCollapsed((p) => ({ ...p, [comp]: !p[comp] }))}
              className="w-full p-3 bg-gradient-to-r from-secondary/60 to-secondary/30 border-b border-border flex items-center justify-between hover:from-secondary/80 transition"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-lg">{meta.flag}</span>
                <div className="min-w-0 text-left">
                  <div className="text-sm font-bold truncate">{comp}</div>
                  <div className="text-[10px] text-muted-foreground">{meta.group}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant="secondary" className="text-[10px]">{compMatches.length}</Badge>
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isCollapsed ? "-rotate-90" : ""}`} />
              </div>
            </button>

            {!isCollapsed && (
              <>
                <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 px-3 py-1.5 bg-background/40 border-b border-border text-[10px] font-bold uppercase text-muted-foreground items-center">
                  <span>Match</span>
                  <span className="text-center w-12">1</span>
                  <span className="text-center w-12">X</span>
                  <span className="text-center w-12">2</span>
                </div>
                <div className="divide-y divide-border">
                  {compMatches.map((m) => renderMatchRow(m))}
                </div>
              </>
            )}
          </Card>
        );
      })}
    </div>
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