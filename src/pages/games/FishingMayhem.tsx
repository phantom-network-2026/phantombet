import { motion } from "framer-motion";
import { SlotGame, SlotTheme } from "@/components/casino/SlotEngine";

// ===== Loading: animated underwater scene with rising bubbles =====
function FishingLoading({ progress }: { progress: number }) {
  return (
    <div className="absolute inset-0 z-50 bg-gradient-to-b from-[#003a6b] via-[#005c8a] to-[#001a33] flex flex-col items-center justify-center overflow-hidden">
      {/* sun rays */}
      <div
        className="absolute inset-x-0 top-0 h-2/3 opacity-30 pointer-events-none"
        style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(180,240,255,0.7), transparent 60%)" }}
      />
      {/* bubbles */}
      {Array.from({ length: 22 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full bg-cyan-200/60 border border-white/40"
          style={{ left: `${(i * 11.3) % 100}%`, bottom: -20, width: 8 + (i % 4) * 6, height: 8 + (i % 4) * 6 }}
          animate={{ y: [0, -700], opacity: [0, 1, 0], x: [0, (i % 2 === 0 ? 1 : -1) * 30] }}
          transition={{ duration: 6 + (i % 5), repeat: Infinity, delay: i * 0.3, ease: "linear" }}
        />
      ))}
      {/* swimming fish */}
      {["🐠", "🐟", "🐡", "🦈"].map((f, i) => (
        <motion.div
          key={f}
          className="absolute text-5xl"
          style={{ top: `${20 + i * 18}%`, left: -80 }}
          animate={{ x: [0, window.innerWidth + 100] }}
          transition={{ duration: 8 + i * 2, repeat: Infinity, delay: i * 1.2, ease: "linear" }}
        >
          {f}
        </motion.div>
      ))}
      {/* big bobbing fishhook */}
      <motion.div
        className="text-7xl"
        animate={{ y: [-20, 20, -20], rotate: [-5, 5, -5] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      >
        🎣
      </motion.div>
      <h1 className="mt-4 font-display text-4xl font-black tracking-wider bg-gradient-to-b from-cyan-100 via-cyan-300 to-blue-600 bg-clip-text text-transparent drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
        FISHING MAYHEM
      </h1>
      <p className="text-cyan-200/80 text-xs uppercase tracking-[0.3em] mt-1">Casting the lines…</p>
      <div className="mt-6 w-64 h-2 bg-black/60 rounded-full overflow-hidden border border-cyan-400/40">
        <div className="h-full bg-gradient-to-r from-cyan-400 via-teal-300 to-cyan-500" style={{ width: `${progress}%` }} />
      </div>
      <p className="text-cyan-200/80 text-[10px] mt-2 font-mono">{Math.round(progress)}%</p>
    </div>
  );
}

const theme: SlotTheme = {
  title: "Fishing Mayhem",
  slug: "fishing-mayhem",
  shortLabel: "FISH",
  topBarGradient: "from-blue-950 via-cyan-700 to-blue-950",
  topBarBorder: "border-cyan-300/70",
  bgGradient: "from-[#001a33] via-[#003a6b] to-black",
  frameBorder: "border-cyan-400",
  frameBg: "from-[#003a6b] via-[#001a33] to-black",
  accentText: "text-cyan-100",
  spinButtonGradient: "from-cyan-200 via-cyan-500 to-blue-700",
  spinButtonBorder: "border-cyan-100",
  symbols: [
    { id: "shark",    emoji: "🦈", pay: [3, 12, 50, 200], weight: 1, tier: "premium", label: "Shark" },
    { id: "boat",     emoji: "⛵", pay: [2.5, 10, 40, 150], weight: 4, tier: "premium", label: "Boat" },
    { id: "bigfish",  emoji: "🐠", pay: [2, 7, 25, 100], weight: 6, tier: "high",    label: "Tropical" },
    { id: "octopus",  emoji: "🐙", pay: [1.5, 5, 20, 80], weight: 7, tier: "high",  label: "Octopus" },
    { id: "fish",     emoji: "🐟", pay: [1.2, 4, 14, 50], weight: 9, tier: "mid",    label: "Fish" },
    { id: "puffer",   emoji: "🐡", pay: [1.2, 4, 14, 50], weight: 9, tier: "mid",    label: "Puffer" },
    { id: "crab",     emoji: "🦀", pay: [1, 3, 12, 40], weight: 10, tier: "mid",   label: "Crab" },
    { id: "shrimp",   emoji: "🦐", pay: [1, 3, 12, 40], weight: 10, tier: "mid",   label: "Shrimp" },
    { id: "shell",    emoji: "🐚", pay: [0.8, 2.5, 9, 30], weight: 12, tier: "low", label: "Shell" },
    { id: "anchor",   emoji: "⚓", pay: [0.8, 2.5, 9, 30], weight: 12, tier: "low", label: "Anchor" },
    { id: "wave",     emoji: "🌊", pay: [0.6, 2, 7, 22], weight: 13, tier: "low",  label: "Wave" },
    { id: "chest",    emoji: "💎", pay: [0.6, 2, 7, 22], weight: 13, tier: "low",  label: "Pearl" },
    { id: "hook",     emoji: "🎣", pay: [5, 18, 70, 300], weight: 1, tier: "wild",   label: "WILD HOOK" },
  ],
  wildId: "hook",
  scatterId: "shark",
  bonusTitle: "DEEP SEA BONUS",
  bonusSubtitle: "Pick the shells — beware the shark!",
  bonusBgGradient: "from-[#001a33] via-[#002a4f] to-black",
  bonusItemEmoji: "🐚",
  bonusEndEmoji: "🦈",
  bonusEndMessage: "🦈 The shark strikes! Bonus ends.",
  bigWinGradient: "from-cyan-100 via-cyan-300 to-blue-700",
  bigWinCoinEmoji: "🪙",
  jackpotColors: [
    "from-cyan-300 to-blue-500",
    "from-emerald-300 to-teal-500",
    "from-sky-300 to-indigo-500",
    "from-rose-400 to-red-600",
  ],
  loadingScreen: FishingLoading,
  emojiLeft: "🎣",
  emojiRight: "🐟",
  primaryHsl: "190 90% 55%",
  bonusType: "fishing",
  skin: "aquarium",
};

export default function FishingMayhem() {
  return <SlotGame theme={theme} />;
}
