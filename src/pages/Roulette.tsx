import { useState, useCallback, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { AuthGuard } from "@/components/casino/AuthGuard";
import { Header } from "@/components/casino/Header";
import { BottomNav } from "@/components/casino/BottomNav";
import { GameChat } from "@/components/casino/GameChat";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { RotateCw, Trash2 } from "lucide-react";
import { toast } from "sonner";

// ─── European roulette wheel order ──────────────────────────────
const WHEEL_ORDER = [
  0,32,15,19,4,21,2,25,17,34,6,27,13,36,11,30,8,23,10,5,24,16,33,1,20,14,31,9,22,18,29,7,28,12,35,3,26
];
const SEGMENT_ANGLE = 360 / 37;

const RED_NUMBERS = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36];

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

function colorHsl(c: "green" | "red" | "black") {
  return c === "green" ? "hsl(140,60%,30%)" : c === "red" ? "hsl(0,65%,42%)" : "hsl(0,0%,15%)";
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

const CHIP_VALUES = [1, 2, 5];

// ─── Wheel ──────────────────────────────────────────────────────
function RouletteWheel({ spinning, result, size = 160 }: { spinning: boolean; result: number | null; size?: number }) {
  // The pointer is at the TOP of the wheel (12 o'clock).
  // Segment i sits at angle (i * SEGMENT_ANGLE) clockwise from 12 o'clock.
  // To land segment i under the pointer, rotate the wheel by -(i * SEGMENT_ANGLE).
  const targetAngle = result !== null
    ? -(WHEEL_ORDER.indexOf(result) * SEGMENT_ANGLE)
    : 0;

  // Add multiple full rotations for spinning effect
  const spinRotation = 360 * 5 + targetAngle;

  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      {/* Gold ring */}
      <div className="absolute inset-0 rounded-full"
        style={{
          background: "linear-gradient(135deg, hsl(43,80%,55%), hsl(43,70%,35%), hsl(43,80%,55%))",
          boxShadow: "0 0 20px hsl(43,80%,50%,0.3)",
        }}
      />
      {/* Spinning face */}
      <motion.div
        className="absolute rounded-full overflow-hidden"
        style={{ inset: size * 0.03, background: "hsl(140,30%,18%)" }}
        animate={{ rotate: spinning ? spinRotation : targetAngle }}
        transition={spinning
          ? { duration: 4, ease: [0.12, 0.8, 0.3, 1] }
          : { duration: 0 }
        }
      >
        {/* Segments */}
        {WHEEL_ORDER.map((num, i) => {
          const angle = i * SEGMENT_ANGLE;
          const innerR = size * 0.35;
          const segW = Math.max(14, size * 0.06);
          const segH = Math.max(18, size * 0.11);
          return (
            <div key={num} className="absolute top-0 left-1/2 origin-bottom h-1/2"
              style={{ width: 1, transform: `rotate(${angle}deg) translateX(-50%)` }}>
              <div className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center rounded-sm"
                style={{
                  top: size * 0.04,
                  width: segW,
                  height: segH,
                  background: colorHsl(getColor(num)),
                  fontSize: Math.max(7, size * 0.04),
                }}>
                <span className="font-bold text-white leading-none">{num}</span>
              </div>
            </div>
          );
        })}
        {/* Hub */}
        <div className="absolute rounded-full"
          style={{
            inset: "32%",
            background: "radial-gradient(circle, hsl(30,50%,45%), hsl(30,40%,25%))",
          }}
        />
      </motion.div>
      {/* Pointer at top */}
      <div className="absolute left-1/2 -translate-x-1/2 z-10" style={{ top: -2 }}>
        <div className="w-0 h-0"
          style={{
            borderLeft: "6px solid transparent",
            borderRight: "6px solid transparent",
            borderTop: "12px solid hsl(43,80%,55%)",
          }}
        />
      </div>
    </div>
  );
}

// ─── Win Splash ─────────────────────────────────────────────────
function WinSplash({ amount, onClose }: { amount: number; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div className="text-center p-6 rounded-2xl"
        style={{
          background: "radial-gradient(ellipse, hsl(43,80%,15%), hsl(0,0%,5%))",
          border: "2px solid hsl(43,80%,50%)",
          boxShadow: "0 0 60px hsl(43,80%,50%,0.4)",
        }}
        initial={{ scale: 0.3, y: 50 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.3, opacity: 0 }}
        transition={{ type: "spring", damping: 12 }}>
        <motion.div className="text-5xl mb-1" animate={{ rotate: [0, -10, 10, -5, 5, 0] }}
          transition={{ duration: 0.6, delay: 0.3 }}>🎉</motion.div>
        <p className="text-sm text-[hsl(43,80%,60%)] font-semibold">YOU WON</p>
        <motion.p className="text-4xl font-black"
          style={{ color: "hsl(43,80%,55%)", textShadow: "0 0 20px hsl(43,80%,50%,0.5)" }}
          initial={{ scale: 0 }} animate={{ scale: [0, 1.2, 1] }}
          transition={{ delay: 0.2, duration: 0.5 }}>
          ${amount.toFixed(2)}
        </motion.p>
        <p className="text-xs text-muted-foreground mt-2">Tap to continue</p>
      </motion.div>
    </motion.div>
  );
}

