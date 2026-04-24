import { motion } from "framer-motion";
import { SlotGame, SlotTheme } from "@/components/casino/SlotEngine";

function DragonLoading({ progress }: { progress: number }) {
  return (
    <div className="absolute inset-0 z-50 bg-gradient-to-b from-[#3a0606] via-[#1a0202] to-black flex flex-col items-center justify-center overflow-hidden">
      {/* hanging lanterns swaying */}
      {[10, 30, 50, 70, 90].map((x, i) => (
        <motion.div
          key={i}
          className="absolute top-2 text-4xl"
          style={{ left: `${x}%` }}
          animate={{ rotate: [-8, 8, -8] }}
          transition={{ duration: 3 + i * 0.2, repeat: Infinity, ease: "easeInOut" }}
        >
          🏮
        </motion.div>
      ))}
      {/* coiled dragon */}
      <motion.div
        className="text-7xl"
        style={{ filter: "drop-shadow(0 0 22px #facc15)" }}
        animate={{ scale: [1, 1.12, 1], rotate: [-4, 4, -4] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        🐉
      </motion.div>
      <h1 className="mt-3 font-display text-4xl font-black tracking-wider text-amber-300" style={{ textShadow: "0 0 18px #facc15, 0 0 4px #ef4444" }}>
        DRAGON HOARD
      </h1>
      <p className="text-amber-200/80 text-xs uppercase tracking-[0.3em] mt-1 font-bold">Awakening the dragon…</p>
      <div className="mt-6 w-64 h-2 bg-black/60 rounded-full overflow-hidden border-2 border-amber-400">
        <div className="h-full bg-gradient-to-r from-amber-300 via-red-500 to-amber-300" style={{ width: `${progress}%` }} />
      </div>
      <p className="text-amber-200/80 text-[10px] mt-2 font-mono font-bold">{Math.round(progress)}%</p>
    </div>
  );
}

const theme: SlotTheme = {
  title: "Dragon Hoard",
  slug: "dragon-hoard",
  shortLabel: "🐉",
  topBarGradient: "from-red-950 via-amber-700 to-red-950",
  topBarBorder: "border-amber-300",
  bgGradient: "from-[#3a0606] via-[#1a0202] to-black",
  frameBorder: "border-amber-500",
  frameBg: "from-[#1a0202] via-[#3a0606] to-black",
  accentText: "text-amber-300",
  spinButtonGradient: "from-amber-300 via-red-600 to-red-900",
  spinButtonBorder: "border-amber-200",
  symbols: [
    { id: "dragon",  emoji: "🐉", pay: [5, 20, 80, 400], weight: 1, tier: "premium", label: "Dragon" },
    { id: "ingot",   emoji: "💰", pay: [3, 12, 50, 200], weight: 4, tier: "premium", label: "Gold Ingot" },
    { id: "jade",    emoji: "💚", pay: [2, 7, 25, 100], weight: 6, tier: "high", label: "Jade" },
    { id: "ruby",    emoji: "❤️", pay: [1.5, 5, 20, 80], weight: 7, tier: "high", label: "Ruby" },
    { id: "phoenix", emoji: "🦅", pay: [1.2, 4, 14, 50], weight: 9, tier: "mid", label: "Phoenix" },
    { id: "tiger",   emoji: "🐯", pay: [1.2, 4, 14, 50], weight: 9, tier: "mid", label: "Tiger" },
    { id: "lantern", emoji: "🏮", pay: [1, 3, 12, 40], weight: 10, tier: "mid", label: "Lantern" },
    { id: "fan",     emoji: "🪭", pay: [1, 3, 12, 40], weight: 10, tier: "mid", label: "Fan" },
    { id: "coin",    emoji: "🪙", pay: [0.8, 2.5, 9, 30], weight: 12, tier: "low", label: "Coin" },
    { id: "scroll",  emoji: "📜", pay: [0.8, 2.5, 9, 30], weight: 12, tier: "low", label: "Scroll" },
    { id: "tea",     emoji: "🍵", pay: [0.6, 2, 7, 22], weight: 13, tier: "low", label: "Tea" },
    { id: "fish",    emoji: "🐟", pay: [0.6, 2, 7, 22], weight: 13, tier: "low", label: "Carp" },
    { id: "yang",    emoji: "☯️", pay: [5, 18, 70, 300], weight: 1, tier: "wild", label: "WILD YIN" },
  ],
  wildId: "yang",
  scatterId: "dragon",
  bonusTitle: "DRAGON'S LAIR",
  bonusSubtitle: "Smash the gates to claim the hoard — beware the dragonfire!",
  bonusBgGradient: "from-red-950 via-[#1a0202] to-black",
  bonusItemEmoji: "🚪",
  bonusEndEmoji: "🔥",
  bonusEndMessage: "🔥 Dragonfire! The hoard burns away.",
  bigWinGradient: "from-amber-200 via-amber-400 to-red-700",
  bigWinCoinEmoji: "🪙",
  jackpotColors: [
    "from-amber-300 to-red-700",
    "from-yellow-400 to-amber-700",
    "from-red-400 to-rose-800",
    "from-orange-400 to-red-800",
  ],
  loadingScreen: DragonLoading,
  emojiLeft: "🐉",
  emojiRight: "🏮",
  primaryHsl: "10 85% 55%",
  bonusType: "siege",
  skin: "fortress",
};

export default function DragonHoard() {
  return <SlotGame theme={theme} />;
}