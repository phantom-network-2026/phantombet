import { motion } from "framer-motion";
import { SlotGame, SlotTheme } from "@/components/casino/SlotEngine";

// ===== Loading: Vegas neon sign blinking with marquee lights =====
function Lucky7sLoading({ progress }: { progress: number }) {
  return (
    <div className="absolute inset-0 z-50 bg-black flex flex-col items-center justify-center overflow-hidden">
      {/* checker floor perspective */}
      <div
        className="absolute inset-x-0 bottom-0 h-1/3 opacity-60 pointer-events-none"
        style={{
          backgroundImage: "repeating-linear-gradient(90deg, #1a0000 0 40px, #2a0000 40px 80px)",
          transform: "perspective(300px) rotateX(60deg)",
          transformOrigin: "bottom",
        }}
      />
      {/* marquee bulbs around */}
      {Array.from({ length: 24 }).map((_, i) => {
        const angle = (i / 24) * Math.PI * 2;
        return (
          <motion.div
            key={i}
            className="absolute w-3 h-3 rounded-full bg-yellow-300 shadow-[0_0_12px_rgba(255,220,80,1)]"
            style={{ left: `calc(50% + ${Math.cos(angle) * 180}px)`, top: `calc(50% + ${Math.sin(angle) * 180}px)` }}
            animate={{ opacity: [1, 0.2, 1] }}
            transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.05 }}
          />
        );
      })}
      {/* The big 777 */}
      <div className="flex gap-2">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="font-display font-black text-7xl text-red-500"
            style={{ textShadow: "0 0 20px #ff0000, 0 0 40px #ff5500, 0 0 60px #ffaa00" }}
            animate={{ scale: [1, 1.15, 1], opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
          >
            7
          </motion.div>
        ))}
      </div>
      <h1 className="mt-3 font-display text-3xl font-black tracking-[0.3em] text-yellow-300" style={{ textShadow: "0 0 10px #ffaa00, 0 0 20px #ff5500" }}>
        LUCKY 7s
      </h1>
      <p className="text-yellow-300/70 text-xs uppercase tracking-[0.4em] mt-1">Welcome to vegas…</p>
      <div className="mt-6 w-64 h-2 bg-black rounded-full overflow-hidden border border-yellow-500/60">
        <div className="h-full bg-gradient-to-r from-red-600 via-yellow-400 to-red-600" style={{ width: `${progress}%`, boxShadow: "0 0 10px #ff0000" }} />
      </div>
      <p className="text-yellow-300/80 text-[10px] mt-2 font-mono">{Math.round(progress)}%</p>
    </div>
  );
}

const theme: SlotTheme = {
  title: "Lucky 7s",
  slug: "lucky-7s",
  shortLabel: "777",
  topBarGradient: "from-red-950 via-red-700 to-red-950",
  topBarBorder: "border-yellow-400",
  bgGradient: "from-black via-[#1a0000] to-black",
  frameBorder: "border-yellow-400",
  frameBg: "from-[#1a0000] via-black to-[#1a0000]",
  accentText: "text-yellow-300",
  spinButtonGradient: "from-yellow-300 via-red-500 to-red-800",
  spinButtonBorder: "border-yellow-200",
  symbols: [
    { id: "seven",   emoji: "7️⃣", pay: [1, 3, 10, 50], weight: 1, tier: "premium", label: "Lucky 7" },
    { id: "diamond", emoji: "💎", pay: [0.5, 1.5, 5, 20], weight: 4, tier: "premium", label: "Diamond" },
    { id: "bell",    emoji: "🔔", pay: [0.4, 1.2, 4, 15], weight: 6, tier: "high",   label: "Bell" },
    { id: "money",   emoji: "💵", pay: [0.3, 0.9, 3, 10], weight: 7, tier: "high",   label: "Money" },
    { id: "bar",     emoji: "🅱️", pay: [0.2, 0.5, 2, 6], weight: 9, tier: "mid",    label: "BAR" },
    { id: "cherry",  emoji: "🍒", pay: [0.2, 0.5, 2, 6], weight: 9, tier: "mid",    label: "Cherry" },
    { id: "lemon",   emoji: "🍋", pay: [0.15, 0.4, 1.5, 5], weight: 10, tier: "mid", label: "Lemon" },
    { id: "grape",   emoji: "🍇", pay: [0.15, 0.4, 1.5, 5], weight: 10, tier: "mid", label: "Grape" },
    { id: "watermelon", emoji: "🍉", pay: [0.1, 0.3, 1, 4], weight: 12, tier: "low", label: "Melon" },
    { id: "orange",  emoji: "🍊", pay: [0.1, 0.3, 1, 4], weight: 12, tier: "low",   label: "Orange" },
    { id: "card",    emoji: "🃏", pay: [0.05, 0.15, 0.5, 2], weight: 13, tier: "low", label: "Card" },
    { id: "dice",    emoji: "🎲", pay: [0.05, 0.15, 0.5, 2], weight: 13, tier: "low", label: "Dice" },
    { id: "star",    emoji: "⭐", pay: [0.8, 2.5, 10, 40], weight: 1, tier: "wild",  label: "WILD STAR" },
  ],
  wildId: "star",
  scatterId: "seven",
  bonusTitle: "JACKPOT BONUS",
  bonusSubtitle: "Pick the lucky numbers — avoid the bust!",
  bonusBgGradient: "from-black via-[#2a0000] to-black",
  bonusItemEmoji: "🎰",
  bonusEndEmoji: "💥",
  bonusEndMessage: "💥 BUST! Bonus ends.",
  bigWinGradient: "from-yellow-200 via-red-400 to-red-700",
  bigWinCoinEmoji: "💰",
  jackpotColors: [
    "from-yellow-300 to-amber-600",
    "from-orange-400 to-red-600",
    "from-fuchsia-400 to-purple-700",
    "from-red-500 to-rose-800",
  ],
  loadingScreen: Lucky7sLoading,
  emojiLeft: "7️⃣",
  emojiRight: "💎",
  primaryHsl: "0 90% 55%",
  bonusType: "wheel",
};

export default function Lucky7s() {
  return <SlotGame theme={theme} />;
}
