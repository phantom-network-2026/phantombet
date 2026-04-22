import { motion } from "framer-motion";
import { SlotGame, SlotTheme } from "@/components/casino/SlotEngine";

// ===== Loading: shuffling card deck + flying chips =====
function RoyalFlushLoading({ progress }: { progress: number }) {
  const cards = ["A♠", "K♥", "Q♦", "J♣", "10♠"];
  return (
    <div className="absolute inset-0 z-50 bg-gradient-to-br from-[#1a0000] via-[#3b0a0a] to-black flex flex-col items-center justify-center overflow-hidden">
      {/* felt texture */}
      <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "radial-gradient(circle at 50% 50%, #4a0000 0%, transparent 70%)" }} />
      {/* poker chips flying */}
      {Array.from({ length: 14 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-6 h-6 rounded-full border-4 border-white/80"
          style={{
            left: `${(i * 13) % 90 + 5}%`,
            top: `${(i * 23) % 80 + 10}%`,
            background: i % 3 === 0 ? "#dc2626" : i % 3 === 1 ? "#1e40af" : "#15803d",
            boxShadow: "0 4px 8px rgba(0,0,0,0.6)",
          }}
          animate={{ y: [0, -30, 0], rotate: [0, 360] }}
          transition={{ duration: 2 + (i % 3), repeat: Infinity, delay: i * 0.15 }}
        />
      ))}
      {/* shuffling cards */}
      <div className="relative h-32 w-48 flex items-center justify-center">
        {cards.map((c, i) => (
          <motion.div
            key={i}
            className="absolute w-20 h-28 rounded-lg bg-white shadow-2xl border-2 border-yellow-400 flex items-center justify-center font-display font-black text-3xl"
            style={{ color: c.includes("♥") || c.includes("♦") ? "#dc2626" : "#000" }}
            animate={{
              x: [0, (i - 2) * 50, 0],
              y: [0, -20, 0],
              rotate: [(i - 2) * 5, (i - 2) * 15, (i - 2) * 5],
            }}
            transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.1 }}
          >
            {c}
          </motion.div>
        ))}
      </div>
      <h1 className="mt-6 font-display text-4xl font-black tracking-wider text-yellow-300" style={{ textShadow: "0 0 12px #ffaa00, 0 0 24px #ff5500" }}>
        ROYAL FLUSH
      </h1>
      <p className="text-yellow-200/80 text-xs uppercase tracking-[0.3em] mt-1 font-bold">Dealing the cards…</p>
      <div className="mt-6 w-64 h-2 bg-black/60 rounded-full overflow-hidden border-2 border-yellow-400">
        <motion.div className="h-full bg-gradient-to-r from-yellow-300 via-red-500 to-yellow-300" style={{ width: `${progress}%` }} animate={{ backgroundPositionX: ["0%", "100%"] }} transition={{ duration: 1, repeat: Infinity }} />
      </div>
      <p className="text-yellow-200/80 text-[10px] mt-2 font-mono font-bold">{Math.round(progress)}%</p>
    </div>
  );
}

const theme: SlotTheme = {
  title: "Royal Flush",
  slug: "royal-flush",
  shortLabel: "RF",
  topBarGradient: "from-red-950 via-red-800 to-red-950",
  topBarBorder: "border-yellow-400",
  bgGradient: "from-[#1a0000] via-[#3b0a0a] to-black",
  frameBorder: "border-yellow-400",
  frameBg: "from-[#3b0a0a] via-[#1a0000] to-black",
  accentText: "text-yellow-200",
  spinButtonGradient: "from-yellow-300 via-red-600 to-red-900",
  spinButtonBorder: "border-yellow-200",
  symbols: [
    { id: "ace_s",  emoji: "🂡", pay: [3, 12, 50, 200], weight: 1, tier: "premium", label: "Ace ♠" },
    { id: "king_h", emoji: "🂾", pay: [2.5, 10, 40, 150], weight: 4, tier: "premium", label: "King ♥" },
    { id: "queen_d",emoji: "🃎", pay: [2, 7, 25, 100], weight: 6, tier: "high",    label: "Queen ♦" },
    { id: "jack_c", emoji: "🃛", pay: [1.5, 5, 20, 80], weight: 7, tier: "high",  label: "Jack ♣" },
    { id: "ten",    emoji: "🔟", pay: [1.2, 4, 14, 50], weight: 9, tier: "mid",    label: "Ten" },
    { id: "chip_r", emoji: "🔴", pay: [1.2, 4, 14, 50], weight: 9, tier: "mid",    label: "Red Chip" },
    { id: "chip_b", emoji: "🔵", pay: [1, 3, 12, 40], weight: 10, tier: "mid",   label: "Blue Chip" },
    { id: "chip_g", emoji: "🟢", pay: [1, 3, 12, 40], weight: 10, tier: "mid",   label: "Green Chip" },
    { id: "spade",  emoji: "♠️", pay: [0.8, 2.5, 9, 30], weight: 12, tier: "low", label: "Spade" },
    { id: "heart",  emoji: "♥️", pay: [0.8, 2.5, 9, 30], weight: 12, tier: "low", label: "Heart" },
    { id: "diamond",emoji: "♦️", pay: [0.6, 2, 7, 22], weight: 13, tier: "low", label: "Diamond" },
    { id: "club",   emoji: "♣️", pay: [0.6, 2, 7, 22], weight: 13, tier: "low", label: "Club" },
    { id: "joker",  emoji: "🃏", pay: [5, 18, 70, 300], weight: 1, tier: "wild",  label: "WILD JOKER" },
  ],
  wildId: "joker",
  scatterId: "ace_s",
  bonusTitle: "POKER TOURNAMENT",
  bonusSubtitle: "Spin the deal-wheel for cash hands!",
  bonusBgGradient: "from-red-950 via-[#3b0a0a] to-black",
  bonusItemEmoji: "🎴",
  bonusEndEmoji: "💥",
  bonusEndMessage: "💥 Folded! Bonus ends.",
  bigWinGradient: "from-yellow-200 via-red-400 to-red-700",
  bigWinCoinEmoji: "🪙",
  jackpotColors: [
    "from-yellow-300 to-amber-600",
    "from-red-400 to-red-700",
    "from-fuchsia-400 to-purple-700",
    "from-emerald-400 to-emerald-700",
  ],
  loadingScreen: RoyalFlushLoading,
  emojiLeft: "♠️",
  emojiRight: "♥️",
  primaryHsl: "0 80% 55%",
  bonusType: "wheel",
  skin: "casino-felt",
};

export default function RoyalFlush() {
  return <SlotGame theme={theme} />;
}