import { useState, useCallback, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { AuthGuard } from "@/components/casino/AuthGuard";
import { GameChat } from "@/components/casino/GameChat";
import { motion, AnimatePresence } from "framer-motion";
import { RotateCw, X, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import phantomLogo from "@/assets/phantombet-logo.svg";

// ─── Constants ──────────────────────────────────────────────────
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

const CHIP_VALUES = [0.20, 0.50, 1, 5];
const CHIP_COLORS: Record<number, { bg: string; text: string; label: string }> = {
  0.20: { bg: "linear-gradient(135deg, #d4a8e0, #9b59b6)", text: "#fff", label: "20¢" },
  0.50: { bg: "linear-gradient(135deg, #f5a623, #d4830a)", text: "#fff", label: "50¢" },
  1:    { bg: "linear-gradient(135deg, #5dade2, #2e86c1)", text: "#fff", label: "$1" },
  5:    { bg: "linear-gradient(135deg, #27ae60, #1e8449)", text: "#fff", label: "$5" },
};

// ─── Roulette Wheel ─────────────────────────────────────────────
function PennyRouletteWheel({ spinning, result, size = 280 }: { spinning: boolean; result: number | null; size?: number }) {
  const targetAngle = result !== null
    ? -(WHEEL_ORDER.indexOf(result) * SEGMENT_ANGLE)
    : 0;
  const spinRotation = 360 * 6 + targetAngle;

  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      {/* Outer wooden rim */}
      <div className="absolute inset-0 rounded-full"
        style={{
          background: "radial-gradient(circle at 30% 30%, #8b5e3c, #5a3520, #3a1f0f)",
          boxShadow: "0 8px 30px rgba(0,0,0,0.6), inset 0 2px 10px rgba(255,200,100,0.15)",
        }}
      />
      {/* Chrome ring */}
      <div className="absolute rounded-full"
        style={{
          inset: size * 0.04,
          background: "linear-gradient(135deg, #e0e0e0 0%, #888 30%, #ccc 50%, #999 70%, #bbb 100%)",
          boxShadow: "inset 0 1px 4px rgba(255,255,255,0.5)",
        }}
      />
      {/* Spinning section */}
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
                style={{
                  top: size * 0.04,
                  width: segW,
                  height: segH,
                  background: colorHex(getColor(num)),
                  fontSize: Math.max(7, size * 0.035),
                  borderRadius: 2,
                }}>
                <span className="font-bold text-white leading-none">{num}</span>
              </div>
            </div>
          );
        })}
        {/* Inner decorative ring */}
        <div className="absolute rounded-full"
          style={{
            inset: "28%",
            background: "linear-gradient(135deg, #c0c0c0, #888, #aaa)",
            boxShadow: "inset 0 1px 3px rgba(0,0,0,0.3)",
          }}
        />
        {/* Center hub - PhantomBet branding */}
        <div className="absolute rounded-full flex items-center justify-center"
          style={{
            inset: "30%",
            background: "radial-gradient(circle at 40% 35%, #5a3520, #3a1f0f, #2a1008)",
            boxShadow: "inset 0 2px 8px rgba(0,0,0,0.5)",
          }}
        >
          <img src={phantomLogo} alt="PhantomBet" className="w-1/2 h-1/2 object-contain drop-shadow-lg" style={{ filter: "brightness(1.4)" }} />
        </div>
      </motion.div>
      {/* Ball marker */}
      <div className="absolute left-1/2 -translate-x-1/2 z-10" style={{ top: -4 }}>
        <div className="w-0 h-0"
          style={{
            borderLeft: "7px solid transparent",
            borderRight: "7px solid transparent",
            borderTop: "14px solid #d4af37",
            filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.5))",
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
          background: "radial-gradient(ellipse, #1a3d1a, #050f05)",
          border: "2px solid #d4af37",
          boxShadow: "0 0 60px rgba(212,175,55,0.4)",
        }}
        initial={{ scale: 0.3, y: 50 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.3, opacity: 0 }}
        transition={{ type: "spring", damping: 12 }}>
        <p className="text-xs text-[#d4af37] font-semibold mb-2 uppercase tracking-wider">Ball landed on</p>
        <motion.div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center text-2xl font-black text-white mb-3"
          style={{ background: colorHex(color), boxShadow: `0 0 20px ${colorHex(color)}` }}
          initial={{ scale: 0 }} animate={{ scale: [0, 1.3, 1] }}
          transition={{ delay: 0.15, duration: 0.4 }}>
          {resultNumber}
        </motion.div>
        <motion.div className="text-xs font-semibold mb-1 text-[#d4af37]">
          {color.toUpperCase()} {resultNumber}
        </motion.div>
        {isWin ? (
          <>
            <motion.div className="text-5xl mb-1" animate={{ rotate: [0, -10, 10, -5, 5, 0] }}
              transition={{ duration: 0.6, delay: 0.3 }}>🎉</motion.div>
            <p className="text-sm text-[#d4af37] font-semibold">YOU WON</p>
            <motion.p className="text-4xl font-black"
              style={{ color: "#2ecc71", textShadow: "0 0 20px rgba(46,204,113,0.5)" }}
              initial={{ scale: 0 }} animate={{ scale: [0, 1.2, 1] }}
              transition={{ delay: 0.2, duration: 0.5 }}>
              +${netAmount.toFixed(2)}
            </motion.p>
          </>
        ) : (
          <>
            <p className="text-sm text-gray-400 font-semibold mt-2">Better luck next time!</p>
            <motion.p className="text-2xl font-bold mt-1 text-red-400"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}>
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
type GameView = "wheel" | "table";

export default function PennyRoulette() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [view, setView] = useState<GameView>("table");
  const [bets, setBets] = useState<PlacedBet[]>([]);
  const [selectedChip, setSelectedChip] = useState(0.20);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<number | null>(null);
  const [splashData, setSplashData] = useState<{ resultNumber: number; netAmount: number } | null>(null);
  const [history, setHistory] = useState<number[]>([]);
  const [lastBets, setLastBets] = useState<PlacedBet[]>([]);
  const [winLoss, setWinLoss] = useState(0);
  const [showChat, setShowChat] = useState(false);

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
    setLastBets(bets);

    let forceActive = false;
    try {
      const { data: fl } = await supabase.from("site_settings").select("value").eq("key", "force_loss").maybeSingle();
      forceActive = (fl?.value as any)?.enabled === true;
    } catch {}

    let winningNumber: number;
    if (forceActive) {
      let found = false;
      for (let attempt = 0; attempt < 100; attempt++) {
        const candidate = Math.floor(Math.random() * 37);
        let total = 0;
        for (const bet of bets) total += bet.amount * calculatePayout(bet.type, candidate);
        if (total <= 0) { winningNumber = candidate; found = true; break; }
      }
      if (!found) winningNumber = 0;
    } else {
      winningNumber = Math.floor(Math.random() * 37);
    }

    let netAmount = 0;
    for (const bet of bets) netAmount += bet.amount * calculatePayout(bet.type, winningNumber);

    setResult(winningNumber);
    setView("wheel"); // Switch to wheel view to show spin
    await new Promise((r) => setTimeout(r, 5000));

    try {
      const { error } = await supabase.functions.invoke("game-settle", {
        body: { userId: user.id, amount: netAmount, gameType: "penny-roulette",
          outcome: `Number ${winningNumber} (${getColor(winningNumber)})` },
      });
      if (error) throw error;
      await refreshProfile();
    } catch { toast.error("Failed to settle bet"); }

    setWinLoss(prev => prev + netAmount);
    setHistory((prev) => [winningNumber, ...prev.slice(0, 19)]);
    setSplashData({ resultNumber: winningNumber, netAmount });
    setSpinning(false);
    setBets([]);
  };

  const rebet = () => {
    if (spinning || lastBets.length === 0) return;
    const rebetTotal = lastBets.reduce((s, b) => s + b.amount, 0);
    if (rebetTotal > balance) { toast.error("Insufficient balance"); return; }
    if (rebetTotal > 5) { toast.error("Maximum total bet is $5"); return; }
    setBets(lastBets);
  };

  const respin = async () => {
    if (spinning || lastBets.length === 0) return;
    const rebetTotal = lastBets.reduce((s, b) => s + b.amount, 0);
    if (rebetTotal > balance) { toast.error("Insufficient balance"); return; }
    if (rebetTotal > 5) { toast.error("Maximum total bet is $5"); return; }
    setBets(lastBets);
    setTimeout(() => spin(), 50);
  };

  const getBetTotal = (filter: (b: PlacedBet) => boolean) =>
    bets.filter(filter).reduce((s, b) => s + b.amount, 0);

  const chipOverlay = (amount: number) => {
    if (amount <= 0) return null;
    const label = amount < 1 ? `${Math.round(amount * 100)}¢` : `$${amount.toFixed(0)}`;
    return (
      <span className="absolute -top-1 -right-1 z-10 rounded-full flex items-center justify-center font-black text-[#1a1a1a] pointer-events-none"
        style={{
          minWidth: 16, height: 16, fontSize: 7,
          background: "radial-gradient(circle, #d4af37, #a08420)",
          boxShadow: "0 0 4px rgba(212,175,55,0.6)",
          border: "1px solid #e5c94b",
        }}>
        {label}
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

  // ─── History bar ──────────────────────────────────────────────
  const historyBar = (
    <div className="flex items-center gap-[2px] px-2 py-1 overflow-x-auto" style={{ background: "#1a1a1a" }}>
      {history.length === 0 ? (
        <span className="text-gray-500 text-[10px]">No history yet</span>
      ) : history.slice(0, 12).map((n, i) => (
        <span key={i} className="rounded-sm flex items-center justify-center font-bold text-white shrink-0"
          style={{
            width: 22, height: 20, fontSize: 9,
            background: colorHex(getColor(n)),
          }}>{n}</span>
      ))}
      <div className="flex-1" />
      <span className="text-gray-500 text-[10px]">0%</span>
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
      {/* PhantomBet logo title */}
      <div className="flex items-center justify-center gap-2 mb-4 mt-2">
        <img src={phantomLogo} alt="PhantomBet" className="h-8 drop-shadow-lg" style={{ filter: "brightness(1.3)" }} />
        <span className="text-[#d4af37] font-black text-xl tracking-wide drop-shadow-lg" style={{ textShadow: "0 2px 8px rgba(0,0,0,0.5)" }}>
          ROULETTE
        </span>
      </div>

      <PennyRouletteWheel spinning={spinning} result={result} size={260} />

      {/* Spin button */}
      <div className="absolute bottom-4 left-4">
        <button
          onClick={bets.length > 0 ? spin : undefined}
          disabled={spinning || bets.length === 0}
          className="w-16 h-16 rounded-full flex flex-col items-center justify-center text-white font-bold transition-all"
          style={{
            background: spinning
              ? "radial-gradient(circle, #555, #333)"
              : "radial-gradient(circle, #f0f0f0, #ccc, #aaa)",
            boxShadow: "0 4px 15px rgba(0,0,0,0.5)",
            border: "3px solid #0d5d0d",
            opacity: bets.length === 0 && !spinning ? 0.5 : 1,
          }}
        >
          <RotateCw className={`w-6 h-6 ${spinning ? "animate-spin text-gray-300" : "text-[#0d5d0d]"}`} />
          <span className="text-[8px] font-bold mt-0.5" style={{ color: spinning ? "#999" : "#0d5d0d" }}>SPIN</span>
        </button>
      </div>

      {/* Side tabs */}
      <button
        onClick={() => setView("table")}
        className="absolute right-0 top-1/2 -translate-y-1/2 text-white font-bold text-[10px] px-1.5 py-6 rounded-l-lg"
        style={{ background: "rgba(80,80,80,0.8)", writingMode: "vertical-rl" }}
      >
        BACK
      </button>

      {/* Chat toggle */}
      <button
        onClick={() => setShowChat(!showChat)}
        className="absolute bottom-4 left-24 w-8 h-8 rounded-full flex items-center justify-center"
        style={{ background: "rgba(80,80,80,0.8)" }}
      >
        <span className="text-white text-lg">☰</span>
      </button>
    </div>
  );

  // ─── Table View ───────────────────────────────────────────────
  const tableView = (
    <div className="flex-1 flex flex-col relative" style={{ background: "radial-gradient(ellipse at center, #1a5c1a, #0d3d0d, #082808)" }}>
      {/* Logo */}
      <div className="flex items-center gap-2 px-3 pt-2 pb-1">
        <img src={phantomLogo} alt="PhantomBet" className="h-6 drop-shadow-lg" style={{ filter: "brightness(1.3)" }} />
        <span className="text-[#d4af37] font-black text-sm tracking-wide drop-shadow-lg">ROULETTE</span>
      </div>

      <div className="flex-1 flex px-1 pb-1 gap-1">
        {/* Left side tabs */}
        <div className="flex flex-col gap-1 shrink-0">
          <button onClick={() => setView("wheel")}
            className="text-white font-bold text-[9px] px-1.5 py-8 rounded-r-lg"
            style={{ background: "rgba(80,80,80,0.8)", writingMode: "vertical-rl" }}>
            WHEEL
          </button>
          {/* Bet limits info */}
          <div className="text-center text-[8px] text-white mt-1 space-y-0.5">
            <p className="font-bold">MIN</p>
            <p className="text-[#d4af37]">$0.20</p>
            <p className="font-bold mt-1">MAX</p>
            <p className="text-[#d4af37]">$5.00</p>
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
              {/* Zero */}
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
              {/* 12 rows × 3 columns */}
              <div className="grid grid-cols-3 gap-[1px]">
                {Array.from({ length: 12 }, (_, row) =>
                  [1, 2, 3].map(col => numCell(row * 3 + col))
                )}
              </div>
              {/* 2:1 row */}
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

        {/* Right side - chips stack */}
        <div className="flex flex-col items-center gap-2 shrink-0 justify-end pb-4 pl-1">
          {[...CHIP_VALUES].reverse().map(v => {
            const chip = CHIP_COLORS[v];
            return (
              <button key={v} onClick={() => setSelectedChip(v)}
                className="rounded-full flex items-center justify-center font-bold transition-all"
                style={{
                  width: 38, height: 38,
                  fontSize: 9,
                  background: chip.bg,
                  color: chip.text,
                  border: selectedChip === v ? "3px solid #d4af37" : "3px solid rgba(255,255,255,0.2)",
                  boxShadow: selectedChip === v
                    ? "0 0 12px rgba(212,175,55,0.6), 0 4px 8px rgba(0,0,0,0.4)"
                    : "0 2px 6px rgba(0,0,0,0.4)",
                  transform: selectedChip === v ? "scale(1.15)" : "scale(1)",
                }}>
                {chip.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Spin button */}
      <div className="absolute bottom-2 left-2">
        <button
          onClick={bets.length > 0 ? spin : undefined}
          disabled={spinning || bets.length === 0}
          className="w-14 h-14 rounded-full flex flex-col items-center justify-center font-bold transition-all"
          style={{
            background: spinning
              ? "radial-gradient(circle, #555, #333)"
              : "radial-gradient(circle, #f0f0f0, #ccc, #aaa)",
            boxShadow: "0 4px 15px rgba(0,0,0,0.5)",
            border: "3px solid #0d5d0d",
            opacity: bets.length === 0 && !spinning ? 0.5 : 1,
          }}
        >
          <RotateCw className={`w-5 h-5 ${spinning ? "animate-spin text-gray-300" : "text-[#0d5d0d]"}`} />
          <span className="text-[7px] font-bold mt-0.5" style={{ color: spinning ? "#999" : "#0d5d0d" }}>SPIN</span>
        </button>
      </div>

      {/* Action buttons */}
      {lastBets.length > 0 && !spinning && bets.length === 0 && (
        <div className="absolute bottom-2 right-14 flex gap-1">
          <button onClick={rebet}
            className="px-2 py-1 rounded text-[9px] font-bold text-white"
            style={{ background: "rgba(80,80,80,0.8)" }}>
            REBET
          </button>
          <button onClick={respin}
            className="px-2 py-1 rounded text-[9px] font-bold text-white"
            style={{ background: "rgba(80,80,80,0.8)" }}>
            RESPIN
          </button>
        </div>
      )}
      {bets.length > 0 && !spinning && (
        <div className="absolute bottom-2 right-14 flex gap-1">
          <button onClick={clearBets}
            className="px-2 py-1 rounded text-[9px] font-bold text-white"
            style={{ background: "rgba(80,80,80,0.8)" }}>
            CLEAR
          </button>
        </div>
      )}

      {/* Chat toggle */}
      <button
        onClick={() => setShowChat(!showChat)}
        className="absolute bottom-2 left-20 w-7 h-7 rounded-full flex items-center justify-center"
        style={{ background: "rgba(80,80,80,0.8)" }}
      >
        <span className="text-white text-sm">☰</span>
      </button>
    </div>
  );

  return (
    <AuthGuard>
      <div className="h-screen flex flex-col overflow-hidden" style={{ background: "#0d3d0d" }}>
        <AnimatePresence>
          {splashData !== null && <ResultSplash resultNumber={splashData.resultNumber} netAmount={splashData.netAmount} onClose={() => setSplashData(null)} />}
        </AnimatePresence>

        {/* Top bar */}
        {topBar}
        {/* History bar */}
        {historyBar}

        {/* Main game area */}
        <div className="flex-1 flex flex-col min-h-0 relative">
          <AnimatePresence mode="wait">
            {view === "wheel" ? (
              <motion.div key="wheel" className="flex-1 flex flex-col"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
                {wheelView}
              </motion.div>
            ) : (
              <motion.div key="table" className="flex-1 flex flex-col"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
                {tableView}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Chat overlay */}
          <AnimatePresence>
            {showChat && (
              <motion.div
                className="absolute inset-0 z-40 bg-black/80 flex flex-col"
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
              >
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

        {/* Bottom bar */}
        {bottomBar}
      </div>
    </AuthGuard>
  );
}
