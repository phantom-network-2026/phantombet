import { useEffect, useRef, useState } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";

const PAIRS = [
  "BTC/USDT", "ETH/USDT", "SOL/USDT", "PHX/USDT", "GHOST/USDT",
  "SHDW/ETH", "WRAITH/USDT", "BNB/USDT", "XRP/USDT", "DOGE/USDT",
  "ARB/USDT", "AVAX/USDT", "LINK/USDT", "MATIC/USDT", "TON/USDT",
];

const SIDES = ["LONG", "SHORT", "BUY", "SELL"] as const;

const USERNAMES = [
  "WhaleHunter", "AlphaSeeker", "ChartNinja", "PhantomTrader", "GhostScalper",
  "MoonRider", "NightHawk", "DeltaKing", "PipMaster", "QuantQueen",
  "ShadowBull", "OrderFlow", "BlockSniper", "ApexTrader", "NeonBear",
  "CryptoPilot", "RangeBreaker", "VolatilityX", "EchoCapital", "ZeroSlippage",
];

function rand(min: number, max: number) { return Math.random() * (max - min) + min; }

let usedUsernames = new Set<string>();

function generateTrade() {
  if (usedUsernames.size >= USERNAMES.length) usedUsernames = new Set();
  const available = USERNAMES.filter((u) => !usedUsernames.has(u));
  const username = available[Math.floor(Math.random() * available.length)];
  usedUsernames.add(username);
  const pair = PAIRS[Math.floor(Math.random() * PAIRS.length)];
  const side = SIDES[Math.floor(Math.random() * SIDES.length)];
  const isBig = Math.random() < 0.08;
  const amount = isBig ? Math.round(rand(5000, 75000)) : Math.round(rand(50, 4500));
  const isProfit = Math.random() < 0.78;
  const pnlPct = isProfit ? rand(0.4, isBig ? 38 : 12) : -rand(0.3, 6);
  return { id: Date.now() + Math.random(), username, pair, side, amount, pnlPct: Math.round(pnlPct * 10) / 10, isProfit };
}

export function FakeTradesTicker() {
  const [trades, setTrades] = useState<ReturnType<typeof generateTrade>[]>([]);
  const ref = useRef<number | null>(null);

  useEffect(() => {
    setTrades(Array.from({ length: 8 }, generateTrade));
    const schedule = () => {
      const delay = (2 + Math.random() * 5) * 1000;
      ref.current = window.setTimeout(() => {
        setTrades((prev) => [generateTrade(), ...prev].slice(0, 24));
        schedule();
      }, delay);
    };
    schedule();
    return () => { if (ref.current) clearTimeout(ref.current); };
  }, []);

  if (trades.length === 0) return null;

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