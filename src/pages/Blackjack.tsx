import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/casino/Header";
import { BottomNav } from "@/components/casino/BottomNav";
import { Button } from "@/components/ui/button";
import { ArrowLeft, RotateCcw } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

const SUITS = ["♠", "♥", "♦", "♣"];
const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
const BET_OPTIONS = [10, 25, 50, 100, 250, 500, 1000, 5000, 10000];

interface Card {
  suit: string;
  rank: string;
  hidden?: boolean;
}

function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank });
    }
  }
  // Shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function cardValue(card: Card): number[] {
  if (["J", "Q", "K"].includes(card.rank)) return [10];
  if (card.rank === "A") return [1, 11];
  return [parseInt(card.rank)];
}

function bestScore(cards: Card[]): number {
  let totals = [0];
  for (const card of cards) {
    if (card.hidden) continue;
    const vals = cardValue(card);
    const next: number[] = [];
    for (const t of totals) {
      for (const v of vals) next.push(t + v);
    }
    totals = next;
  }
  const valid = totals.filter((t) => t <= 21);
  return valid.length > 0 ? Math.max(...valid) : Math.min(...totals);
}

function isBlackjack(cards: Card[]): boolean {
  return cards.length === 2 && bestScore(cards) === 21;
}

const suitColor = (suit: string) =>
  suit === "♥" || suit === "♦" ? "text-red-500" : "text-foreground";

