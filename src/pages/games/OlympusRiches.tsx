import { motion } from "framer-motion";
import { SlotGame, SlotTheme } from "@/components/casino/SlotEngine";

function OlympusLoading({ progress }: { progress: number }) {
  return (
    <div className="absolute inset-0 z-50 bg-gradient-to-b from-[#0a1840] via-[#1a1240] to-black flex flex-col items-center justify-center overflow-hidden">
      {/* lightning flashes */}
      {Array.from({ length: 6 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute h-full w-1 bg-yellow-200"
          style={{ left: `${10 + i * 15}%`, filter: "blur(2px)", boxShadow: "0 0 30px #fde047" }}
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 0.4, repeat: Infinity, delay: i * 0.7, repeatDelay: 2 }}
        />
      ))}
      {/* floating columns */}
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="absolute bottom-12 w-10 h-32 rounded-t-md bg-gradient-to-b from-stone-200 via-stone-400 to-stone-700 border-x-2 border-yellow-400/40"
          style={{ left: `${20 + i * 25}%` }}
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.3 }}
        />
      ))}
      <motion.div
        className="text-7xl"
        style={{ filter: "drop-shadow(0 0 24px #fde047)" }}
        animate={{ scale: [1, 1.15, 1], rotate: [-4, 4, -4] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        ⚡
      </motion.div>
      <h1 className="mt-3 font-display text-4xl font-black tracking-wider text-yellow-200" style={{ textShadow: "0 0 18px #fde047, 0 0 4px #fff" }}>
        OLYMPUS RICHES
      </h1>
      <p className="text-yellow-200/80 text-xs uppercase tracking-[0.3em] mt-1 font-bold">Summoning the gods…</p>
      <div className="mt-6 w-64 h-2 bg-black/60 rounded-full overflow-hidden border-2 border-yellow-400">
        <div className="h-full bg-gradient-to-r from-yellow-300 via-blue-400 to-yellow-300" style={{ width: `${progress}%` }} />
      </div>
      <p className="text-yellow-200/80 text-[10px] mt-2 font-mono font-bold">{Math.round(progress)}%</p>
    </div>
  );
}

const theme: SlotTheme = {
  title: "Olympus Riches",
  slug: "olympus-riches",
  shortLabel: "⚡",
  topBarGradient: "from-blue-950 via-yellow-700 to-blue-950",
  topBarBorder: "border-yellow-300",
  bgGradient: "from-[#0a1840] via-[#1a1240] to-black",
  frameBorder: "border-yellow-400",
  frameBg: "from-[#1a1240] via-[#0a1840] to-black",
  accentText: "text-yellow-200",
  spinButtonGradient: "from-yellow-300 via-yellow-500 to-blue-800",
  spinButtonBorder: "border-yellow-100",
  symbols: [
    { id: "zeus",    emoji: "⚡", pay: [5, 20, 80, 400], weight: 1, tier: "premium", label: "Zeus' Bolt" },
    { id: "crown",   emoji: "👑", pay: [3, 12, 50, 200], weight: 4, tier: "premium", label: "Crown" },
    { id: "harp",    emoji: "🎼", pay: [2, 7, 25, 100], weight: 6, tier: "high", label: "Lyre" },
    { id: "owl",     emoji: "🦉", pay: [1.5, 5, 20, 80], weight: 7, tier: "high", label: "Owl" },
    { id: "horse",   emoji: "🐎", pay: [1.2, 4, 14, 50], weight: 9, tier: "mid", label: "Pegasus" },
    { id: "amphora", emoji: "🏺", pay: [1.2, 4, 14, 50], weight: 9, tier: "mid", label: "Amphora" },
    { id: "olive",   emoji: "🫒", pay: [1, 3, 12, 40], weight: 10, tier: "mid", label: "Olive" },
    { id: "shield",  emoji: "🛡️", pay: [1, 3, 12, 40], weight: 10, tier: "mid", label: "Shield" },
    { id: "grape",   emoji: "🍇", pay: [0.8, 2.5, 9, 30], weight: 12, tier: "low", label: "Grape" },
    { id: "scroll",  emoji: "📜", pay: [0.8, 2.5, 9, 30], weight: 12, tier: "low", label: "Scroll" },
    { id: "torch",   emoji: "🔥", pay: [0.6, 2, 7, 22], weight: 13, tier: "low", label: "Flame" },
    { id: "feather", emoji: "🪶", pay: [0.6, 2, 7, 22], weight: 13, tier: "low", label: "Feather" },
    { id: "sun",     emoji: "☀️", pay: [5, 18, 70, 300], weight: 1, tier: "wild", label: "WILD SUN" },
  ],
  wildId: "sun",
  scatterId: "zeus",
  bonusTitle: "MOUNT OLYMPUS BONUS",
  bonusSubtitle: "Pick clouds to reveal the gods' favor — beware Hades!",
  bonusBgGradient: "from-blue-950 via-[#1a1240] to-black",
  bonusItemEmoji: "☁️",
  bonusEndEmoji: "💀",
  bonusEndMessage: "💀 Hades claims you! Bonus ends.",
  bigWinGradient: "from-yellow-200 via-yellow-400 to-amber-700",
  bigWinCoinEmoji: "⚡",
  jackpotColors: [
    "from-yellow-300 to-yellow-700",
    "from-blue-400 to-blue-800",
    "from-cyan-400 to-blue-700",
    "from-amber-400 to-rose-700",
  ],
  loadingScreen: OlympusLoading,
  emojiLeft: "⚡",
  emojiRight: "👑",
  primaryHsl: "48 95% 60%",
  bonusType: "wheel",
  skin: "cosmic",
};

export default function OlympusRiches() {
  return <SlotGame theme={theme} />;
}