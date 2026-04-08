import { useState, useCallback, useRef, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { AuthGuard } from "@/components/casino/AuthGuard";
import { Header } from "@/components/casino/Header";
import { BottomNav } from "@/components/casino/BottomNav";
import { GameChat } from "@/components/casino/GameChat";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { RotateCw, Trash2, Volume2 } from "lucide-react";
import { toast } from "sonner";

// ─── Roulette data ───────────────────────────────────────────────
const NUMBERS = [
  0,32,15,19,4,21,2,25,17,34,6,27,13,36,11,30,8,23,10,5,24,16,33,1,20,14,31,9,22,18,29,7,28,12,35,3,26
];

const RED_NUMBERS = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36];
const BLACK_NUMBERS = [2,4,6,8,10,11,13,15,17,20,22,24,26,28,29,31,33,35];

type BetType =
  | { kind: "straight"; number: number }
  | { kind: "red" }
  | { kind: "black" }
  | { kind: "odd" }
  | { kind: "even" }
  | { kind: "low" }
  | { kind: "high" }
  | { kind: "dozen"; dozen: 1 | 2 | 3 }
  | { kind: "column"; column: 1 | 2 | 3 };

interface PlacedBet {
  type: BetType;
  amount: number;
  label: string;
}

function getColor(n: number): "green" | "red" | "black" {
  if (n === 0) return "green";
  return RED_NUMBERS.includes(n) ? "red" : "black";
}

function calculatePayout(bet: BetType, result: number): number {
  switch (bet.kind) {
    case "straight": return bet.number === result ? 35 : -1;
    case "red": return RED_NUMBERS.includes(result) ? 1 : -1;
    case "black": return BLACK_NUMBERS.includes(result) ? 1 : -1;
    case "odd": return result > 0 && result % 2 === 1 ? 1 : -1;
    case "even": return result > 0 && result % 2 === 0 ? 1 : -1;
    case "low": return result >= 1 && result <= 18 ? 1 : -1;
    case "high": return result >= 19 && result <= 36 ? 1 : -1;
    case "dozen": {
      const d = bet.dozen;
      const inRange = result >= (d - 1) * 12 + 1 && result <= d * 12;
      return inRange ? 2 : -1;
    }
    case "column": {
      const c = bet.column;
      return result > 0 && result % 3 === (c === 3 ? 0 : c) ? 2 : -1;
    }
  }
}

const CHIP_VALUES = [1, 2, 5];

// ─── Wheel Component ─────────────────────────────────────────────
function RouletteWheel({ spinning, result }: { spinning: boolean; result: number | null }) {
  const baseAngle = result !== null ? -(NUMBERS.indexOf(result) * (360 / 37)) - 90 : 0;

  return (
    <div className="relative w-[280px] h-[280px] mx-auto">
      {/* Gold outer ring */}
      <div className="absolute inset-0 rounded-full"
        style={{
          background: "linear-gradient(135deg, hsl(43,80%,55%), hsl(43,70%,35%), hsl(43,80%,55%))",
          boxShadow: "0 0 30px hsl(43,80%,50%,0.3), inset 0 0 20px hsl(43,80%,30%,0.5)",
        }}
      />
      {/* Wheel face */}
      <motion.div
        className="absolute inset-[8px] rounded-full overflow-hidden"
        style={{ background: "hsl(140,30%,20%)" }}
        animate={{
          rotate: spinning ? [0, 1800 + baseAngle] : [baseAngle],
        }}
        transition={spinning ? { duration: 4, ease: [0.15, 0.85, 0.35, 1] } : { duration: 0 }}
      >
        {/* Number segments */}
        {NUMBERS.map((num, i) => {
          const angle = (i * 360) / 37;
          const color = getColor(num);
          return (
            <div
              key={num}
              className="absolute top-0 left-1/2 origin-bottom h-1/2"
              style={{
                width: "2px",
                transform: `rotate(${angle}deg) translateX(-50%)`,
              }}
            >
              <div
                className="absolute top-[10px] left-1/2 -translate-x-1/2 w-[22px] h-[30px] rounded-t-md flex items-center justify-center"
                style={{
                  background:
                    color === "green"
                      ? "hsl(140,60%,35%)"
                      : color === "red"
                      ? "hsl(0,70%,45%)"
                      : "hsl(0,0%,15%)",
                  transform: `rotate(0deg)`,
                }}
              >
                <span className="text-[9px] font-bold text-white">{num}</span>
              </div>
            </div>
          );
        })}
        {/* Inner hub */}
        <div className="absolute inset-[35%] rounded-full"
          style={{
            background: "radial-gradient(circle, hsl(30,50%,45%), hsl(30,40%,25%))",
            boxShadow: "0 0 15px hsl(30,50%,30%,0.5)",
          }}
        />
      </motion.div>
      {/* Ball pointer */}
      <div className="absolute top-[2px] left-1/2 -translate-x-1/2 z-10">
        <div className="w-3 h-3 rounded-full bg-white shadow-lg border border-gray-300" />
      </div>
    </div>
  );
}