// ─── Main ───────────────────────────────────────────────────────
export default function Roulette() {
  const { user, profile, refreshProfile } = useAuth();
  const [bets, setBets] = useState<PlacedBet[]>([]);
  const [selectedChip, setSelectedChip] = useState(1);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<number | null>(null);
  const [winAmount, setWinAmount] = useState<number | null>(null);
  const [history, setHistory] = useState<number[]>([]);

  const totalBet = bets.reduce((s, b) => s + b.amount, 0);
  const balance = profile?.balance ?? 0;

  const placeBet = useCallback((type: BetType, label: string) => {
    if (spinning) return;
    if (totalBet + selectedChip > balance) { toast.error("Insufficient balance"); return; }
    if (totalBet + selectedChip > 5) { toast.error("Maximum total bet is $5"); return; }
    setBets((prev) => [...prev, { type, amount: selectedChip, label }]);
  }, [spinning, selectedChip, totalBet, balance]);

  const clearBets = () => { if (!spinning) setBets([]); };

  const spin = async () => {
    if (!user || spinning || bets.length === 0) return;
    setSpinning(true);
    setResult(null);
    setWinAmount(null);

    const winningNumber = Math.floor(Math.random() * 37);
    let netAmount = 0;
    for (const bet of bets) netAmount += bet.amount * calculatePayout(bet.type, winningNumber);

    setResult(winningNumber);
    await new Promise((r) => setTimeout(r, 4500));

    try {
      const { error } = await supabase.functions.invoke("game-settle", {
        body: { userId: user.id, amount: netAmount, gameType: "roulette",
          outcome: `Number ${winningNumber} (${getColor(winningNumber)})` },
      });
      if (error) throw error;
      await refreshProfile();
    } catch { toast.error("Failed to settle bet"); }

    setHistory((prev) => [winningNumber, ...prev.slice(0, 14)]);
    if (netAmount > 0) setWinAmount(netAmount);
    setSpinning(false);
    setBets([]);
  };

  // Bet button helper
  const betBtn = (bg: string, label: string, type: BetType) => (
    <button onClick={() => placeBet(type, label)}
      className="py-1.5 rounded text-[10px] font-bold text-white border border-white/20 hover:brightness-125 active:scale-95 transition-all"
      style={{ background: bg }}>
      {label}
    </button>
  );

  // Number cell
  const cell = (num: number) => {
    const hasBet = bets.some(b => b.type.kind === "straight" && b.type.number === num);
    return (
      <button key={num} onClick={() => placeBet({ kind: "straight", number: num }, `${num}`)}
        className="relative flex items-center justify-center text-white font-bold text-[11px] rounded-[3px] border border-white/20 hover:brightness-125 active:scale-95 transition-all aspect-[4/3]"
        style={{ background: colorHsl(getColor(num)) }}>
        {num}
        {hasBet && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[hsl(var(--casino-gold))]" />}
      </button>
    );
  };

  return (
    <AuthGuard>
      <div className="min-h-screen gradient-casino-bg pb-20 md:pb-4">
        <Header />
        <AnimatePresence>
          {winAmount !== null && <WinSplash amount={winAmount} onClose={() => setWinAmount(null)} />}
        </AnimatePresence>

        <div className="px-2 py-2 max-w-lg mx-auto space-y-2">
          {/* Top bar: balance + bet */}
          <div className="flex items-center justify-between text-xs">
            <span className="px-2 py-1 rounded-full bg-secondary/80 border border-border">
              <span className="text-muted-foreground">Bal </span>
              <span className="font-bold text-[hsl(var(--casino-gold))]">${balance.toFixed(2)}</span>
            </span>
            <span className="px-2 py-1 rounded-full bg-secondary/80 border border-border">
              <span className="text-muted-foreground">Bet </span>
              <span className="font-bold text-foreground">${totalBet.toFixed(2)}</span>
            </span>
          </div>

          {/* Main game area — wheel left, table right on wider; stacked on narrow */}
          <div className="flex flex-col items-center gap-2">
            {/* Wheel + result */}
            <div className="flex flex-col items-center gap-1">
              <RouletteWheel spinning={spinning} result={result} size={150} />
              {/* Last result badge */}
              {result !== null && !spinning && (
                <motion.span initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }}
                  className="inline-block px-3 py-0.5 rounded-full font-bold text-white text-sm"
                  style={{ background: colorHsl(getColor(result)), boxShadow: "0 0 10px hsl(0,0%,0%,0.4)" }}>
                  {result}
                </motion.span>
              )}
              {/* History */}
              {history.length > 0 && (
                <div className="flex gap-0.5 flex-wrap justify-center">
                  {history.map((n, i) => (
                    <span key={i} className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white"
                      style={{ background: colorHsl(getColor(n)) }}>{n}</span>
                  ))}
                </div>
              )}
            </div>

            {/* Betting Table */}
            <div className="w-full rounded-lg p-1.5"
              style={{
                background: "linear-gradient(180deg, hsl(140,35%,18%), hsl(140,30%,12%))",
                border: "1px solid hsl(43,50%,35%)",
              }}>
              {/* Zero */}
              <div className="mb-0.5">
                <button onClick={() => placeBet({ kind: "straight", number: 0 }, "0")}
                  className="w-full py-1 rounded-[3px] text-white font-bold text-xs border border-white/20 hover:brightness-125"
                  style={{ background: "hsl(140,60%,30%)" }}>0</button>
              </div>

              {/* Number grid: 12 rows × 3 cols, matching reference (3,2,1 | 6,5,4 ...) */}
              <div className="grid grid-cols-3 gap-[2px] mb-0.5">
                {Array.from({ length: 12 }, (_, row) =>
                  [3, 2, 1].map(col => cell(row * 3 + col))
                )}
              </div>

              {/* 2 to 1 (columns) */}
              <div className="grid grid-cols-3 gap-[2px] mb-0.5">
                {betBtn("hsl(140,30%,22%)", "2:1", { kind: "column", column: 3 })}
                {betBtn("hsl(140,30%,22%)", "2:1", { kind: "column", column: 2 })}
                {betBtn("hsl(140,30%,22%)", "2:1", { kind: "column", column: 1 })}
              </div>

              {/* Dozens */}
              <div className="grid grid-cols-3 gap-[2px] mb-0.5">
                {betBtn("hsl(140,30%,22%)", "1st 12", { kind: "dozen", dozen: 1 })}
                {betBtn("hsl(140,30%,22%)", "2nd 12", { kind: "dozen", dozen: 2 })}
                {betBtn("hsl(140,30%,22%)", "3rd 12", { kind: "dozen", dozen: 3 })}
              </div>

              {/* Outside bets row */}
              <div className="grid grid-cols-6 gap-[2px]">
                {betBtn("hsl(140,30%,22%)", "1-18", { kind: "low" })}
                {betBtn("hsl(140,30%,22%)", "EVEN", { kind: "even" })}
                {betBtn("hsl(0,65%,42%)", "◆", { kind: "red" })}
                {betBtn("hsl(0,0%,15%)", "◆", { kind: "black" })}
                {betBtn("hsl(140,30%,22%)", "ODD", { kind: "odd" })}
                {betBtn("hsl(140,30%,22%)", "19-36", { kind: "high" })}
              </div>
            </div>
          </div>

          {/* Chips + controls */}
          <div className="flex items-center justify-between">
            <div className="flex gap-1.5">
              {CHIP_VALUES.map(v => (
                <button key={v} onClick={() => setSelectedChip(v)}
                  className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs transition-transform"
                  style={{
                    background: v === 1 ? "radial-gradient(circle, hsl(0,0%,95%), hsl(0,0%,70%))"
                      : v === 2 ? "radial-gradient(circle, hsl(210,70%,55%), hsl(210,70%,35%))"
                      : "radial-gradient(circle, hsl(280,50%,55%), hsl(280,50%,35%))",
                    color: v === 1 ? "hsl(0,0%,15%)" : "white",
                    border: selectedChip === v ? "3px solid hsl(43,80%,55%)" : "2px solid hsl(0,0%,30%)",
                    boxShadow: selectedChip === v ? "0 0 10px hsl(43,80%,50%,0.5)" : "none",
                    transform: selectedChip === v ? "scale(1.15)" : "scale(1)",
                  }}>
                  ${v}
                </button>
              ))}
            </div>
            <div className="flex gap-1.5">
              <Button variant="outline" size="icon" className="h-9 w-9" onClick={clearBets} disabled={spinning || bets.length === 0}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
              <Button variant="gold" className="px-5 h-9 text-sm" onClick={spin} disabled={spinning || bets.length === 0}>
                {spinning && <RotateCw className="h-3.5 w-3.5 animate-spin mr-1" />}
                {spinning ? "Spinning..." : "SPIN"}
              </Button>
            </div>
          </div>

          {/* Active bets */}
          {bets.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {bets.map((b, i) => (
                <span key={i} className="px-1.5 py-0.5 rounded-full bg-secondary text-[10px] text-muted-foreground">
                  ${b.amount} {b.label}
                </span>
              ))}
            </div>
          )}

          {/* Chat */}
          <GameChat gameRoom="roulette" />
        </div>
        <BottomNav />
      </div>
    </AuthGuard>
  );
}
