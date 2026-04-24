import { motion } from "framer-motion";
import { SlotGame, SlotTheme } from "@/components/casino/SlotEngine";

function VoodooLoading({ progress }: { progress: number }) {
  return (
    <div className="absolute inset-0 z-50 bg-black flex flex-col items-center justify-center overflow-hidden">
      {/* swirling green/purple smoke */}
      <div
        className="absolute inset-0 opacity-60 pointer-events-none"
        style={{ background: "radial-gradient(circle at 30% 60%, hsla(280,70%,40%,0.6), transparent 50%), radial-gradient(circle at 70% 40%, hsla(140,80%,40%,0.6), transparent 50%)" }}
      />
      {/* floating candles */}
      {Array.from({ length: 6 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute text-3xl"
          style={{ left: `${10 + i * 15}%`, bottom: `${20 + (i % 2) * 20}%` }}
          animate={{ y: [0, -8, 0], opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 2 + i * 0.3, repeat: Infinity }}
        >
          🕯️
        </motion.div>
      ))}
      <motion.div
        className="text-7xl relative"
        style={{ filter: "drop-shadow(0 0 24px #c026d3)" }}
        animate={{ rotate: [-8, 8, -8], scale: [1, 1.1, 1] }}
        transition={{ duration: 2.5, repeat: Infinity }}
      >
        💀
      </motion.div>
      <h1 className="mt-3 font-display text-4xl font-black tracking-wider text-fuchsia-300" style={{ textShadow: "0 0 18px #d946ef, 0 0 30px #22c55e" }}>
        VOODOO NIGHTS
      </h1>
      <p className="text-fuchsia-200/80 text-xs uppercase tracking-[0.3em] mt-1 font-bold">Casting the hex…</p>
      <div className="mt-6 w-64 h-2 bg-black/60 rounded-full overflow-hidden border-2 border-fuchsia-400">
        <div className="h-full bg-gradient-to-r from-fuchsia-400 via-green-400 to-fuchsia-400" style={{ width: `${progress}%` }} />
      </div>
      <p className="text-fuchsia-200/80 text-[10px] mt-2 font-mono font-bold">{Math.round(progress)}%</p>
    </div>
  );
}

const theme: SlotTheme = {
  title: "Voodoo Nights",
  slug: "voodoo-nights",
  shortLabel: "💀",
  topBarGradient: "from-purple-950 via-fuchsia-700 to-green-900",
  topBarBorder: "border-fuchsia-300",
  bgGradient: "from-black via-[#1a0426] to-black",
  frameBorder: "border-fuchsia-400",
  frameBg: "from-[#1a0426] via-black to-[#062a14]",
  accentText: "text-fuchsia-200",
  spinButtonGradient: "from-fuchsia-400 via-green-500 to-purple-900",
  spinButtonBorder: "border-fuchsia-200",
  symbols: [
    { id: "doll",    emoji: "🪆", pay: [5, 20, 80, 400], weight: 1, tier: "premium", label: "Voodoo Doll" },
    { id: "skull",   emoji: "💀", pay: [3, 12, 50, 200], weight: 4, tier: "premium", label: "Skull" },
    { id: "snake",   emoji: "🐍", pay: [2, 7, 25, 100], weight: 6, tier: "high", label: "Serpent" },
    { id: "spider",  emoji: "🕷️", pay: [1.5, 5, 20, 80], weight: 7, tier: "high", label: "Spider" },
    { id: "candle",  emoji: "🕯️", pay: [1.2, 4, 14, 50], weight: 9, tier: "mid", label: "Candle" },
    { id: "potion",  emoji: "🧪", pay: [1.2, 4, 14, 50], weight: 9, tier: "mid", label: "Potion" },
    { id: "eye",     emoji: "👁️", pay: [1, 3, 12, 40], weight: 10, tier: "mid", label: "Evil Eye" },
    { id: "moon",    emoji: "🌙", pay: [1, 3, 12, 40], weight: 10, tier: "mid", label: "Moon" },
    { id: "bone",    emoji: "🦴", pay: [0.8, 2.5, 9, 30], weight: 12, tier: "low", label: "Bone" },
    { id: "frog",    emoji: "🐸", pay: [0.8, 2.5, 9, 30], weight: 12, tier: "low", label: "Frog" },
    { id: "bat",     emoji: "🦇", pay: [0.6, 2, 7, 22], weight: 13, tier: "low", label: "Bat" },
    { id: "rose",    emoji: "🥀", pay: [0.6, 2, 7, 22], weight: 13, tier: "low", label: "Dead Rose" },
    { id: "ghost",   emoji: "👻", pay: [5, 18, 70, 300], weight: 1, tier: "wild", label: "WILD GHOST" },
  ],
  wildId: "ghost",
  scatterId: "doll",
  bonusTitle: "RITUAL BONUS",
  bonusSubtitle: "Pick voodoo dolls to release spirits — beware the curse!",
  bonusBgGradient: "from-purple-950 via-black to-green-950",
  bonusItemEmoji: "🪆",
  bonusEndEmoji: "💀",
  bonusEndMessage: "💀 Cursed! The ritual fails.",
  bigWinGradient: "from-fuchsia-200 via-fuchsia-400 to-green-500",
  bigWinCoinEmoji: "💀",
  jackpotColors: [
    "from-fuchsia-300 to-purple-700",
    "from-green-300 to-green-700",
    "from-pink-400 to-fuchsia-800",
    "from-emerald-400 to-purple-800",
  ],
  loadingScreen: VoodooLoading,
  emojiLeft: "💀",
  emojiRight: "🪆",
  primaryHsl: "290 80% 60%",
  bonusType: "gifts",
  skin: "neon-arcade",
};

export default function VoodooNights() {
  return <SlotGame theme={theme} />;
}