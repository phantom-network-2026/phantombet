import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/casino/Header";
import { BottomNav } from "@/components/casino/BottomNav";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Sparkles, RotateCcw } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const BET_OPTIONS = [1, 5, 10, 25, 50, 100, 500];

const SYMBOLS = ["💎", "🍒", "⭐", "🔔", "7️⃣", "🍀", "💰", "🎰", "👑"];

interface ScratchCell {
  symbol: string;
  multiplier: number;
  scratched: boolean;
}

function generateCard(): ScratchCell[] {
  // ~30% chance of any cell being a winner
  // Matching 3+ symbols = big win
  const cells: ScratchCell[] = [];
  
  // Decide outcome first
  const roll = Math.random();
  let outcome: "jackpot" | "bigwin" | "smallwin" | "lose";
  
  if (roll < 0.02) outcome = "jackpot";       // 2% - 3 matching premium symbols
  else if (roll < 0.08) outcome = "bigwin";    // 6% - 3 matching symbols
  else if (roll < 0.30) outcome = "smallwin";  // 22% - 2 matching symbols
  else outcome = "lose";                        // 70% - no matches

  if (outcome === "jackpot") {
    const jackpotSymbol = SYMBOLS[Math.floor(Math.random() * 3)]; // 💎⭐🍒
    const positions = shufflePositions();
    for (let i = 0; i < 9; i++) {
      if (positions.indexOf(i) < 3) {
        cells.push({ symbol: jackpotSymbol, multiplier: 10, scratched: false });
      } else {
        cells.push({ symbol: randomSymbolExcept(jackpotSymbol), multiplier: 0, scratched: false });
      }
    }
  } else if (outcome === "bigwin") {
    const winSymbol = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
    const positions = shufflePositions();
    for (let i = 0; i < 9; i++) {
      if (positions.indexOf(i) < 3) {
        cells.push({ symbol: winSymbol, multiplier: 5, scratched: false });
      } else {
        cells.push({ symbol: randomSymbolExcept(winSymbol), multiplier: 0, scratched: false });
      }
    }
  } else if (outcome === "smallwin") {
    const winSymbol = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
    const positions = shufflePositions();
    for (let i = 0; i < 9; i++) {
      if (positions.indexOf(i) < 2) {
        cells.push({ symbol: winSymbol, multiplier: 2, scratched: false });
      } else {
        cells.push({ symbol: randomSymbolExcept(winSymbol), multiplier: 0, scratched: false });
      }
    }
  } else {
    // All different symbols
    const used: string[] = [];
    for (let i = 0; i < 9; i++) {
      let sym = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
      // Ensure no 3 of the same
      const count = used.filter(s => s === sym).length;
      if (count >= 2) {
        sym = SYMBOLS.find(s => used.filter(u => u === s).length < 2) || sym;
      }
      used.push(sym);
      cells.push({ symbol: sym, multiplier: 0, scratched: false });
    }
  }

  return cells;
}

function randomSymbolExcept(exclude: string): string {
  const filtered = SYMBOLS.filter(s => s !== exclude);
  return filtered[Math.floor(Math.random() * filtered.length)];
}

