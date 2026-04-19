import { useNavigate } from "react-router-dom";
import { AuthGuard } from "@/components/casino/AuthGuard";
import { GameChat } from "@/components/casino/GameChat";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MessageSquare, X, Volume2, VolumeX, Coins, Info, Repeat } from "lucide-react";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

// ==================== Types ====================
export type SlotSymbol = {
  id: string;
  emoji: string;            // unicode emoji used as the symbol art
  pay: [number, number, number, number]; // 3,4,5,6 of a kind
  weight: number;
  tier: "low" | "mid" | "high" | "premium" | "wild";
  label: string;
};

export type SlotTheme = {
  title: string;
  slug: string;
  shortLabel: string;
  topBarGradient: string;       // e.g. "from-blue-900 via-cyan-700 to-blue-900"
  topBarBorder: string;         // e.g. "border-cyan-300"
  bgGradient: string;           // game area background "from-... via-... to-black"
  frameBorder: string;          // reels frame border color class e.g. "border-cyan-400"
  frameBg: string;              // reels frame inner gradient
  accentText: string;           // primary text color e.g. "text-cyan-200"
  spinButtonGradient: string;   // "from-cyan-300 via-cyan-500 to-blue-700"
  spinButtonBorder: string;     // "border-cyan-100"
  symbols: SlotSymbol[];
  wildId: string;
  scatterId: string;            // symbol that triggers bonus when 5+ appear
  bonusTitle: string;           // banner title e.g. "DEEP SEA BONUS"
  bonusSubtitle: string;
  bonusBgGradient: string;
  bonusItemEmoji: string;       // displayed under unrevealed bonus tiles e.g. "🐚"
  bonusEndEmoji: string;        // killer reveal e.g. "🦈"
  bonusEndMessage: string;
  bigWinGradient: string;       // BIG WIN text gradient classes
  bigWinCoinEmoji: string;
  jackpotColors: string[];      // 4 background gradients for MINI..MEGA
  loadingScreen: React.FC<{ progress: number }>;
  emojiLeft: string;            // top bar decorative emoji
  emojiRight: string;
  paytableTitle?: string;
  primaryHsl?: string;          // for hold ring
};

// ==================== Constants ====================
const REELS = 6;
const ROWS = 4;
const BET_TIERS = [0.1, 0.2, 0.5, 1, 2, 5];

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

const JACKPOT_LABELS = ["MINI", "MINOR", "MAJOR", "MEGA"];
const JACKPOT_VALUES = [20, 50, 200, 2500];

// ==================== Helpers ====================
function buildPool(symbols: SlotSymbol[], wildId: string): string[] {
  const pool: string[] = [];
  for (const s of symbols) {
    if (s.id === wildId) continue;
    for (let i = 0; i < s.weight; i++) pool.push(s.id);
  }
  return pool;
}

function makeRandomSymbol(pool: string[], wildId: string) {
  return (forceLoss = false) => {
    if (!forceLoss && Math.random() < 0.01) return wildId;
    return pool[Math.floor(Math.random() * pool.length)];
  };
}

function generateGrid(rand: (force?: boolean) => string, force = false): string[][] {
  return Array.from({ length: REELS }, () => Array.from({ length: ROWS }, () => rand(force)));
}

function generateBonusGrid(rand: (force?: boolean) => string, scatterId: string): string[][] {
  const g = generateGrid(rand);
  const positions = [0, 2, 3, 5];
  positions.forEach((c) => (g[c][1] = scatterId));
  return g;
}

type WinLine = { line: number; sym: string; count: number; multiplier: number; positions: [number, number][] };

