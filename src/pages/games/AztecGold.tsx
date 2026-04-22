import { motion } from "framer-motion";
import { SlotGame, SlotTheme } from "@/components/casino/SlotEngine";

// ===== Loading: temple stones rising + glowing glyphs =====
function AztecGoldLoading({ progress }: { progress: number }) {
  return (
    <div className="absolute inset-0 z-50 bg-gradient-to-b from-[#0a2818] via-[#3a2a0a] to-black flex flex-col items-center justify-center overflow-hidden">
      {/* jungle leaves */}
      {["🌿","🍃","🌴","🌿","🍃"].map((l, i) => (
        <motion.div
          key={i}
          className="absolute text-5xl opacity-60"
          style={{ left: `${i * 22 + 5}%`, top: `${(i % 2) * 70 + 5}%` }}
          animate={{ rotate: [-10, 10, -10], y: [0, -8, 0] }}
          transition={{ duration: 3 + i * 0.4, repeat: Infinity }}
        >
          {l}
        </motion.div>
      ))}
      {/* rising stone blocks */}
      <div className="relative w-64 h-32 mb-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-md bg-gradient-to-b from-yellow-700 to-yellow-900 border-2 border-yellow-500/50"
            style={{
              width: `${100 - i * 15}%`,
              height: 18,
              left: `${i * 7.5}%`,
              bottom: i * 22,
              boxShadow: "inset 0 -3px 0 rgba(0,0,0,0.4)",
            }}
            animate={{ y: [20, 0], opacity: [0, 1] }}
            transition={{ duration: 1, delay: i * 0.2, repeat: Infinity, repeatDelay: 1.5 }}
          />
        ))}
      </div>
      {/* glowing mask */}
      <motion.div
        className="text-7xl"
        style={{ filter: "drop-shadow(0 0 18px #fbbf24)" }}
        animate={{ scale: [1, 1.1, 1], rotate: [-3, 3, -3] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        🗿
      </motion.div>
      <h1 className="mt-3 font-display text-4xl font-black tracking-wider text-amber-300" style={{ textShadow: "0 0 14px #f59e0b" }}>
        AZTEC GOLD
      </h1>
      <p className="text-amber-200/80 text-xs uppercase tracking-[0.3em] mt-1 font-bold">Awakening the temple…</p>
      <div className="mt-6 w-64 h-2 bg-black/60 rounded-full overflow-hidden border-2 border-amber-500">
        <motion.div className="h-full bg-gradient-to-r from-amber-300 via-emerald-400 to-amber-300" style={{ width: `${progress}%` }} animate={{ backgroundPositionX: ["0%", "100%"] }} transition={{ duration: 1, repeat: Infinity }} />
      </div>
      <p className="text-amber-200/80 text-[10px] mt-2 font-mono font-bold">{Math.round(progress)}%</p>
    </div>
  );
}

const theme: SlotTheme = {
  title: "Aztec Gold",
  slug: "aztec-gold",
  shortLabel: "AZ",
  topBarGradient: "from-emerald-900 via-amber-700 to-emerald-900",
  topBarBorder: "border-amber-300",
  bgGradient: "from-[#0a2818] via-[#3a2a0a] to-black",
  frameBorder: "border-amber-400",
  frameBg: "from-[#3a2a0a] via-[#0a2818] to-black",
  accentText: "text-amber-200",
  spinButtonGradient: "from-amber-300 via-emerald-600 to-emerald-900",
  spinButtonBorder: "border-amber-200",
  symbols: [
    { id: "mask",   emoji: "🗿", pay: [3, 12, 50, 200], weight: 1, tier: "premium", label: "Sun Mask" },
    { id: "idol",   emoji: "👑", pay: [2.5, 10, 40, 150], weight: 4, tier: "premium", label: "Idol" },
    { id: "jade",   emoji: "💚", pay: [2, 7, 25, 100], weight: 6, tier: "high",    label: "Jade" },
    { id: "ruby",   emoji: "❤️", pay: [1.5, 5, 20, 80], weight: 7, tier: "high",  label: "Ruby" },
    { id: "snake",  emoji: "🐍", pay: [1.2, 4, 14, 50], weight: 9, tier: "mid",    label: "Serpent" },
    { id: "jaguar", emoji: "🐆", pay: [1.2, 4, 14, 50], weight: 9, tier: "mid",    label: "Jaguar" },
    { id: "eagle",  emoji: "🦅", pay: [1, 3, 12, 40], weight: 10, tier: "mid",   label: "Eagle" },
    { id: "frog",   emoji: "🐸", pay: [1, 3, 12, 40], weight: 10, tier: "mid",   label: "Frog" },
    { id: "leaf",   emoji: "🌿", pay: [0.8, 2.5, 9, 30], weight: 12, tier: "low", label: "Leaf" },
    { id: "torch",  emoji: "🔥", pay: [0.8, 2.5, 9, 30], weight: 12, tier: "low", label: "Torch" },
    { id: "skull",  emoji: "💀", pay: [0.6, 2, 7, 22], weight: 13, tier: "low", label: "Skull" },
    { id: "bowl",   emoji: "🏺", pay: [0.6, 2, 7, 22], weight: 13, tier: "low", label: "Urn" },
    { id: "sun",    emoji: "☀️", pay: [5, 18, 70, 300], weight: 1, tier: "wild",   label: "WILD SUN" },
  ],
  wildId: "sun",
  scatterId: "mask",
  bonusTitle: "TEMPLE EXPEDITION",
  bonusSubtitle: "Pick relics — beware the cursed skull!",
  bonusBgGradient: "from-emerald-950 via-[#3a2a0a] to-black",
  bonusItemEmoji: "🏺",
  bonusEndEmoji: "💀",
  bonusEndMessage: "💀 Cursed! The temple seals shut.",
  bigWinGradient: "from-amber-200 via-emerald-400 to-amber-600",
  bigWinCoinEmoji: "💰",
  jackpotColors: [
    "from-amber-300 to-amber-700",
    "from-emerald-400 to-emerald-700",
    "from-fuchsia-400 to-purple-700",
    "from-red-500 to-rose-800",
  ],
  loadingScreen: AztecGoldLoading,
  emojiLeft: "🗿",
  emojiRight: "👑",
  primaryHsl: "40 90% 55%",
  bonusType: "map",
  skin: "tablet",
};

export default function AztecGold() {
  return <SlotGame theme={theme} />;
}