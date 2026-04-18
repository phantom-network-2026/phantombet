import { useNavigate } from "react-router-dom";
import { Header } from "@/components/casino/Header";
import { AuthGuard } from "@/components/casino/AuthGuard";
import { GameChat } from "@/components/casino/GameChat";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MessageSquare, X, Volume2, VolumeX, Settings2, Coins, Info, Repeat } from "lucide-react";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import phantombetLogo from "@/assets/phantombet-logo.svg";

const GAME_TITLE = "Pirate Plunder";
const GAME_SLUG = "pirate-plunder";

const ROOT = "/games/pirate-plunder/symbols";

// Symbol catalog: high-value, mid, low, special. Lower payout = more frequent.
type Sym = {
  id: string;
  img: string;
  // payout multipliers for matches: index 0 = 3-of-a-kind, 1 = 4, 2 = 5, 3 = 6
  pay: [number, number, number, number];
  weight: number; // higher = more common
  tier: "low" | "mid" | "high" | "premium" | "scatter" | "wild";
};

const SYMBOLS: Sym[] = [
  // Premium
  { id: "chest", img: `${ROOT}/treasure_chest_1.png`, pay: [0.5, 1.5, 5, 20], weight: 1, tier: "premium" },
  { id: "galleon", img: `${ROOT}/pirate_galleon_4.png`, pay: [0.4, 1.2, 4, 15], weight: 4, tier: "premium" },
  // High
  { id: "locker", img: `${ROOT}/capns_locker.png`, pay: [0.3, 0.9, 3, 10], weight: 6, tier: "high" },
  { id: "doubloon", img: `${ROOT}/doubloon_3.png`, pay: [0.25, 0.7, 2.5, 8], weight: 7, tier: "high" },
  // Mid
  { id: "bell", img: `${ROOT}/ships_bell_3.png`, pay: [0.15, 0.4, 1.5, 5], weight: 9, tier: "mid" },
  { id: "wheel", img: `${ROOT}/ships_wheel_2.png`, pay: [0.15, 0.4, 1.5, 5], weight: 9, tier: "mid" },
  { id: "lantern", img: `${ROOT}/ships_lantern_3.png`, pay: [0.12, 0.3, 1.2, 4], weight: 10, tier: "mid" },
  { id: "compass", img: `${ROOT}/ships_compass_3.png`, pay: [0.12, 0.3, 1.2, 4], weight: 10, tier: "mid" },
  // Low
  { id: "globe", img: `${ROOT}/pirate_globe_2.png`, pay: [0.08, 0.2, 0.7, 2.5], weight: 12, tier: "low" },
  { id: "bottle", img: `${ROOT}/ship_in_a_bottle_3.png`, pay: [0.08, 0.2, 0.7, 2.5], weight: 12, tier: "low" },
  { id: "cannon", img: `${ROOT}/cannon_3.png`, pay: [0.05, 0.15, 0.5, 2], weight: 13, tier: "low" },
  { id: "flintlock", img: `${ROOT}/pirate_flintlock_3.png`, pay: [0.05, 0.15, 0.5, 2], weight: 13, tier: "low" },
  { id: "squeeze", img: `${ROOT}/pirate_sqeezebox_2.png`, pay: [0.05, 0.12, 0.4, 1.5], weight: 14, tier: "low" },
  // Special
  { id: "key", img: `${ROOT}/treasure_chest_key.png`, pay: [0.8, 2.5, 10, 40], weight: 1, tier: "wild" }, // WILD
];

const SYMBOL_BY_ID = Object.fromEntries(SYMBOLS.map((s) => [s.id, s]));

const REELS = 6;
const ROWS = 4;

// Pre-compute weighted pool for spins (excludes wild from spin pool — wild appears via "scatter trigger" or dropped randomly)
const SPIN_POOL: string[] = (() => {
  const pool: string[] = [];
  for (const s of SYMBOLS) {
    if (s.tier === "wild") continue;
    for (let i = 0; i < s.weight; i++) pool.push(s.id);
  }
  return pool;
})();

function randomSymbol(forceLoss = false): string {
  // ~1% wild drop chance per cell
  if (!forceLoss && Math.random() < 0.01) return "key";
  return SPIN_POOL[Math.floor(Math.random() * SPIN_POOL.length)];
}

function generateGrid(forceLoss = false): string[][] {
  return Array.from({ length: REELS }, () =>
    Array.from({ length: ROWS }, () => randomSymbol(forceLoss))
  );
}

// Force a guaranteed bonus map drop (4+ chests on the bonus map row)
function generateBonusGrid(): string[][] {
  const g = generateGrid();
  // sprinkle 4 chests
  const positions = [0, 2, 3, 5];
  positions.forEach((c) => (g[c][1] = "chest"));
  return g;
}

// 5 paylines (zigzag patterns across all 6 reels)
const PAYLINES: number[][] = [
  [0, 0, 0, 0, 0, 0],
  [1, 1, 1, 1, 1, 1],
  [2, 2, 2, 2, 2, 2],
  [3, 3, 3, 3, 3, 3],
  [0, 1, 2, 3, 2, 1],
  [3, 2, 1, 0, 1, 2],
  [1, 2, 1, 2, 1, 2],
  [2, 1, 2, 1, 2, 1],
];

type WinLine = { line: number; sym: string; count: number; multiplier: number; positions: [number, number][] };

function evaluateGrid(grid: string[][], bet: number): { totalWin: number; lines: WinLine[]; scatterCount: number } {
  const lines: WinLine[] = [];
  let totalWin = 0;
  PAYLINES.forEach((line, lineIdx) => {
    const positions: [number, number][] = [];
    let firstSym = grid[0][line[0]];
    // Wild can substitute — find first non-wild for symbol identity
    if (firstSym === "key") {
      for (let i = 1; i < REELS; i++) {
        if (grid[i][line[i]] !== "key") { firstSym = grid[i][line[i]]; break; }
      }
    }
    if (!firstSym) return;
    let count = 0;
    for (let i = 0; i < REELS; i++) {
      const cell = grid[i][line[i]];
      if (cell === firstSym || cell === "key") {
        count++;
        positions.push([i, line[i]]);
      } else break;
    }
    if (count >= 3) {
      const sym = SYMBOL_BY_ID[firstSym];
      const idx = Math.min(count - 3, 3);
      const mult = sym.pay[idx];
      const win = mult * bet;
      totalWin += win;
      lines.push({ line: lineIdx, sym: firstSym, count, multiplier: mult, positions });
    }
  });
  // Scatter: count chests anywhere — 4+ triggers bonus
  let scatterCount = 0;
  for (let r = 0; r < REELS; r++) for (let c = 0; c < ROWS; c++) if (grid[r][c] === "chest") scatterCount++;
  return { totalWin, lines, scatterCount };
}

const JACKPOTS = [
  { id: "mini", label: "MINI", value: 20, color: "from-amber-300 to-yellow-500" },
  { id: "minor", label: "MINOR", value: 50, color: "from-emerald-300 to-green-500" },
  { id: "major", label: "MAJOR", value: 200, color: "from-sky-300 to-blue-500" },
  { id: "mega", label: "MEGA", value: 2500, color: "from-rose-400 to-red-600" },
];

const BET_TIERS = [0.1, 0.2, 0.5, 1, 2, 5];

