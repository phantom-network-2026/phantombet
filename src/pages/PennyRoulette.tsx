import { useState, useCallback, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { AuthGuard } from "@/components/casino/AuthGuard";
import { GameChat } from "@/components/casino/GameChat";
import { ChatPopupOverlay } from "@/components/casino/ChatPopupOverlay";
import { motion, AnimatePresence } from "framer-motion";
import { RotateCw, X, Volume2, VolumeX } from "lucide-react";
import { useRouletteAudio } from "@/hooks/useRouletteAudio";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import phantomLogo from "@/assets/phantombet-logo.png";

// ─── Constants ──────────────────────────────────────────────────
const WHEEL_ORDER = [
  0,32,15,19,4,21,2,25,17,34,6,27,13,36,11,30,8,23,10,5,24,16,33,1,20,14,31,9,22,18,29,7,28,12,35,3,26
];
const SEGMENT_ANGLE = 360 / 37;
const RED_NUMBERS = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36];

// Neighbour bet sections (European racetrack)
const VOISINS = [22,18,29,7,28,12,35,3,26,0,32,15,19,4,21,2,25]; // Voisins du Zero
const TIERS = [27,13,36,11,30,8,23,10,5,24,16,33]; // Tiers du Cylindre
const ORPHELINS = [17,34,6,1,20,14,31,9]; // Orphelins

type BetType =
  | { kind: "straight"; number: number }
  | { kind: "red" } | { kind: "black" }
  | { kind: "odd" } | { kind: "even" }
  | { kind: "low" } | { kind: "high" }
  | { kind: "dozen"; dozen: 1 | 2 | 3 }
  | { kind: "column"; column: 1 | 2 | 3 };

interface PlacedBet { type: BetType; amount: number; label: string; }

function getColor(n: number): "green" | "red" | "black" {
  if (n === 0) return "green";
  return RED_NUMBERS.includes(n) ? "red" : "black";
}

function colorHex(c: "green" | "red" | "black") {
  return c === "green" ? "#0a6e2e" : c === "red" ? "#8b1a1a" : "#1a1a1a";
}

function calculatePayout(bet: BetType, result: number): number {
  switch (bet.kind) {
    case "straight": return bet.number === result ? 35 : -1;
    case "red": return RED_NUMBERS.includes(result) ? 1 : -1;
    case "black": return result > 0 && !RED_NUMBERS.includes(result) ? 1 : -1;
    case "odd": return result > 0 && result % 2 === 1 ? 1 : -1;
    case "even": return result > 0 && result % 2 === 0 ? 1 : -1;
    case "low": return result >= 1 && result <= 18 ? 1 : -1;
    case "high": return result >= 19 && result <= 36 ? 1 : -1;
    case "dozen": {
      const d = bet.dozen;
      return result >= (d - 1) * 12 + 1 && result <= d * 12 ? 2 : -1;
    }
    case "column": {
      const c = bet.column;
      return result > 0 && result % 3 === (c === 3 ? 0 : c) ? 2 : -1;
    }
  }
}

const CHIP_VALUES = [0.10, 0.20, 0.50, 1, 2, 5, 10];
const CHIP_COLORS: Record<number, { bg: string; glow: string; text: string; label: string }> = {
  0.10: { bg: "linear-gradient(135deg, #d0d0d0, #888)", glow: "0 0 10px rgba(200,200,200,0.5)", text: "#222", label: "10¢" },
  0.20: { bg: "linear-gradient(135deg, #d4a8e0, #9b59b6)", glow: "0 0 10px rgba(155,89,182,0.6)", text: "#fff", label: "20¢" },
  0.50: { bg: "linear-gradient(135deg, #f5a623, #d4830a)", glow: "0 0 10px rgba(245,166,35,0.6)", text: "#fff", label: "50¢" },
  1:    { bg: "linear-gradient(135deg, #5dade2, #2e86c1)", glow: "0 0 10px rgba(93,173,226,0.6)", text: "#fff", label: "$1" },
  2:    { bg: "linear-gradient(135deg, #e67e22, #d35400)", glow: "0 0 10px rgba(230,126,34,0.6)", text: "#fff", label: "$2" },
  5:    { bg: "linear-gradient(135deg, #27ae60, #1e8449)", glow: "0 0 10px rgba(39,174,96,0.6)", text: "#fff", label: "$5" },
  10:   { bg: "linear-gradient(135deg, #e74c3c, #c0392b)", glow: "0 0 10px rgba(231,76,60,0.6)", text: "#fff", label: "$10" },
};

