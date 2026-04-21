import { motion } from "framer-motion";
import { SlotGame, SlotTheme } from "@/components/casino/SlotEngine";

// ===== Loading: confetti explosion + balloons + fireworks =====
function JackpotJoyLoading({ progress }: { progress: number }) {
  const colors = ["#ff2d92", "#ffd23f", "#ff6b6b", "#a78bfa", "#22d3ee", "#fb923c"];
  return (
    <div className="absolute inset-0 z-50 bg-gradient-to-br from-[#ff2d92] via-[#a020f0] to-[#ff6b00] flex flex-col items-center justify-center overflow-hidden">
      {/* fireworks bursts */}
      {Array.from({ length: 5 }).map((_, fb) => (
        <div key={fb} className="absolute" style={{ left: `${15 + fb * 18}%`, top: `${15 + (fb % 2) * 30}%` }}>
          {Array.from({ length: 12 }).map((_, p) => {
            const angle = (p / 12) * Math.PI * 2;
            return (
              <motion.div
                key={p}
                className="absolute w-1.5 h-1.5 rounded-full"
                style={{ background: colors[(fb + p) % colors.length], boxShadow: `0 0 8px ${colors[(fb + p) % colors.length]}` }}
                animate={{ x: [0, Math.cos(angle) * 60], y: [0, Math.sin(angle) * 60], opacity: [1, 0], scale: [1, 0.3] }}
                transition={{ duration: 1.4, repeat: Infinity, delay: fb * 0.4 + p * 0.05 }}
              />
            );
          })}
        </div>
      ))}
      {/* falling confetti */}
      {Array.from({ length: 36 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-3"
          style={{ left: `${(i * 3) % 100}%`, top: -20, background: colors[i % colors.length] }}
          animate={{ y: [0, 700], rotate: [0, 360 * 3], x: [0, (i % 2 ? 40 : -40)] }}
          transition={{ duration: 4 + (i % 3), repeat: Infinity, delay: i * 0.1, ease: "linear" }}
        />
      ))}
      {/* floating balloons */}
      {["🎈", "🎈", "🎈", "🎈"].map((b, i) => (
        <motion.div
          key={i}
          className="absolute text-6xl"
          style={{ left: `${10 + i * 22}%`, bottom: -60 }}
          animate={{ y: [0, -700], x: [0, (i % 2 ? 20 : -20)] }}
          transition={{ duration: 8 + i, repeat: Infinity, delay: i * 1.5, ease: "linear" }}
        >
          {b}
        </motion.div>
      ))}
      {/* center icon */}
      <motion.div
        className="text-8xl"
        animate={{ scale: [1, 1.2, 1], rotate: [-5, 5, -5] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        🎉
      </motion.div>
      <h1 className="mt-3 font-display text-4xl font-black tracking-wider text-white drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)]">
        JACKPOTJOY
      </h1>
      <p className="text-white/90 text-xs uppercase tracking-[0.3em] mt-1 font-bold">Let the party begin…</p>
      <div className="mt-6 w-64 h-2 bg-black/40 rounded-full overflow-hidden border-2 border-yellow-300">
        <motion.div className="h-full bg-gradient-to-r from-yellow-300 via-pink-300 to-fuchsia-400" style={{ width: `${progress}%` }} animate={{ backgroundPositionX: ["0%", "100%"] }} transition={{ duration: 1, repeat: Infinity }} />
      </div>
      <p className="text-white/90 text-[10px] mt-2 font-mono font-bold">{Math.round(progress)}%</p>
    </div>
  );
}

const theme: SlotTheme = {
  title: "JackpotJoy",
  slug: "jackpotjoy",
  shortLabel: "JOY",
  topBarGradient: "from-fuchsia-900 via-pink-600 to-fuchsia-900",
  topBarBorder: "border-pink-300",
  bgGradient: "from-[#3a0a3a] via-[#5a0a5a] to-black",
  frameBorder: "border-pink-400",
  frameBg: "from-[#5a0a5a] via-[#3a0a3a] to-black",
  accentText: "text-pink-100",
  spinButtonGradient: "from-pink-300 via-fuchsia-500 to-purple-800",
  spinButtonBorder: "border-pink-200",
  symbols: [
    { id: "trophy",   emoji: "🏆", pay: [3, 12, 50, 200], weight: 1, tier: "premium", label: "Trophy" },
    { id: "moneybag", emoji: "💰", pay: [2.5, 10, 40, 150], weight: 4, tier: "premium", label: "Cash" },
    { id: "gem",      emoji: "💎", pay: [2, 7, 25, 100], weight: 6, tier: "high",    label: "Gem" },
    { id: "ring",     emoji: "💍", pay: [1.5, 5, 20, 80], weight: 7, tier: "high",  label: "Ring" },
    { id: "balloon",  emoji: "🎈", pay: [1.2, 4, 14, 50], weight: 9, tier: "mid",    label: "Balloon" },
    { id: "cake",     emoji: "🎂", pay: [1.2, 4, 14, 50], weight: 9, tier: "mid",    label: "Cake" },
    { id: "gift",     emoji: "🎁", pay: [1, 3, 12, 40], weight: 10, tier: "mid",   label: "Gift" },
    { id: "popper",   emoji: "🎊", pay: [1, 3, 12, 40], weight: 10, tier: "mid",   label: "Popper" },
    { id: "ticket",   emoji: "🎫", pay: [0.8, 2.5, 9, 30], weight: 12, tier: "low", label: "Ticket" },
    { id: "drum",     emoji: "🥁", pay: [0.8, 2.5, 9, 30], weight: 12, tier: "low", label: "Drum" },
    { id: "guitar",   emoji: "🎸", pay: [0.6, 2, 7, 22], weight: 13, tier: "low",  label: "Guitar" },
    { id: "candy",    emoji: "🍭", pay: [0.6, 2, 7, 22], weight: 13, tier: "low",  label: "Candy" },
    { id: "party",    emoji: "🎉", pay: [5, 18, 70, 300], weight: 1, tier: "wild",   label: "WILD PARTY" },
  ],
  wildId: "party",
  scatterId: "trophy",
  bonusTitle: "PARTY BONUS",
  bonusSubtitle: "Pick the gifts — avoid the empty box!",
  bonusBgGradient: "from-fuchsia-900 via-pink-700 to-purple-900",
  bonusItemEmoji: "🎁",
  bonusEndEmoji: "📦",
  bonusEndMessage: "📦 Empty box! Bonus ends.",
  bigWinGradient: "from-yellow-200 via-pink-400 to-fuchsia-700",
  bigWinCoinEmoji: "🎉",
  jackpotColors: [
    "from-pink-300 to-rose-600",
    "from-fuchsia-400 to-purple-700",
    "from-yellow-300 to-amber-600",
    "from-cyan-300 to-blue-700",
  ],
  loadingScreen: JackpotJoyLoading,
  emojiLeft: "🎉",
  emojiRight: "🎊",
  primaryHsl: "320 90% 65%",
  bonusType: "gifts",
};

export default function JackpotJoy() {
  return <SlotGame theme={theme} />;
}