// ---- Loading screen ----
function LoadingScreen({ progress }: { progress: number }) {
  return (
    <div className="absolute inset-0 z-50 bg-gradient-to-b from-[#0a1f3a] via-[#1a0f2e] to-black flex flex-col items-center justify-center overflow-hidden">
      {/* animated waves */}
      <div className="absolute inset-x-0 bottom-0 h-1/2 opacity-30">
        <svg viewBox="0 0 1200 200" className="w-full h-full" preserveAspectRatio="none">
          <motion.path
            d="M0,100 Q300,40 600,100 T1200,100 V200 H0 Z"
            fill="#1e90ff"
            animate={{ d: [
              "M0,100 Q300,40 600,100 T1200,100 V200 H0 Z",
              "M0,100 Q300,160 600,100 T1200,100 V200 H0 Z",
              "M0,100 Q300,40 600,100 T1200,100 V200 H0 Z",
            ] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          />
        </svg>
      </div>

      {/* HUGE PhantomBet logo */}
      <motion.img
        src={phantombetLogo}
        alt="PhantomBet"
        className="w-[78%] max-w-[480px] object-contain drop-shadow-[0_0_40px_rgba(255,215,0,0.8)]"
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: [0.95, 1.04, 0.98, 1.02, 1], opacity: 1, y: [0, -6, 0] }}
        transition={{ scale: { duration: 1.2, ease: "easeOut" }, opacity: { duration: 0.6 }, y: { duration: 3, repeat: Infinity, ease: "easeInOut", delay: 1.2 } }}
      />

      {/* EXCLUSIVE banner */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="relative mt-3 px-5 py-1 rounded-full border border-yellow-400/70 bg-gradient-to-r from-amber-700/40 via-yellow-500/30 to-amber-700/40 overflow-hidden"
      >
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.5) 50%, transparent 70%)" }}
          animate={{ x: ["-100%", "120%"] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "linear" }}
        />
        <span className="relative font-display font-black text-[11px] tracking-[0.4em] text-yellow-200 drop-shadow">
          PHANTOMBET EXCLUSIVE
        </span>
      </motion.div>

      <motion.img
        src={`${ROOT}/pirate_galleon_4.png`}
        className="mt-6 w-24 h-24 object-contain drop-shadow-[0_0_20px_rgba(255,200,80,0.6)]"
        animate={{ rotate: [-3, 3, -3], y: [0, -8, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />
      <h1 className="mt-3 font-display text-3xl font-black tracking-wider bg-gradient-to-b from-yellow-200 via-yellow-400 to-amber-700 bg-clip-text text-transparent drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
        PIRATE PLUNDER
      </h1>
      <p className="text-amber-200/70 text-xs uppercase tracking-[0.3em] mt-1">Loading the seven seas…</p>
      <div className="mt-6 w-64 h-2 bg-black/60 rounded-full overflow-hidden border border-amber-700/40">
        <motion.div
          className="h-full bg-gradient-to-r from-amber-500 via-yellow-300 to-amber-500"
          style={{ width: `${progress}%` }}
          animate={{ backgroundPositionX: ["0%", "100%"] }}
          transition={{ duration: 1.2, repeat: Infinity }}
        />
      </div>
      <p className="text-yellow-300/80 text-[10px] mt-2 font-mono">{Math.round(progress)}%</p>
    </div>
  );
}

// ---- Bonus map (Seven Seas Bonus) ----
const BonusMap = React.forwardRef<HTMLDivElement, { bet: number; onComplete: (totalWin: number) => void }>(
  ({ bet, onComplete }, ref) => {
  const [picks, setPicks] = useState<number[]>([]);
  const [revealed, setRevealed] = useState<Record<number, number | "end">>({});
  const [total, setTotal] = useState(0);
  const [done, setDone] = useState(false);

  // 12 islands, hidden prizes
  const prizes = useMemo(() => {
    const arr: (number | "end")[] = [
      bet * 0.5, bet * 1, bet * 1.5, bet * 0.75, bet * 3, bet * 0.25,
      bet * 5, bet * 1, bet * 10, bet * 2, "end", bet * 20,
    ];
    // shuffle
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }, [bet]);

  const pickIsland = (i: number) => {
    if (done || revealed[i] !== undefined) return;
    const prize = prizes[i];
    setRevealed((r) => ({ ...r, [i]: prize }));
    setPicks((p) => [...p, i]);
    if (prize === "end") {
      setDone(true);
      setTimeout(() => onComplete(total), 2200);
    } else {
      setTotal((t) => t + (prize as number));
    }
  };

  return (
    <div ref={ref} className="absolute inset-0 z-40 bg-gradient-to-b from-[#3a1a05] via-[#1f0c02] to-black flex flex-col items-center justify-center p-4 overflow-hidden">
      {/* parchment glow (cheap CSS pulse) */}
      <div
        className="absolute inset-0 opacity-40 animate-pulse"
        style={{ background: "radial-gradient(circle at 50% 40%, rgba(255,180,80,0.4), transparent 60%)" }}
      />
      <h2
        className="font-display text-3xl font-black bg-gradient-to-b from-yellow-200 to-amber-600 bg-clip-text text-transparent drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] mb-1"
      >
        ⚓ SEVEN SEAS BONUS ⚓
      </h2>
      <p className="text-amber-200/80 text-xs uppercase tracking-widest mb-4">Pick islands to find treasure — beware the Kraken!</p>

      <div className="relative w-full max-w-md aspect-[4/3] rounded-xl border-4 border-amber-800/60 bg-gradient-to-br from-[#d8b074] via-[#a87d4a] to-[#7a5530] shadow-[0_0_40px_rgba(255,180,60,0.4)] p-3">
        <div className="grid grid-cols-4 gap-2 h-full">
          {prizes.map((p, i) => {
            const r = revealed[i];
            return (
              <motion.button
                key={i}
                onClick={() => pickIsland(i)}
                disabled={done || r !== undefined}
                className="relative rounded-lg flex items-center justify-center overflow-hidden bg-black/30 border border-amber-900/60"
                whileHover={r === undefined && !done ? { scale: 1.05 } : {}}
                whileTap={r === undefined && !done ? { scale: 0.95 } : {}}
              >
                {r === undefined ? (
                  <motion.div
                    animate={{ y: [0, -3, 0] }}
                    transition={{ duration: 2, repeat: Infinity, delay: i * 0.1 }}
                    className="text-3xl"
                  >
                    🏝️
                  </motion.div>
                ) : r === "end" ? (
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", damping: 10 }}
                    className="text-4xl"
                  >
                    🐙
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: [0, 1.3, 1] }}
                    transition={{ duration: 0.5 }}
                    className="flex flex-col items-center"
                  >
                    <img src={`${ROOT}/doubloon_3.png`} className="w-8 h-8 object-contain" />
                    <span className="text-yellow-300 text-[10px] font-bold font-mono">${(r as number).toFixed(2)}</span>
                  </motion.div>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

      <div className="mt-4 px-6 py-2 rounded-full bg-gradient-to-r from-amber-700 via-yellow-500 to-amber-700 border-2 border-yellow-300/70 shadow-[0_0_20px_rgba(255,200,60,0.6)]">
        <span className="text-black font-display font-black text-lg">TOTAL: ${total.toFixed(2)}</span>
      </div>

      {done && (
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 text-red-400 font-display font-bold uppercase tracking-wider"
        >
          🐙 The Kraken strikes! Bonus ends.
        </motion.p>
      )}
    </div>
  );
});
BonusMap.displayName = "BonusMap";

// ---- Big Win overlay ----
const BigWinOverlay = React.forwardRef<HTMLDivElement, { amount: number; label: string; onDone: () => void }>(
  ({ amount, label, onDone }, ref) => {
  useEffect(() => {
    const t = setTimeout(onDone, 3500);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div ref={ref} className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none">
      <div className="absolute inset-0 bg-black/70" />
      {/* coin burst — reduced to 14 for perf */}
      {Array.from({ length: 14 }).map((_, i) => (
        <motion.img
          key={i}
          src={`${ROOT}/doubloon_3.png`}
          className="absolute w-10 h-10 object-contain"
          style={{ willChange: "transform, opacity" }}
          initial={{ x: 0, y: 0, scale: 0, rotate: 0 }}
          animate={{
            x: (Math.random() - 0.5) * 500,
            y: (Math.random() - 0.5) * 500,
            scale: [0, 1, 0.6],
            rotate: Math.random() * 540 - 270,
          }}
          transition={{ duration: 2, ease: "easeOut", delay: i * 0.05 }}
        />
      ))}
      <motion.div
        initial={{ scale: 0, rotate: -10 }}
        animate={{ scale: [0, 1.2, 1], rotate: [0, -3, 3, 0] }}
        transition={{ duration: 0.8 }}
        className="relative text-center"
      >
        <h1 className="font-display font-black text-5xl bg-gradient-to-b from-yellow-100 via-yellow-400 to-amber-700 bg-clip-text text-transparent drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)] uppercase tracking-wider">
          {label}
        </h1>
        <motion.p
          className="mt-2 font-mono font-black text-4xl text-yellow-300"
          initial={{ scale: 0.5 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3, type: "spring" }}
        >
          ${amount.toFixed(2)}
        </motion.p>
      </motion.div>
    </div>
  );
});
BigWinOverlay.displayName = "BigWinOverlay";

// ---- Floating Win Popup (per-spin) ----
function WinPopup({ amount, bet, onDone }: { amount: number; bet: number; onDone: () => void }) {
  const ratio = amount / bet;
  const tier = ratio >= 50 ? "mega" : ratio >= 20 ? "huge" : ratio >= 10 ? "big" : ratio >= 3 ? "nice" : "win";
  const colors: Record<string, string> = {
    mega: "from-fuchsia-300 via-pink-400 to-rose-600",
    huge: "from-orange-200 via-amber-400 to-red-600",
    big: "from-yellow-200 via-amber-400 to-amber-700",
    nice: "from-yellow-200 via-yellow-400 to-amber-600",
    win: "from-yellow-100 via-yellow-300 to-amber-500",
  };
  useEffect(() => {
    const t = setTimeout(onDone, 1800);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <motion.div
      className="pointer-events-none absolute left-1/2 top-[44%] -translate-x-1/2 -translate-y-1/2 z-30"
      initial={{ scale: 0, y: 30, opacity: 0 }}
      animate={{ scale: [0, 1.25, 1], y: [30, -10, -20], opacity: [0, 1, 1] }}
      exit={{ scale: 0.6, opacity: 0, y: -60 }}
      transition={{ duration: 0.6, ease: "backOut" }}
    >
      <div className="absolute inset-0 -m-8 pointer-events-none">
        {Array.from({ length: 10 }).map((_, i) => {
          const angle = (i / 10) * Math.PI * 2;
          return (
            <motion.div
              key={i}
              className="absolute left-1/2 top-1/2 w-2 h-2 rounded-full bg-yellow-200 shadow-[0_0_8px_rgba(255,220,80,1)]"
              initial={{ x: 0, y: 0, opacity: 0, scale: 0 }}
              animate={{
                x: Math.cos(angle) * 70,
                y: Math.sin(angle) * 70,
                opacity: [0, 1, 0],
                scale: [0, 1.2, 0],
              }}
              transition={{ duration: 1.4, delay: 0.1 + i * 0.04 }}
              style={{ willChange: "transform" }}
            />
          );
        })}
      </div>
      <div className={`relative px-5 py-2 rounded-2xl bg-gradient-to-b ${colors[tier]} border-2 border-yellow-100 shadow-[0_0_30px_rgba(255,200,80,0.8),inset_0_2px_4px_rgba(255,255,255,0.4)]`}>
        <div className="text-[10px] font-display font-black uppercase tracking-[0.25em] text-black/70 text-center leading-none">
          {tier === "mega" ? "MEGA WIN" : tier === "huge" ? "HUGE WIN" : tier === "big" ? "BIG WIN" : tier === "nice" ? "NICE WIN" : "WIN"}
        </div>
        <div className="font-mono font-black text-2xl text-black drop-shadow text-center leading-tight">
          +${amount.toFixed(2)}
        </div>
      </div>
    </motion.div>
  );
}

// ---- Spinning Reel column ----
function Reel({
  colIndex,
  finalSymbols,
  spinning,
  winPositions,
}: {
  colIndex: number;
  finalSymbols: string[]; // length = ROWS, the resting symbols top-to-bottom
  spinning: boolean;
  winPositions: number[];
}) {
  // Build a long strip: many random symbols on top + the final resting symbols at the bottom.
  // During spin we translate the strip from a negative offset (showing only randoms) down to 0
  // (showing the final symbols). We re-randomise on every new spin.
  const SPIN_LEN = 18; // number of random symbols above the resting set
  const stripRef = useRef<string[]>([]);
  const [stripVersion, setStripVersion] = useState(0);

  // Rebuild strip each time finalSymbols changes (i.e. each spin result)
  useEffect(() => {
    const randoms = Array.from({ length: SPIN_LEN }, () => randomSymbol());
    stripRef.current = [...randoms, ...finalSymbols];
    setStripVersion((v) => v + 1);
  }, [finalSymbols]);

  const strip = stripRef.current.length ? stripRef.current : finalSymbols;
  // Each cell is 1fr of the column width. We use percentage translate so it works at any size.
  // The viewport shows ROWS cells (height = ROWS * cell). The strip total height = strip.length * cell.
  // Resting position translateY = -(SPIN_LEN cells) so the last ROWS cells are visible.
  const restingPercent = -(SPIN_LEN / strip.length) * 100;
  const startPercent = 0; // start showing the random symbols at the top
  const stopDelay = colIndex * 0.18; // sequential stop per reel
  const spinDuration = 0.6 + stopDelay; // total spin time for this column

  return (
    <div
      className="relative overflow-hidden rounded-md bg-black/40"
      style={{ aspectRatio: `1 / ${ROWS}` }}
    >
      <motion.div
        key={`${stripVersion}-${spinning ? "spin" : "stop"}`}
        className="absolute left-0 right-0 top-0 flex flex-col gap-0.5"
        style={{ height: `${(strip.length / ROWS) * 100}%` }}
        initial={spinning ? { y: `${restingPercent}%` } : { y: "0%" }}
        animate={spinning ? { y: "0%" } : { y: `${restingPercent}%` }}
        transition={
          spinning
            ? { duration: 0.45, ease: "linear", repeat: Infinity }
            : { duration: spinDuration, ease: [0.22, 1.4, 0.36, 1], delay: stopDelay }
        }
      >
        {strip.map((symId, idx) => {
          const restingRow = idx - SPIN_LEN; // 0..ROWS-1 when in final visible window
          const isWin = !spinning && restingRow >= 0 && winPositions.includes(restingRow);
          const sym = SYMBOL_BY_ID[symId];
          return (
            <div
              key={`${stripVersion}-${idx}`}
              className={`relative flex items-center justify-center rounded-md overflow-hidden ${
                isWin
                  ? "bg-gradient-to-br from-yellow-400/40 to-amber-600/40 ring-2 ring-yellow-300 shadow-[0_0_15px_rgba(255,220,80,0.8)]"
                  : "bg-gradient-to-br from-red-950/60 to-black/60 border border-yellow-900/40"
              }`}
              style={{ aspectRatio: "1 / 1" }}
            >
              <motion.img
                src={sym?.img}
                alt={symId}
                className={`w-[85%] h-[85%] object-contain drop-shadow-[0_2px_3px_rgba(0,0,0,0.7)] ${
                  spinning ? "blur-[1.5px]" : ""
                }`}
                animate={isWin ? { scale: [1, 1.15, 1] } : {}}
                transition={isWin ? { duration: 0.6, repeat: Infinity } : {}}
              />
              {isWin && (
                <motion.div
                  className="absolute inset-0 pointer-events-none"
                  animate={{ opacity: [0, 0.6, 0] }}
                  transition={{ duration: 0.8, repeat: Infinity }}
                  style={{ background: "radial-gradient(circle, rgba(255,255,150,0.6), transparent 70%)" }}
                />
              )}
            </div>
          );
        })}
      </motion.div>

      {/* Motion-blur overlay during spin */}
      {spinning && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, transparent 20%, transparent 80%, rgba(0,0,0,0.5) 100%)",
          }}
        />
      )}
    </div>
  );
}


// ---- Paytable Modal ----
function Paytable({ onClose }: { onClose: () => void }) {
  // Build display rows from SYMBOLS, ordered by tier
  const order: Sym["tier"][] = ["wild", "premium", "high", "mid", "low"];
  const rows = [...SYMBOLS].sort((a, b) => order.indexOf(a.tier) - order.indexOf(b.tier));
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-40 bg-gradient-to-b from-[#0a0a1a]/95 via-[#1a0c2e]/95 to-black/95 overflow-y-auto"
    >
      <div className="sticky top-0 z-10 bg-gradient-to-b from-black to-transparent flex items-center justify-between px-3 py-2">
        <h2 className="font-display font-black text-yellow-200 text-base tracking-widest">GAME RULES</h2>
        <button onClick={onClose} className="text-white/80 hover:text-white">
          <X className="h-6 w-6" />
        </button>
      </div>
      <p className="px-4 text-center text-white/80 text-xs leading-snug">
        All symbols pay from left to right on adjacent reels starting from the leftmost reel.
      </p>

      <div className="grid grid-cols-2 gap-3 px-3 mt-4">
        {rows.map((s) => (
          <div key={s.id} className="flex flex-col items-center bg-black/40 rounded-lg p-2 border border-yellow-700/30">
            <div className="relative">
              <img src={s.img} className="w-16 h-16 object-contain drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" />
              {s.tier === "wild" && (
                <span className="absolute -top-1 -right-1 px-1 rounded-sm bg-purple-500 text-white text-[8px] font-black">WILD</span>
              )}
              {s.tier === "scatter" && (
                <span className="absolute -top-1 -right-1 px-1 rounded-sm bg-rose-500 text-white text-[8px] font-black">SCATTER</span>
              )}
            </div>
            <div className="mt-1 text-[11px] text-white/90 font-mono leading-tight text-center">
              <div>6 — <span className="text-yellow-300">{s.pay[3]}x</span></div>
              <div>5 — <span className="text-yellow-300">{s.pay[2]}x</span></div>
              <div>4 — <span className="text-yellow-300">{s.pay[1]}x</span></div>
              <div>3 — <span className="text-yellow-300">{s.pay[0]}x</span></div>
            </div>
          </div>
        ))}
      </div>

      <div className="px-4 mt-4 space-y-3 text-white/90 text-xs leading-snug">
        <div className="bg-black/40 rounded-lg p-3 border border-yellow-700/30">
          <h3 className="font-display font-black text-yellow-300 text-sm mb-1">🗝️ WILD (Treasure Key)</h3>
          <p>Substitutes for all symbols except SCATTER. Wild appears on all reels and pays the highest multipliers.</p>
        </div>
        <div className="bg-black/40 rounded-lg p-3 border border-yellow-700/30">
          <h3 className="font-display font-black text-yellow-300 text-sm mb-1">🪙 SCATTER (Treasure Chest)</h3>
          <p>Hit 5 or more SCATTER symbols anywhere on the reels to trigger the SEVEN SEAS BONUS round.</p>
        </div>
        <div className="bg-black/40 rounded-lg p-3 border border-yellow-700/30">
          <h3 className="font-display font-black text-yellow-300 text-sm mb-1">⚓ FREE SPINS</h3>
          <p>After completing the SEVEN SEAS BONUS, players are awarded 5 FREE SPINS that play automatically.</p>
        </div>
        <div className="bg-black/40 rounded-lg p-3 border border-yellow-700/30">
          <h3 className="font-display font-black text-yellow-300 text-sm mb-1">🌊 SEVEN SEAS BONUS</h3>
          <p>Pick islands on the map to reveal cash prizes (multipliers of your stake). Beware the Kraken — picking it ends the bonus!</p>
        </div>
        <div className="bg-black/40 rounded-lg p-3 border border-yellow-700/30">
          <h3 className="font-display font-black text-yellow-300 text-sm mb-1">🔁 AUTO SPIN</h3>
          <p>Hold the SPIN button for 3 seconds to start AUTO SPIN. Single-tap the SPIN button while spinning to cancel.</p>
        </div>
        <div className="bg-black/40 rounded-lg p-3 border border-yellow-700/30">
          <h3 className="font-display font-black text-yellow-300 text-sm mb-1">💰 BET LIMITS</h3>
          <p>Stake options: $0.10, $0.20, $0.50, $1.00, $2.00, $5.00.</p>
        </div>
        <div className="bg-black/40 rounded-lg p-3 border border-rose-700/30">
          <h3 className="font-display font-black text-rose-300 text-sm mb-1">🏆 MAX WIN</h3>
          <p>Maximum win per round is capped at 2,500x your total stake (MEGA jackpot).</p>
        </div>
        <div className="h-6" />
      </div>
    </motion.div>
  );
}

// ---- Main Game ----
function PiratePlunderInner() {
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();
  const [showChat, setShowChat] = useState(false);
  const [muted, setMuted] = useState(false);
  const [showBetMenu, setShowBetMenu] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [loaded, setLoaded] = useState(false);

  const [bet, setBet] = useState(1);
  const [grid, setGrid] = useState<string[][]>(() => generateGrid());
  const [spinning, setSpinning] = useState(false);
  const [winLines, setWinLines] = useState<WinLine[]>([]);
  const [lastWin, setLastWin] = useState(0);
  const [bigWin, setBigWin] = useState<{ amt: number; label: string } | null>(null);
  const [bonusActive, setBonusActive] = useState(false);
  const [freeSpins, setFreeSpins] = useState(0);
  const [autoSpin, setAutoSpin] = useState(false);
  const [showPaytable, setShowPaytable] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0); // 0..1 while holding spin button
  const [coinGoal, setCoinGoal] = useState(() => 800 + Math.floor(Math.random() * 1201)); // 800-2000
  const [coinMeter, setCoinMeter] = useState(0);
  const [chestBurst, setChestBurst] = useState(false);
  const [coinPing, setCoinPing] = useState(0);

  // refs for stale closures
  const profileRef = useRef(profile);
  const userRef = useRef(user);
  useEffect(() => { profileRef.current = profile; }, [profile]);
  useEffect(() => { userRef.current = user; }, [user]);

  // Loading sim
  useEffect(() => {
    let p = 0;
    const iv = setInterval(() => {
      p += Math.random() * 18 + 6;
      if (p >= 100) { p = 100; clearInterval(iv); setTimeout(() => setLoaded(true), 300); }
      setLoadProgress(p);
    }, 180);
    return () => clearInterval(iv);
  }, []);

  // Settle bet/win server-side
  const settle = useCallback(async (amount: number, outcome: string) => {
    const u = userRef.current;
    if (!u || amount === 0) return null;

    // Ensure we have a valid session before invoking; refresh if missing
    const { data: sessionData } = await supabase.auth.getSession();
    let token = sessionData.session?.access_token;
    if (!token) {
      const { data: refreshed } = await supabase.auth.refreshSession();
      token = refreshed.session?.access_token;
    }
    if (!token) {
      console.error("Pirate Plunder settle: no auth session");
      return null;
    }

    const { data, error } = await supabase.functions.invoke("game-settle", {
      body: { userId: u.id, amount, gameType: GAME_TITLE, outcome },
    });
    if (error) {
      console.error("Pirate Plunder settle error:", error);
      return null;
    }
    await refreshProfile();
    return data;
  }, [refreshProfile]);

  // Audio: oscillator-based sfx with richer presets
  const audioCtxRef = useRef<AudioContext | null>(null);
  const getCtx = () => {
    if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    return audioCtxRef.current!;
  };
  const beep = useCallback((freq: number, dur = 0.1, type: OscillatorType = "sine", vol = 0.1) => {
    if (muted) return;
    try {
      const ctx = getCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.value = vol;
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
      osc.stop(ctx.currentTime + dur);
    } catch { /* ignore */ }
  }, [muted]);

  // Sound effect presets
  const sfx = useMemo(() => ({
    spinStart: () => {
      beep(180, 0.15, "sawtooth", 0.06);
      setTimeout(() => beep(260, 0.1, "square", 0.04), 80);
    },
    reelStop: (i: number) => beep(180 - i * 12, 0.08, "triangle", 0.07),
    coin: (i: number) => {
      beep(880 + i * 60, 0.08, "sine", 0.06);
      setTimeout(() => beep(1320 + i * 80, 0.06, "sine", 0.04), 30);
    },
    bigWin: () => {
      // ascending fanfare
      const notes = [523, 659, 784, 1047, 1319];
      notes.forEach((n, i) => setTimeout(() => beep(n, 0.25, "triangle", 0.08), i * 90));
    },
    bonusJingle: () => {
      const notes = [392, 523, 659, 784, 988];
      notes.forEach((n, i) => setTimeout(() => beep(n, 0.18, "square", 0.07), i * 100));
    },
  }), [beep]);

  const triggerBigWin = (amt: number, threshold: number) => {
    const ratio = amt / bet;
    if (ratio >= 50) setBigWin({ amt, label: "MEGA WIN!" });
    else if (ratio >= 20) setBigWin({ amt, label: "HUGE WIN!" });
    else if (ratio >= 10) setBigWin({ amt, label: "BIG WIN!" });
  };

  const spin = useCallback(async (isFree = false) => {
    if (spinning || bonusActive) return;
    const balance = profileRef.current?.balance ?? 0;
    if (!isFree && balance < bet) {
      toast({ title: "Insufficient balance", description: `You need $${bet.toFixed(2)} to spin.`, variant: "destructive" });
      return;
    }
    setSpinning(true);
    setWinLines([]);
    setLastWin(0);
    sfx.spinStart();

    // Deduct bet first (free spins skip this)
    if (!isFree) {
      const r = await settle(-bet, "Pirate Plunder bet");
      if (!r) { setSpinning(false); return; }
    }

    const triggerBonus = Math.random() < 0.06;
    const newGrid = triggerBonus ? generateBonusGrid() : generateGrid();

    // Reels stop in sequence — play a thud per column
    for (let i = 0; i < REELS; i++) {
      setTimeout(() => sfx.reelStop(i), 600 + i * 180);
    }

    // Set the resting grid early so reels animate to the correct symbols
    setGrid(newGrid);

    // Wait for ALL reels to visually finish stopping before evaluating wins
    // Reel timing: stopDelay = colIndex*0.18, spinDuration = 0.6 + stopDelay
    // Last reel (col 5): starts at 0.9s, runs 1.5s -> finishes ~2.4s
    // Keep spinning state true until reels actually settle, then add a small buffer.
    await new Promise((r) => setTimeout(r, 2500));
    setSpinning(false);
    await new Promise((r) => setTimeout(r, 250));

    const { totalWin, lines, scatterCount } = evaluateGrid(newGrid, bet);
    setWinLines(lines);

    if (totalWin > 0) {
      setLastWin(totalWin);
      lines.forEach((_, i) => setTimeout(() => sfx.coin(i), i * 110));
      await settle(totalWin, "Pirate Plunder win");
      const ratio = totalWin / bet;
      if (ratio >= 10) {
        setTimeout(() => sfx.bigWin(), 200);
      }
      triggerBigWin(totalWin, bet);
    }

    if (isFree) setFreeSpins((n) => Math.max(0, n - 1));

    // Count doubloons on this spin → fill the chest meter
    let doubloonsThisSpin = 0;
    for (let r = 0; r < REELS; r++) for (let c = 0; c < ROWS; c++) if (newGrid[r][c] === "doubloon") doubloonsThisSpin++;
    if (doubloonsThisSpin > 0) {
      setCoinPing((n) => n + 1);
      setCoinMeter((prev) => {
        const next = prev + doubloonsThisSpin;
        if (next >= coinGoal) {
          // Trigger chest burst → bonus
          setTimeout(() => {
            setChestBurst(true);
            sfx.bonusJingle();
          }, 600);
          setTimeout(() => {
            setChestBurst(false);
            setCoinMeter(0);
            setCoinGoal(800 + Math.floor(Math.random() * 1201));
            setBonusActive(true);
          }, 2400);
          return coinGoal;
        }
        return next;
      });
    }

    if (scatterCount >= 5) {
      setTimeout(() => {
        sfx.bonusJingle();
        setBonusActive(true);
      }, 800);
    }
  }, [spinning, bonusActive, bet, settle, sfx]);

  const handleBonusComplete = useCallback(async (winAmt: number) => {
    setBonusActive(false);
    if (winAmt > 0) {
      await settle(winAmt, "Pirate Plunder bonus win");
      setBigWin({ amt: winAmt, label: "BONUS WIN!" });
    }
    setFreeSpins(5); // Award 5 free spins after bonus
  }, [settle]);

  // Auto-play free spins
  useEffect(() => {
    if (freeSpins > 0 && !spinning && !bonusActive && !bigWin) {
      const t = setTimeout(() => spin(true), 1500);
      return () => clearTimeout(t);
    }
  }, [freeSpins, spinning, bonusActive, bigWin, spin]);

  // Auto-spin loop (when toggled on, keep spinning until cancelled or balance too low)
  useEffect(() => {
    if (!autoSpin) return;
    if (spinning || bonusActive || bigWin || freeSpins > 0) return;
    const bal = profileRef.current?.balance ?? 0;
    if (bal < bet) {
      setAutoSpin(false);
      toast({ title: "Auto spin stopped", description: "Insufficient balance." });
      return;
    }
    const t = setTimeout(() => spin(false), 1800);
    return () => clearTimeout(t);
  }, [autoSpin, spinning, bonusActive, bigWin, freeSpins, bet, spin]);

  // Hold-to-start auto-spin: 3-second hold on spin button
  const holdTimerRef = useRef<number | null>(null);
  const holdRafRef = useRef<number | null>(null);
  const holdStartRef = useRef<number>(0);
  const holdTriggeredRef = useRef<boolean>(false);

  const clearHold = useCallback(() => {
    if (holdTimerRef.current) { clearTimeout(holdTimerRef.current); holdTimerRef.current = null; }
    if (holdRafRef.current) { cancelAnimationFrame(holdRafRef.current); holdRafRef.current = null; }
    setHoldProgress(0);
  }, []);

  const handleSpinPressStart = useCallback(() => {
    if (autoSpin) return; // tap will cancel auto-spin in pressEnd
    if (spinning || bonusActive || freeSpins > 0) return;
    holdTriggeredRef.current = false;
    holdStartRef.current = Date.now();
    const tick = () => {
      const elapsed = (Date.now() - holdStartRef.current) / 3000;
      setHoldProgress(Math.min(1, elapsed));
      if (elapsed < 1) holdRafRef.current = requestAnimationFrame(tick);
    };
    holdRafRef.current = requestAnimationFrame(tick);
    holdTimerRef.current = window.setTimeout(() => {
      holdTriggeredRef.current = true;
      setAutoSpin(true);
      setHoldProgress(0);
      toast({ title: "🔁 Auto Spin Started", description: "Tap SPIN once to cancel." });
    }, 3000);
  }, [autoSpin, spinning, bonusActive, freeSpins]);

  const handleSpinPressEnd = useCallback(() => {
    const wasTriggered = holdTriggeredRef.current;
    clearHold();
    if (wasTriggered) return;
    if (autoSpin) {
      setAutoSpin(false);
      toast({ title: "Auto Spin Cancelled" });
      return;
    }
    if (spinning || bonusActive || freeSpins > 0) return;
    spin(false);
  }, [autoSpin, spinning, bonusActive, freeSpins, spin, clearHold]);

  useEffect(() => () => clearHold(), [clearHold]);

  const balance = profile?.balance ?? 0;

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col overflow-hidden font-sans">
      {/* Top status bar */}
      <div className="relative shrink-0 bg-gradient-to-r from-red-950 via-red-800 to-red-950 border-b-2 border-yellow-500/70 flex items-center justify-between px-3 py-1.5 safe-area-top overflow-hidden">
        {/* animated golden shimmer sweep */}
        <motion.div
          className="absolute inset-y-0 w-1/3 pointer-events-none"
          style={{
            background: "linear-gradient(90deg, transparent, rgba(255,215,0,0.25), transparent)",
          }}
          animate={{ x: ["-150%", "350%"] }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
        />
        {/* rope trim */}
        <div
          className="absolute bottom-0 left-0 right-0 h-[3px] opacity-80 pointer-events-none"
          style={{
            backgroundImage: "repeating-linear-gradient(90deg, #d4a017 0 6px, #6b3410 6px 12px)",
          }}
        />
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="relative z-10 text-white h-8 px-2 text-xs gap-1 hover:bg-white/10">
          <ArrowLeft className="h-4 w-4" /> Exit
        </Button>
        <div className="relative z-10 flex flex-col items-center leading-none">
          <div className="flex items-center gap-1.5">
            <motion.span
              className="text-base"
              animate={{ rotate: [-12, 12, -12], y: [0, -1, 0] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
            >
              🏴‍☠️
            </motion.span>
            <motion.span
              className="font-display font-black text-sm tracking-wider"
              style={{
                backgroundImage: "linear-gradient(90deg, #fde047, #fff7c2, #fbbf24, #fde047)",
                backgroundSize: "200% 100%",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.8))",
              }}
              animate={{ backgroundPositionX: ["0%", "200%"] }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            >
              {GAME_TITLE}
            </motion.span>
            <motion.span
              className="text-base"
              animate={{ rotate: [12, -12, 12], y: [0, -1, 0] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
            >
              ⚔️
            </motion.span>
          </div>
          <div className="flex items-center gap-1 mt-0.5">
            <span className="h-px w-3 bg-gradient-to-r from-transparent to-yellow-400/70" />
            <span className="font-display font-bold text-[7px] tracking-[0.35em] text-yellow-300/90">
              PHANTOMBET EXCLUSIVE
            </span>
            <span className="h-px w-3 bg-gradient-to-l from-transparent to-yellow-400/70" />
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setShowChat((v) => !v)} className="relative z-10 text-white h-8 px-2 text-xs gap-1 hover:bg-white/10">
          <MessageSquare className="h-4 w-4" />
        </Button>
      </div>

      {/* Game area */}
      <div className="flex-1 min-h-0 relative bg-gradient-to-b from-[#1a0c00] via-[#2a0f00] to-black overflow-hidden">
        {/* parchment/wood texture overlay */}
        <div
          className="absolute inset-0 opacity-30 pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(circle at 20% 30%, rgba(255,180,60,0.15), transparent 50%), radial-gradient(circle at 80% 70%, rgba(180,80,20,0.2), transparent 50%)",
          }}
        />

        {/* Floating embers */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {Array.from({ length: 14 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 rounded-full bg-amber-300 shadow-[0_0_6px_rgba(255,180,60,0.9)]"
              style={{
                left: `${(i * 7.3) % 100}%`,
                bottom: -10,
                willChange: "transform, opacity",
              }}
              animate={{
                y: [0, -400 - (i % 5) * 40],
                opacity: [0, 1, 0],
                x: [(i % 2 === 0 ? -1 : 1) * 0, (i % 2 === 0 ? -1 : 1) * 30],
              }}
              transition={{
                duration: 6 + (i % 4),
                repeat: Infinity,
                delay: i * 0.6,
                ease: "linear",
              }}
            />
          ))}
        </div>

        {/* Bonus enhancements bar */}
        <div className="relative z-10 px-2 pt-2">
          <div className="relative rounded-lg border border-yellow-600/60 bg-gradient-to-b from-[#2a0d00]/80 to-[#1a0500]/80 px-2 py-1.5 overflow-hidden shadow-[inset_0_0_12px_rgba(255,180,60,0.15)]">
            {/* shimmer sweep across whole panel */}
            <motion.div
              className="absolute inset-y-0 w-1/4 pointer-events-none"
              style={{ background: "linear-gradient(90deg, transparent, rgba(255,215,0,0.18), transparent)" }}
              animate={{ x: ["-120%", "420%"] }}
              transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
            />
            {/* mini floating sparkles */}
            {Array.from({ length: 6 }).map((_, i) => (
              <motion.div
                key={`spk-${i}`}
                className="absolute w-[3px] h-[3px] rounded-full bg-yellow-200 shadow-[0_0_4px_rgba(255,215,0,0.9)] pointer-events-none"
                style={{ left: `${10 + i * 14}%`, top: "50%" }}
                animate={{ y: [-8, 8, -8], opacity: [0.2, 1, 0.2] }}
                transition={{ duration: 2 + (i % 3) * 0.4, repeat: Infinity, delay: i * 0.3 }}
              />
            ))}

            <motion.div
              className="relative text-center font-display font-black text-[10px] tracking-widest mb-1.5 flex items-center justify-center gap-1.5"
              style={{
                backgroundImage: "linear-gradient(90deg, #fbbf24, #fef3c7, #fbbf24, #fde047)",
                backgroundSize: "200% 100%",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.9))",
              }}
              animate={{ backgroundPositionX: ["0%", "200%"] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: "linear" }}
            >
              <motion.span animate={{ rotate: [0, 15, -15, 0] }} transition={{ duration: 3, repeat: Infinity }}>⚜</motion.span>
              SEVEN SEAS BONUS ENHANCEMENTS
              <motion.span animate={{ rotate: [0, -15, 15, 0] }} transition={{ duration: 3, repeat: Infinity }}>⚜</motion.span>
            </motion.div>

            <div className="relative grid grid-cols-6 gap-1">
              {[
                { sym: "doubloon_3", label: "2.00x", color: "from-yellow-300 to-amber-600" },
                { sym: "ships_compass_3", label: "MULTI", color: "from-blue-400 to-indigo-700" },
                { sym: "treasure_chest_key", label: "+3 SPINS", color: "from-fuchsia-400 to-purple-700" },
                { sym: "cannon_3", label: "CANNON", color: "from-orange-400 to-red-700" },
                { sym: "doubloon_3", label: "200 COINS", color: "from-amber-300 to-yellow-700" },
                { sym: "treasure_chest_1", label: "SUPER", color: "from-rose-400 to-red-800" },
              ].map((e, i) => (
                <motion.div
                  key={i}
                  className={`relative flex flex-col items-center p-1 rounded-lg bg-gradient-to-b ${e.color} border border-yellow-400/70 shadow-[0_2px_6px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.4)] overflow-hidden`}
                  animate={{ y: [0, -2, 0] }}
                  transition={{ duration: 2.2, repeat: Infinity, delay: i * 0.18, ease: "easeInOut" }}
                >
                  <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/30 to-transparent pointer-events-none rounded-t-lg" />
                  <motion.div
                    className="absolute inset-0 pointer-events-none"
                    style={{ background: "linear-gradient(115deg, transparent 30%, rgba(255,255,255,0.45) 50%, transparent 70%)" }}
                    animate={{ x: ["-100%", "120%"] }}
                    transition={{ duration: 3, repeat: Infinity, delay: i * 0.4, ease: "linear" }}
                  />
                  <motion.img
                    src={`${ROOT}/${e.sym}.png`}
                    className="relative w-7 h-7 object-contain drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]"
                    animate={{ rotate: [-4, 4, -4], scale: [1, 1.06, 1] }}
                    transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.2, ease: "easeInOut" }}
                  />
                  <span className="relative text-[8px] font-black text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.9)] uppercase leading-tight">
                    {e.label}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Animated Treasure Chest (no progress meter shown to player) */}
        <div className="relative z-10 px-2 pt-1.5 flex justify-center">
          <div className="relative w-24 h-20">
            {/* Chest base — wobbles when coins drop in */}
            <motion.img
              src={`${ROOT}/treasure_chest_1.png`}
              className="absolute inset-0 w-full h-full object-contain drop-shadow-[0_3px_5px_rgba(0,0,0,0.9)]"
              animate={coinPing > 0 ? { scale: [1, 1.12, 1], rotate: [0, -3, 3, 0] } : {}}
              transition={{ duration: 0.45 }}
              key={`chest-${coinPing}`}
              style={{ display: chestBurst ? "none" : "block" }}
            />

            {/* Coins flying INTO the chest from above (suction effect) */}
            <AnimatePresence>
              {!chestBurst && coinPing > 0 && (
                <React.Fragment key={`suck-${coinPing}`}>
                  {Array.from({ length: 7 }).map((_, i) => {
                    const startX = -50 + Math.random() * 140;
                    const startY = -55 - Math.random() * 30;
                    return (
                      <motion.img
                        key={`suck-c-${coinPing}-${i}`}
                        src={`${ROOT}/doubloon_3.png`}
                        className="absolute left-1/2 top-1/2 w-3.5 h-3.5 object-contain pointer-events-none"
                        initial={{ x: startX, y: startY, opacity: 0, scale: 0.6, rotate: 0 }}
                        animate={{
                          x: [startX, startX * 0.4, 0],
                          y: [startY, startY * 0.3, 8],
                          opacity: [0, 1, 0],
                          scale: [0.6, 1, 0.4],
                          rotate: 540,
                        }}
                        transition={{ duration: 0.95, delay: i * 0.05, ease: "easeIn" }}
                      />
                    );
                  })}
                  {/* Brief glow as coins drop in */}
                  <motion.div
                    className="absolute inset-x-2 bottom-1 h-2 rounded-full bg-yellow-300 blur-md pointer-events-none"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 0.7, 0] }}
                    transition={{ duration: 0.8 }}
                  />
                </React.Fragment>
              )}
            </AnimatePresence>

            {/* Burst sequence (chest opens, all coins explode out) */}
            <AnimatePresence>
              {chestBurst && (
                <>
                  <motion.img
                    src={`${ROOT}/treasure_chest_1.png`}
                    className="absolute inset-0 w-full h-full object-contain"
                    initial={{ scale: 1, rotate: 0 }}
                    animate={{ scale: [1, 1.5, 1.3], rotate: [0, -10, 10, 0], y: [0, -6, -2] }}
                    transition={{ duration: 0.8 }}
                    style={{ filter: "drop-shadow(0 0 22px rgba(255,220,80,1))" }}
                  />
                  {Array.from({ length: 30 }).map((_, i) => {
                    const angle = (i / 30) * Math.PI * 2;
                    const dist = 90 + (i % 5) * 22;
                    return (
                      <motion.img
                        key={`burst-c-${i}`}
                        src={`${ROOT}/doubloon_3.png`}
                        className="absolute top-1/2 left-1/2 w-4 h-4 object-contain pointer-events-none"
                        initial={{ x: -8, y: -8, opacity: 1, scale: 0.7 }}
                        animate={{
                          x: -8 + Math.cos(angle) * dist,
                          y: -8 + Math.sin(angle) * dist + 30,
                          opacity: 0,
                          scale: 1.3,
                          rotate: 540,
                        }}
                        transition={{ duration: 1.8, ease: "easeOut" }}
                      />
                    );
                  })}
                  <motion.div
                    className="absolute inset-0 rounded-full bg-yellow-200 pointer-events-none"
                    initial={{ scale: 0.2, opacity: 0.9 }}
                    animate={{ scale: 6, opacity: 0 }}
                    transition={{ duration: 0.9 }}
                  />
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
        {/* Jackpot ladder */}
        <div className="relative z-10 px-2 pt-1.5 grid grid-cols-4 gap-1">
          {JACKPOTS.map((j) => (
            <div
              key={j.id}
              className={`relative rounded-md border-2 border-yellow-600/70 bg-gradient-to-b ${j.color} px-1 py-0.5 text-center shadow-[0_2px_4px_rgba(0,0,0,0.6)]`}
            >
              <div className="font-display font-black text-[10px] text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.9)] tracking-wider">{j.label}</div>
              <div className="font-mono font-bold text-[11px] text-black bg-black/20 rounded">${j.value.toFixed(2)}</div>
            </div>
          ))}
        </div>

        {/* Reels frame */}
        <div className="relative z-10 mx-2 mt-2 rounded-xl border-[3px] border-yellow-600 bg-gradient-to-br from-[#3a0d05] via-[#2a0a05] to-[#1a0500] shadow-[inset_0_0_20px_rgba(0,0,0,0.8),0_0_25px_rgba(255,180,60,0.3)] p-1.5">
          {/* PhantomBet watermark behind reels */}
          <img
            src={phantombetLogo}
            alt=""
            aria-hidden
            className="pointer-events-none select-none absolute inset-0 m-auto w-[70%] h-[70%] object-contain opacity-[0.07]"
          />

          <div className="grid grid-cols-6 gap-0.5 bg-black/40 rounded-lg p-1">
            {grid.map((reel, ci) => (
              <Reel
                key={ci}
                colIndex={ci}
                finalSymbols={reel}
                spinning={spinning}
                winPositions={winLines.flatMap((wl) =>
                  wl.positions.filter(([x]) => x === ci).map(([, y]) => y)
                )}
              />
            ))}
          </div>
        </div>

        {/* Win text */}
        <div className="relative z-10 text-center mt-2 h-5">
          {lastWin > 0 && (
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="font-display font-black text-yellow-300 text-base drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]"
            >
              💰 WIN ${lastWin.toFixed(2)}
            </motion.div>
          )}
          {freeSpins > 0 && (
            <motion.div
              animate={{ opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="font-display font-black text-amber-300 text-xs"
            >
              🎁 FREE SPINS: {freeSpins}
            </motion.div>
          )}
        </div>

        {/* Press to spin label */}
        {!spinning && !lastWin && !freeSpins && (
          <motion.div
            className="relative z-10 text-center font-display font-black text-white/80 text-sm tracking-widest mt-1"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            PRESS TO SPIN
          </motion.div>
        )}
      </div>

      {/* Control bar */}
      <div className="shrink-0 bg-gradient-to-b from-[#1a0500] to-black border-t-2 border-yellow-700/50 px-3 py-2 safe-area-bottom">
        <div className="flex items-center justify-between gap-2">
          {/* Left controls */}
          <div className="flex gap-1.5">
            <button
              onClick={() => setMuted((m) => !m)}
              className="w-9 h-9 rounded-full bg-black/60 border border-yellow-600/40 flex items-center justify-center text-white/80 hover:text-white"
            >
              {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
            <button
              onClick={() => setShowBetMenu((v) => !v)}
              className="w-9 h-9 rounded-full bg-black/60 border border-yellow-600/40 flex items-center justify-center text-yellow-400"
            >
              <Coins className="h-4 w-4" />
            </button>
            <button
              onClick={() => setShowPaytable(true)}
              className="w-9 h-9 rounded-full bg-black/60 border border-yellow-600/40 flex items-center justify-center text-white/80 hover:text-white"
              aria-label="Paytable"
            >
              <Info className="h-4 w-4" />
            </button>
          </div>

          {/* Spin button (hold 3s for auto, tap to spin / cancel auto) */}
          <motion.button
            onPointerDown={handleSpinPressStart}
            onPointerUp={handleSpinPressEnd}
            onPointerLeave={clearHold}
            onPointerCancel={clearHold}
            onContextMenu={(e) => e.preventDefault()}
            disabled={spinning || bonusActive || freeSpins > 0}
            className="relative w-16 h-16 rounded-full bg-gradient-to-b from-yellow-300 via-amber-500 to-amber-800 border-4 border-yellow-200 shadow-[0_0_25px_rgba(255,200,60,0.7),inset_0_2px_4px_rgba(255,255,255,0.4)] flex items-center justify-center disabled:opacity-60 select-none touch-none"
            whileTap={{ scale: 0.92 }}
            animate={spinning ? { rotate: 360 } : {}}
            transition={spinning ? { duration: 0.6, repeat: Infinity, ease: "linear" } : {}}
            style={{ WebkitUserSelect: "none" }}
          >
            {/* Hold progress ring */}
            {holdProgress > 0 && (
              <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none" viewBox="0 0 64 64">
                <circle cx="32" cy="32" r="29" fill="none" stroke="rgba(0,0,0,0.3)" strokeWidth="3" />
                <circle
                  cx="32" cy="32" r="29"
                  fill="none"
                  stroke="hsl(280 90% 65%)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 29}
                  strokeDashoffset={(1 - holdProgress) * 2 * Math.PI * 29}
                  style={{ filter: "drop-shadow(0 0 4px hsl(280 90% 65%))" }}
                />
              </svg>
            )}
            {autoSpin ? (
              <Repeat className="h-6 w-6 text-black" />
            ) : (
              <div className="w-12 h-12 rounded-full border-[3px] border-black/60 border-t-transparent" />
            )}
            {autoSpin && (
              <span className="absolute -top-2 -right-2 px-1.5 py-0.5 rounded-full bg-purple-600 text-white text-[8px] font-black border border-white/40 shadow">
                AUTO
              </span>
            )}
          </motion.button>

          {/* Right info */}
          <div className="flex flex-col items-end text-[10px] font-display font-bold leading-tight">
            <span className="text-yellow-400">STAKE <span className="text-white">${bet.toFixed(2)}</span></span>
            <span className="text-yellow-400">CREDIT <span className="text-white">${balance.toFixed(2)}</span></span>
          </div>
        </div>

        {/* Bet selector */}
        <AnimatePresence>
          {showBetMenu && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-6 gap-1 mt-2">
                {BET_TIERS.map((b) => (
                  <button
                    key={b}
                    onClick={() => { setBet(b); setShowBetMenu(false); }}
                    className={`py-1.5 rounded-md text-[10px] font-bold border ${
                      bet === b
                        ? "bg-gradient-to-b from-yellow-300 to-amber-600 border-yellow-200 text-black"
                        : "bg-black/60 border-yellow-700/40 text-yellow-200"
                    }`}
                  >
                    ${b.toFixed(2)}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Loading screen */}
      <AnimatePresence>
        {!loaded && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0 z-50"
          >
            <LoadingScreen progress={loadProgress} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bonus round */}
      <AnimatePresence>
        {bonusActive && <BonusMap bet={bet} onComplete={handleBonusComplete} />}
      </AnimatePresence>

      {/* Per-spin floating win popup */}
      <AnimatePresence>
        {lastWin > 0 && !bigWin && (
          <WinPopup amount={lastWin} bet={bet} onDone={() => { /* keep until next spin clears */ }} />
        )}
      </AnimatePresence>

      {/* Big win overlay */}
      <AnimatePresence>
        {bigWin && (
          <BigWinOverlay
            amount={bigWin.amt}
            label={bigWin.label}
            onDone={() => setBigWin(null)}
          />
        )}
      </AnimatePresence>

      {/* Paytable */}
      <AnimatePresence>
        {showPaytable && <Paytable onClose={() => setShowPaytable(false)} />}
      </AnimatePresence>

      {/* Chat */}
      {showChat && (
        <div className="absolute inset-0 z-40 bg-black/80 flex items-end">
          <div className="w-full h-[60%] bg-card border-t border-border rounded-t-xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-3 py-2 border-b border-border">
              <span className="text-sm font-bold text-gold">🏴‍☠️ {GAME_TITLE} Chat</span>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setShowChat(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-hidden">
              <GameChat gameRoom={GAME_SLUG} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PiratePlunder() {
  return (
    <AuthGuard>
      <PiratePlunderInner />
    </AuthGuard>
  );
}