// ─── Roulette Wheel ─────────────────────────────────────────────
function PennyRouletteWheel({ spinning, result, size = 280 }: { spinning: boolean; result: number | null; size?: number }) {
  const targetAngle = result !== null
    ? -(WHEEL_ORDER.indexOf(result) * SEGMENT_ANGLE)
    : 0;
  const spinRotation = 360 * 6 + targetAngle;

  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      <div className="absolute inset-0 rounded-full"
        style={{
          background: "radial-gradient(circle at 30% 30%, #8b5e3c, #5a3520, #3a1f0f)",
          boxShadow: "0 8px 30px rgba(0,0,0,0.6), inset 0 2px 10px rgba(255,200,100,0.15)",
        }}
      />
      <div className="absolute rounded-full"
        style={{
          inset: size * 0.04,
          background: "linear-gradient(135deg, #e0e0e0 0%, #888 30%, #ccc 50%, #999 70%, #bbb 100%)",
          boxShadow: "inset 0 1px 4px rgba(255,255,255,0.5)",
        }}
      />
      <motion.div
        className="absolute rounded-full overflow-hidden"
        style={{ inset: size * 0.06, background: "#0d2b0d" }}
        animate={{ rotate: spinning ? spinRotation : targetAngle }}
        transition={spinning ? { duration: 4.5, ease: [0.12, 0.8, 0.3, 1] } : { duration: 0 }}
      >
        {WHEEL_ORDER.map((num, i) => {
          const angle = i * SEGMENT_ANGLE;
          const segW = Math.max(14, size * 0.065);
          const segH = Math.max(18, size * 0.11);
          return (
            <div key={num} className="absolute top-0 left-1/2 origin-bottom h-1/2"
              style={{ width: 1, transform: `rotate(${angle}deg) translateX(-50%)` }}>
              <div className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center"
                style={{ top: size * 0.04, width: segW, height: segH, background: colorHex(getColor(num)), fontSize: Math.max(7, size * 0.035), borderRadius: 2 }}>
                <span className="font-bold text-white leading-none">{num}</span>
              </div>
            </div>
          );
        })}
        <div className="absolute rounded-full" style={{ inset: "28%", background: "linear-gradient(135deg, #c0c0c0, #888, #aaa)", boxShadow: "inset 0 1px 3px rgba(0,0,0,0.3)" }} />
        <div className="absolute rounded-full flex items-center justify-center"
          style={{ inset: "30%", background: "radial-gradient(circle at 40% 35%, #5a3520, #3a1f0f, #2a1008)", boxShadow: "inset 0 2px 8px rgba(0,0,0,0.5)" }}>
          <img src={phantomLogo} alt="PhantomBet" className="w-3/5 h-3/5 object-contain drop-shadow-lg" style={{ filter: "brightness(1.4)" }} />
        </div>
      </motion.div>
      <div className="absolute left-1/2 -translate-x-1/2 z-10" style={{ top: -4 }}>
        <div className="w-0 h-0" style={{ borderLeft: "7px solid transparent", borderRight: "7px solid transparent", borderTop: "14px solid #d4af37", filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.5))" }} />
      </div>
    </div>
  );
}

// ─── Result Splash ──────────────────────────────────────────────
function ResultSplash({ resultNumber, netAmount, onClose }: { resultNumber: number; netAmount: number; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);

  const isWin = netAmount > 0;
  const color = getColor(resultNumber);

  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div className="text-center p-6 rounded-2xl min-w-[220px]"
        style={{ background: "radial-gradient(ellipse, #1a3d1a, #050f05)", border: "2px solid #d4af37", boxShadow: "0 0 60px rgba(212,175,55,0.4)" }}
        initial={{ scale: 0.3, y: 50 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.3, opacity: 0 }}
        transition={{ type: "spring", damping: 12 }}>
        <p className="text-xs text-[#d4af37] font-semibold mb-2 uppercase tracking-wider">Ball landed on</p>
        <motion.div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center text-2xl font-black text-white mb-3"
          style={{ background: colorHex(color), boxShadow: `0 0 20px ${colorHex(color)}` }}
          initial={{ scale: 0 }} animate={{ scale: [0, 1.3, 1] }} transition={{ delay: 0.15, duration: 0.4 }}>
          {resultNumber}
        </motion.div>
        <motion.div className="text-xs font-semibold mb-1 text-[#d4af37]">
          {color.toUpperCase()} {resultNumber}
        </motion.div>
        {isWin ? (
          <>
            <motion.div className="text-5xl mb-1" animate={{ rotate: [0, -10, 10, -5, 5, 0] }} transition={{ duration: 0.6, delay: 0.3 }}>🎉</motion.div>
            <p className="text-sm text-[#d4af37] font-semibold">YOU WON</p>
            <motion.p className="text-4xl font-black" style={{ color: "#2ecc71", textShadow: "0 0 20px rgba(46,204,113,0.5)" }}
              initial={{ scale: 0 }} animate={{ scale: [0, 1.2, 1] }} transition={{ delay: 0.2, duration: 0.5 }}>
              +${netAmount.toFixed(2)}
            </motion.p>
          </>
        ) : (
          <>
            <p className="text-sm text-gray-400 font-semibold mt-2">Better luck next time!</p>
            <motion.p className="text-2xl font-bold mt-1 text-red-400" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
              -${Math.abs(netAmount).toFixed(2)}
            </motion.p>
          </>
        )}
        <p className="text-xs text-gray-500 mt-3">Tap to continue</p>
      </motion.div>
    </motion.div>
  );
}

