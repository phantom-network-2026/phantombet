import { motion } from "framer-motion";
import { SlotGame, SlotTheme } from "@/components/casino/SlotEngine";

function FrozenLoading({ progress }: { progress: number }) {
  return (
    <div className="absolute inset-0 z-50 bg-gradient-to-b from-[#06223a] via-[#0a1a3a] to-black flex flex-col items-center justify-center overflow-hidden">
      {/* falling snow */}
      {Array.from({ length: 30 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1.5 h-1.5 rounded-full bg-white"
          style={{ left: `${(i * 7) % 100}%`, boxShadow: "0 0 6px #fff" }}
          animate={{ y: ["-10%", "110%"], opacity: [0, 1, 0] }}
          transition={{ duration: 4 + (i % 4), repeat: Infinity, delay: i * 0.15, ease: "linear" }}
        />
      ))}
      {/* aurora ribbons */}
      <div className="absolute inset-x-0 top-1/4 h-32 opacity-40 pointer-events-none"
        style={{ background: "linear-gradient(180deg, transparent, hsla(160, 80%, 60%, 0.6), hsla(190, 90%, 70%, 0.5), transparent)", filter: "blur(20px)" }} />
      <motion.div
        className="text-7xl"
        style={{ filter: "drop-shadow(0 0 24px #67e8f9)" }}
        animate={{ scale: [1, 1.08, 1], rotate: [-3, 3, -3] }}
        transition={{ duration: 3, repeat: Infinity }}
      >
        👑
      </motion.div>
      <h1 className="mt-3 font-display text-4xl font-black tracking-wider text-cyan-100" style={{ textShadow: "0 0 18px #22d3ee, 0 0 4px #fff" }}>
        FROZEN CROWN
      </h1>
      <p className="text-cyan-200/80 text-xs uppercase tracking-[0.3em] mt-1 font-bold">Forging the crown of ice…</p>
      <div className="mt-6 w-64 h-2 bg-black/60 rounded-full overflow-hidden border-2 border-cyan-300">
        <div className="h-full bg-gradient-to-r from-cyan-200 via-blue-300 to-cyan-200" style={{ width: `${progress}%` }} />
      </div>
      <p className="text-cyan-200/80 text-[10px] mt-2 font-mono font-bold">{Math.round(progress)}%</p>
    </div>
  );
}

const theme: SlotTheme = {
  title: "Frozen Crown",
  slug: "frozen-crown",
  shortLabel: "❄",
  topBarGradient: "from-blue-950 via-cyan-700 to-blue-950",
  topBarBorder: "border-cyan-200",
  bgGradient: "from-[#06223a] via-[#0a1a3a] to-black",
  frameBorder: "border-cyan-300",
  frameBg: "from-[#0a1a3a] via-[#06223a] to-black",
  accentText: "text-cyan-100",
  spinButtonGradient: "from-cyan-200 via-cyan-400 to-blue-800",
  spinButtonBorder: "border-cyan-100",
  symbols: [
    { id: "crown",   emoji: "👑", pay: [5, 20, 80, 400], weight: 1, tier: "premium", label: "Ice Crown" },
    { id: "snowflake", emoji: "❄️", pay: [3, 12, 50, 200], weight: 4, tier: "premium", label: "Snowflake" },
    { id: "diamond",  emoji: "💎", pay: [2, 7, 25, 100], weight: 6, tier: "high", label: "Diamond" },
    { id: "wolf",     emoji: "🐺", pay: [1.5, 5, 20, 80], weight: 7, tier: "high", label: "Wolf" },
    { id: "bear",     emoji: "🐻‍❄️", pay: [1.2, 4, 14, 50], weight: 9, tier: "mid", label: "Polar Bear" },
    { id: "deer",     emoji: "🦌", pay: [1.2, 4, 14, 50], weight: 9, tier: "mid", label: "Stag" },
    { id: "owl",      emoji: "🦉", pay: [1, 3, 12, 40], weight: 10, tier: "mid", label: "Snow Owl" },
    { id: "axe",      emoji: "🪓", pay: [1, 3, 12, 40], weight: 10, tier: "mid", label: "Frost Axe" },
    { id: "tree",     emoji: "🌲", pay: [0.8, 2.5, 9, 30], weight: 12, tier: "low", label: "Pine" },
    { id: "berry",    emoji: "🫐", pay: [0.8, 2.5, 9, 30], weight: 12, tier: "low", label: "Iceberry" },
    { id: "fish",     emoji: "🐟", pay: [0.6, 2, 7, 22], weight: 13, tier: "low", label: "Frozen Fish" },
    { id: "candle",   emoji: "🕯️", pay: [0.6, 2, 7, 22], weight: 13, tier: "low", label: "Candle" },
    { id: "star",     emoji: "✨", pay: [5, 18, 70, 300], weight: 1, tier: "wild", label: "WILD STAR" },
  ],
  wildId: "star",
  scatterId: "crown",
  bonusTitle: "FROZEN KEEP SIEGE",
  bonusSubtitle: "Smash ice walls to claim the crown — avoid the avalanche!",
  bonusBgGradient: "from-blue-950 via-[#0a1a3a] to-black",
  bonusItemEmoji: "🧊",
  bonusEndEmoji: "🌨️",
  bonusEndMessage: "🌨️ Avalanche! The keep buries the spoils.",
  bigWinGradient: "from-cyan-100 via-cyan-300 to-blue-600",
  bigWinCoinEmoji: "❄️",
  jackpotColors: [
    "from-cyan-200 to-cyan-600",
    "from-blue-300 to-blue-700",
    "from-indigo-400 to-blue-800",
    "from-sky-300 to-cyan-700",
  ],
  loadingScreen: FrozenLoading,
  emojiLeft: "❄️",
  emojiRight: "👑",
  primaryHsl: "190 90% 70%",
  bonusType: "siege",
  skin: "fortress",
};

export default function FrozenCrown() {
  return <SlotGame theme={theme} />;
}