// ─── Win Splash ──────────────────────────────────────────────────
function WinSplash({ amount, onClose }: { amount: number; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="relative text-center p-8 rounded-2xl"
        style={{
          background: "radial-gradient(ellipse, hsl(43,80%,15%), hsl(0,0%,5%))",
          border: "2px solid hsl(43,80%,50%)",
          boxShadow: "0 0 60px hsl(43,80%,50%,0.4), 0 0 120px hsl(43,80%,50%,0.2)",
        }}
        initial={{ scale: 0.3, y: 50 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.3, opacity: 0 }}
        transition={{ type: "spring", damping: 12 }}
      >
        <motion.div
          className="text-6xl mb-2"
          animate={{ rotate: [0, -10, 10, -5, 5, 0] }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          🎉
        </motion.div>
        <p className="text-lg text-[hsl(43,80%,60%)] font-semibold mb-1">YOU WON</p>
        <motion.p
          className="text-5xl font-black"
          style={{ color: "hsl(43,80%,55%)", textShadow: "0 0 20px hsl(43,80%,50%,0.5)" }}
          initial={{ scale: 0 }}
          animate={{ scale: [0, 1.2, 1] }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          ${amount.toFixed(2)}
        </motion.p>
        <p className="text-sm text-muted-foreground mt-3">Tap to continue</p>
      </motion.div>
    </motion.div>
  );
}

// ─── Number Cell ─────────────────────────────────────────────────
function NumberCell({
  num,
  bets,
  onClick,
}: {
  num: number;
  bets: PlacedBet[];
  onClick: () => void;
}) {
  const color = getColor(num);
  const totalBet = bets
    .filter((b) => b.type.kind === "straight" && b.type.number === num)
    .reduce((s, b) => s + b.amount, 0);

  return (
    <button
      onClick={onClick}
      className="relative w-full aspect-square rounded-md flex items-center justify-center text-white font-bold text-sm transition-transform hover:scale-110 hover:z-10 border border-white/20"
      style={{
        background:
          color === "green"
            ? "hsl(140,60%,30%)"
            : color === "red"
            ? "hsl(0,65%,42%)"
            : "hsl(0,0%,15%)",
      }}
    >
      {num}
      {totalBet > 0 && (
        <span className="absolute -top-1 -right-1 bg-[hsl(var(--casino-gold))] text-black text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
          {totalBet}
        </span>
      )}
    </button>
  );
}

// ─── Main Page ───────────────────────────────────────────────────
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

  const placeBet = useCallback(
    (type: BetType, label: string) => {
      if (spinning) return;
      if (totalBet + selectedChip > balance) {
        toast.error("Insufficient balance");
        return;
      }
      if (totalBet + selectedChip > 5) {
        toast.error("Maximum total bet is $5");
        return;
      }
      setBets((prev) => [...prev, { type, amount: selectedChip, label }]);
    },
    [spinning, selectedChip, totalBet, balance]
  );

  const clearBets = () => {
    if (!spinning) setBets([]);
  };

  const spin = async () => {
    if (!user || spinning || bets.length === 0) return;

    setSpinning(true);
    setResult(null);
    setWinAmount(null);

    // Generate random result
    const winningNumber = Math.floor(Math.random() * 37);

    // Calculate net payout
    let netAmount = 0;
    for (const bet of bets) {
      const mult = calculatePayout(bet.type, winningNumber);
      netAmount += bet.amount * mult;
    }

    // Set result to trigger wheel animation
    setResult(winningNumber);

    // Wait for animation
    await new Promise((r) => setTimeout(r, 4200));

    // Settle on server
    try {
      const { data, error } = await supabase.functions.invoke("game-settle", {
        body: {
          userId: user.id,
          amount: netAmount,
          gameType: "roulette",
          outcome: `Number ${winningNumber} (${getColor(winningNumber)}) — ${netAmount >= 0 ? "Win" : "Loss"}`,
        },
      });
      if (error) throw error;
      await refreshProfile();
    } catch {
      toast.error("Failed to settle bet");
    }

    setHistory((prev) => [winningNumber, ...prev.slice(0, 14)]);
    if (netAmount > 0) setWinAmount(netAmount);
    setSpinning(false);
    setBets([]);
  };

  const outsideBetClass =
    "px-2 py-2 rounded-md text-xs font-bold text-white border border-white/20 transition-transform hover:scale-105 text-center";

  return (
    <AuthGuard>
      <div className="min-h-screen gradient-casino-bg pb-24 md:pb-4">
        <Header />

        <AnimatePresence>
          {winAmount !== null && (
            <WinSplash amount={winAmount} onClose={() => setWinAmount(null)} />
          )}
        </AnimatePresence>

        <div className="container max-w-2xl px-3 py-4 space-y-4">
          {/* Balance & Bet */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="px-3 py-1.5 rounded-full bg-secondary/80 backdrop-blur border border-border">
                <span className="text-xs text-muted-foreground">Balance</span>
                <span className="ml-2 text-sm font-bold text-[hsl(var(--casino-gold))]">
                  ${balance.toFixed(2)}
                </span>
              </div>
              <div className="px-3 py-1.5 rounded-full bg-secondary/80 backdrop-blur border border-border">
                <span className="text-xs text-muted-foreground">Bet</span>
                <span className="ml-2 text-sm font-bold text-foreground">${totalBet.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Wheel */}
          <RouletteWheel spinning={spinning} result={result} />

          {/* Last result */}
          {result !== null && !spinning && (
            <motion.div
              className="text-center"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <span
                className="inline-block px-4 py-1.5 rounded-full font-bold text-white text-lg"
                style={{
                  background:
                    getColor(result) === "green"
                      ? "hsl(140,60%,30%)"
                      : getColor(result) === "red"
                      ? "hsl(0,65%,42%)"
                      : "hsl(0,0%,15%)",
                  boxShadow: "0 0 15px hsl(0,0%,0%,0.4)",
                }}
              >
                {result}
              </span>
            </motion.div>
          )}

          {/* History */}
          {history.length > 0 && (
            <div className="flex gap-1 overflow-x-auto py-1 scrollbar-hide">
              {history.map((n, i) => (
                <span
                  key={i}
                  className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                  style={{
                    background:
                      getColor(n) === "green"
                        ? "hsl(140,60%,30%)"
                        : getColor(n) === "red"
                        ? "hsl(0,65%,42%)"
                        : "hsl(0,0%,18%)",
                  }}
                >
                  {n}
                </span>
              ))}
            </div>
          )}

          {/* Betting Table */}
          <div
            className="rounded-xl p-3 space-y-2"
            style={{
              background: "linear-gradient(180deg, hsl(140,35%,18%), hsl(140,30%,12%))",
              border: "2px solid hsl(43,50%,35%)",
            }}
          >
            {/* Zero */}
            <div className="grid grid-cols-12 gap-1">
              <div className="col-span-12">
                <NumberCell num={0} bets={bets} onClick={() => placeBet({ kind: "straight", number: 0 }, "0")} />
              </div>
            </div>

            {/* Numbers grid 1-36, 3 columns */}
            <div className="grid grid-cols-3 gap-1">
              {Array.from({ length: 12 }, (_, row) =>
                [3, 2, 1].map((col) => {
                  const num = row * 3 + col;
                  return (
                    <NumberCell
                      key={num}
                      num={num}
                      bets={bets}
                      onClick={() => placeBet({ kind: "straight", number: num }, `${num}`)}
                    />
                  );
                })
              )}
            </div>

            {/* Columns */}
            <div className="grid grid-cols-3 gap-1">
              {([3, 2, 1] as const).map((c) => (
                <button
                  key={c}
                  className={outsideBetClass}
                  style={{ background: "hsl(140,30%,22%)" }}
                  onClick={() => placeBet({ kind: "column", column: c }, `Col ${c}`)}
                >
                  2 to 1
                </button>
              ))}
            </div>

            {/* Dozens */}
            <div className="grid grid-cols-3 gap-1">
              {([1, 2, 3] as const).map((d) => (
                <button
                  key={d}
                  className={outsideBetClass}
                  style={{ background: "hsl(140,30%,22%)" }}
                  onClick={() => placeBet({ kind: "dozen", dozen: d }, `${d === 1 ? "1st" : d === 2 ? "2nd" : "3rd"} 12`)}
                >
                  {d === 1 ? "1st 12" : d === 2 ? "2nd 12" : "3rd 12"}
                </button>
              ))}
            </div>

            {/* Outside bets */}
            <div className="grid grid-cols-6 gap-1">
              <button className={outsideBetClass} style={{ background: "hsl(140,30%,22%)" }} onClick={() => placeBet({ kind: "low" }, "1-18")}>
                1-18
              </button>
              <button className={outsideBetClass} style={{ background: "hsl(140,30%,22%)" }} onClick={() => placeBet({ kind: "even" }, "Even")}>
                EVEN
              </button>
              <button className={outsideBetClass} style={{ background: "hsl(0,65%,42%)" }} onClick={() => placeBet({ kind: "red" }, "Red")}>
                ◆
              </button>
              <button className={outsideBetClass} style={{ background: "hsl(0,0%,15%)" }} onClick={() => placeBet({ kind: "black" }, "Black")}>
                ◆
              </button>
              <button className={outsideBetClass} style={{ background: "hsl(140,30%,22%)" }} onClick={() => placeBet({ kind: "odd" }, "Odd")}>
                ODD
              </button>
              <button className={outsideBetClass} style={{ background: "hsl(140,30%,22%)" }} onClick={() => placeBet({ kind: "high" }, "19-36")}>
                19-36
              </button>
            </div>
          </div>

          {/* Chip selector & controls */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex gap-2">
              {CHIP_VALUES.map((v) => (
                <button
                  key={v}
                  onClick={() => setSelectedChip(v)}
                  className="relative w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm transition-transform"
                  style={{
                    background:
                      v === 1
                        ? "radial-gradient(circle, hsl(0,0%,95%), hsl(0,0%,70%))"
                        : v === 2
                        ? "radial-gradient(circle, hsl(210,70%,55%), hsl(210,70%,35%))"
                        : "radial-gradient(circle, hsl(280,50%,55%), hsl(280,50%,35%))",
                    color: v === 1 ? "hsl(0,0%,15%)" : "white",
                    border: selectedChip === v ? "3px solid hsl(43,80%,55%)" : "3px solid hsl(0,0%,30%)",
                    boxShadow:
                      selectedChip === v ? "0 0 12px hsl(43,80%,50%,0.5)" : "0 2px 6px hsl(0,0%,0%,0.3)",
                    transform: selectedChip === v ? "scale(1.1)" : "scale(1)",
                  }}
                >
                  ${v}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={clearBets}
                disabled={spinning || bets.length === 0}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              <Button
                variant="gold"
                className="px-6"
                onClick={spin}
                disabled={spinning || bets.length === 0}
              >
                {spinning ? (
                  <RotateCw className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                {spinning ? "Spinning..." : "SPIN"}
              </Button>
            </div>
          </div>

          {/* Active bets display */}
          {bets.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {bets.map((b, i) => (
                <span key={i} className="px-2 py-0.5 rounded-full bg-secondary text-xs text-muted-foreground">
                  ${b.amount} on {b.label}
                </span>
              ))}
            </div>
          )}

          {/* Game Chat */}
          <GameChat gameRoom="roulette" />
        </div>
        <BottomNav />
      </div>
    </AuthGuard>
  );
}