// ─── Main ───────────────────────────────────────────────────────
type GameView = "wheel" | "table" | "racetrack";

export default function PennyRoulette() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [view, setView] = useState<GameView>("table");
  const [bets, setBets] = useState<PlacedBet[]>([]);
  const [selectedChip, setSelectedChip] = useState(0.10);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<number | null>(null);
  const [splashData, setSplashData] = useState<{ resultNumber: number; netAmount: number } | null>(null);
  const [history, setHistory] = useState<number[]>([]);
  const [lastBets, setLastBets] = useState<PlacedBet[]>([]);
  const [winLoss, setWinLoss] = useState(0);
  const [showChat, setShowChat] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const pendingSpinRef = useRef(false);
  const audio = useRouletteAudio();
  const ballTickCleanupRef = useRef<(() => void) | null>(null);

  const totalBet = bets.reduce((s, b) => s + b.amount, 0);
  const balance = profile?.balance ?? 0;

  const placeBet = useCallback((type: BetType, label: string) => {
    if (spinning) return;
    if (totalBet + selectedChip > balance) { toast.error("Insufficient balance"); return; }
    if (totalBet + selectedChip > 50) { toast.error("Maximum total bet is $50"); return; }
    audio.chipPlace();
    setBets((prev) => [...prev, { type, amount: selectedChip, label }]);
  }, [spinning, selectedChip, totalBet, balance, audio]);

  // Place multiple bets at once (for neighbour/racetrack bets)
  const placeMultipleBets = useCallback((betDefs: { type: BetType; label: string }[]) => {
    if (spinning) return;
    const addedCost = betDefs.length * selectedChip;
    if (totalBet + addedCost > balance) { toast.error("Insufficient balance"); return; }
    if (totalBet + addedCost > 50) { toast.error("Max total bet is $50"); return; }
    setBets((prev) => [
      ...prev,
      ...betDefs.map(d => ({ type: d.type, amount: selectedChip, label: d.label })),
    ]);
  }, [spinning, selectedChip, totalBet, balance]);

  const clearBets = () => { if (!spinning) { audio.clearSound(); setBets([]); } };

  const spin = useCallback(async (overrideBets?: PlacedBet[]) => {
    const activeBets = overrideBets || bets;
    if (!user || spinning || activeBets.length === 0) return;
    setSpinning(true);
    setResult(null);
    setSplashData(null);
    setLastBets(activeBets);

    // Play spin sound + ball ticks
    audio.spinStart();
    const cleanup = audio.startBallTicks();
    ballTickCleanupRef.current = cleanup;

    const winningNumber = Math.floor(Math.random() * 37);

    let netAmount = 0;
    for (const bet of activeBets) netAmount += bet.amount * calculatePayout(bet.type, winningNumber);

    setResult(winningNumber);
    setView("wheel");
    await new Promise((r) => setTimeout(r, 4500));

    // Ball landing sound
    if (ballTickCleanupRef.current) { ballTickCleanupRef.current(); ballTickCleanupRef.current = null; }
    audio.ballLand();

    await new Promise((r) => setTimeout(r, 500));

    try {
      const { error } = await supabase.functions.invoke("game-settle", {
        body: { userId: user.id, amount: netAmount, gameType: "penny-roulette",
          outcome: `Number ${winningNumber} (${getColor(winningNumber)})` },
      });
      if (error) throw error;
      await refreshProfile();
    } catch { toast.error("Failed to settle bet"); }

    // Win/lose sound
    if (netAmount > 0) audio.winSound();
    else audio.loseSound();

    setWinLoss(prev => prev + netAmount);
    setHistory((prev) => [winningNumber, ...prev.slice(0, 19)]);
    setSplashData({ resultNumber: winningNumber, netAmount });
    setSpinning(false);
    setBets([]);
  }, [bets, user, spinning, refreshProfile, audio]);

  const rebet = () => {
    if (spinning || lastBets.length === 0) return;
    const rebetTotal = lastBets.reduce((s, b) => s + b.amount, 0);
    if (rebetTotal > balance) { toast.error("Insufficient balance"); return; }
    if (rebetTotal > 50) { toast.error("Maximum total bet is $50"); return; }
    setBets(lastBets);
  };

  const respin = () => {
    if (spinning || lastBets.length === 0) return;
    const rebetTotal = lastBets.reduce((s, b) => s + b.amount, 0);
    if (rebetTotal > balance) { toast.error("Insufficient balance"); return; }
    if (rebetTotal > 50) { toast.error("Maximum total bet is $50"); return; }
    // Directly call spin with the lastBets to avoid state timing issues
    spin(lastBets);
  };

  const getBetTotal = (filter: (b: PlacedBet) => boolean) =>
    bets.filter(filter).reduce((s, b) => s + b.amount, 0);

  // Chip overlay centered in square with neon glow
  const chipOverlay = (amount: number) => {
    if (amount <= 0) return null;
    const label = amount < 1 ? `${Math.round(amount * 100)}¢` : `$${amount.toFixed(0)}`;
    return (
      <span className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
        <span className="rounded-full flex items-center justify-center font-black text-white"
          style={{
            minWidth: 20, height: 20, fontSize: 8, padding: "0 3px",
            background: "radial-gradient(circle, #d4af37, #a08420)",
            boxShadow: "0 0 8px rgba(212,175,55,0.8), 0 0 3px rgba(212,175,55,0.4)",
            border: "1.5px solid #e5c94b",
            animation: "neonPulse 2s ease-in-out infinite",
          }}>
          {label}
        </span>
      </span>
    );
  };

  const numCell = (num: number) => {
    const betAmount = getBetTotal(b => b.type.kind === "straight" && b.type.number === num);
    const bg = getColor(num) === "red" ? "#8b1a1a" : getColor(num) === "green" ? "#0a6e2e" : "#1a1a1a";
    return (
      <button key={num} onClick={() => placeBet({ kind: "straight", number: num }, `${num}`)}
        className="relative flex items-center justify-center text-white font-bold border border-[#333]/50 hover:brightness-125 active:scale-95 transition-all"
        style={{ background: bg, fontSize: 13, padding: "6px 0" }}>
        {num}
        {chipOverlay(betAmount)}
      </button>
    );
  };

  const outsideBtn = (label: string, type: BetType, bg?: string, customContent?: React.ReactNode) => {
    const betAmount = getBetTotal(b => JSON.stringify(b.type) === JSON.stringify(type));
    return (
      <button onClick={() => placeBet(type, label)}
        className="relative text-white font-bold border border-[#333]/50 hover:brightness-125 active:scale-95 transition-all text-center leading-tight flex items-center justify-center"
        style={{ background: bg || "#0d3d0d", fontSize: 10, padding: "4px 2px", writingMode: "vertical-rl" }}>
        {customContent || label}
        {chipOverlay(betAmount)}
      </button>
    );
  };

  // ─── Quick bet buttons (inside/outside combos) ─────────────────
  const quickBets = (
    <div className="flex gap-1 px-2 py-1.5 overflow-x-auto" style={{ background: "#0a2a0a" }}>
      <button onClick={() => {
        placeMultipleBets([
          { type: { kind: "red" }, label: "Red" },
          { type: { kind: "odd" }, label: "Odd" },
        ]);
      }}
        className="shrink-0 text-[9px] font-bold px-2.5 py-1.5 rounded-full border border-red-700/50 text-red-300 hover:bg-red-900/30 transition-colors">
        Red + Odd
      </button>
      <button onClick={() => {
        placeMultipleBets([
          { type: { kind: "black" }, label: "Black" },
          { type: { kind: "even" }, label: "Even" },
        ]);
      }}
        className="shrink-0 text-[9px] font-bold px-2.5 py-1.5 rounded-full border border-gray-600/50 text-gray-300 hover:bg-gray-800/30 transition-colors">
        Black + Even
      </button>
      <button onClick={() => {
        placeMultipleBets([
          { type: { kind: "red" }, label: "Red" },
          { type: { kind: "high" }, label: "19-36" },
        ]);
      }}
        className="shrink-0 text-[9px] font-bold px-2.5 py-1.5 rounded-full border border-red-700/50 text-red-300 hover:bg-red-900/30 transition-colors">
        Red + High
      </button>
      <button onClick={() => {
        placeMultipleBets([
          { type: { kind: "black" }, label: "Black" },
          { type: { kind: "low" }, label: "1-18" },
        ]);
      }}
        className="shrink-0 text-[9px] font-bold px-2.5 py-1.5 rounded-full border border-gray-600/50 text-gray-300 hover:bg-gray-800/30 transition-colors">
        Black + Low
      </button>
      <button onClick={() => {
        placeMultipleBets([
          { type: { kind: "dozen", dozen: 1 }, label: "1st 12" },
          { type: { kind: "red" }, label: "Red" },
        ]);
      }}
        className="shrink-0 text-[9px] font-bold px-2.5 py-1.5 rounded-full border border-[#d4af37]/50 text-[#d4af37] hover:bg-[#d4af37]/10 transition-colors">
        1st12 + Red
      </button>
    </div>
  );

  // ─── Racetrack View ──────────────────────────────────────────
  const racetrackView = (
    <div className="flex-1 flex flex-col items-center justify-center relative px-4 py-6" style={{ background: "radial-gradient(ellipse at center, #1a5c1a, #0d3d0d, #082808)" }}>
      <div className="flex items-center gap-2 mb-6">
        <img src={phantomLogo} alt="PhantomBet" className="h-10 drop-shadow-lg" style={{ filter: "brightness(1.3)" }} />
        <span className="text-[#d4af37] font-black text-lg tracking-wide">RACETRACK BETS</span>
      </div>

      {/* Racetrack oval */}
      <div className="relative w-full max-w-xs mx-auto">
        {/* Oval track with numbers */}
        <div className="flex flex-wrap justify-center gap-1 mb-4">
          {WHEEL_ORDER.map(num => (
            <button key={num} onClick={() => placeBet({ kind: "straight", number: num }, `${num}`)}
              className="w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-[9px] border border-white/20 hover:brightness-150 transition-all"
              style={{ background: colorHex(getColor(num)) }}>
              {num}
            </button>
          ))}
        </div>

        {/* Section buttons */}
        <div className="grid grid-cols-3 gap-2 mt-4">
          <button onClick={() => {
            const betDefs = VOISINS.map(n => ({ type: { kind: "straight" as const, number: n }, label: `${n}` }));
            placeMultipleBets(betDefs);
          }}
            className="rounded-xl py-3 text-center font-bold text-sm text-white transition-all hover:brightness-125"
            style={{ background: "linear-gradient(135deg, #2a5a2a, #1a3d1a)", border: "1px solid #d4af37", boxShadow: "0 0 12px rgba(212,175,55,0.2)" }}>
            <p className="text-[#d4af37] text-xs mb-0.5">Voisins</p>
            <p className="text-[10px] text-gray-400">du Zero</p>
            <p className="text-[9px] text-gray-500 mt-0.5">{VOISINS.length} numbers</p>
          </button>
          <button onClick={() => {
            const betDefs = TIERS.map(n => ({ type: { kind: "straight" as const, number: n }, label: `${n}` }));
            placeMultipleBets(betDefs);
          }}
            className="rounded-xl py-3 text-center font-bold text-sm text-white transition-all hover:brightness-125"
            style={{ background: "linear-gradient(135deg, #2a5a2a, #1a3d1a)", border: "1px solid #d4af37", boxShadow: "0 0 12px rgba(212,175,55,0.2)" }}>
            <p className="text-[#d4af37] text-xs mb-0.5">Tiers</p>
            <p className="text-[10px] text-gray-400">du Cylindre</p>
            <p className="text-[9px] text-gray-500 mt-0.5">{TIERS.length} numbers</p>
          </button>
          <button onClick={() => {
            const betDefs = ORPHELINS.map(n => ({ type: { kind: "straight" as const, number: n }, label: `${n}` }));
            placeMultipleBets(betDefs);
          }}
            className="rounded-xl py-3 text-center font-bold text-sm text-white transition-all hover:brightness-125"
            style={{ background: "linear-gradient(135deg, #2a5a2a, #1a3d1a)", border: "1px solid #d4af37", boxShadow: "0 0 12px rgba(212,175,55,0.2)" }}>
            <p className="text-[#d4af37] text-xs mb-0.5">Orphelins</p>
            <p className="text-[10px] text-gray-400"> </p>
            <p className="text-[9px] text-gray-500 mt-0.5">{ORPHELINS.length} numbers</p>
          </button>
        </div>

        {/* Neighbour bet */}
        <div className="mt-4 rounded-xl p-3 text-center" style={{ background: "rgba(0,0,0,0.3)", border: "1px solid #333" }}>
          <p className="text-[#d4af37] text-xs font-bold mb-2">NEIGHBOUR BET</p>
          <p className="text-gray-400 text-[10px] mb-2">Tap a number on the track above to bet on it and its 2 neighbours</p>
        </div>
      </div>

      {/* Navigation */}
      <button onClick={() => setView("table")}
        className="absolute right-0 top-1/2 -translate-y-1/2 text-white font-bold text-[10px] px-1.5 py-6 rounded-l-lg"
        style={{ background: "rgba(80,80,80,0.8)", writingMode: "vertical-rl" }}>
        TABLE
      </button>
    </div>
  );

  // ─── History bar ──────────────────────────────────────────────
  const historyBar = (
    <div className="flex items-center gap-[2px] px-2 py-1 overflow-x-auto" style={{ background: "#1a1a1a" }}>
      {history.length === 0 ? (
        <span className="text-gray-500 text-[10px]">No history yet</span>
      ) : history.slice(0, 12).map((n, i) => (
        <span key={i} className="rounded-sm flex items-center justify-center font-bold text-white shrink-0"
          style={{ width: 22, height: 20, fontSize: 9, background: colorHex(getColor(n)) }}>{n}</span>
      ))}
      <div className="flex-1" />
    </div>
  );

  // ─── Top bar ──────────────────────────────────────────────────
  const topBar = (
    <div className="flex items-center justify-between px-3 py-1.5" style={{ background: "#111" }}>
      <div>
        <span className="text-gray-400 text-[10px]">Balance:</span>
        <span className="text-white font-bold text-xs ml-1">${balance.toFixed(2)}</span>
      </div>
      <div>
        <span className="text-gray-400 text-[10px]">Win & Loss:</span>
        <span className={`font-bold text-xs ml-1 ${winLoss >= 0 ? "text-green-400" : "text-red-400"}`}>
          ${winLoss.toFixed(2)}
        </span>
      </div>
      <button onClick={() => { const on = audio.toggle(); setSoundOn(on); }}
        className="flex items-center justify-center text-white hover:text-[#d4af37] transition-colors w-7 h-7">
        {soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-gray-500" />}
      </button>
      <button onClick={() => navigate("/games")} className="flex items-center gap-1 text-white text-xs hover:text-red-400 transition-colors">
        Exit <X className="w-4 h-4" />
      </button>
    </div>
  );

  // ─── Bottom bar ───────────────────────────────────────────────
  const bottomBar = (
    <div className="flex items-center justify-between px-4 py-2" style={{ background: "#111", borderTop: "1px solid #333" }}>
      <div className="text-center">
        <p className="text-[#d4af37] font-bold text-[10px] uppercase">Your Balance</p>
        <p className="text-white font-bold text-sm">${balance.toFixed(2)}</p>
      </div>
      <div className="text-center">
        <p className="text-white font-bold text-[10px] uppercase">Place Your Bets</p>
        <p className="text-gray-400 text-[10px]">Penny Roulette</p>
      </div>
      <div className="text-center">
        <p className="text-[#d4af37] font-bold text-[10px] uppercase">Total Bet</p>
        <p className="text-white font-bold text-sm">${totalBet.toFixed(2)}</p>
      </div>
    </div>
  );

  // ─── Wheel View ───────────────────────────────────────────────
  const wheelView = (
    <div className="flex-1 flex flex-col items-center justify-center relative" style={{ background: "radial-gradient(ellipse at center, #1a5c1a, #0d3d0d, #082808)" }}>
      {/* PhantomBet logo - LARGE */}
      <div className="flex items-center justify-center gap-3 mb-4 mt-2">
        <img src={phantomLogo} alt="PhantomBet" className="h-14 md:h-20 drop-shadow-lg" style={{ filter: "brightness(1.3)" }} />
        <span className="text-[#d4af37] font-black text-2xl md:text-3xl tracking-wide drop-shadow-lg" style={{ textShadow: "0 2px 8px rgba(0,0,0,0.5)" }}>
          ROULETTE
        </span>
      </div>

      <PennyRouletteWheel spinning={spinning} result={result} size={260} />

      {/* Spin button */}
      <div className="absolute bottom-4 left-4">
        <button onClick={bets.length > 0 ? () => spin() : undefined}
          disabled={spinning || bets.length === 0}
          className="w-16 h-16 rounded-full flex flex-col items-center justify-center text-white font-bold transition-all"
          style={{
            background: spinning ? "radial-gradient(circle, #555, #333)" : "radial-gradient(circle, #f0f0f0, #ccc, #aaa)",
            boxShadow: "0 4px 15px rgba(0,0,0,0.5)", border: "3px solid #0d5d0d",
            opacity: bets.length === 0 && !spinning ? 0.5 : 1,
          }}>
          <RotateCw className={`w-6 h-6 ${spinning ? "animate-spin text-gray-300" : "text-[#0d5d0d]"}`} />
          <span className="text-[8px] font-bold mt-0.5" style={{ color: spinning ? "#999" : "#0d5d0d" }}>SPIN</span>
        </button>
      </div>

      {/* Side tabs */}
      <button onClick={() => setView("table")}
        className="absolute right-0 top-1/2 -translate-y-1/2 text-white font-bold text-[10px] px-1.5 py-6 rounded-l-lg"
        style={{ background: "rgba(80,80,80,0.8)", writingMode: "vertical-rl" }}>
        TABLE
      </button>

      <button onClick={() => setShowChat(!showChat)}
        className="absolute bottom-4 left-24 w-8 h-8 rounded-full flex items-center justify-center"
        style={{ background: "rgba(80,80,80,0.8)" }}>
        <span className="text-white text-lg">☰</span>
      </button>
    </div>
  );

  // ─── Table View ───────────────────────────────────────────────
  const tableView = (
    <div className="flex-1 flex flex-col relative" style={{ background: "radial-gradient(ellipse at center, #1a5c1a, #0d3d0d, #082808)" }}>
      {/* Logo */}
      <div className="flex items-center gap-2 px-3 pt-2 pb-1">
        <img src={phantomLogo} alt="PhantomBet" className="h-8 drop-shadow-lg" style={{ filter: "brightness(1.3)" }} />
        <span className="text-[#d4af37] font-black text-base tracking-wide drop-shadow-lg">ROULETTE</span>
      </div>

      {/* Quick inside/outside combo bets */}
      {quickBets}

      <div className="flex-1 flex px-1 pb-1 gap-1">
        {/* Left side tabs */}
        <div className="flex flex-col gap-1 shrink-0">
          <button onClick={() => setView("wheel")}
            className="text-white font-bold text-[9px] px-1.5 py-6 rounded-r-lg"
            style={{ background: "rgba(80,80,80,0.8)", writingMode: "vertical-rl" }}>
            WHEEL
          </button>
          <button onClick={() => setView("racetrack")}
            className="text-[#d4af37] font-bold text-[9px] px-1.5 py-6 rounded-r-lg"
            style={{ background: "rgba(80,80,80,0.8)", writingMode: "vertical-rl" }}>
            TRACK
          </button>
          <div className="text-center text-[8px] text-white mt-1 space-y-0.5">
            <p className="font-bold">MIN</p>
            <p className="text-[#d4af37]">$0.10</p>
            <p className="font-bold mt-1">MAX</p>
            <p className="text-[#d4af37]">$50</p>
          </div>
        </div>

        {/* Main betting table */}
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="flex gap-[1px]">
            {/* Outside bets LEFT column */}
            <div className="flex flex-col gap-[1px] shrink-0" style={{ width: 28 }}>
              {outsideBtn("1-18", { kind: "low" })}
              {outsideBtn("1st 12", { kind: "dozen", dozen: 1 })}
              {outsideBtn("Even", { kind: "even" })}
              {outsideBtn("", { kind: "red" }, "#8b1a1a",
                <span className="text-red-400 text-base">◆</span>
              )}
              {outsideBtn("2nd 12", { kind: "dozen", dozen: 2 })}
              {outsideBtn("", { kind: "black" }, "#1a1a1a",
                <span className="text-gray-300 text-base">◆</span>
              )}
              {outsideBtn("Odd", { kind: "odd" })}
              {outsideBtn("3rd 12", { kind: "dozen", dozen: 3 })}
              {outsideBtn("19-36", { kind: "high" })}
            </div>

            {/* Number grid */}
            <div className="flex-1 flex flex-col gap-[1px]">
              {(() => {
                const zeroAmount = getBetTotal(b => b.type.kind === "straight" && b.type.number === 0);
                return (
                  <button onClick={() => placeBet({ kind: "straight", number: 0 }, "0")}
                    className="relative w-full text-white font-bold border border-[#333]/50 hover:brightness-125"
                    style={{ background: "#0a6e2e", fontSize: 14, padding: "4px 0" }}>
                    0
                    {chipOverlay(zeroAmount)}
                  </button>
                );
              })()}
              <div className="grid grid-cols-3 gap-[1px]">
                {Array.from({ length: 12 }, (_, row) =>
                  [1, 2, 3].map(col => numCell(row * 3 + col))
                )}
              </div>
              <div className="grid grid-cols-3 gap-[1px] mt-[1px]">
                {[1, 2, 3].map(col => {
                  const betAmount = getBetTotal(b => b.type.kind === "column" && b.type.column === col);
                  return (
                    <button key={col} onClick={() => placeBet({ kind: "column", column: col as 1|2|3 }, `Col${col}`)}
                      className="relative text-white font-bold border border-[#333]/50 hover:brightness-125 active:scale-95"
                      style={{ background: "#0d3d0d", fontSize: 10, padding: "3px 0" }}>
                      2to1
                      {chipOverlay(betAmount)}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Right side - chips stack with neon glow */}
        <div className="flex flex-col items-center gap-1.5 shrink-0 justify-end pb-4 pl-1">
          {[...CHIP_VALUES].reverse().map(v => {
            const chip = CHIP_COLORS[v];
            const isSelected = selectedChip === v;
            return (
              <button key={v} onClick={() => setSelectedChip(v)}
                className="rounded-full flex items-center justify-center font-black transition-all"
                style={{
                  width: 42, height: 42,
                  fontSize: 10,
                  background: chip.bg,
                  color: chip.text,
                  border: isSelected ? "3px solid #d4af37" : "3px solid rgba(255,255,255,0.15)",
                  boxShadow: isSelected
                    ? `0 0 16px rgba(212,175,55,0.8), ${chip.glow}, 0 4px 8px rgba(0,0,0,0.4)`
                    : `${chip.glow}, 0 2px 6px rgba(0,0,0,0.4)`,
                  transform: isSelected ? "scale(1.2)" : "scale(1)",
                }}>
                {chip.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Spin button */}
      <div className="absolute bottom-2 left-2">
        <button onClick={bets.length > 0 ? () => spin() : undefined}
          disabled={spinning || bets.length === 0}
          className="w-14 h-14 rounded-full flex flex-col items-center justify-center font-bold transition-all"
          style={{
            background: spinning ? "radial-gradient(circle, #555, #333)" : "radial-gradient(circle, #f0f0f0, #ccc, #aaa)",
            boxShadow: "0 4px 15px rgba(0,0,0,0.5)", border: "3px solid #0d5d0d",
            opacity: bets.length === 0 && !spinning ? 0.5 : 1,
          }}>
          <RotateCw className={`w-5 h-5 ${spinning ? "animate-spin text-gray-300" : "text-[#0d5d0d]"}`} />
          <span className="text-[7px] font-bold mt-0.5" style={{ color: spinning ? "#999" : "#0d5d0d" }}>SPIN</span>
        </button>
      </div>

      {/* Action buttons - BIGGER with better colors */}
      {lastBets.length > 0 && !spinning && bets.length === 0 && (
        <div className="absolute bottom-2 right-14 flex gap-2">
          <button onClick={rebet}
            className="px-4 py-2.5 rounded-lg text-xs font-black text-white uppercase tracking-wide transition-all hover:brightness-125"
            style={{ background: "linear-gradient(135deg, #2e86c1, #1a5276)", boxShadow: "0 0 10px rgba(46,134,193,0.4), 0 2px 6px rgba(0,0,0,0.4)" }}>
            REBET
          </button>
          <button onClick={respin}
            className="px-4 py-2.5 rounded-lg text-xs font-black text-black uppercase tracking-wide transition-all hover:brightness-125"
            style={{ background: "linear-gradient(135deg, #d4af37, #f0c040)", boxShadow: "0 0 12px rgba(212,175,55,0.5), 0 2px 6px rgba(0,0,0,0.4)" }}>
            RESPIN
          </button>
        </div>
      )}
      {bets.length > 0 && !spinning && (
        <div className="absolute bottom-2 right-14 flex gap-2">
          <button onClick={clearBets}
            className="px-4 py-2.5 rounded-lg text-xs font-black text-white uppercase tracking-wide transition-all hover:brightness-125"
            style={{ background: "linear-gradient(135deg, #c0392b, #922b21)", boxShadow: "0 0 10px rgba(192,57,43,0.4), 0 2px 6px rgba(0,0,0,0.4)" }}>
            CLEAR
          </button>
        </div>
      )}

      {/* Chat toggle */}
      <button onClick={() => setShowChat(!showChat)}
        className="absolute bottom-2 left-20 w-7 h-7 rounded-full flex items-center justify-center"
        style={{ background: "rgba(80,80,80,0.8)" }}>
        <span className="text-white text-sm">☰</span>
      </button>
    </div>
  );

  return (
    <AuthGuard>
      <style>{`
        @keyframes neonPulse {
          0%, 100% { box-shadow: 0 0 6px rgba(212,175,55,0.6), 0 0 3px rgba(212,175,55,0.3); }
          50% { box-shadow: 0 0 12px rgba(212,175,55,0.9), 0 0 6px rgba(212,175,55,0.5); }
        }
      `}</style>
      <div className="h-screen flex flex-col overflow-hidden" style={{ background: "#0d3d0d" }}>
        <AnimatePresence>
          {splashData !== null && <ResultSplash resultNumber={splashData.resultNumber} netAmount={splashData.netAmount} onClose={() => setSplashData(null)} />}
        </AnimatePresence>

        {topBar}
        {historyBar}

        <div className="flex-1 flex flex-col min-h-0 relative">
          <AnimatePresence mode="wait">
            {view === "wheel" ? (
              <motion.div key="wheel" className="flex-1 flex flex-col"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
                {wheelView}
              </motion.div>
            ) : view === "racetrack" ? (
              <motion.div key="racetrack" className="flex-1 flex flex-col"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
                {racetrackView}
              </motion.div>
            ) : (
              <motion.div key="table" className="flex-1 flex flex-col"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
                {tableView}
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {showChat && (
              <motion.div className="absolute inset-0 z-40 bg-black/80 flex flex-col"
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}>
                <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700">
                  <span className="text-white font-bold text-sm">Chat</span>
                  <button onClick={() => setShowChat(false)} className="text-white"><X className="w-5 h-5" /></button>
                </div>
                <div className="flex-1 min-h-0">
                  <GameChat gameRoom="penny-roulette" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {bottomBar}
        {!showChat && (
          <ChatPopupOverlay gameRoom="penny-roulette" positionClassName="absolute left-2 right-2 bottom-20 z-30" />
        )}
      </div>
    </AuthGuard>
  );
}
