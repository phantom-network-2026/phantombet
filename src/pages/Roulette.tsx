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

const CHIP_VALUES = [0.20, 0.50, 1, 5];

// ─── Wheel ──────────────────────────────────────────────────────
function RouletteWheel({ spinning, result, size = 130 }: { spinning: boolean; result: number | null; size?: number }) {
  const targetAngle = result !== null
    ? -(WHEEL_ORDER.indexOf(result) * SEGMENT_ANGLE)
    : 0;
  const spinRotation = 360 * 5 + targetAngle;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <div className="absolute inset-0 rounded-full"
        style={{
          background: "linear-gradient(135deg, hsl(43,80%,55%), hsl(43,70%,35%), hsl(43,80%,55%))",
          boxShadow: "0 0 15px hsl(43,80%,50%,0.3)",
        }}
      />
      <motion.div
        className="absolute rounded-full overflow-hidden"
        style={{ inset: size * 0.03, background: "hsl(140,30%,18%)" }}
        animate={{ rotate: spinning ? spinRotation : targetAngle }}
        transition={spinning ? { duration: 4, ease: [0.12, 0.8, 0.3, 1] } : { duration: 0 }}
      >
        {WHEEL_ORDER.map((num, i) => {
          const angle = i * SEGMENT_ANGLE;
          const segW = Math.max(12, size * 0.06);
          const segH = Math.max(14, size * 0.1);
          return (
            <div key={num} className="absolute top-0 left-1/2 origin-bottom h-1/2"
              style={{ width: 1, transform: `rotate(${angle}deg) translateX(-50%)` }}>
              <div className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center rounded-sm"
                style={{
                  top: size * 0.04,
                  width: segW,
                  height: segH,
                  background: colorHsl(getColor(num)),
                  fontSize: Math.max(6, size * 0.04),
                }}>
                <span className="font-bold text-white leading-none">{num}</span>
              </div>
            </div>
          );
        })}
        <div className="absolute rounded-full"
          style={{
            inset: "32%",
            background: "radial-gradient(circle, hsl(30,50%,45%), hsl(30,40%,25%))",
          }}
        />
      </motion.div>
      <div className="absolute left-1/2 -translate-x-1/2 z-10" style={{ top: -2 }}>
        <div className="w-0 h-0"
          style={{
            borderLeft: "5px solid transparent",
            borderRight: "5px solid transparent",
            borderTop: "10px solid hsl(43,80%,55%)",
          }}
        />
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
        style={{
          background: "radial-gradient(ellipse, hsl(43,80%,15%), hsl(0,0%,5%))",
          border: "2px solid hsl(43,80%,50%)",
          boxShadow: "0 0 60px hsl(43,80%,50%,0.4)",
        }}
        initial={{ scale: 0.3, y: 50 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.3, opacity: 0 }}
        transition={{ type: "spring", damping: 12 }}>
        <p className="text-xs text-[hsl(43,80%,60%)] font-semibold mb-2 uppercase tracking-wider">Ball landed on</p>
        <motion.div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center text-2xl font-black text-white mb-3"
          style={{ background: colorHsl(color), boxShadow: `0 0 20px ${colorHsl(color)}` }}
          initial={{ scale: 0 }} animate={{ scale: [0, 1.3, 1] }}
          transition={{ delay: 0.15, duration: 0.4 }}>
          {resultNumber}
        </motion.div>
        <motion.div className="text-xs font-semibold mb-1" style={{ color: "hsl(43,80%,60%)" }}>
          {color.toUpperCase()} {resultNumber}
        </motion.div>
        {isWin ? (
          <>
            <motion.div className="text-5xl mb-1" animate={{ rotate: [0, -10, 10, -5, 5, 0] }}
              transition={{ duration: 0.6, delay: 0.3 }}>🎉</motion.div>
            <p className="text-sm text-[hsl(43,80%,60%)] font-semibold">YOU WON</p>
            <motion.p className="text-4xl font-black"
              style={{ color: "hsl(140,70%,50%)", textShadow: "0 0 20px hsl(140,70%,50%,0.5)" }}
              initial={{ scale: 0 }} animate={{ scale: [0, 1.2, 1] }}
              transition={{ delay: 0.2, duration: 0.5 }}>
              +${netAmount.toFixed(2)}
            </motion.p>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground font-semibold mt-2">Better luck next time!</p>
            <motion.p className="text-2xl font-bold mt-1"
              style={{ color: "hsl(0,70%,55%)" }}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}>
              -${Math.abs(netAmount).toFixed(2)}
            </motion.p>
          </>
        )}
        <p className="text-xs text-muted-foreground mt-3">Tap to continue</p>
      </motion.div>
    </motion.div>
  );
}