function PlayingCard({ card, index, flipping }: { card: Card; index: number; flipping?: boolean }) {
  if (card.hidden) {
    return (
      <motion.div
        initial={{ scale: 0, rotateY: 180 }}
        animate={{ scale: 1, rotateY: 0 }}
        transition={{ delay: index * 0.15, duration: 0.4, type: "spring" }}
        className="w-16 h-24 sm:w-20 sm:h-28 rounded-lg bg-gradient-to-br from-primary to-primary/60 border-2 border-primary/40 flex items-center justify-center shadow-lg"
      >
        <span className="text-2xl font-bold text-primary-foreground/30">?</span>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={flipping ? { rotateY: 180 } : { scale: 0, y: -50 }}
      animate={{ scale: 1, y: 0, rotateY: 0 }}
      transition={{ delay: flipping ? 0 : index * 0.15, duration: 0.4, type: "spring" }}
      className="w-16 h-24 sm:w-20 sm:h-28 rounded-lg bg-card border-2 border-border flex flex-col items-center justify-between p-1.5 shadow-lg"
    >
      <span className={`text-xs sm:text-sm font-bold self-start ${suitColor(card.suit)}`}>
        {card.rank}
      </span>
      <span className={`text-xl sm:text-2xl ${suitColor(card.suit)}`}>{card.suit}</span>
      <span className={`text-xs sm:text-sm font-bold self-end rotate-180 ${suitColor(card.suit)}`}>
        {card.rank}
      </span>
    </motion.div>
  );
}

type GameState = "betting" | "playing" | "dealer" | "result";

export default function Blackjack() {
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();
  const [bet, setBet] = useState(10);
  const [deck, setDeck] = useState<Card[]>([]);
  const [playerHand, setPlayerHand] = useState<Card[]>([]);
  const [dealerHand, setDealerHand] = useState<Card[]>([]);
  const [gameState, setGameState] = useState<GameState>("betting");
  const [result, setResult] = useState("");
  const [winAmount, setWinAmount] = useState(0);
  const [dealerRevealed, setDealerRevealed] = useState(false);

  const balance = profile?.balance ?? 0;

  const deal = () => {
    if (bet > balance) {
      toast.error("Insufficient balance");
      return;
    }
    const newDeck = createDeck();
    const pCards = [newDeck.pop()!, newDeck.pop()!];
    const dCards = [newDeck.pop()!, { ...newDeck.pop()!, hidden: true }];
    setDeck(newDeck);
    setPlayerHand(pCards);
    setDealerHand(dCards);
    setGameState("playing");
    setResult("");
    setWinAmount(0);
    setDealerRevealed(false);

    // Check for player blackjack
    if (isBlackjack(pCards)) {
      const revealedDealer = dCards.map((c) => ({ suit: c.suit, rank: c.rank, hidden: false }));
      setDealerHand(revealedDealer);
      setDealerRevealed(true);
      if (isBlackjack(revealedDealer)) {
        finishGame("push", 0, newDeck);
      } else {
        finishGame("blackjack", Math.floor(bet * 1.5), newDeck);
      }
    }
  };

  const hit = () => {
    const newDeck = [...deck];
    const newHand = [...playerHand, newDeck.pop()!];
    setDeck(newDeck);
    setPlayerHand(newHand);

    if (bestScore(newHand) > 21) {
      revealDealer(newHand, newDeck);
    }
  };

  const stand = () => {
    revealDealer(playerHand, deck);
  };

  const doubleDown = () => {
    if (bet * 2 > balance) {
      toast.error("Insufficient balance to double down");
      return;
    }
    const newDeck = [...deck];
    const newHand = [...playerHand, newDeck.pop()!];
    setBet((prev) => prev * 2);
    setDeck(newDeck);
    setPlayerHand(newHand);
    revealDealer(newHand, newDeck, bet * 2);
  };

  const revealDealer = (pHand: Card[], currentDeck: Card[], currentBet?: number) => {
    setGameState("dealer");
    const activeBet = currentBet ?? bet;
    let dHand = dealerHand.map((c) => ({ ...c, hidden: false }));
    setDealerHand(dHand);
    setDealerRevealed(true);

    const playerScore = bestScore(pHand);
    if (playerScore > 21) {
      finishGame("bust", -activeBet, currentDeck);
      return;
    }

    // Dealer draws
    const newDeck = [...currentDeck];
    const drawDealer = () => {
      let hand = [...dHand];
      while (bestScore(hand) < 17) {
        hand.push(newDeck.pop()!);
      }
      setDealerHand(hand);
      setDeck(newDeck);

      const dealerScore = bestScore(hand);
      if (dealerScore > 21) {
        finishGame("dealer_bust", activeBet, newDeck);
      } else if (dealerScore > playerScore) {
        finishGame("lose", -activeBet, newDeck);
      } else if (dealerScore < playerScore) {
        finishGame("win", activeBet, newDeck);
      } else {
        finishGame("push", 0, newDeck);
      }
    };

    setTimeout(drawDealer, 600);
  };

  const finishGame = async (outcome: string, amount: number, _deck: Card[]) => {
    setGameState("result");
    setWinAmount(amount);

    const messages: Record<string, string> = {
      blackjack: "🎉 BLACKJACK! You win!",
      win: "🎉 You win!",
      dealer_bust: "🎉 Dealer busts! You win!",
      lose: "😔 Dealer wins",
      bust: "💥 Bust! You lose",
      push: "🤝 Push - It's a tie!",
    };
    setResult(messages[outcome] || "Game over");

    if (!user || amount === 0) return;

    // Update balance via admin edge function won't work for game wins
    // Use RPC or direct update - but balance is protected, so we use a transaction record
    // For demo: record the transaction and update balance via service role
    try {
      const { error } = await supabase.functions.invoke("game-settle", {
        body: { userId: user.id, amount, gameType: "blackjack", outcome },
      });
      if (error) throw error;
      await refreshProfile();
    } catch {
      toast.error("Failed to settle bet");
    }
  };

  const playerScore = bestScore(playerHand);
  const dealerScore = dealerRevealed ? bestScore(dealerHand) : bestScore(dealerHand);

  return (
    <div className="min-h-screen gradient-casino-bg pb-20 md:pb-0">
      <Header />
      <div className="container max-w-2xl py-4 px-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>

        <div className="rounded-2xl bg-card border border-border p-4 sm:p-6 space-y-6">
          <div className="text-center">
            <h1 className="font-display text-2xl font-black text-gold">♠ Blackjack ♠</h1>
            <p className="text-sm text-muted-foreground">Max bet: 10,000</p>
          </div>

          {/* Dealer Hand */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-muted-foreground">Dealer</h3>
              {dealerHand.length > 0 && (
                <span className="text-sm font-bold">
                  {dealerHand.some((c) => c.hidden) ? "?" : dealerScore}
                </span>
              )}
            </div>
            <div className="flex gap-2 justify-center min-h-[7rem]">
              <AnimatePresence>
                {dealerHand.map((card, i) => (
                  <PlayingCard key={`d-${i}`} card={card} index={i} flipping={dealerRevealed && i === 1} />
                ))}
              </AnimatePresence>
            </div>
          </div>

          {/* Result */}
          <AnimatePresence>
            {gameState === "result" && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-center py-3"
              >
                <p className="font-display text-xl font-black">{result}</p>
                {winAmount !== 0 && (
                  <p className={`text-lg font-bold ${winAmount > 0 ? "text-green-400" : "text-red-400"}`}>
                    {winAmount > 0 ? "+" : ""}{winAmount.toLocaleString()} coins
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Player Hand */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-muted-foreground">Your Hand</h3>
              {playerHand.length > 0 && (
                <span className={`text-sm font-bold ${playerScore > 21 ? "text-red-400" : ""}`}>
                  {playerScore}
                </span>
              )}
            </div>
            <div className="flex gap-2 justify-center min-h-[7rem]">
              <AnimatePresence>
                {playerHand.map((card, i) => (
                  <PlayingCard key={`p-${i}`} card={card} index={i} />
                ))}
              </AnimatePresence>
            </div>
          </div>

          {/* Controls */}
          {gameState === "betting" && (
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">Select your bet</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {BET_OPTIONS.map((b) => (
                    <button
                      key={b}
                      onClick={() => setBet(b)}
                      disabled={b > balance}
                      className={`px-3 py-1.5 rounded-full text-sm font-bold transition-all ${
                        bet === b
                          ? "gradient-gold text-accent-foreground glow-gold"
                          : "bg-secondary text-muted-foreground hover:text-foreground disabled:opacity-30"
                      }`}
                    >
                      {b >= 1000 ? `${b / 1000}k` : b}
                    </button>
                  ))}
                </div>
              </div>
              <Button
                variant="gold"
                size="lg"
                className="w-full"
                onClick={deal}
                disabled={!user || bet > balance}
              >
                {user ? `Deal - Bet ${bet.toLocaleString()}` : "Sign in to Play"}
              </Button>
            </div>
          )}

          {gameState === "playing" && (
            <div className="flex gap-3 justify-center">
              <Button variant="gold" onClick={hit}>Hit</Button>
              <Button variant="outline" onClick={stand}>Stand</Button>
              {playerHand.length === 2 && bet * 2 <= balance && (
                <Button variant="outline" onClick={doubleDown}>Double</Button>
              )}
            </div>
          )}

          {gameState === "result" && (
            <div className="flex gap-3 justify-center">
              <Button variant="gold" onClick={() => { setGameState("betting"); setPlayerHand([]); setDealerHand([]); }}>
                <RotateCcw className="h-4 w-4 mr-2" /> New Game
              </Button>
            </div>
          )}
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
