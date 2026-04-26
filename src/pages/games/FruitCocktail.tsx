import { motion } from "framer-motion";
import { SlotGame, SlotTheme } from "@/components/casino/SlotEngine";

function FruitCocktailLoading({ progress }: { progress: number }) {
  const fruits = ["🍓","🍒","🍋","🍊","🍉","🍇","🍑"];
  return (
    <div className="absolute inset-0 z-50 bg-gradient-to-b from-[#ff2d55] via-[#ff8a3d] to-[#fff170] flex flex-col items-center justify-center overflow-hidden">
      {Array.from({ length: 22 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute text-3xl"
          style={{ left: `${(i * 5) % 100}%`, top: -30 }}
          animate={{ y: [0, 700], rotate: [0, 360] }}
          transition={{ duration: 4 + (i % 3), repeat: Infinity, delay: i * 0.15, ease: "linear" }}
        >
          {fruits[i % fruits.length]}
        </motion.div>
      ))}
      <motion.div
        className="text-8xl"
        animate={{ scale: [1, 1.2, 1], rotate: [-8, 8, -8] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        🍹
      </motion.div>
      <h1 className="mt-3 font-display text-4xl font-black tracking-wider text-white drop-shadow-[0_4px_8px_rgba(180,30,30,0.7)]">
        FRUIT COCKTAIL
      </h1>
      <p className="text-white/90 text-xs uppercase tracking-[0.3em] mt-1 font-bold">Mixing the juice…</p>
      <div className="mt-6 w-64 h-2 bg-black/30 rounded-full overflow-hidden border-2 border-yellow-200">
        <motion.div className="h-full bg-gradient-to-r from-pink-400 via-orange-400 to-yellow-300" style={{ width: `${progress}%` }} />
      </div>
      <p className="text-white/90 text-[10px] mt-2 font-mono font-bold">{Math.round(progress)}%</p>
    </div>
  );
}

const theme: SlotTheme = {
  title: "Fruit Cocktail",
  slug: "fruit-cocktail",
  shortLabel: "FC",
  topBarGradient: "from-red-700 via-orange-500 to-yellow-500",
  topBarBorder: "border-yellow-200",
  bgGradient: "from-[#ff2d55] via-[#ff8a3d] to-[#fff170]",
  frameBorder: "border-orange-300",
  frameBg: "from-orange-400 via-yellow-300 to-orange-500",
  accentText: "text-red-900",
  spinButtonGradient: "from-yellow-300 via-orange-500 to-red-700",
  spinButtonBorder: "border-yellow-200",
  symbols: [
    { id: "cocktail", emoji: "🍹", pay: [3, 12, 50, 200], weight: 1, tier: "premium", label: "Cocktail" },
    { id: "watermelon", emoji: "🍉", pay: [2.5, 10, 40, 150], weight: 4, tier: "premium", label: "Watermelon" },
    { id: "strawberry", emoji: "🍓", pay: [2, 7, 25, 100], weight: 6, tier: "high", label: "Strawberry" },
    { id: "cherry", emoji: "🍒", pay: [1.5, 5, 20, 80], weight: 7, tier: "high", label: "Cherry" },
    { id: "orange", emoji: "🍊", pay: [1.2, 4, 14, 50], weight: 9, tier: "mid", label: "Orange" },
    { id: "lemon", emoji: "🍋", pay: [1.2, 4, 14, 50], weight: 9, tier: "mid", label: "Lemon" },
    { id: "peach", emoji: "🍑", pay: [1, 3, 12, 40], weight: 10, tier: "mid", label: "Peach" },
    { id: "grapes", emoji: "🍇", pay: [1, 3, 12, 40], weight: 10, tier: "mid", label: "Grapes" },
    { id: "apple", emoji: "🍎", pay: [0.8, 2.5, 9, 30], weight: 12, tier: "low", label: "Apple" },
    { id: "pear", emoji: "🍐", pay: [0.8, 2.5, 9, 30], weight: 12, tier: "low", label: "Pear" },
    { id: "banana", emoji: "🍌", pay: [0.6, 2, 7, 22], weight: 13, tier: "low", label: "Banana" },
    { id: "kiwi", emoji: "🥝", pay: [0.6, 2, 7, 22], weight: 13, tier: "low", label: "Kiwi" },
    { id: "diamond", emoji: "💎", pay: [5, 18, 70, 300], weight: 1, tier: "wild", label: "WILD GEM" },
  ],
  wildId: "diamond",
  scatterId: "cocktail",
  bonusTitle: "FRUIT MIXER",
  bonusSubtitle: "Pick fruit — avoid the rotten apple!",
  bonusBgGradient: "from-red-700 via-orange-500 to-yellow-500",
  bonusItemEmoji: "🍓",
  bonusEndEmoji: "🦠",
  bonusEndMessage: "🦠 Rotten! Bonus ends.",
  bigWinGradient: "from-yellow-200 via-orange-400 to-red-700",
  bigWinCoinEmoji: "🍒",
  jackpotColors: [
    "from-pink-300 to-red-600",
    "from-yellow-300 to-amber-500",
    "from-orange-400 to-orange-700",
    "from-lime-300 to-green-600",
  ],
  loadingScreen: FruitCocktailLoading,
  emojiLeft: "🍹",
  emojiRight: "🍓",
  primaryHsl: "10 90% 55%",
  bonusType: "gifts",
  skin: "classic",
};

export default function FruitCocktail() {
  return <SlotGame theme={theme} />;
}