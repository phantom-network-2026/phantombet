import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/casino/Header";
import { BottomNav } from "@/components/casino/BottomNav";
import { GameChat } from "@/components/casino/GameChat";
import { AuthGuard } from "@/components/casino/AuthGuard";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Sparkles, RotateCcw } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const BET_OPTIONS = [1, 5, 10, 25, 50, 100, 500];

const SYMBOLS = ["💎", "🍒", "⭐", "🔔", "7️⃣", "🍀", "💰", "🎰", "👑"];

interface ScratchCell {
  symbol: string;
  scratched: boolean;
}

function buildDisplayCard(symbols: string[], isWinner: boolean): ScratchCell[] {
  // Use the symbols from the server but shuffle them for visual variety
  const cells: ScratchCell[] = symbols.map((s) => ({ symbol: s, scratched: false }));
  // Shuffle the cells
  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cells[i], cells[j]] = [cells[j], cells[i]];
  }
  return cells;
}

export default function ScratchCard() {
  return <AuthGuard><ScratchCardInner /></AuthGuard>;
}

function ScratchCardInner() {
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();
  const [bet, setBet] = useState(5);
  const [card, setCard] = useState<ScratchCell[]>([]);
  const [gameState, setGameState] = useState<"idle" | "playing" | "revealing" | "done">("idle");
  const [serverResult, setServerResult] = useState<{ is_winner: boolean; win_amount: number } | null>(null);
  const [scratchedCount, setScratchedCount] = useState(0);
  const [remaining, setRemaining] = useState<Record<number, number>>({});
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);
  const isScratching = useRef(false);

  // Fetch remaining card counts
  useEffect(() => {
    const fetchCounts = async () => {
      const counts: Record<number, number> = {};
      for (const tier of BET_OPTIONS) {
        const { count } = await supabase
          .from("scratch_card_pool")
          .select("id", { count: "exact", head: true })
          .eq("bet_tier", tier)
          .is("claimed_by", null);
        counts[tier] = count ?? 0;
      }
      setRemaining(counts);
    };
    fetchCounts();
  }, [gameState]);

  const startGame = async () => {
    if (!user) { navigate("/login"); return; }
    if ((profile?.balance ?? 0) < bet) {
      toast.error("Insufficient balance!");
      return;
    }

    if ((remaining[bet] ?? 0) <= 0) {
      toast.error("No cards left for this tier! Sold out.");
      return;
    }

    // Buy card from server
    const { data, error } = await supabase.functions.invoke("scratch-card-buy", {
      body: { betTier: bet },
    });

    if (error || !data?.success) {
      toast.error(data?.error || "Failed to buy card");
      return;
    }

    await refreshProfile();

    const cardData = data.card;
    setServerResult({ is_winner: cardData.is_winner, win_amount: cardData.win_amount });
    setRemaining((prev) => ({ ...prev, [bet]: data.remaining }));

    const displayCard = buildDisplayCard(cardData.symbols, cardData.is_winner);
    setCard(displayCard);
    setGameState("playing");
    setScratchedCount(0);
  };

  useEffect(() => {
    if (gameState !== "playing") return;
    canvasRefs.current.forEach((canvas, i) => {
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const w = canvas.width;
      const h = canvas.height;

      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, "hsl(265, 45%, 25%)");
      grad.addColorStop(0.5, "hsl(270, 50%, 30%)");
      grad.addColorStop(1, "hsl(265, 40%, 20%)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      ctx.fillStyle = "rgba(255, 215, 0, 0.15)";
      for (let k = 0; k < 8; k++) {
        ctx.beginPath();
        ctx.arc(Math.random() * w, Math.random() * h, 2 + Math.random() * 3, 0, Math.PI * 2);
        ctx.fill();
      }

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
      setScratchedCount((prev) => prev + 1);
    }
  }, [gameState, card]);

  const handleMouseDown = () => { isScratching.current = true; };
  const handleMouseUp = () => { isScratching.current = false; };
  const handleMouseMove = (index: number, e: React.MouseEvent) => {
    if (isScratching.current) handleScratch(index, e);
  };
  const handleTouchMove = (index: number, e: React.TouchEvent) => {
    e.preventDefault();
    handleScratch(index, e);
  };

  useEffect(() => {
    if (scratchedCount >= 5 && gameState === "playing") {
      revealAll();
    }
  }, [scratchedCount]);

  const revealAll = async () => {
    setGameState("revealing");

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
        await new Promise((r) => setTimeout(r, 120));
      }
    }

    // Balance already settled server-side, just refresh
    await refreshProfile();
    setGameState("done");
  };

  const revealAllButton = () => {
    if (gameState === "playing") revealAll();
  };

  const remainingForBet = remaining[bet] ?? 0;
  const totalForBet = 2000;
  const soldPercent = Math.round(((totalForBet - remainingForBet) / totalForBet) * 100);

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
          <p className="text-muted-foreground text-sm mt-1">2,000 cards per tier — 1 in 5 is a guaranteed winner!</p>
        </div>

        {/* Bet Selection */}
        {gameState === "idle" && (
          <div className="space-y-4 animate-fade-in">
            <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
              <label className="text-sm font-medium text-muted-foreground">Choose your card</label>
              <div className="flex flex-wrap gap-2">
                {BET_OPTIONS.map((b) => (
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

              {/* Remaining cards indicator */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{remainingForBet.toLocaleString()} cards remaining</span>
                  <span>{soldPercent}% sold</span>
                </div>
                <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[hsl(var(--casino-gold))] to-[hsl(var(--casino-pink))] transition-all duration-500"
                    style={{ width: `${soldPercent}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border">
                <span>Balance: <span className="text-[hsl(var(--casino-gold))] font-bold">${profile?.balance?.toFixed(2) ?? "0.00"}</span></span>
                <span>Win pays: <span className="text-[hsl(var(--casino-green))] font-bold">${(bet * 2).toLocaleString()}</span></span>
              </div>

              <Button
                variant="gold"
                size="lg"
                className="w-full text-lg font-bold"
                onClick={startGame}
                disabled={!user || (profile?.balance ?? 0) < bet || remainingForBet <= 0}
              >
                {remainingForBet <= 0 ? "Sold Out!" : `Buy Card - $${bet}`}
              </Button>
            </div>

            {/* Payout table */}
            <div className="bg-card rounded-2xl border border-border p-4">
              <h3 className="font-display font-bold text-sm text-muted-foreground mb-3">How It Works</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Total cards per tier</span>
                  <span className="font-bold">2,000</span>
                </div>
                <div className="flex justify-between">
                  <span>Winners per tier</span>
                  <span className="text-[hsl(var(--casino-green))] font-bold">400 (1 in 5)</span>
                </div>
                <div className="flex justify-between">
                  <span>Winner payout</span>
                  <span className="text-[hsl(var(--casino-gold))] font-bold">2× your bet</span>
                </div>
                <div className="flex justify-between text-muted-foreground text-xs pt-2 border-t border-border">
                  <span>Example: $5 card</span>
                  <span>Wins $10</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Scratch Card */}
        {(gameState === "playing" || gameState === "revealing" || gameState === "done") && (
          <div className="space-y-4 animate-scale-in">
            <div className="bg-card rounded-2xl border-2 border-[hsl(var(--casino-gold))/0.3] p-4 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--casino-gold))/0.05] via-transparent to-[hsl(var(--casino-pink))/0.05] pointer-events-none" />

              <div className="grid grid-cols-3 gap-2 relative" onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
                {card.map((cell, i) => (
                  <div
                    key={i}
                    className="relative aspect-square rounded-xl overflow-hidden bg-secondary border border-border"
                  >
                    <div className={`absolute inset-0 flex items-center justify-center text-4xl transition-transform duration-500 ${
                      cell.scratched || gameState === "done" ? "scale-100" : "scale-75"
                    }`}>
                      <span className={`${cell.scratched || gameState === "done" ? "animate-bounce" : ""}`} style={{ animationDelay: `${i * 80}ms`, animationDuration: "600ms" }}>
                        {cell.symbol}
                      </span>
                    </div>

                    {gameState !== "done" && (
                      <canvas
                        ref={(el) => { canvasRefs.current[i] = el; }}
                        width={200}
                        height={200}
                        className="absolute inset-0 w-full h-full cursor-pointer touch-none"
                        onMouseDown={() => handleMouseDown()}
                        onMouseMove={(e) => handleMouseMove(i, e)}
                        onTouchStart={() => {}}
                        onTouchMove={(e) => handleTouchMove(i, e)}
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
            {gameState === "done" && serverResult && (
              <div className={`rounded-2xl border-2 p-6 text-center animate-scale-in ${
                serverResult.is_winner
                  ? "border-[hsl(var(--casino-gold))] bg-gradient-to-b from-[hsl(var(--casino-gold))/0.1] to-card"
                  : "border-border bg-card"
              }`}>
                {serverResult.is_winner ? (
                  <>
                    <div className="text-5xl mb-2 animate-bounce">💰</div>
                    <p className="font-display text-2xl font-black text-[hsl(var(--casino-gold))]">
                      YOU WON ${serverResult.win_amount.toLocaleString()}!
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Winner! 2× your ${bet} bet
                    </p>
                  </>
                ) : (
                  <>
                    <p className="font-display text-xl font-bold text-muted-foreground">No Win</p>
                    <p className="text-sm text-muted-foreground mt-1">Better luck next time!</p>
                  </>
                )}

                <Button
                  variant="gold"
                  size="lg"
                  className="w-full mt-4 text-lg font-bold"
                  onClick={() => { setGameState("idle"); setCard([]); setServerResult(null); }}
                >
                  <RotateCcw className="h-5 w-5 mr-2" /> Play Again
                </Button>
              </div>
            )}
          </div>
        )}

        <div className="mt-4">
          <GameChat gameRoom="scratch-card" />
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
