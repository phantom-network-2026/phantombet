import { motion } from "framer-motion";
import { SlotGame, SlotTheme } from "@/components/casino/SlotEngine";

function MardiLoading({ progress }: { progress: number }) {
  return (
    <div className="absolute inset-0 z-50 bg-gradient-to-b from-[#2a063a] via-[#0a0218] to-black flex flex-col items-center justify-center overflow-hidden">
      {/* confetti rain */}
      {Array.from({ length: 28 }).map((_, i) => {
        const colors = ["#facc15", "#a855f7", "#22c55e", "#ec4899"];
        return (
          <motion.div
            key={i}
            className="absolute w-2 h-3"
            style={{ left: `${(i * 5) % 100}%`, background: colors[i % 4] }}
            animate={{ y: ["-10%", "110%"], rotate: [0, 360], x: [0, 20, -20, 0] }}
            transition={{ duration: 3 + (i % 3), repeat: Infinity, delay: i * 0.1, ease: "linear" }}
          />
        );
      })}
      {/* fireworks bursts */}
      {[20, 80].map((x, i) => (
        <motion.div
          key={i}
          className="absolute text-5xl"
          style={{ left: `${x}%`, top: "20%" }}
          animate={{ scale: [0, 1.4, 0], opacity: [0, 1, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.7 }}
        >
          🎆
        </motion.div>
      ))}
      <motion.div
        className="text-7xl"
        style={{ filter: "drop-shadow(0 0 22px #facc15)" }}
        animate={{ rotate: [-6, 6, -6] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        🎭
      </motion.div>
      <h1 className="mt-3 font-display text-4xl font-black tracking-wider text-yellow-300" style={{ textShadow: "0 0 18px #a855f7, 0 0 30px #facc15" }}>
        MARDI GRAS MEGA
      </h1>
      <p className="text-yellow-200/90 text-xs uppercase tracking-[0.3em] mt-1 font-bold">Let the parade begin…</p>
      <div className="mt-6 w-64 h-2 bg-black/60 rounded-full overflow-hidden border-2 border-yellow-300">
        <div className="h-full bg-gradient-to-r from-yellow-300 via-fuchsia-500 to-green-400" style={{ width: `${progress}%` }} />
      </div>
      <p className="text-yellow-200/80 text-[10px] mt-2 font-mono font-bold">{Math.round(progress)}%</p>
    </div>
  );
}

const theme: SlotTheme = {
  title: "Mardi Gras Mega",
  slug: "mardi-gras-mega",
  shortLabel: "🎭",
  topBarGradient: "from-purple-900 via-yellow-600 to-green-800",
  topBarBorder: "border-yellow-300",
  bgGradient: "from-[#2a063a] via-[#0a0218] to-black",
  frameBorder: "border-yellow-300",
  frameBg: "from-[#2a063a] via-[#0a0218] to-[#062a14]",
  accentText: "text-yellow-200",
  spinButtonGradient: "from-yellow-300 via-fuchsia-500 to-green-700",
  spinButtonBorder: "border-yellow-100",
  symbols: [
    { id: "mask",    emoji: "🎭", pay: [5, 20, 80, 400], weight: 1, tier: "premium", label: "Mask" },
    { id: "crown",   emoji: "👑", pay: [3, 12, 50, 200], weight: 4, tier: "premium", label: "King Cake" },
    { id: "horn",    emoji: "🎺", pay: [2, 7, 25, 100], weight: 6, tier: "high", label: "Trumpet" },
    { id: "drum",    emoji: "🥁", pay: [1.5, 5, 20, 80], weight: 7, tier: "high", label: "Drum" },
    { id: "fire",    emoji: "🎆", pay: [1.2, 4, 14, 50], weight: 9, tier: "mid", label: "Fireworks" },
    { id: "balloon", emoji: "🎈", pay: [1.2, 4, 14, 50], weight: 9, tier: "mid", label: "Balloon" },
    { id: "guitar",  emoji: "🎸", pay: [1, 3, 12, 40], weight: 10, tier: "mid", label: "Guitar" },
    { id: "feather", emoji: "🪶", pay: [1, 3, 12, 40], weight: 10, tier: "mid", label: "Feather" },
    { id: "beads",   emoji: "📿", pay: [0.8, 2.5, 9, 30], weight: 12, tier: "low", label: "Beads" },
    { id: "rose",    emoji: "🌹", pay: [0.8, 2.5, 9, 30], weight: 12, tier: "low", label: "Rose" },
    { id: "wine",    emoji: "🍷", pay: [0.6, 2, 7, 22], weight: 13, tier: "low", label: "Wine" },
    { id: "pepper",  emoji: "🌶️", pay: [0.6, 2, 7, 22], weight: 13, tier: "low", label: "Cajun" },
    { id: "star",    emoji: "🌟", pay: [5, 18, 70, 300], weight: 1, tier: "wild", label: "WILD STAR" },
  ],
  wildId: "star",
  scatterId: "mask",
  bonusTitle: "PARADE BONUS",
  bonusSubtitle: "Catch beads from the floats — but skip the spilled drink!",
  bonusBgGradient: "from-purple-950 via-[#0a0218] to-green-950",
  bonusItemEmoji: "🎁",
  bonusEndEmoji: "🍹",
  bonusEndMessage: "🍹 Spilled the hurricane! Bonus over.",
  bigWinGradient: "from-yellow-200 via-fuchsia-400 to-green-500",
  bigWinCoinEmoji: "🎉",
  jackpotColors: [
    "from-yellow-300 to-amber-700",
    "from-fuchsia-400 to-purple-700",
    "from-green-300 to-emerald-700",
    "from-pink-400 to-fuchsia-800",
  ],
  loadingScreen: MardiLoading,
  emojiLeft: "🎭",
  emojiRight: "🎺",
  primaryHsl: "48 95% 55%",
  bonusType: "gifts",
  skin: "carnival",
};

export default function MardiGrasMega() {
  return <SlotGame theme={theme} />;
}