function shufflePositions(): number[] {
  const arr = [0, 1, 2, 3, 4, 5, 6, 7, 8];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function calculateWinnings(cells: ScratchCell[], bet: number): { amount: number; matches: string } {
  const symbolCount: Record<string, number> = {};
  cells.forEach(c => {
    symbolCount[c.symbol] = (symbolCount[c.symbol] || 0) + 1;
  });

  for (const [symbol, count] of Object.entries(symbolCount)) {
    if (count >= 3) {
      const cell = cells.find(c => c.symbol === symbol);
      const mult = cell?.multiplier || 5;
      return { amount: bet * mult, matches: symbol };
    }
  }

  for (const [symbol, count] of Object.entries(symbolCount)) {
    if (count >= 2) {
      const cell = cells.find(c => c.symbol === symbol);
      if (cell?.multiplier && cell.multiplier > 0) {
        return { amount: bet * cell.multiplier, matches: symbol };
      }
    }
  }

  return { amount: 0, matches: "" };
}

export default function ScratchCard() {
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();
  const [bet, setBet] = useState(5);
  const [card, setCard] = useState<ScratchCell[]>([]);
  const [gameState, setGameState] = useState<"idle" | "playing" | "revealing" | "done">("idle");
  const [result, setResult] = useState<{ amount: number; matches: string } | null>(null);
  const [scratchedCount, setScratchedCount] = useState(0);
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);
  const isScratching = useRef(false);

  const startGame = async () => {
    if (!user) { navigate("/login"); return; }
    if ((profile?.balance ?? 0) < bet) {
      toast.error("Insufficient balance!");
      return;
    }

    // Deduct bet via edge function
    const { error } = await supabase.functions.invoke("game-settle", {
      body: { userId: user.id, amount: -bet, gameType: "scratch", outcome: "bet_placed" },
    });

    if (error) { toast.error("Failed to place bet"); return; }

    await refreshProfile();

    const newCard = generateCard();
    setCard(newCard);
    setGameState("playing");
    setResult(null);
    setScratchedCount(0);
  };

  useEffect(() => {
    if (gameState !== "playing") return;
    // Initialize scratch canvases
    canvasRefs.current.forEach((canvas, i) => {
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const w = canvas.width;
      const h = canvas.height;

      // Gradient scratch surface
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, "hsl(265, 45%, 25%)");
      grad.addColorStop(0.5, "hsl(270, 50%, 30%)");
      grad.addColorStop(1, "hsl(265, 40%, 20%)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Sparkle pattern
      ctx.fillStyle = "rgba(255, 215, 0, 0.15)";
      for (let k = 0; k < 8; k++) {
        ctx.beginPath();
        ctx.arc(Math.random() * w, Math.random() * h, 2 + Math.random() * 3, 0, Math.PI * 2);
        ctx.fill();
      }

      // Question mark
      ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
      ctx.font = `bold ${Math.floor(h * 0.5)}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("?", w / 2, h / 2);
    });
  }, [gameState, card]);

  const handleScratch = useCallback((index: number, e: React.MouseEvent | React.TouchEvent) => {
    if (gameState !== "playing") return;
    const canvas = canvasRefs.current[index];
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let x: number, y: number;

    if ("touches" in e) {
      x = (e.touches[0].clientX - rect.left) * (canvas.width / rect.width);
      y = (e.touches[0].clientY - rect.top) * (canvas.height / rect.height);
    } else {
      x = (e.clientX - rect.left) * (canvas.width / rect.width);
      y = (e.clientY - rect.top) * (canvas.height / rect.height);
    }

    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(x, y, 18, 0, Math.PI * 2);
    ctx.fill();

    // Check if mostly scratched
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let transparent = 0;
    for (let i = 3; i < imageData.data.length; i += 4) {
      if (imageData.data[i] === 0) transparent++;
    }
    const ratio = transparent / (imageData.data.length / 4);
    if (ratio > 0.5 && !card[index].scratched) {
      const newCard = [...card];
      newCard[index] = { ...newCard[index], scratched: true };
      setCard(newCard);
      setScratchedCount(prev => prev + 1);
    }
  }, [gameState, card]);

  const handleMouseDown = (index: number) => {
    isScratching.current = true;
  };

  const handleMouseUp = () => {
    isScratching.current = false;
  };

  const handleMouseMove = (index: number, e: React.MouseEvent) => {
    if (isScratching.current) handleScratch(index, e);
  };

  const handleTouchMove = (index: number, e: React.TouchEvent) => {
    e.preventDefault();
    handleScratch(index, e);
  };

  // Reveal all when enough scratched
  useEffect(() => {
    if (scratchedCount >= 5 && gameState === "playing") {
      revealAll();
    }
  }, [scratchedCount]);

  const revealAll = async () => {
    setGameState("revealing");

    // Animate reveal of remaining cells
    for (let i = 0; i < card.length; i++) {
      if (!card[i].scratched) {
        const canvas = canvasRefs.current[i];
        if (canvas) {
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.globalCompositeOperation = "destination-out";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
          }
        }
        await new Promise(r => setTimeout(r, 120));
      }
    }

    const win = calculateWinnings(card, bet);
    setResult(win);

    if (win.amount > 0 && user) {
      await supabase.functions.invoke("game-settle", {
        body: { userId: user.id, amount: win.amount, gameType: "scratch", outcome: `win_${win.matches}x3` },
      });

      await refreshProfile();
    }

    setGameState("done");
  };

  const revealAllButton = () => {
    if (gameState === "playing") revealAll();
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Header />
      <div className="container max-w-lg py-4 px-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>

        <div className="text-center mb-6">
          <h1 className="font-display text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[hsl(var(--casino-gold))] to-[hsl(var(--casino-gold-light))]">
            <Sparkles className="inline h-7 w-7 mr-2 text-[hsl(var(--casino-gold))]" />
            Scratch & Win
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Match 3 symbols to win big!</p>
        </div>

        {/* Bet Selection */}
        {gameState === "idle" && (
          <div className="space-y-4 animate-fade-in">
            <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
              <label className="text-sm font-medium text-muted-foreground">Choose your bet</label>
              <div className="flex flex-wrap gap-2">
                {BET_OPTIONS.map(b => (
                  <button
                    key={b}
                    onClick={() => setBet(b)}
                    className={`px-4 py-2 rounded-xl text-sm font-bold transition-all duration-200 ${
                      bet === b
                        ? "bg-[hsl(var(--casino-gold))] text-[hsl(var(--accent-foreground))] scale-105 shadow-lg shadow-[hsl(var(--casino-gold))/0.3]"
                        : "bg-secondary text-foreground hover:bg-[hsl(var(--casino-surface-hover))]"
                    }`}
                  >
                    ${b}
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border">
                <span>Balance: <span className="text-[hsl(var(--casino-gold))] font-bold">${profile?.balance?.toFixed(2) ?? "0.00"}</span></span>
                <span>Max win: <span className="text-[hsl(var(--casino-green))] font-bold">${(bet * 10).toLocaleString()}</span></span>
              </div>

              <Button
                variant="gold"
                size="lg"
                className="w-full text-lg font-bold"
                onClick={startGame}
                disabled={!user || (profile?.balance ?? 0) < bet}
              >
                {!user ? "Sign In to Play" : `Buy Card - $${bet}`}
              </Button>
            </div>

            {/* Payout table */}
            <div className="bg-card rounded-2xl border border-border p-4">
              <h3 className="font-display font-bold text-sm text-muted-foreground mb-3">Payouts</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>3 matching symbols</span>
                  <span className="text-[hsl(var(--casino-gold))] font-bold">5× bet</span>
                </div>
                <div className="flex justify-between">
                  <span>3 premium symbols (💎🍒⭐)</span>
                  <span className="text-[hsl(var(--casino-pink))] font-bold">10× bet</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Win chance</span>
                  <span>~30%</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Scratch Card */}
        {(gameState === "playing" || gameState === "revealing" || gameState === "done") && (
          <div className="space-y-4 animate-scale-in">
            <div className="bg-card rounded-2xl border-2 border-[hsl(var(--casino-gold))/0.3] p-4 relative overflow-hidden">
              {/* Shimmer effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--casino-gold))/0.05] via-transparent to-[hsl(var(--casino-pink))/0.05] pointer-events-none" />

              <div className="grid grid-cols-3 gap-2 relative" onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
                {card.map((cell, i) => (
                  <div
                    key={i}
                    className="relative aspect-square rounded-xl overflow-hidden bg-secondary border border-border"
                  >
                    {/* Symbol underneath */}
                    <div className={`absolute inset-0 flex items-center justify-center text-4xl transition-transform duration-500 ${
                      cell.scratched || gameState === "done" ? "scale-100" : "scale-75"
                    }`}>
                      <span className={`${cell.scratched || gameState === "done" ? "animate-bounce" : ""}`} style={{ animationDelay: `${i * 80}ms`, animationDuration: "600ms" }}>
                        {cell.symbol}
                      </span>
                    </div>

                    {/* Scratch canvas overlay */}
                    {gameState !== "done" && (
                      <canvas
                        ref={el => { canvasRefs.current[i] = el; }}
                        width={200}
                        height={200}
                        className="absolute inset-0 w-full h-full cursor-pointer touch-none"
                        onMouseDown={() => handleMouseDown(i)}
                        onMouseMove={e => handleMouseMove(i, e)}
                        onTouchStart={() => {}}
                        onTouchMove={e => handleTouchMove(i, e)}
                      />
                    )}
                  </div>
                ))}
              </div>

              {gameState === "playing" && (
                <div className="mt-3 flex justify-between items-center">
                  <p className="text-xs text-muted-foreground">Scratch 5 cells to reveal all</p>
                  <Button variant="ghost" size="sm" onClick={revealAllButton} className="text-xs text-[hsl(var(--casino-pink))]">
                    Reveal All
                  </Button>
                </div>
              )}
            </div>

            {/* Result */}
            {gameState === "done" && result && (
              <div className={`rounded-2xl border-2 p-6 text-center animate-scale-in ${
                result.amount > 0
                  ? "border-[hsl(var(--casino-gold))] bg-gradient-to-b from-[hsl(var(--casino-gold))/0.1] to-card"
                  : "border-border bg-card"
              }`}>
                {result.amount > 0 ? (
                  <>
                    <div className="text-5xl mb-2 animate-bounce">{result.matches}</div>
                    <p className="font-display text-2xl font-black text-[hsl(var(--casino-gold))]">
                      YOU WON ${result.amount.toLocaleString()}!
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {result.matches} × 3 match!
                    </p>
                  </>
                ) : (
                  <>
                    <p className="font-display text-xl font-bold text-muted-foreground">No Match</p>
                    <p className="text-sm text-muted-foreground mt-1">Better luck next time!</p>
                  </>
                )}

                <Button
                  variant="gold"
                  size="lg"
                  className="w-full mt-4 text-lg font-bold"
                  onClick={() => { setGameState("idle"); setCard([]); setResult(null); }}
                >
                  <RotateCcw className="h-5 w-5 mr-2" /> Play Again
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
