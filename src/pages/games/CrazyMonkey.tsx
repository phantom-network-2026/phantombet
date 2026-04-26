import { motion } from "framer-motion";
import { SlotGame, SlotTheme } from "@/components/casino/SlotEngine";

function CrazyMonkeyLoading({ progress }: { progress: number }) {
  return (
    <div className="absolute inset-0 z-50 bg-gradient-to-b from-emerald-900 via-green-700 to-lime-500 flex flex-col items-center justify-center overflow-hidden">
      {Array.from({ length: 18 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute text-3xl"
          style={{ left: `${(i * 6) % 100}%`, top: -30 }}
          animate={{ y: [0, 700], rotate: [0, 360] }}
          transition={{ duration: 4 + (i % 3), repeat: Infinity, delay: i * 0.18, ease: "linear" }}
        >
          🍌
        </motion.div>
      ))}
      <motion.div
        className="text-8xl"
        animate={{ rotate: [-15, 15, -15], scale: [1, 1.15, 1] }}
        transition={{ duration: 1.4, repeat: Infinity }}
      >
        🐒
      </motion.div>
      <h1 className="mt-3 font-display text-4xl font-black tracking-wider text-yellow-200 drop-shadow-[0_4px_8px_rgba(0,0,0,0.6)]">
        CRAZY MONKEY
      </h1>
      <p className="text-white/90 text-xs uppercase tracking-[0.3em] mt-1 font-bold">Going bananas…</p>
      <div className="mt-6 w-64 h-2 bg-black/40 rounded-full overflow-hidden border-2 border-yellow-300">
        <motion.div className="h-full bg-gradient-to-r from-yellow-300 via-lime-400 to-emerald-500" style={{ width: `${progress}%` }} />
      </div>
      <p className="text-white/90 text-[10px] mt-2 font-mono font-bold">{Math.round(progress)}%</p>
    </div>
  );
}

const theme: SlotTheme = {
  title: "Crazy Monkey",
  slug: "crazy-monkey",
  shortLabel: "CM",
  topBarGradient: "from-emerald-900 via-green-700 to-emerald-900",
  topBarBorder: "border-yellow-300",
  bgGradient: "from-emerald-950 via-green-800 to-lime-700",
  frameBorder: "border-yellow-400",
  frameBg: "from-green-700 via-emerald-600 to-green-900",
  accentText: "text-yellow-100",
  spinButtonGradient: "from-yellow-300 via-lime-400 to-emerald-700",
  spinButtonBorder: "border-yellow-200",
  symbols: [
    { id: "monkey", emoji: "🐒", pay: [3, 12, 50, 200], weight: 1, tier: "premium", label: "Monkey" },
    { id: "banana", emoji: "🍌", pay: [2.5, 10, 40, 150], weight: 4, tier: "premium", label: "Banana" },
    { id: "coconut", emoji: "🥥", pay: [2, 7, 25, 100], weight: 6, tier: "high", label: "Coconut" },
    { id: "pineapple", emoji: "🍍", pay: [1.5, 5, 20, 80], weight: 7, tier: "high", label: "Pineapple" },
    { id: "mango", emoji: "🥭", pay: [1.2, 4, 14, 50], weight: 9, tier: "mid", label: "Mango" },
    { id: "kiwi", emoji: "🥝", pay: [1.2, 4, 14, 50], weight: 9, tier: "mid", label: "Kiwi" },
    { id: "papaya", emoji: "🍈", pay: [1, 3, 12, 40], weight: 10, tier: "mid", label: "Melon" },
    { id: "grapes", emoji: "🍇", pay: [1, 3, 12, 40], weight: 10, tier: "mid", label: "Grapes" },
    { id: "leaf", emoji: "🌿", pay: [0.8, 2.5, 9, 30], weight: 12, tier: "low", label: "Leaf" },
    { id: "drum", emoji: "🥁", pay: [0.8, 2.5, 9, 30], weight: 12, tier: "low", label: "Drum" },
    { id: "flower", emoji: "🌺", pay: [0.6, 2, 7, 22], weight: 13, tier: "low", label: "Flower" },
    { id: "palm", emoji: "🌴", pay: [0.6, 2, 7, 22], weight: 13, tier: "low", label: "Palm" },
    { id: "crown", emoji: "👑", pay: [5, 18, 70, 300], weight: 1, tier: "wild", label: "WILD KING" },
  ],
  wildId: "crown",
  scatterId: "monkey",
  bonusTitle: "JUNGLE FEAST",
  bonusSubtitle: "Pick fruit — beware the snake!",
  bonusBgGradient: "from-emerald-900 via-green-700 to-lime-600",
  bonusItemEmoji: "🍌",
  bonusEndEmoji: "🐍",
  bonusEndMessage: "🐍 Snake! Bonus ends.",
  bigWinGradient: "from-yellow-200 via-lime-400 to-emerald-700",
  bigWinCoinEmoji: "🍌",
  jackpotColors: [
    "from-lime-300 to-green-600",
    "from-yellow-300 to-amber-500",
    "from-emerald-400 to-green-700",
    "from-orange-400 to-red-600",
  ],
  loadingScreen: CrazyMonkeyLoading,
  emojiLeft: "🐒",
  emojiRight: "🍌",
  primaryHsl: "80 80% 55%",
  bonusType: "gifts",
  skin: "classic",
};

export default function CrazyMonkey() {
  return <SlotGame theme={theme} />;
}