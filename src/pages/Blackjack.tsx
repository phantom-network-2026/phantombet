import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/casino/Header";
import { BottomNav } from "@/components/casino/BottomNav";
import { GameChat } from "@/components/casino/GameChat";
import { AuthGuard } from "@/components/casino/AuthGuard";
import { Button } from "@/components/ui/button";
import { ArrowLeft, RotateCcw, Zap, Hand, Square } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

const SUITS = ["♠", "♥", "♦", "♣"];
const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
const BET_OPTIONS = [0.10, 0.20, 0.50, 1, 2, 5];

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

const isRed = (suit: string) => suit === "♥" || suit === "♦";

function PlayingCard({ card, index, flipping }: { card: Card; index: number; flipping?: boolean }) {
  if (card.hidden) {
    return (
      <motion.div
        initial={{ scale: 0, rotateY: 180 }}
        animate={{ scale: 1, rotateY: 0 }}
        transition={{ delay: index * 0.15, duration: 0.5, type: "spring", stiffness: 200 }}
        className="relative w-[4.5rem] h-[6.5rem] sm:w-24 sm:h-[8.5rem] rounded-xl overflow-hidden shadow-2xl shadow-black/40"
        style={{ perspective: "600px" }}
      >
        {/* Card back */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/80 to-[hsl(var(--casino-purple-light))] border-2 border-primary/50 rounded-xl" />
        <div className="absolute inset-2 rounded-lg border border-primary-foreground/10" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-primary-foreground/20 flex items-center justify-center">
            <span className="text-primary-foreground/30 font-black text-lg sm:text-xl">♠</span>
          </div>
        </div>
        {/* Subtle pattern */}
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(255,255,255,0.05) 5px, rgba(255,255,255,0.05) 10px)"
        }} />
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={flipping ? { rotateY: 180 } : { scale: 0, y: -60, opacity: 0 }}
      animate={{ scale: 1, y: 0, rotateY: 0, opacity: 1 }}
      transition={{ delay: flipping ? 0 : index * 0.15, duration: 0.5, type: "spring", stiffness: 200 }}
      whileHover={{ y: -4, scale: 1.03 }}
      className="relative w-[4.5rem] h-[6.5rem] sm:w-24 sm:h-[8.5rem] rounded-xl overflow-hidden shadow-2xl shadow-black/40 cursor-default"
    >
      {/* Card face */}
      <div className="absolute inset-0 bg-gradient-to-b from-white to-gray-100 border-2 border-white/20 rounded-xl" />
      
      {/* Top left rank + suit */}
      <div className="absolute top-1.5 left-2 flex flex-col items-center leading-none">
        <span className={`text-sm sm:text-base font-black ${isRed(card.suit) ? "text-red-600" : "text-gray-900"}`}>
          {card.rank}
        </span>
        <span className={`text-xs sm:text-sm ${isRed(card.suit) ? "text-red-600" : "text-gray-900"}`}>
          {card.suit}
        </span>
      </div>

      {/* Center suit large */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={`text-3xl sm:text-4xl ${isRed(card.suit) ? "text-red-600" : "text-gray-900"} drop-shadow-sm`}>
          {card.suit}
        </span>
      </div>

      {/* Bottom right rank + suit (rotated) */}
      <div className="absolute bottom-1.5 right-2 flex flex-col items-center leading-none rotate-180">
        <span className={`text-sm sm:text-base font-black ${isRed(card.suit) ? "text-red-600" : "text-gray-900"}`}>
          {card.rank}
        </span>
        <span className={`text-xs sm:text-sm ${isRed(card.suit) ? "text-red-600" : "text-gray-900"}`}>
          {card.suit}
        </span>
      </div>

      {/* Gloss effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-transparent rounded-xl pointer-events-none" />
    </motion.div>
  );
}

type GameState = "betting" | "playing" | "dealer" | "result";

export default function Blackjack() {
  return <AuthGuard><BlackjackInner /></AuthGuard>;
}

function BlackjackInner() {
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

  const deal = async () => {
    if (bet > balance) { toast.error("Insufficient balance"); return; }

    // force_loss is now enforced server-side only
    const forceActive = false;

    let newDeck = createDeck();

    if (forceActive) {
      // Rig deck: put high cards on top for dealer, low cards for player
      const highCards = newDeck.filter(c => ["10", "J", "Q", "K", "A"].includes(c.rank));
      const lowCards = newDeck.filter(c => ["2", "3", "4", "5", "6"].includes(c.rank));
      const rest = newDeck.filter(c => !highCards.includes(c) && !lowCards.includes(c));
      // Player gets low, dealer gets high: deal order is p,p,d,d from end
      newDeck = [...rest, ...highCards.slice(0, 2), ...lowCards.slice(0, 2)];
    }

    const pCards = [newDeck.pop()!, newDeck.pop()!];
    const dCards = [newDeck.pop()!, { ...newDeck.pop()!, hidden: true }];
    setDeck(newDeck);
    setPlayerHand(pCards);
    setDealerHand(dCards);
    setGameState("playing");
    setResult("");
    setWinAmount(0);
    setDealerRevealed(false);

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
    if (bestScore(newHand) > 21) revealDealer(newHand, newDeck);
  };

  const stand = () => revealDealer(playerHand, deck);

  const doubleDown = () => {
    if (bet * 2 > balance) { toast.error("Insufficient balance to double down"); return; }
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
    let dHand: Card[] = dealerHand.map((c) => ({ suit: c.suit, rank: c.rank, hidden: false }));
    setDealerHand(dHand);
    setDealerRevealed(true);

    const playerScore = bestScore(pHand);
    if (playerScore > 21) { finishGame("bust", -activeBet, currentDeck); return; }

    const newDeck = [...currentDeck];
    const drawDealer = () => {
      let hand = [...dHand];
      while (bestScore(hand) < 17) hand.push(newDeck.pop()!);
      setDealerHand(hand);
      setDeck(newDeck);

      const dealerScore = bestScore(hand);
      if (dealerScore > 21) finishGame("dealer_bust", activeBet, newDeck);
      else if (dealerScore > playerScore) finishGame("lose", -activeBet, newDeck);
      else if (dealerScore < playerScore) finishGame("win", activeBet, newDeck);
      else finishGame("push", 0, newDeck);
    };

    setTimeout(drawDealer, 600);
  };

  const finishGame = async (outcome: string, amount: number, _deck: Card[]) => {
    setGameState("result");
    setWinAmount(amount);

    const messages: Record<string, string> = {
      blackjack: "BLACKJACK!",
      win: "You Win!",
      dealer_bust: "Dealer Busts!",
      lose: "Dealer Wins",
      bust: "Bust!",
      push: "Push — Tie",
    };
    setResult(messages[outcome] || "Game over");

    if (!user || amount === 0) return;
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
  const dealerScore = bestScore(dealerHand);
  const isWin = winAmount > 0;
  const isLoss = winAmount < 0;

  return (
    <div className="min-h-screen gradient-casino-bg pb-20 md:pb-0">
      <Header />
      <div className="container max-w-2xl py-4 px-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-2">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>

        {/* Table */}
        <div className="relative rounded-3xl overflow-hidden border border-[hsl(var(--casino-green))/0.3]">
          {/* Felt background */}
          <div className="absolute inset-0 bg-gradient-to-b from-[hsl(145,50%,18%)] via-[hsl(145,45%,15%)] to-[hsl(145,50%,12%)]" />
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='20' height='20' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='1' cy='1' r='1' fill='white'/%3E%3C/svg%3E\")",
            backgroundSize: "20px 20px"
          }} />

          {/* Glow edges */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2/3 h-px bg-gradient-to-r from-transparent via-[hsl(var(--casino-gold))/0.4] to-transparent" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2/3 h-px bg-gradient-to-r from-transparent via-[hsl(var(--casino-gold))/0.4] to-transparent" />

          <div className="relative p-4 sm:p-6 space-y-4">
            {/* Title & Balance Bar */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-display text-xl sm:text-2xl font-black text-white tracking-tight">
                  ♠ Blackjack
                </h1>
                <p className="text-[10px] sm:text-xs text-white/40 font-medium">Max bet: $5</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <div className="bg-black/30 backdrop-blur-sm rounded-full px-3 py-1 border border-white/10">
                  <span className="text-xs text-white/50">Balance</span>
                  <span className="text-sm font-bold text-[hsl(var(--casino-gold))] ml-1.5">${balance.toLocaleString()}</span>
                </div>
                {gameState !== "betting" && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-[hsl(var(--casino-gold))/0.15] backdrop-blur-sm rounded-full px-3 py-0.5 border border-[hsl(var(--casino-gold))/0.3]"
                  >
                    <span className="text-xs text-[hsl(var(--casino-gold))] font-bold">Bet: ${bet.toLocaleString()}</span>
                  </motion.div>
                )}
              </div>
            </div>

            {/* Dealer Section */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                <h3 className="text-xs font-bold text-white/60 uppercase tracking-widest">Dealer</h3>
                {dealerHand.length > 0 && (
                  <motion.span
                    key={dealerScore}
                    initial={{ scale: 1.3 }}
                    animate={{ scale: 1 }}
                    className="ml-auto bg-black/40 rounded-full px-2.5 py-0.5 text-xs font-bold text-white/90 border border-white/10"
                  >
                    {dealerHand.some((c) => c.hidden) ? "?" : dealerScore}
                  </motion.span>
                )}
              </div>
              <div className="flex gap-2 sm:gap-3 justify-center min-h-[7rem] sm:min-h-[9rem] items-center">
                <AnimatePresence>
                  {dealerHand.map((card, i) => (
                    <PlayingCard key={`d-${i}-${card.rank}-${card.suit}`} card={card} index={i} flipping={dealerRevealed && i === 1} />
                  ))}
                </AnimatePresence>
                {dealerHand.length === 0 && (
                  <div className="text-white/10 text-sm font-medium">Waiting for deal...</div>
                )}
              </div>
            </div>

            {/* Divider with result */}
            <div className="relative flex items-center justify-center py-1">
              <div className="absolute inset-x-0 top-1/2 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              <AnimatePresence>
                {gameState === "result" && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 300 }}
                    className={`relative z-10 rounded-2xl px-5 py-2.5 text-center backdrop-blur-md border ${
                      isWin
                        ? "bg-[hsl(var(--casino-gold))/0.2] border-[hsl(var(--casino-gold))/0.5]"
                        : isLoss
                        ? "bg-red-500/15 border-red-500/30"
                        : "bg-white/10 border-white/20"
                    }`}
                  >
                    <p className={`font-display text-lg sm:text-xl font-black ${
                      isWin ? "text-[hsl(var(--casino-gold))]" : isLoss ? "text-red-400" : "text-white"
                    }`}>
                      {result}
                    </p>
                    {winAmount !== 0 && (
                      <motion.p
                        initial={{ y: 5, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className={`text-sm font-bold ${isWin ? "text-[hsl(var(--casino-green))]" : "text-red-400"}`}
                      >
                        {isWin ? "+" : ""}{winAmount >= 0 ? "$" : "-$"}{Math.abs(winAmount).toLocaleString()}
                      </motion.p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Player Section */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--casino-green))]" />
                <h3 className="text-xs font-bold text-white/60 uppercase tracking-widest">Your Hand</h3>
                {playerHand.length > 0 && (
                  <motion.span
                    key={playerScore}
                    initial={{ scale: 1.3 }}
                    animate={{ scale: 1 }}
                    className={`ml-auto rounded-full px-2.5 py-0.5 text-xs font-bold border ${
                      playerScore > 21
                        ? "bg-red-500/20 text-red-400 border-red-500/30"
                        : playerScore === 21
                        ? "bg-[hsl(var(--casino-gold))/0.2] text-[hsl(var(--casino-gold))] border-[hsl(var(--casino-gold))/0.3]"
                        : "bg-black/40 text-white/90 border-white/10"
                    }`}
                  >
                    {playerScore}
                  </motion.span>
                )}
              </div>
              <div className="flex gap-2 sm:gap-3 justify-center min-h-[7rem] sm:min-h-[9rem] items-center">
                <AnimatePresence>
                  {playerHand.map((card, i) => (
                    <PlayingCard key={`p-${i}-${card.rank}-${card.suit}`} card={card} index={i} />
                  ))}
                </AnimatePresence>
                {playerHand.length === 0 && (
                  <div className="text-white/10 text-sm font-medium">Place your bet to begin</div>
                )}
              </div>
            </div>

            {/* Controls */}
            {gameState === "betting" && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4 pt-2"
              >
                <div className="text-center">
                  <p className="text-xs text-white/40 font-medium uppercase tracking-wider mb-3">Select Bet</p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {BET_OPTIONS.map((b) => (
                      <motion.button
                        key={b}
                        whileHover={{ scale: 1.08 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setBet(b)}
                        disabled={b > balance}
                        className={`relative px-3 sm:px-4 py-2 rounded-xl text-sm font-bold transition-all duration-200 ${
                          bet === b
                            ? "bg-gradient-to-b from-[hsl(var(--casino-gold))] to-[hsl(var(--casino-gold-light))] text-[hsl(var(--accent-foreground))] shadow-lg shadow-[hsl(var(--casino-gold))/0.3] ring-2 ring-[hsl(var(--casino-gold))/0.5]"
                            : "bg-black/30 text-white/70 hover:text-white border border-white/10 hover:border-white/20 disabled:opacity-20 disabled:cursor-not-allowed"
                        }`}
                      >
                        ${b >= 1000 ? `${b / 1000}k` : b}
                      </motion.button>
                    ))}
                  </div>
                </div>
                <Button
                  variant="gold"
                  size="lg"
                  className="w-full text-base font-black tracking-wide h-12"
                  onClick={deal}
                  disabled={!user || bet > balance}
                >
                  {user ? `Deal — $${bet.toLocaleString()}` : "Sign in to Play"}
                </Button>
              </motion.div>
            )}

            {gameState === "playing" && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-3 justify-center pt-2"
              >
                <Button
                  onClick={hit}
                  className="bg-[hsl(var(--casino-green))] hover:bg-[hsl(var(--casino-green))]/90 text-white font-bold px-6 h-11 rounded-xl shadow-lg shadow-[hsl(var(--casino-green))]/20"
                >
                  <Hand className="h-4 w-4 mr-1.5" /> Hit
                </Button>
                <Button
                  onClick={stand}
                  className="bg-white/10 hover:bg-white/20 text-white font-bold px-6 h-11 rounded-xl border border-white/20"
                >
                  <Square className="h-4 w-4 mr-1.5" /> Stand
                </Button>
                {playerHand.length === 2 && bet * 2 <= balance && (
                  <Button
                    onClick={doubleDown}
                    className="bg-[hsl(var(--casino-gold))/0.2] hover:bg-[hsl(var(--casino-gold))/0.3] text-[hsl(var(--casino-gold))] font-bold px-5 h-11 rounded-xl border border-[hsl(var(--casino-gold))/0.3]"
                  >
                    <Zap className="h-4 w-4 mr-1.5" /> Double
                  </Button>
                )}
              </motion.div>
            )}

            {gameState === "result" && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-center pt-2"
              >
                <Button
                  variant="gold"
                  size="lg"
                  className="px-8 h-11 font-bold"
                  onClick={() => { setGameState("betting"); setPlayerHand([]); setDealerHand([]); }}
                >
                  <RotateCcw className="h-4 w-4 mr-2" /> New Game
                </Button>
              </motion.div>
            )}
          </div>
        </div>

        <div className="mt-4">
          <GameChat gameRoom="blackjack" />
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
