import { motion } from "framer-motion";
import { SlotGame, SlotTheme } from "@/components/casino/SlotEngine";

function ChristmasLoading({ progress }: { progress: number }) {
  const flakes = ["❄️","❅","❆"];
  return (
    <div className="absolute inset-0 z-50 bg-gradient-to-b from-[#0b1a3a] via-[#1d3a72] to-[#b91c1c] flex flex-col items-center justify-center overflow-hidden">
      {Array.from({ length: 30 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute text-2xl text-white"
          style={{ left: `${(i * 3.5) % 100}%`, top: -20 }}
          animate={{ y: [0, 700], x: [0, 20, -20, 0] }}
          transition={{ duration: 5 + (i % 4), repeat: Infinity, delay: i * 0.1, ease: "linear" }}
        >
          {flakes[i % flakes.length]}
        </motion.div>
      ))}
      <motion.div
        className="text-8xl"
        animate={{ y: [0, -15, 0], rotate: [-5, 5, -5] }}
        transition={{ duration: 1.6, repeat: Infinity }}
      >
        🎅
      </motion.div>
      <h1 className="mt-3 font-display text-4xl font-black tracking-wider text-red-200 drop-shadow-[0_4px_8px_rgba(0,0,0,0.6)]">
        CHRISTMAS MAGIC
      </h1>
      <p className="text-white/90 text-xs uppercase tracking-[0.3em] mt-1 font-bold">Wrapping presents…</p>
      <div className="mt-6 w-64 h-2 bg-white/20 rounded-full overflow-hidden border-2 border-red-300">
        <motion.div className="h-full bg-gradient-to-r from-red-400 via-yellow-200 to-green-400" style={{ width: `${progress}%` }} />
      </div>
      <p className="text-white/90 text-[10px] mt-2 font-mono font-bold">{Math.round(progress)}%</p>
    </div>
  );
}

const theme: SlotTheme = {
  title: "Christmas Magic",
  slug: "christmas-magic",
  shortLabel: "XM",
  topBarGradient: "from-red-900 via-red-700 to-green-800",
  topBarBorder: "border-yellow-300",
  bgGradient: "from-[#0b1a3a] via-[#15306b] to-[#7f1d1d]",
  frameBorder: "border-yellow-400",
  frameBg: "from-red-700 via-red-900 to-green-900",
  accentText: "text-yellow-100",
  spinButtonGradient: "from-yellow-300 via-red-500 to-green-700",
  spinButtonBorder: "border-yellow-200",
  symbols: [
    { id: "santa", emoji: "🎅", pay: [3, 12, 50, 200], weight: 1, tier: "premium", label: "Santa" },
    { id: "tree", emoji: "🎄", pay: [2.5, 10, 40, 150], weight: 4, tier: "premium", label: "Tree" },
    { id: "gift", emoji: "🎁", pay: [2, 7, 25, 100], weight: 6, tier: "high", label: "Gift" },
    { id: "snowman", emoji: "⛄", pay: [1.5, 5, 20, 80], weight: 7, tier: "high", label: "Snowman" },
    { id: "reindeer", emoji: "🦌", pay: [1.2, 4, 14, 50], weight: 9, tier: "mid", label: "Reindeer" },
    { id: "bell", emoji: "🔔", pay: [1.2, 4, 14, 50], weight: 9, tier: "mid", label: "Bell" },
    { id: "candy", emoji: "🍬", pay: [1, 3, 12, 40], weight: 10, tier: "mid", label: "Candy" },
    { id: "stocking", emoji: "🧦", pay: [1, 3, 12, 40], weight: 10, tier: "mid", label: "Stocking" },
    { id: "snow", emoji: "❄️", pay: [0.8, 2.5, 9, 30], weight: 12, tier: "low", label: "Snowflake" },
    { id: "holly", emoji: "🌿", pay: [0.8, 2.5, 9, 30], weight: 12, tier: "low", label: "Holly" },
    { id: "candle", emoji: "🕯️", pay: [0.6, 2, 7, 22], weight: 13, tier: "low", label: "Candle" },
    { id: "cookie", emoji: "🍪", pay: [0.6, 2, 7, 22], weight: 13, tier: "low", label: "Cookie" },
    { id: "star", emoji: "⭐", pay: [5, 18, 70, 300], weight: 1, tier: "wild", label: "WILD STAR" },
  ],
  wildId: "star",
  scatterId: "santa",
  bonusTitle: "GIFT UNWRAP",
  bonusSubtitle: "Open presents — avoid the lump of coal!",
  bonusBgGradient: "from-red-900 via-red-700 to-green-900",
  bonusItemEmoji: "🎁",
  bonusEndEmoji: "⚫",
  bonusEndMessage: "⚫ Coal! Bonus ends.",
  bigWinGradient: "from-yellow-200 via-red-400 to-green-600",
  bigWinCoinEmoji: "🎁",
  jackpotColors: [
    "from-red-400 to-red-700",
    "from-yellow-300 to-amber-500",
    "from-green-400 to-green-700",
    "from-blue-300 to-blue-600",
  ],
  loadingScreen: ChristmasLoading,
  emojiLeft: "🎅",
  emojiRight: "🎄",
  primaryHsl: "0 80% 55%",
  bonusType: "gifts",
  skin: "classic",
};

export default function ChristmasMagic() {
  return <SlotGame theme={theme} />;
}