function evaluateGrid(
  grid: string[][],
  bet: number,
  symMap: Record<string, SlotSymbol>,
  wildId: string,
  scatterId: string
): { totalWin: number; lines: WinLine[]; scatterCount: number } {
  const lines: WinLine[] = [];
  let totalWin = 0;
  PAYLINES.forEach((line, lineIdx) => {
    const positions: [number, number][] = [];
    let firstSym = grid[0][line[0]];
    if (firstSym === wildId) {
      for (let i = 1; i < REELS; i++) {
        if (grid[i][line[i]] !== wildId) { firstSym = grid[i][line[i]]; break; }
      }
    }
    if (!firstSym) return;
    let count = 0;
    for (let i = 0; i < REELS; i++) {
      const cell = grid[i][line[i]];
      if (cell === firstSym || cell === wildId) {
        count++;
        positions.push([i, line[i]]);
      } else break;
    }
    if (count >= 3) {
      const sym = symMap[firstSym];
      const idx = Math.min(count - 3, 3);
      const mult = sym.pay[idx];
      const win = mult * bet;
      totalWin += win;
      lines.push({ line: lineIdx, sym: firstSym, count, multiplier: mult, positions });
    }
  });
  let scatterCount = 0;
  for (let r = 0; r < REELS; r++) for (let c = 0; c < ROWS; c++) if (grid[r][c] === scatterId) scatterCount++;
  return { totalWin, lines, scatterCount };
}

// ==================== Reel ====================
function Reel({
  colIndex,
  finalSymbols,
  spinning,
  winPositions,
  symMap,
  rand,
}: {
  colIndex: number;
  finalSymbols: string[];
  spinning: boolean;
  winPositions: number[];
  symMap: Record<string, SlotSymbol>;
  rand: (force?: boolean) => string;
}) {
  const SPIN_LEN = 18;
  const stripRef = useRef<string[]>([]);
  const [stripVersion, setStripVersion] = useState(0);

  useEffect(() => {
    const randoms = Array.from({ length: SPIN_LEN }, () => rand());
    stripRef.current = [...randoms, ...finalSymbols];
    setStripVersion((v) => v + 1);
  }, [finalSymbols, rand]);

  const strip = stripRef.current.length ? stripRef.current : finalSymbols;
  const restingPercent = -(SPIN_LEN / strip.length) * 100;
  const stopDelay = colIndex * 0.18;
  const spinDuration = 0.8 + stopDelay;

  return (
    <div className="relative overflow-hidden rounded-md bg-black/40" style={{ aspectRatio: `1 / ${ROWS}` }}>
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
          const restingRow = idx - SPIN_LEN;
          const isWin = !spinning && restingRow >= 0 && winPositions.includes(restingRow);
          const sym = symMap[symId];
          return (
            <div
              key={`${stripVersion}-${idx}`}
              className={`relative flex items-center justify-center rounded-md overflow-hidden ${
                isWin
                  ? "bg-gradient-to-br from-yellow-400/40 to-amber-600/40 ring-2 ring-yellow-300 shadow-[0_0_15px_rgba(255,220,80,0.8)]"
                  : "bg-gradient-to-br from-black/60 to-black/30 border border-white/10"
              }`}
              style={{ aspectRatio: "1 / 1" }}
            >
              <motion.span
                className={`text-[40px] sm:text-5xl leading-none drop-shadow-[0_2px_3px_rgba(0,0,0,0.7)] ${spinning ? "blur-[1.5px]" : ""}`}
                animate={isWin ? { scale: [1, 1.2, 1] } : {}}
                transition={isWin ? { duration: 0.6, repeat: Infinity } : {}}
              >
                {sym?.emoji}
              </motion.span>
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
      {spinning && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, transparent 20%, transparent 80%, rgba(0,0,0,0.5) 100%)",
          }}
        />
      )}
    </div>
  );
}

