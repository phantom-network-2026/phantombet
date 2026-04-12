import { useState, useEffect, useRef } from "react";
import { Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export interface FakeWinsConfig {
  enabled: boolean;
  minAmount: number;
  maxAmount: number;
  intervalSeconds: number;
  randomInterval: boolean;
  minIntervalSeconds: number;
  maxIntervalSeconds: number;
  games: string[];
  usernames: string[];
}

const GAME_WIN_RANGES: Record<string, { min: number; max: number; bigChance: number; bigMax: number }> = {
  "European Roulette": { min: 0.20, max: 25, bigChance: 0.05, bigMax: 175 },
  "Slot Cowboy": { min: 0.10, max: 8, bigChance: 0.08, bigMax: 50 },
  "Lucky Sevens": { min: 0.05, max: 5, bigChance: 0.06, bigMax: 40 },
  "Golden Dragon": { min: 0.15, max: 12, bigChance: 0.07, bigMax: 60 },
  "Mega Fortune": { min: 0.20, max: 15, bigChance: 0.04, bigMax: 200 },
  "Diamond Rush": { min: 0.10, max: 10, bigChance: 0.06, bigMax: 45 },
  "Blackjack": { min: 1, max: 30, bigChance: 0.1, bigMax: 100 },
  "Scratch & Win": { min: 0.50, max: 10, bigChance: 0.03, bigMax: 50 },
};

const DEFAULT_GAME_FALLBACK = { min: 0.10, max: 10, bigChance: 0.05, bigMax: 50 };

export const SETTINGS_KEY = "fake_wins_config";

export const DEFAULT_CONFIG: FakeWinsConfig = {
  enabled: true,
  minAmount: 0.1,
  maxAmount: 200,
  intervalSeconds: 4,
  randomInterval: true,
  minIntervalSeconds: 2,
  maxIntervalSeconds: 8,
  games: Object.keys(GAME_WIN_RANGES),
  usernames: [
    "LuckyAce99", "CryptoKing", "BigWinner22", "SlotMaster", "JackpotJoe",
    "GoldRush88", "HighRoller", "DiamondDan", "MegaSpin", "WinStreak",
    "BetBoss", "CasinoQueen", "RoyalFlush", "StarPlayer", "NeonNights",
    "ThunderBet", "VegasVibes", "SpinDoctor", "CashFlow", "LuckyCharm7",
  ],
};

// Fetch config via public settings endpoint, fallback to defaults
// Also syncs usernames from ghost_users config if available
export async function fetchFakeWinsConfig(): Promise<FakeWinsConfig> {
  try {
    const { data } = await supabase.functions.invoke("get-public-settings", {
      body: { keys: [SETTINGS_KEY, "ghost_users"] },
    });
    let config = DEFAULT_CONFIG;
    if (data?.settings?.[SETTINGS_KEY]) {
      config = { ...DEFAULT_CONFIG, ...(data.settings[SETTINGS_KEY] as Partial<FakeWinsConfig>) };
    }
    // Sync usernames from ghost_users pool if it has names
    const ghostConfig = data?.settings?.["ghost_users"];
    if (ghostConfig?.usernames?.length > 0) {
      config = { ...config, usernames: ghostConfig.usernames };
    }
    return config;
  } catch {}
  return DEFAULT_CONFIG;
}

// Save config to DB (admin only - upsert)
export async function saveFakeWinsConfig(config: FakeWinsConfig): Promise<boolean> {
  // Try update first
  const { data: existing } = await supabase
    .from("site_settings")
    .select("id")
    .eq("key", SETTINGS_KEY)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("site_settings")
      .update({ value: config as any })
      .eq("key", SETTINGS_KEY);
    if (error) { console.error("Save failed:", error); return false; }
  } else {
    const { error } = await supabase
      .from("site_settings")
      .insert({ key: SETTINGS_KEY, value: config as any });
    if (error) { console.error("Save failed:", error); return false; }
  }
  window.dispatchEvent(new Event("fake-wins-config-change"));
  return true;
}

function randomBetween(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function generateWin(config: FakeWinsConfig) {
  const username = config.usernames[Math.floor(Math.random() * config.usernames.length)];
  const game = config.games[Math.floor(Math.random() * config.games.length)];
  const range = GAME_WIN_RANGES[game] || DEFAULT_GAME_FALLBACK;
  const isBig = Math.random() < range.bigChance;
  const raw = isBig
    ? randomBetween(range.max, range.bigMax)
    : randomBetween(range.min, range.max);
  const skewed = isBig ? raw : range.min + (raw - range.min) * Math.random();
  const amount = Math.round(skewed * 100) / 100;
  return { username, game, amount, id: Date.now() + Math.random() };
}

export function FakeWinsTicker() {
  const [config, setConfig] = useState<FakeWinsConfig>(DEFAULT_CONFIG);
  const [wins, setWins] = useState<ReturnType<typeof generateWin>[]>([]);
  const [loaded, setLoaded] = useState(false);
  const intervalRef = useRef<number | null>(null);

  // Load config from DB on mount
  useEffect(() => {
    fetchFakeWinsConfig().then((c) => {
      setConfig(c);
      setLoaded(true);
    });
  }, []);

  // Listen for local config change events (after admin saves)
  useEffect(() => {
    const handler = () => {
      fetchFakeWinsConfig().then(setConfig);
    };
    window.addEventListener("fake-wins-config-change", handler);
    return () => window.removeEventListener("fake-wins-config-change", handler);
  }, []);

  // Seed initial wins
  useEffect(() => {
    if (!loaded) return;
    if (!config.enabled) { setWins([]); return; }
    const initial = Array.from({ length: 6 }, () => generateWin(config));
    setWins(initial);
  }, [config.enabled, loaded]);

  // Add new wins on interval
  useEffect(() => {
    if (!config.enabled || !loaded) return;
    const scheduleNext = () => {
      const delay = config.randomInterval
        ? (config.minIntervalSeconds + Math.random() * (config.maxIntervalSeconds - config.minIntervalSeconds)) * 1000
        : config.intervalSeconds * 1000;
      intervalRef.current = window.setTimeout(() => {
        setWins((prev) => [generateWin(config), ...prev].slice(0, 20));
        scheduleNext();
      }, delay);
    };
    scheduleNext();
    return () => { if (intervalRef.current) clearTimeout(intervalRef.current); };
  }, [config, loaded]);

  if (!config.enabled || wins.length === 0) return null;

  return (
    <div className="w-full bg-gradient-to-r from-yellow-900/40 via-amber-900/30 to-yellow-900/40 border-b border-casino-gold/20 overflow-hidden">
      <div className="flex animate-marquee whitespace-nowrap py-1">
        {[...wins, ...wins].map((win, i) => (
          <span key={`${win.id}-${i}`} className="inline-flex items-center gap-1.5 mx-4 text-xs">
            <Trophy className="h-3 w-3 text-casino-gold shrink-0" />
            <span className="font-bold text-casino-gold">{win.username}</span>
            <span className="text-muted-foreground">won</span>
            <span className="font-bold text-casino-green">${win.amount.toLocaleString()}</span>
            <span className="text-muted-foreground">on</span>
            <span className="text-foreground font-medium">{win.game}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