// ─── Main ───────────────────────────────────────────────────────
export default function Roulette() {
  const { user, profile, refreshProfile } = useAuth();
  const [bets, setBets] = useState<PlacedBet[]>([]);
  const [selectedChip, setSelectedChip] = useState(0.20);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<number | null>(null);
  const [splashData, setSplashData] = useState<{ resultNumber: number; netAmount: number } | null>(null);
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
    setSplashData(null);

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
    setSplashData({ resultNumber: winningNumber, netAmount });
    setSpinning(false);
    setBets([]);
  };

  const getBetTotal = (filter: (b: PlacedBet) => boolean) =>
    bets.filter(filter).reduce((s, b) => s + b.amount, 0);

  const chipOverlay = (amount: number) => {
    if (amount <= 0) return null;
    const label = amount < 1 ? `${Math.round(amount * 100)}¢` : `$${amount.toFixed(0)}`;
    return (
      <span className="absolute -top-1 -right-1 z-10 min-w-[14px] h-[14px] rounded-full flex items-center justify-center text-[6px] font-black text-[hsl(0,0%,15%)] pointer-events-none"
        style={{
          background: "radial-gradient(circle, hsl(43,80%,60%), hsl(43,70%,40%))",
          boxShadow: "0 0 4px hsl(43,80%,50%,0.6)",
          border: "1px solid hsl(43,80%,70%)",
        }}>
        {label}
      </span>
    );
  };

  const numCell = (num: number) => {
    const betAmount = getBetTotal(b => b.type.kind === "straight" && b.type.number === num);
    return (
      <button key={num} onClick={() => placeBet({ kind: "straight", number: num }, `${num}`)}
        className="relative flex items-center justify-center text-white font-bold rounded-[2px] border border-white/20 hover:brightness-125 active:scale-95 transition-all"
        style={{ background: colorHsl(getColor(num)), fontSize: 10, padding: "3px 0" }}>
        {num}
        {chipOverlay(betAmount)}
      </button>
    );
  };

  const outsideBtn = (label: string, type: BetType, bg?: string) => {
    const betAmount = getBetTotal(b => JSON.stringify(b.type) === JSON.stringify(type));
    return (
      <button onClick={() => placeBet(type, label)}
        className="relative text-white font-bold border border-white/20 hover:brightness-125 active:scale-95 transition-all text-center leading-tight"
        style={{ background: bg || "hsl(140,30%,22%)", fontSize: 8, padding: "2px 1px" }}>
        {label}
        {chipOverlay(betAmount)}
      </button>
    );
  };

  return (
    <AuthGuard>
      <div className="min-h-screen gradient-casino-bg pb-20 md:pb-4">
        <Header />
        <AnimatePresence>
          {splashData !== null && <ResultSplash resultNumber={splashData.resultNumber} netAmount={splashData.netAmount} onClose={() => setSplashData(null)} />}
        </AnimatePresence>

        <div className="px-2 py-1 max-w-lg mx-auto space-y-1.5">
          {/* Balance bar */}
          <div className="flex items-center justify-between text-[10px]">
            <span className="px-2 py-0.5 rounded-full bg-secondary/80 border border-border">
              <span className="text-muted-foreground">Bal </span>
              <span className="font-bold text-[hsl(var(--casino-gold))]">${balance.toFixed(2)}</span>
            </span>
            <span className="px-2 py-0.5 rounded-full bg-secondary/80 border border-border">
              <span className="text-muted-foreground">Bet </span>
              <span className="font-bold text-foreground">${totalBet.toFixed(2)}</span>
            </span>
          </div>

          {/* GAME AREA: Wheel left + Table right — side by side like the reference */}
          <div className="rounded-xl p-2"
            style={{
              background: "linear-gradient(180deg, hsl(80,30%,28%), hsl(80,25%,20%))",
              border: "1px solid hsl(43,50%,35%)",
            }}>
            <div className="flex gap-2 items-start">
              {/* LEFT: Wheel + chips */}
              <div className="flex flex-col items-center gap-2 shrink-0">
                <RouletteWheel spinning={spinning} result={result} size={130} />
                {/* Result badge */}
                {result !== null && !spinning && (
                  <motion.span initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }}
                    className="px-2 py-0.5 rounded-full font-bold text-white text-xs"
                    style={{ background: colorHsl(getColor(result)) }}>
                    {result}
                  </motion.span>
                )}
                {/* Chips */}
                <div className="flex gap-1">
                  {CHIP_VALUES.map(v => {
                    const chipLabel = v < 1 ? `${Math.round(v * 100)}¢` : `$${v}`;
                    const chipBg = v === 0.20 ? "radial-gradient(circle, hsl(0,0%,95%), hsl(0,0%,70%))"
                      : v === 0.50 ? "radial-gradient(circle, hsl(210,70%,55%), hsl(210,70%,35%))"
                      : v === 1 ? "radial-gradient(circle, hsl(280,50%,55%), hsl(280,50%,35%))"
                      : "radial-gradient(circle, hsl(43,75%,50%), hsl(43,65%,35%))";
                    const chipColor = v === 0.20 ? "hsl(0,0%,15%)" : "white";
                    return (
                      <button key={v} onClick={() => setSelectedChip(v)}
                        className="rounded-full flex items-center justify-center font-bold transition-transform"
                        style={{
                          width: 28, height: 28,
                          fontSize: 8,
                          background: chipBg,
                          color: chipColor,
                          border: selectedChip === v ? "2px solid hsl(43,80%,55%)" : "2px solid hsl(0,0%,30%)",
                          boxShadow: selectedChip === v ? "0 0 8px hsl(43,80%,50%,0.5)" : "none",
                          transform: selectedChip === v ? "scale(1.15)" : "scale(1)",
                        }}>
                        {chipLabel}
                      </button>
                    );
                  })}
                </div>
                {/* History */}
                {history.length > 0 && (
                  <div className="flex gap-[2px] flex-wrap justify-center max-w-[130px]">
                    {history.slice(0, 10).map((n, i) => (
                      <span key={i} className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-[6px] font-bold text-white"
                        style={{ background: colorHsl(getColor(n)) }}>{n}</span>
                    ))}
                  </div>
                )}
              </div>

              {/* RIGHT: Betting table — matching reference layout */}
              <div className="flex-1 min-w-0">
                {/* Zero at top spanning full width */}
                <button onClick={() => placeBet({ kind: "straight", number: 0 }, "0")}
                  className="w-full py-1 rounded-t-md text-white font-bold text-xs border border-white/20 hover:brightness-125 mb-[2px]"
                  style={{ background: "hsl(140,60%,30%)" }}>0</button>

                {/* Main layout: outside-left | numbers | 2:1 right */}
                <div className="flex gap-[2px]">
                  {/* Outside bets LEFT column: 1-18, 1st12, EVEN, ◆red, 2nd12, ◆blk, ODD, 3rd12, 19-36 */}
                  <div className="flex flex-col gap-[2px] shrink-0" style={{ width: 22 }}>
                    {outsideBtn("1-18", { kind: "low" })}
                    {outsideBtn("1st", { kind: "dozen", dozen: 1 })}
                    {outsideBtn("EVN", { kind: "even" })}
                    {outsideBtn("◆", { kind: "red" }, "hsl(0,65%,42%)")}
                    {outsideBtn("2nd", { kind: "dozen", dozen: 2 })}
                    {outsideBtn("◆", { kind: "black" }, "hsl(0,0%,15%)")}
                    {outsideBtn("ODD", { kind: "odd" })}
                    {outsideBtn("3rd", { kind: "dozen", dozen: 3 })}
                    {outsideBtn("19+", { kind: "high" })}
                  </div>

                  {/* Number grid 12 rows × 3 cols */}
                  <div className="flex-1 grid grid-cols-3 gap-[2px]">
                    {Array.from({ length: 12 }, (_, row) =>
                      [1, 2, 3].map(col => numCell(row * 3 + col))
                    )}
                  </div>

                  {/* 2:1 column bets RIGHT */}
                  <div className="flex flex-col shrink-0" style={{ width: 20 }}>
                    <button onClick={() => placeBet({ kind: "column", column: 1 }, "Col1")}
                      className="flex-1 text-white font-bold border border-white/20 hover:brightness-125 active:scale-95"
                      style={{ background: "hsl(140,30%,22%)", fontSize: 7, writingMode: "vertical-rl" }}>
                      2to1
                    </button>
                    <button onClick={() => placeBet({ kind: "column", column: 2 }, "Col2")}
                      className="flex-1 text-white font-bold border border-white/20 hover:brightness-125 active:scale-95 mt-[2px]"
                      style={{ background: "hsl(140,30%,22%)", fontSize: 7, writingMode: "vertical-rl" }}>
                      2to1
                    </button>
                    <button onClick={() => placeBet({ kind: "column", column: 3 }, "Col3")}
                      className="flex-1 text-white font-bold border border-white/20 hover:brightness-125 active:scale-95 mt-[2px]"
                      style={{ background: "hsl(140,30%,22%)", fontSize: 7, writingMode: "vertical-rl" }}>
                      2to1
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Controls row */}
          <div className="flex items-center justify-between">
            <div className="flex gap-1">
              <Button variant="outline" size="icon" className="h-7 w-7" onClick={clearBets} disabled={spinning || bets.length === 0}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
            <Button variant="gold" className="px-6 h-8 text-xs" onClick={spin} disabled={spinning || bets.length === 0}>
              {spinning && <RotateCw className="h-3 w-3 animate-spin mr-1" />}
              {spinning ? "Spinning..." : "SPIN"}
            </Button>
          </div>

          {/* Active bets */}
          {bets.length > 0 && (
            <div className="flex flex-wrap gap-0.5">
              {bets.map((b, i) => (
                <span key={i} className="px-1.5 py-0.5 rounded-full bg-secondary text-[9px] text-muted-foreground">
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
