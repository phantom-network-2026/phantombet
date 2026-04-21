import { motion } from "framer-motion";
import { SlotGame, SlotTheme } from "@/components/casino/SlotEngine";

// ===== Loading: medieval castle with raising drawbridge / fire torches =====
function CastleLoading({ progress }: { progress: number }) {
  return (
    <div className="absolute inset-0 z-50 bg-gradient-to-b from-[#1a0a2e] via-[#3a0f1a] to-black flex flex-col items-center justify-center overflow-hidden">
      {/* sunset glow */}
      <div className="absolute inset-x-0 top-1/3 h-1/2 opacity-50 pointer-events-none" style={{ background: "radial-gradient(ellipse at 50% 100%, rgba(255,120,40,0.6), transparent 70%)" }} />
      {/* floating embers */}
      {Array.from({ length: 30 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full bg-orange-300 shadow-[0_0_6px_rgba(255,140,40,0.9)]"
          style={{ left: `${(i * 7.7) % 100}%`, bottom: -10 }}
          animate={{ y: [0, -600 - (i % 5) * 50], opacity: [0, 1, 0], x: [0, (i % 2 ? 30 : -30)] }}
          transition={{ duration: 5 + (i % 4), repeat: Infinity, delay: i * 0.25, ease: "linear" }}
        />
      ))}
      {/* castle silhouette */}
      <motion.div className="text-[100px] leading-none" animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 4, repeat: Infinity }}>
        🏰
      </motion.div>
      {/* circling dragon */}
      <motion.div
        className="absolute text-5xl"
        animate={{
          x: [-200, 200, -200],
          y: [-150, -100, -150],
          rotateY: [0, 0, 180, 180, 0],
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
      >
        🐉
      </motion.div>
      <h1 className="mt-2 font-display text-4xl font-black tracking-wider bg-gradient-to-b from-amber-200 via-orange-400 to-red-700 bg-clip-text text-transparent drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
        CASTLE DEFENCE
      </h1>
      <p className="text-orange-200/80 text-xs uppercase tracking-[0.3em] mt-1">Raising the drawbridge…</p>
      <div className="mt-6 w-64 h-2 bg-black/60 rounded-full overflow-hidden border border-orange-500/40">
        <div className="h-full bg-gradient-to-r from-orange-500 via-red-500 to-orange-700" style={{ width: `${progress}%` }} />
      </div>
      <p className="text-orange-200/80 text-[10px] mt-2 font-mono">{Math.round(progress)}%</p>
    </div>
  );
}

const theme: SlotTheme = {
  title: "Castle Defence",
  slug: "castle-defence",
  shortLabel: "CASTLE",
  topBarGradient: "from-[#1a0a2e] via-[#5a1f0a] to-[#1a0a2e]",
  topBarBorder: "border-orange-500/70",
  bgGradient: "from-[#1a0a2e] via-[#3a0f1a] to-black",
  frameBorder: "border-orange-600",
  frameBg: "from-[#3a0f1a] via-[#1a0a2e] to-black",
  accentText: "text-orange-200",
  spinButtonGradient: "from-orange-300 via-red-500 to-red-900",
  spinButtonBorder: "border-orange-200",
  symbols: [
    { id: "dragon",  emoji: "🐉", pay: [3, 12, 50, 200], weight: 1, tier: "premium", label: "Dragon" },
    { id: "castle",  emoji: "🏰", pay: [2.5, 10, 40, 150], weight: 4, tier: "premium", label: "Castle" },
    { id: "knight",  emoji: "🤴", pay: [2, 7, 25, 100], weight: 6, tier: "high",    label: "King" },
    { id: "queen",   emoji: "👸", pay: [1.5, 5, 20, 80], weight: 7, tier: "high",  label: "Queen" },
    { id: "sword",   emoji: "⚔️", pay: [1.2, 4, 14, 50], weight: 9, tier: "mid",   label: "Swords" },
    { id: "shield",  emoji: "🛡️", pay: [1.2, 4, 14, 50], weight: 9, tier: "mid",   label: "Shield" },
    { id: "bow",     emoji: "🏹", pay: [1, 3, 12, 40], weight: 10, tier: "mid",  label: "Bow" },
    { id: "axe",     emoji: "🪓", pay: [1, 3, 12, 40], weight: 10, tier: "mid",  label: "Axe" },
    { id: "torch",   emoji: "🔥", pay: [0.8, 2.5, 9, 30], weight: 12, tier: "low", label: "Torch" },
    { id: "scroll",  emoji: "📜", pay: [0.8, 2.5, 9, 30], weight: 12, tier: "low", label: "Scroll" },
    { id: "potion",  emoji: "🧪", pay: [0.6, 2, 7, 22], weight: 13, tier: "low", label: "Potion" },
    { id: "helm",    emoji: "⛑️", pay: [0.6, 2, 7, 22], weight: 13, tier: "low", label: "Helm" },
    { id: "crown",   emoji: "👑", pay: [5, 18, 70, 300], weight: 1, tier: "wild",   label: "WILD CROWN" },
  ],
  wildId: "crown",
  scatterId: "dragon",
  bonusTitle: "SIEGE BONUS",
  bonusSubtitle: "Pick crests — beware the dragon!",
  bonusBgGradient: "from-[#1a0a2e] via-[#3a0f1a] to-black",
  bonusItemEmoji: "🛡️",
  bonusEndEmoji: "🐉",
  bonusEndMessage: "🐉 Dragon attack! Bonus ends.",
  bigWinGradient: "from-amber-200 via-orange-400 to-red-700",
  bigWinCoinEmoji: "💰",
  jackpotColors: [
    "from-amber-300 to-yellow-500",
    "from-emerald-300 to-green-500",
    "from-sky-300 to-blue-500",
    "from-rose-400 to-red-600",
  ],
  loadingScreen: CastleLoading,
  emojiLeft: "⚔️",
  emojiRight: "🛡️",
  primaryHsl: "20 90% 55%",
  bonusType: "siege",
};

export default function CastleDefence() {
  return <SlotGame theme={theme} />;
}