// ==================== Big Win ====================
function BigWinOverlay({ amount, label, onDone, theme }: { amount: number; label: string; onDone: () => void; theme: SlotTheme }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3500);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none">
      <div className="absolute inset-0 bg-black/70" />
      {Array.from({ length: 14 }).map((_, i) => (
        <motion.span
          key={i}
          className="absolute text-3xl"
          initial={{ x: 0, y: 0, scale: 0, rotate: 0 }}
          animate={{
            x: (Math.random() - 0.5) * 500,
            y: (Math.random() - 0.5) * 500,
            scale: [0, 1, 0.6],
            rotate: Math.random() * 540 - 270,
          }}
          transition={{ duration: 2, ease: "easeOut", delay: i * 0.05 }}
        >
          {theme.bigWinCoinEmoji}
        </motion.span>
      ))}
      <motion.div
        initial={{ scale: 0, rotate: -10 }}
        animate={{ scale: [0, 1.2, 1], rotate: [0, -3, 3, 0] }}
        transition={{ duration: 0.8 }}
        className="relative text-center"
      >
        <h1 className={`font-display font-black text-5xl bg-gradient-to-b ${theme.bigWinGradient} bg-clip-text text-transparent drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)] uppercase tracking-wider`}>
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
}

// ==================== Win Popup ====================
function WinPopup({ amount, bet, onDone, theme }: { amount: number; bet: number; onDone: () => void; theme: SlotTheme }) {
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
      <div className={`relative px-5 py-2 rounded-2xl bg-gradient-to-b ${colors[tier]} border-2 border-yellow-100 shadow-[0_0_30px_rgba(255,200,80,0.8),inset_0_2px_4px_rgba(255,255,255,0.4)]`}>
        <div className="text-[10px] font-display font-black uppercase tracking-[0.25em] text-black/70 text-center leading-none">
          {tier === "mega" ? "MEGA WIN" : tier === "huge" ? "HUGE WIN" : tier === "big" ? "BIG WIN" : tier === "nice" ? "NICE WIN" : "WIN"}
        </div>
        <div className="font-mono font-black text-2xl text-black drop-shadow text-center leading-tight">+${amount.toFixed(2)}</div>
      </div>
    </motion.div>
  );
}

