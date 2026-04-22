import { motion } from "framer-motion";
import { SlotGame, SlotTheme } from "@/components/casino/SlotEngine";

// ===== Loading: candy rain + bouncing lollipops =====
function SweetBonanzaLoading({ progress }: { progress: number }) {
  const candies = ["🍬","🍭","🍩","🍫","🍪","🧁","🍦","🍰","🍡"];
  return (
    <div className="absolute inset-0 z-50 bg-gradient-to-b from-[#ffd1ec] via-[#ffaadd] to-[#a020f0] flex flex-col items-center justify-center overflow-hidden">
      {/* falling candy rain */}
      {Array.from({ length: 24 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute text-3xl"
          style={{ left: `${(i * 4.5) % 100}%`, top: -30 }}
          animate={{ y: [0, 700], rotate: [0, 360 * 2] }}
          transition={{ duration: 4 + (i % 4), repeat: Infinity, delay: i * 0.15, ease: "linear" }}
        >
          {candies[i % candies.length]}
        </motion.div>
      ))}
      {/* bouncing lollipops */}
      <div className="flex gap-3 mb-4">
        {[0, 1, 2, 3].map((i) => (
          <motion.div
            key={i}
            className="text-6xl"
            style={{ filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.3))" }}
            animate={{ y: [0, -25, 0], rotate: [0, 12, -12, 0] }}
            transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.2 }}
          >
            🍭
          </motion.div>
        ))}
      </div>
      {/* center cupcake */}
      <motion.div
        className="text-8xl"
        animate={{ scale: [1, 1.2, 1], rotate: [-5, 5, -5] }}
        transition={{ duration: 1.6, repeat: Infinity }}
      >
        🧁
      </motion.div>
      <h1 className="mt-3 font-display text-4xl font-black tracking-wider text-white drop-shadow-[0_4px_8px_rgba(160,0,160,0.8)]">
        SWEET BONANZA
      </h1>
      <p className="text-white/90 text-xs uppercase tracking-[0.3em] mt-1 font-bold">Mixing the sugar…</p>
      <div className="mt-6 w-64 h-2 bg-white/40 rounded-full overflow-hidden border-2 border-white">
        <motion.div className="h-full bg-gradient-to-r from-pink-300 via-yellow-300 to-fuchsia-400" style={{ width: `${progress}%` }} animate={{ backgroundPositionX: ["0%", "100%"] }} transition={{ duration: 1, repeat: Infinity }} />
      </div>
      <p className="text-white/90 text-[10px] mt-2 font-mono font-bold">{Math.round(progress)}%</p>
    </div>
  );
}

const theme: SlotTheme = {
  title: "Sweet Bonanza",
  slug: "sweet-bonanza",
  shortLabel: "SB",
  topBarGradient: "from-pink-700 via-fuchsia-500 to-pink-700",
  topBarBorder: "border-yellow-200",
  bgGradient: "from-[#ffd1ec] via-[#ffaadd] to-[#a020f0]",
  frameBorder: "border-pink-300",
  frameBg: "from-[#ffaadd] via-[#ffd1ec] to-[#ff7fc4]",
  accentText: "text-fuchsia-900",
  spinButtonGradient: "from-yellow-300 via-pink-500 to-fuchsia-700",
  spinButtonBorder: "border-yellow-200",
  symbols: [
    { id: "cupcake", emoji: "🧁", pay: [3, 12, 50, 200], weight: 1, tier: "premium", label: "Cupcake" },
    { id: "cake",    emoji: "🍰", pay: [2.5, 10, 40, 150], weight: 4, tier: "premium", label: "Cake" },
    { id: "donut",   emoji: "🍩", pay: [2, 7, 25, 100], weight: 6, tier: "high",    label: "Donut" },
    { id: "icecream",emoji: "🍦", pay: [1.5, 5, 20, 80], weight: 7, tier: "high",  label: "Ice Cream" },
    { id: "lolly",   emoji: "🍭", pay: [1.2, 4, 14, 50], weight: 9, tier: "mid",    label: "Lollipop" },
    { id: "choc",    emoji: "🍫", pay: [1.2, 4, 14, 50], weight: 9, tier: "mid",    label: "Chocolate" },
    { id: "cookie",  emoji: "🍪", pay: [1, 3, 12, 40], weight: 10, tier: "mid",   label: "Cookie" },
    { id: "candy",   emoji: "🍬", pay: [1, 3, 12, 40], weight: 10, tier: "mid",   label: "Candy" },
    { id: "dango",   emoji: "🍡", pay: [0.8, 2.5, 9, 30], weight: 12, tier: "low", label: "Dango" },
    { id: "honey",   emoji: "🍯", pay: [0.8, 2.5, 9, 30], weight: 12, tier: "low", label: "Honey" },
    { id: "strawberry",emoji: "🍓", pay: [0.6, 2, 7, 22], weight: 13, tier: "low", label: "Berry" },
    { id: "grape",   emoji: "🍇", pay: [0.6, 2, 7, 22], weight: 13, tier: "low", label: "Grape" },
    { id: "rainbow", emoji: "🌈", pay: [5, 18, 70, 300], weight: 1, tier: "wild",  label: "WILD RAINBOW" },
  ],
  wildId: "rainbow",
  scatterId: "cupcake",
  bonusTitle: "CANDY SHOP",
  bonusSubtitle: "Unwrap sweets — avoid the sour lemon!",
  bonusBgGradient: "from-pink-700 via-fuchsia-600 to-purple-900",
  bonusItemEmoji: "🍬",
  bonusEndEmoji: "🍋",
  bonusEndMessage: "🍋 Sour! Bonus ends.",
  bigWinGradient: "from-yellow-200 via-pink-400 to-fuchsia-700",
  bigWinCoinEmoji: "🍭",
  jackpotColors: [
    "from-pink-300 to-rose-600",
    "from-yellow-300 to-amber-500",
    "from-fuchsia-400 to-purple-700",
    "from-cyan-300 to-blue-600",
  ],
  loadingScreen: SweetBonanzaLoading,
  emojiLeft: "🍭",
  emojiRight: "🧁",
  primaryHsl: "320 90% 70%",
  bonusType: "gifts",
  skin: "candy",
};

export default function SweetBonanza() {
  return <SlotGame theme={theme} />;
}