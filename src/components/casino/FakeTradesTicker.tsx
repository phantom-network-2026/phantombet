import { useEffect, useRef, useState } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const DEFAULT_PAIRS = [
  "BTC/USDT", "ETH/USDT", "SOL/USDT", "PHX/USDT", "GHOST/USDT",
  "SHDW/ETH", "WRAITH/USDT", "BNB/USDT", "XRP/USDT", "DOGE/USDT",
  "ARB/USDT", "AVAX/USDT", "LINK/USDT", "MATIC/USDT", "TON/USDT",
];

const SIDES = ["LONG", "SHORT", "BUY", "SELL"] as const;

const DEFAULT_USERNAMES = [
  "WhaleHunter", "AlphaSeeker", "ChartNinja", "PhantomTrader", "GhostScalper",
  "MoonRider", "NightHawk", "DeltaKing", "PipMaster", "QuantQueen",
  "ShadowBull", "OrderFlow", "BlockSniper", "ApexTrader", "NeonBear",
  "CryptoPilot", "RangeBreaker", "VolatilityX", "EchoCapital", "ZeroSlippage",
];

export interface FakeTradesConfig {
  enabled: boolean;
  minIntervalSeconds: number;
  maxIntervalSeconds: number;
  pairs: string[];
  usernames: string[];
  bigTradeChance: number; // 0-1
  profitChance: number;   // 0-1
}

export const DEFAULT_TRADES_CONFIG: FakeTradesConfig = {
  enabled: true,
  minIntervalSeconds: 2,
  maxIntervalSeconds: 7,
  pairs: DEFAULT_PAIRS,
  usernames: DEFAULT_USERNAMES,
  bigTradeChance: 0.08,
  profitChance: 0.78,
};

export const TRADES_SETTINGS_KEY = "fake_trades_config";

export async function fetchFakeTradesConfig(): Promise<FakeTradesConfig> {
  try {
    const { data } = await supabase.functions.invoke("get-public-settings", {
      body: { keys: [TRADES_SETTINGS_KEY] },
    });
    const v = data?.settings?.[TRADES_SETTINGS_KEY];
    if (v) return { ...DEFAULT_TRADES_CONFIG, ...(v as Partial<FakeTradesConfig>) };
  } catch {}
  return DEFAULT_TRADES_CONFIG;
}

export async function saveFakeTradesConfig(cfg: FakeTradesConfig): Promise<boolean> {
  const { data: existing } = await supabase
    .from("site_settings").select("id").eq("key", TRADES_SETTINGS_KEY).maybeSingle();
  if (existing) {
    const { error } = await supabase.from("site_settings").update({ value: cfg as any }).eq("key", TRADES_SETTINGS_KEY);
    if (error) return false;
  } else {
    const { error } = await supabase.from("site_settings").insert({ key: TRADES_SETTINGS_KEY, value: cfg as any });
    if (error) return false;
  }
  window.dispatchEvent(new Event("fake-trades-config-change"));
  return true;
}

function rand(min: number, max: number) { return Math.random() * (max - min) + min; }

let usedUsernames = new Set<string>();

function generateTrade(cfg: FakeTradesConfig) {
  const names = cfg.usernames.length ? cfg.usernames : DEFAULT_USERNAMES;
  const pairs = cfg.pairs.length ? cfg.pairs : DEFAULT_PAIRS;
  if (usedUsernames.size >= names.length) usedUsernames = new Set();
  const available = names.filter((u) => !usedUsernames.has(u));
  const username = available[Math.floor(Math.random() * available.length)];
  usedUsernames.add(username);
  const pair = pairs[Math.floor(Math.random() * pairs.length)];
  const side = SIDES[Math.floor(Math.random() * SIDES.length)];
  const isBig = Math.random() < cfg.bigTradeChance;
  const amount = isBig ? Math.round(rand(5000, 75000)) : Math.round(rand(50, 4500));
  const isProfit = Math.random() < cfg.profitChance;
  const pnlPct = isProfit ? rand(0.4, isBig ? 38 : 12) : -rand(0.3, 6);
  return { id: Date.now() + Math.random(), username, pair, side, amount, pnlPct: Math.round(pnlPct * 10) / 10, isProfit };
}

export function FakeTradesTicker() {
  const [cfg, setCfg] = useState<FakeTradesConfig>(DEFAULT_TRADES_CONFIG);
  const [trades, setTrades] = useState<ReturnType<typeof generateTrade>[]>([]);
  const ref = useRef<number | null>(null);

  useEffect(() => {
    fetchFakeTradesConfig().then(setCfg);
    const handler = () => fetchFakeTradesConfig().then(setCfg);
    window.addEventListener("fake-trades-config-change", handler);
    return () => window.removeEventListener("fake-trades-config-change", handler);
  }, []);

  useEffect(() => {
    if (!cfg.enabled) { setTrades([]); return; }
    setTrades(Array.from({ length: 8 }, () => generateTrade(cfg)));
    const schedule = () => {
      const delay = (cfg.minIntervalSeconds + Math.random() * Math.max(0.1, cfg.maxIntervalSeconds - cfg.minIntervalSeconds)) * 1000;
      ref.current = window.setTimeout(() => {
        setTrades((prev) => [generateTrade(cfg), ...prev].slice(0, 24));
        schedule();
      }, delay);
    };
    schedule();
    return () => { if (ref.current) clearTimeout(ref.current); };
  }, [cfg]);

  if (!cfg.enabled || trades.length === 0) return null;

  return (
    <div className="w-full bg-gradient-to-r from-yellow-900/30 via-amber-900/20 to-yellow-900/30 border-b border-casino-gold/20 overflow-hidden">
      <div className="flex animate-marquee whitespace-nowrap py-1">
        {[...trades, ...trades].map((t, i) => (
          <span key={`${t.id}-${i}`} className="inline-flex items-center gap-1.5 mx-4 text-[11px] sm:text-xs">
            {t.isProfit ? <TrendingUp className="h-3 w-3 text-casino-green shrink-0" /> : <TrendingDown className="h-3 w-3 text-loss shrink-0" />}
            <span className="font-bold text-casino-gold">{t.username}</span>
            <span className="text-muted-foreground">{t.side === "LONG" || t.side === "BUY" ? "opened" : "closed"}</span>
            <span className={`font-bold ${t.side === "LONG" || t.side === "BUY" ? "text-casino-green" : "text-loss"}`}>{t.side}</span>
            <span className="text-foreground font-medium">{t.pair}</span>
            <span className="text-muted-foreground">·</span>
            <span className="text-foreground">${t.amount.toLocaleString()}</span>
            <span className={`font-bold ${t.isProfit ? "text-casino-green" : "text-loss"}`}>{t.isProfit ? "+" : ""}{t.pnlPct}%</span>
          </span>
        ))}
      </div>
    </div>
  );
}