// ==================== Bonus Map ====================
function BonusRound({ bet, onComplete, theme }: { bet: number; onComplete: (totalWin: number) => void; theme: SlotTheme }) {
  const [revealed, setRevealed] = useState<Record<number, number | "end">>({});
  const [total, setTotal] = useState(0);
  const [done, setDone] = useState(false);

  const prizes = useMemo(() => {
    const arr: (number | "end")[] = [
      bet * 0.5, bet * 1, bet * 1.5, bet * 0.75, bet * 3, bet * 0.25,
      bet * 5, bet * 1, bet * 10, bet * 2, "end", bet * 20,
    ];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }, [bet]);

  const pick = (i: number) => {
    if (done || revealed[i] !== undefined) return;
    const prize = prizes[i];
    setRevealed((r) => ({ ...r, [i]: prize }));
    if (prize === "end") {
      setDone(true);
      setTimeout(() => onComplete(total), 2200);
    } else {
      setTotal((t) => t + (prize as number));
    }
  };

  return (
    <div className={`absolute inset-0 z-40 bg-gradient-to-b ${theme.bonusBgGradient} flex flex-col items-center justify-center p-4 overflow-hidden`}>
      <div className="absolute inset-0 opacity-40 animate-pulse" style={{ background: "radial-gradient(circle at 50% 40%, rgba(255,180,80,0.4), transparent 60%)" }} />
      <h2 className="font-display text-3xl font-black bg-gradient-to-b from-yellow-200 to-amber-600 bg-clip-text text-transparent drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] mb-1 text-center">
        ✨ {theme.bonusTitle} ✨
      </h2>
      <p className="text-amber-200/80 text-xs uppercase tracking-widest mb-4 text-center">{theme.bonusSubtitle}</p>

      <div className="relative w-full max-w-md aspect-[4/3] rounded-xl border-4 border-amber-800/60 bg-gradient-to-br from-[#d8b074] via-[#a87d4a] to-[#7a5530] shadow-[0_0_40px_rgba(255,180,60,0.4)] p-3">
        <div className="grid grid-cols-4 gap-2 h-full">
          {prizes.map((p, i) => {
            const r = revealed[i];
            return (
              <motion.button
                key={i}
                onClick={() => pick(i)}
                disabled={done || r !== undefined}
                className="relative rounded-lg flex items-center justify-center overflow-hidden bg-black/30 border border-amber-900/60"
                whileHover={r === undefined && !done ? { scale: 1.05 } : {}}
                whileTap={r === undefined && !done ? { scale: 0.95 } : {}}
              >
                {r === undefined ? (
                  <motion.div animate={{ y: [0, -3, 0] }} transition={{ duration: 2, repeat: Infinity, delay: i * 0.1 }} className="text-3xl">
                    {theme.bonusItemEmoji}
                  </motion.div>
                ) : r === "end" ? (
                  <motion.div initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", damping: 10 }} className="text-4xl">
                    {theme.bonusEndEmoji}
                  </motion.div>
                ) : (
                  <motion.div initial={{ scale: 0 }} animate={{ scale: [0, 1.3, 1] }} transition={{ duration: 0.5 }} className="flex flex-col items-center">
                    <span className="text-2xl">{theme.bigWinCoinEmoji}</span>
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
        <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-3 text-red-400 font-display font-bold uppercase tracking-wider text-center">
          {theme.bonusEndMessage}
        </motion.p>
      )}
    </div>
  );
}

// ==================== Paytable ====================
function Paytable({ onClose, theme }: { onClose: () => void; theme: SlotTheme }) {
  const order: SlotSymbol["tier"][] = ["wild", "premium", "high", "mid", "low"];
  const rows = [...theme.symbols].sort((a, b) => order.indexOf(a.tier) - order.indexOf(b.tier));
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-40 bg-gradient-to-b from-[#0a0a1a]/95 via-[#1a0c2e]/95 to-black/95 overflow-y-auto">
      <div className="sticky top-0 z-10 bg-gradient-to-b from-black to-transparent flex items-center justify-between px-3 py-2">
        <h2 className="font-display font-black text-yellow-200 text-base tracking-widest">{theme.paytableTitle || "GAME RULES"}</h2>
        <button onClick={onClose} className="text-white/80 hover:text-white"><X className="h-6 w-6" /></button>
      </div>
      <p className="px-4 text-center text-white/80 text-xs leading-snug">All symbols pay from left to right on adjacent reels starting from the leftmost reel.</p>
      <div className="grid grid-cols-2 gap-3 px-3 mt-4">
        {rows.map((s) => (
          <div key={s.id} className="flex flex-col items-center bg-black/40 rounded-lg p-2 border border-yellow-700/30">
            <div className="relative">
              <span className="text-5xl">{s.emoji}</span>
              {s.tier === "wild" && <span className="absolute -top-1 -right-1 px-1 rounded-sm bg-purple-500 text-white text-[8px] font-black">WILD</span>}
              {s.id === theme.scatterId && <span className="absolute -top-1 -right-1 px-1 rounded-sm bg-rose-500 text-white text-[8px] font-black">SCATTER</span>}
            </div>
            <div className="mt-1 text-[10px] text-white/70 font-bold uppercase">{s.label}</div>
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
          <h3 className="font-display font-black text-yellow-300 text-sm mb-1">🃏 WILD</h3>
          <p>Substitutes for all symbols except SCATTER. Pays the highest multipliers.</p>
        </div>
        <div className="bg-black/40 rounded-lg p-3 border border-yellow-700/30">
          <h3 className="font-display font-black text-yellow-300 text-sm mb-1">⭐ SCATTER</h3>
          <p>Hit 5 or more SCATTER symbols anywhere to trigger the {theme.bonusTitle}.</p>
        </div>
        <div className="bg-black/40 rounded-lg p-3 border border-yellow-700/30">
          <h3 className="font-display font-black text-yellow-300 text-sm mb-1">🔁 AUTO SPIN</h3>
          <p>Hold the SPIN button for 3 seconds to start AUTO SPIN. Tap once to cancel.</p>
        </div>
        <div className="bg-black/40 rounded-lg p-3 border border-yellow-700/30">
          <h3 className="font-display font-black text-yellow-300 text-sm mb-1">💰 BET LIMITS</h3>
          <p>Stake options: $0.10, $0.20, $0.50, $1.00, $2.00, $5.00.</p>
        </div>
        <div className="bg-black/40 rounded-lg p-3 border border-rose-700/30">
          <h3 className="font-display font-black text-rose-300 text-sm mb-1">🏆 MAX WIN</h3>
          <p>Maximum win per round capped at 2,500x your total stake (MEGA jackpot).</p>
        </div>
        <div className="h-6" />
      </div>
    </motion.div>
  );
}

// ==================== Main Engine ====================
function SlotEngineInner({ theme }: { theme: SlotTheme }) {
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();
  const [showChat, setShowChat] = useState(false);
  const [muted, setMuted] = useState(false);
  const [showBetMenu, setShowBetMenu] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [loaded, setLoaded] = useState(false);

  const symMap = useMemo(() => Object.fromEntries(theme.symbols.map((s) => [s.id, s])), [theme]);
  const pool = useMemo(() => buildPool(theme.symbols, theme.wildId), [theme]);
  const rand = useMemo(() => makeRandomSymbol(pool, theme.wildId), [pool, theme.wildId]);

  const [bet, setBet] = useState(1);
  const [grid, setGrid] = useState<string[][]>(() => generateGrid(rand));
  const [spinning, setSpinning] = useState(false);
  const [winLines, setWinLines] = useState<WinLine[]>([]);
  const [lastWin, setLastWin] = useState(0);
  const [bigWin, setBigWin] = useState<{ amt: number; label: string } | null>(null);
  const [bonusActive, setBonusActive] = useState(false);
  const [freeSpins, setFreeSpins] = useState(0);
  const [autoSpin, setAutoSpin] = useState(false);
  const [showPaytable, setShowPaytable] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);

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

  const settle = useCallback(async (amount: number, outcome: string) => {
    const u = userRef.current;
    if (!u || amount === 0) return null;
    const { data: sessionData } = await supabase.auth.getSession();
    let token = sessionData.session?.access_token;
    if (!token) {
      const { data: refreshed } = await supabase.auth.refreshSession();
      token = refreshed.session?.access_token;
    }
    if (!token) return null;
    const { data, error } = await supabase.functions.invoke("game-settle", {
      body: { userId: u.id, amount, gameType: theme.title, outcome },
    });
    if (error) {
      console.error(`${theme.title} settle error:`, error);
      return null;
    }
    await refreshProfile();
    return data;
  }, [refreshProfile, theme.title]);

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

  const sfx = useMemo(() => ({
    spinStart: () => { beep(180, 0.15, "sawtooth", 0.06); setTimeout(() => beep(260, 0.1, "square", 0.04), 80); },
    reelStop: (i: number) => beep(180 - i * 12, 0.08, "triangle", 0.07),
    coin: (i: number) => { beep(880 + i * 60, 0.08, "sine", 0.06); setTimeout(() => beep(1320 + i * 80, 0.06, "sine", 0.04), 30); },
    bigWin: () => { [523, 659, 784, 1047, 1319].forEach((n, i) => setTimeout(() => beep(n, 0.25, "triangle", 0.08), i * 90)); },
    bonusJingle: () => { [392, 523, 659, 784, 988].forEach((n, i) => setTimeout(() => beep(n, 0.18, "square", 0.07), i * 100)); },
  }), [beep]);

  const triggerBigWin = (amt: number) => {
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

    if (!isFree) {
      const r = await settle(-bet, `${theme.title} bet`);
      if (!r) { setSpinning(false); return; }
    }

    const triggerBonus = Math.random() < 0.06;
    const newGrid = triggerBonus ? generateBonusGrid(rand, theme.scatterId) : generateGrid(rand);

    for (let i = 0; i < REELS; i++) setTimeout(() => sfx.reelStop(i), 800 + i * 180);

    setGrid(newGrid);
    await new Promise((r) => setTimeout(r, 2500));
    setSpinning(false);
    await new Promise((r) => setTimeout(r, 250));

    const { totalWin, lines, scatterCount } = evaluateGrid(newGrid, bet, symMap, theme.wildId, theme.scatterId);
    setWinLines(lines);

    if (totalWin > 0) {
      setLastWin(totalWin);
      lines.forEach((_, i) => setTimeout(() => sfx.coin(i), i * 110));
      await settle(totalWin, `${theme.title} win`);
      const ratio = totalWin / bet;
      if (ratio >= 10) setTimeout(() => sfx.bigWin(), 200);
      triggerBigWin(totalWin);
    }

    if (isFree) setFreeSpins((n) => Math.max(0, n - 1));

    if (scatterCount >= 5) {
      setTimeout(() => { sfx.bonusJingle(); setBonusActive(true); }, 800);
    }
  }, [spinning, bonusActive, bet, settle, sfx, rand, symMap, theme.scatterId, theme.title, theme.wildId]);

  const handleBonusComplete = useCallback(async (winAmt: number) => {
    setBonusActive(false);
    if (winAmt > 0) {
      await settle(winAmt, `${theme.title} bonus win`);
      setBigWin({ amt: winAmt, label: "BONUS WIN!" });
    }
    setFreeSpins(5);
  }, [settle, theme.title]);

  useEffect(() => {
    if (freeSpins > 0 && !spinning && !bonusActive && !bigWin) {
      const t = setTimeout(() => spin(true), 1500);
      return () => clearTimeout(t);
    }
  }, [freeSpins, spinning, bonusActive, bigWin, spin]);

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

  // Hold-to-auto
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
    if (autoSpin) return;
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
    if (autoSpin) { setAutoSpin(false); toast({ title: "Auto Spin Cancelled" }); return; }
    if (spinning || bonusActive || freeSpins > 0) return;
    spin(false);
  }, [autoSpin, spinning, bonusActive, freeSpins, spin, clearHold]);
  useEffect(() => () => clearHold(), [clearHold]);

  const balance = profile?.balance ?? 0;
  const Loading = theme.loadingScreen;

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col overflow-hidden font-sans">
      {/* Top status bar */}
      <div className={`relative shrink-0 bg-gradient-to-r ${theme.topBarGradient} border-b-2 ${theme.topBarBorder} flex items-center justify-between px-3 py-1.5 safe-area-top overflow-hidden`}>
        <motion.div
          className="absolute inset-y-0 w-1/3 pointer-events-none"
          style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent)" }}
          animate={{ x: ["-150%", "350%"] }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
        />
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="relative z-10 text-white h-8 px-2 text-xs gap-1 hover:bg-white/10">
          <ArrowLeft className="h-4 w-4" /> Exit
        </Button>
        <div className="relative z-10 flex flex-col items-center leading-none">
          <div className="flex items-center gap-1.5">
            <motion.span className="text-base" animate={{ rotate: [-12, 12, -12] }} transition={{ duration: 2.4, repeat: Infinity }}>{theme.emojiLeft}</motion.span>
            <span className={`font-display font-black text-sm tracking-wider ${theme.accentText} drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]`}>
              {theme.title}
            </span>
            <motion.span className="text-base" animate={{ rotate: [12, -12, 12] }} transition={{ duration: 2.4, repeat: Infinity }}>{theme.emojiRight}</motion.span>
          </div>
          <span className="font-display font-bold text-[7px] tracking-[0.35em] text-white/60 mt-0.5">PHANTOMBET EXCLUSIVE</span>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setShowChat((v) => !v)} className="relative z-10 text-white h-8 px-2 text-xs gap-1 hover:bg-white/10">
          <MessageSquare className="h-4 w-4" />
        </Button>
      </div>

      {/* Game area */}
      <div className={`flex-1 min-h-0 relative bg-gradient-to-b ${theme.bgGradient} overflow-hidden`}>
        {/* Jackpot ladder */}
        <div className="relative z-10 px-2 pt-2 grid grid-cols-4 gap-1">
          {JACKPOT_LABELS.map((label, i) => (
            <div key={label} className={`relative rounded-md border-2 border-yellow-600/70 bg-gradient-to-b ${theme.jackpotColors[i]} px-1 py-0.5 text-center shadow-[0_2px_4px_rgba(0,0,0,0.6)]`}>
              <div className="font-display font-black text-[10px] text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.9)] tracking-wider">{label}</div>
              <div className="font-mono font-bold text-[11px] text-black bg-black/20 rounded">${JACKPOT_VALUES[i].toFixed(2)}</div>
            </div>
          ))}
        </div>

        {/* Reels frame */}
        <div className={`relative z-10 mx-2 mt-2 rounded-xl border-[3px] ${theme.frameBorder} bg-gradient-to-br ${theme.frameBg} shadow-[inset_0_0_20px_rgba(0,0,0,0.8),0_0_25px_rgba(255,180,60,0.2)] p-1.5`}>
          <div className="grid grid-cols-6 gap-0.5 bg-black/40 rounded-lg p-1">
            {grid.map((reel, ci) => (
              <Reel
                key={ci}
                colIndex={ci}
                finalSymbols={reel}
                spinning={spinning}
                winPositions={winLines.flatMap((wl) => wl.positions.filter(([x]) => x === ci).map(([, y]) => y))}
                symMap={symMap}
                rand={rand}
              />
            ))}
          </div>
        </div>

        <div className="relative z-10 text-center mt-2 h-5">
          {lastWin > 0 && (
            <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="font-display font-black text-yellow-300 text-base drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">
              💰 WIN ${lastWin.toFixed(2)}
            </motion.div>
          )}
          {freeSpins > 0 && (
            <motion.div animate={{ opacity: [0.6, 1, 0.6] }} transition={{ duration: 1, repeat: Infinity }} className="font-display font-black text-amber-300 text-xs">
              🎁 FREE SPINS: {freeSpins}
            </motion.div>
          )}
        </div>
        {!spinning && !lastWin && !freeSpins && (
          <motion.div className="relative z-10 text-center font-display font-black text-white/80 text-sm tracking-widest mt-1" animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 1.5, repeat: Infinity }}>
            PRESS TO SPIN
          </motion.div>
        )}
      </div>

      {/* Control bar */}
      <div className="shrink-0 bg-gradient-to-b from-black/90 to-black border-t-2 border-white/10 px-3 py-2 safe-area-bottom">
        <div className="flex items-center justify-between gap-2">
          <div className="flex gap-1.5">
            <button onClick={() => setMuted((m) => !m)} className="w-9 h-9 rounded-full bg-black/60 border border-white/20 flex items-center justify-center text-white/80 hover:text-white">
              {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
            <button onClick={() => setShowBetMenu((v) => !v)} className="w-9 h-9 rounded-full bg-black/60 border border-white/20 flex items-center justify-center text-yellow-400">
              <Coins className="h-4 w-4" />
            </button>
            <button onClick={() => setShowPaytable(true)} className="w-9 h-9 rounded-full bg-black/60 border border-white/20 flex items-center justify-center text-white/80 hover:text-white" aria-label="Paytable">
              <Info className="h-4 w-4" />
            </button>
          </div>

          <motion.button
            onPointerDown={handleSpinPressStart}
            onPointerUp={handleSpinPressEnd}
            onPointerLeave={clearHold}
            onPointerCancel={clearHold}
            onContextMenu={(e) => e.preventDefault()}
            disabled={spinning || bonusActive || freeSpins > 0}
            className={`relative w-16 h-16 rounded-full bg-gradient-to-b ${theme.spinButtonGradient} border-4 ${theme.spinButtonBorder} shadow-[0_0_25px_rgba(255,200,60,0.7),inset_0_2px_4px_rgba(255,255,255,0.4)] flex items-center justify-center disabled:opacity-60 select-none touch-none`}
            whileTap={{ scale: 0.92 }}
            animate={spinning ? { rotate: 360 } : {}}
            transition={spinning ? { duration: 0.6, repeat: Infinity, ease: "linear" } : {}}
            style={{ WebkitUserSelect: "none" }}
          >
            {holdProgress > 0 && (
              <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none" viewBox="0 0 64 64">
                <circle cx="32" cy="32" r="29" fill="none" stroke="rgba(0,0,0,0.3)" strokeWidth="3" />
                <circle cx="32" cy="32" r="29" fill="none" stroke={theme.primaryHsl ? `hsl(${theme.primaryHsl})` : "hsl(280 90% 65%)"} strokeWidth="3" strokeLinecap="round" strokeDasharray={2 * Math.PI * 29} strokeDashoffset={(1 - holdProgress) * 2 * Math.PI * 29} style={{ filter: "drop-shadow(0 0 4px currentColor)" }} />
              </svg>
            )}
            {autoSpin ? <Repeat className="h-6 w-6 text-black" /> : <div className="w-12 h-12 rounded-full border-[3px] border-black/60 border-t-transparent" />}
            {autoSpin && <span className="absolute -top-2 -right-2 px-1.5 py-0.5 rounded-full bg-purple-600 text-white text-[8px] font-black border border-white/40 shadow">AUTO</span>}
          </motion.button>

          <div className="flex flex-col items-end text-[10px] font-display font-bold leading-tight">
            <span className="text-yellow-400">STAKE <span className="text-white">${bet.toFixed(2)}</span></span>
            <span className="text-yellow-400">CREDIT <span className="text-white">${balance.toFixed(2)}</span></span>
          </div>
        </div>

        <AnimatePresence>
          {showBetMenu && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="grid grid-cols-6 gap-1 mt-2">
                {BET_TIERS.map((b) => (
                  <button
                    key={b}
                    onClick={() => { setBet(b); setShowBetMenu(false); }}
                    className={`py-1.5 rounded-md text-[10px] font-bold border ${
                      bet === b ? "bg-gradient-to-b from-yellow-300 to-amber-600 border-yellow-200 text-black" : "bg-black/60 border-white/20 text-white/80"
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

      <AnimatePresence>
        {!loaded && (
          <motion.div initial={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }} className="absolute inset-0 z-50">
            <Loading progress={loadProgress} />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {bonusActive && <BonusRound bet={bet} onComplete={handleBonusComplete} theme={theme} />}
      </AnimatePresence>

      <AnimatePresence>
        {lastWin > 0 && !bigWin && (
          <WinPopup amount={lastWin} bet={bet} onDone={() => { /* keep until next spin */ }} theme={theme} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {bigWin && <BigWinOverlay amount={bigWin.amt} label={bigWin.label} onDone={() => setBigWin(null)} theme={theme} />}
      </AnimatePresence>

      <AnimatePresence>
        {showPaytable && <Paytable onClose={() => setShowPaytable(false)} theme={theme} />}
      </AnimatePresence>

      {showChat && (
        <div className="absolute inset-0 z-40 bg-black/80 flex items-end">
          <div className="w-full h-[60%] bg-card border-t border-border rounded-t-xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-3 py-2 border-b border-border">
              <span className="text-sm font-bold text-gold">{theme.emojiLeft} {theme.title} Chat</span>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setShowChat(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-hidden">
              <GameChat gameRoom={theme.slug} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function SlotGame({ theme }: { theme: SlotTheme }) {
  return (
    <AuthGuard>
      <SlotEngineInner theme={theme} />
    </AuthGuard>
  );
}
