import { useState, useEffect, useRef } from "react";
import { Trophy } from "lucide-react";

interface FakeWinsConfig {
  enabled: boolean;
  minAmount: number;
  maxAmount: number;
  intervalSeconds: number;
  games: string[];
  usernames: string[];
}

const DEFAULT_CONFIG: FakeWinsConfig = {
  enabled: false,
  minAmount: 0.5,
  maxAmount: 500,
  intervalSeconds: 4,
  games: [
    "European Roulette",
    "Slot Cowboy",
    "Blackjack",
    "Scratch & Win",
    "Lucky Sevens",
    "Golden Dragon",
    "Mega Fortune",
    "Diamond Rush",
  ],
  usernames: [
    "LuckyAce99", "CryptoKing", "BigWinner22", "SlotMaster", "JackpotJoe",
    "GoldRush88", "HighRoller", "DiamondDan", "MegaSpin", "WinStreak",
    "BetBoss", "CasinoQueen", "RoyalFlush", "StarPlayer", "NeonNights",
    "ThunderBet", "VegasVibes", "SpinDoctor", "CashFlow", "LuckyCharm7",
  ],
};

export const FAKE_WINS_STORAGE_KEY = "bitbet_fake_wins_config";

export function getFakeWinsConfig(): FakeWinsConfig {
  try {
    const stored = localStorage.getItem(FAKE_WINS_STORAGE_KEY);
    if (stored) return { ...DEFAULT_CONFIG, ...JSON.parse(stored) };
  } catch {}
  return DEFAULT_CONFIG;
}

export function saveFakeWinsConfig(config: FakeWinsConfig) {
  localStorage.setItem(FAKE_WINS_STORAGE_KEY, JSON.stringify(config));
  window.dispatchEvent(new Event("fake-wins-config-change"));
}

function randomBetween(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function generateWin(config: FakeWinsConfig) {
  const username = config.usernames[Math.floor(Math.random() * config.usernames.length)];
  const game = config.games[Math.floor(Math.random() * config.games.length)];
  const amount = randomBetween(config.minAmount, config.maxAmount);
  // Round nicely
  const rounded = amount < 10 ? Math.round(amount * 100) / 100 : Math.round(amount * 10) / 10;
  return { username, game, amount: rounded, id: Date.now() + Math.random() };
}

export function FakeWinsTicker() {
  const [config, setConfig] = useState<FakeWinsConfig>(getFakeWinsConfig);
  const [wins, setWins] = useState<ReturnType<typeof generateWin>[]>([]);
  const intervalRef = useRef<number | null>(null);

  // Listen for config changes
  useEffect(() => {
    const handler = () => setConfig(getFakeWinsConfig());
    window.addEventListener("fake-wins-config-change", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("fake-wins-config-change", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  // Seed initial wins
  useEffect(() => {
    if (!config.enabled) { setWins([]); return; }
    const initial = Array.from({ length: 6 }, () => generateWin(config));
    setWins(initial);
  }, [config.enabled]);

  // Add new wins on interval
  useEffect(() => {
    if (!config.enabled) return;
    intervalRef.current = window.setInterval(() => {
      setWins((prev) => {
        const next = [generateWin(config), ...prev];
        return next.slice(0, 20);
      });
    }, config.intervalSeconds * 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [config]);

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
