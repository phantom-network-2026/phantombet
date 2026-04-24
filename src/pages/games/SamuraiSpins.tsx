import { motion } from "framer-motion";
import { SlotGame, SlotTheme } from "@/components/casino/SlotEngine";

function SamuraiLoading({ progress }: { progress: number }) {
  return (
    <div className="absolute inset-0 z-50 bg-gradient-to-b from-[#3a0610] via-[#1a0408] to-black flex flex-col items-center justify-center overflow-hidden">
      {/* falling cherry petals */}
      {Array.from({ length: 20 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute text-2xl"
          style={{ left: `${(i * 11) % 100}%` }}
          animate={{ y: ["-10%", "110%"], rotate: [0, 360], x: [0, 30, -30, 0] }}
          transition={{ duration: 6 + (i % 3), repeat: Infinity, delay: i * 0.2, ease: "linear" }}
        >
          🌸
        </motion.div>
      ))}
      {/* large rising sun disc */}
      <motion.div
        className="absolute w-72 h-72 rounded-full"
        style={{ background: "radial-gradient(circle, #f87171 0%, #dc2626 60%, transparent 100%)", boxShadow: "0 0 80px #ef4444" }}
        animate={{ scale: [0.95, 1.05, 0.95], opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 3, repeat: Infinity }}
      />
      <motion.div
        className="text-7xl relative"
        style={{ filter: "drop-shadow(0 0 18px #fbbf24)" }}
        animate={{ rotate: [-5, 5, -5] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        ⚔️
      </motion.div>
      <h1 className="mt-3 font-display text-4xl font-black tracking-wider text-amber-200 relative" style={{ textShadow: "0 0 18px #ef4444, 2px 2px 0 #000" }}>
        SAMURAI SPINS
      </h1>
      <p className="text-amber-200/80 text-xs uppercase tracking-[0.3em] mt-1 font-bold relative">Drawing the blade…</p>
      <div className="mt-6 w-64 h-2 bg-black/60 rounded-full overflow-hidden border-2 border-amber-400 relative">
        <div className="h-full bg-gradient-to-r from-amber-300 via-red-500 to-amber-300" style={{ width: `${progress}%` }} />
      </div>
      <p className="text-amber-200/80 text-[10px] mt-2 font-mono font-bold relative">{Math.round(progress)}%</p>
    </div>
  );
}

const theme: SlotTheme = {
  title: "Samurai Spins",
  slug: "samurai-spins",
  shortLabel: "侍",
  topBarGradient: "from-red-950 via-red-700 to-red-950",
  topBarBorder: "border-amber-300",
  bgGradient: "from-[#3a0610] via-[#1a0408] to-black",
  frameBorder: "border-amber-400",
  frameBg: "from-[#1a0408] via-[#3a0610] to-black",
  accentText: "text-amber-200",
  spinButtonGradient: "from-amber-300 via-red-600 to-red-900",
  spinButtonBorder: "border-amber-200",
  symbols: [
    { id: "katana",  emoji: "⚔️", pay: [5, 20, 80, 400], weight: 1, tier: "premium", label: "Katana" },
    { id: "samurai", emoji: "🥷", pay: [3, 12, 50, 200], weight: 4, tier: "premium", label: "Samurai" },
    { id: "helmet",  emoji: "⛑️", pay: [2, 7, 25, 100], weight: 6, tier: "high", label: "Kabuto" },
    { id: "fan",     emoji: "🪭", pay: [1.5, 5, 20, 80], weight: 7, tier: "high", label: "Fan" },
    { id: "dragon",  emoji: "🐉", pay: [1.2, 4, 14, 50], weight: 9, tier: "mid", label: "Dragon" },
    { id: "koi",     emoji: "🐟", pay: [1.2, 4, 14, 50], weight: 9, tier: "mid", label: "Koi" },
    { id: "lantern", emoji: "🏮", pay: [1, 3, 12, 40], weight: 10, tier: "mid", label: "Lantern" },
    { id: "torii",   emoji: "⛩️", pay: [1, 3, 12, 40], weight: 10, tier: "mid", label: "Torii" },
    { id: "sake",    emoji: "🍶", pay: [0.8, 2.5, 9, 30], weight: 12, tier: "low", label: "Sake" },
    { id: "blossom", emoji: "🌸", pay: [0.8, 2.5, 9, 30], weight: 12, tier: "low", label: "Sakura" },
    { id: "tea",     emoji: "🍵", pay: [0.6, 2, 7, 22], weight: 13, tier: "low", label: "Tea" },
    { id: "scroll",  emoji: "📜", pay: [0.6, 2, 7, 22], weight: 13, tier: "low", label: "Scroll" },
    { id: "sun",     emoji: "🌅", pay: [5, 18, 70, 300], weight: 1, tier: "wild", label: "WILD SUN" },
  ],
  wildId: "sun",
  scatterId: "katana",
  bonusTitle: "BUSHIDO BONUS",
  bonusSubtitle: "Choose stones in the zen garden — avoid the shuriken!",
  bonusBgGradient: "from-red-950 via-[#1a0408] to-black",
  bonusItemEmoji: "🪨",
  bonusEndEmoji: "🥷",
  bonusEndMessage: "🥷 The shadow strikes! Bonus ends.",
  bigWinGradient: "from-amber-200 via-red-400 to-red-700",
  bigWinCoinEmoji: "🌸",
  jackpotColors: [
    "from-amber-300 to-amber-700",
    "from-red-400 to-red-800",
    "from-pink-300 to-rose-700",
    "from-yellow-400 to-red-700",
  ],
  loadingScreen: SamuraiLoading,
  emojiLeft: "⚔️",
  emojiRight: "🌸",
  primaryHsl: "0 75% 55%",
  bonusType: "map",
  skin: "tablet",
};

export default function SamuraiSpins() {
  return <SlotGame theme={theme} />;
}