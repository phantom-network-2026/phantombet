import { motion } from "framer-motion";
import { SlotGame, SlotTheme } from "@/components/casino/SlotEngine";

function SunkenLoading({ progress }: { progress: number }) {
  return (
    <div className="absolute inset-0 z-50 bg-gradient-to-b from-[#062a3a] via-[#021a2a] to-black flex flex-col items-center justify-center overflow-hidden">
      {/* god rays */}
      <div
        className="absolute inset-0 opacity-40 pointer-events-none"
        style={{ background: "linear-gradient(180deg, hsla(190, 90%, 60%, 0.6), transparent 70%)" }}
      />
      {/* rising bubbles */}
      {Array.from({ length: 22 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full bg-cyan-200/40 border border-cyan-100/60"
          style={{ left: `${(i * 7) % 100}%`, width: 6 + (i % 4) * 4, height: 6 + (i % 4) * 4, bottom: 0 }}
          animate={{ y: [0, -700], opacity: [0.7, 0] }}
          transition={{ duration: 5 + (i % 3), repeat: Infinity, delay: i * 0.2, ease: "linear" }}
        />
      ))}
      {/* sunken column */}
      <div className="absolute bottom-12 left-1/4 w-6 h-32 bg-gradient-to-b from-teal-200/60 to-teal-900/60 rounded-t-md transform -rotate-12" />
      <div className="absolute bottom-12 right-1/4 w-6 h-28 bg-gradient-to-b from-teal-200/60 to-teal-900/60 rounded-t-md transform rotate-6" />
      <motion.div
        className="text-7xl relative"
        style={{ filter: "drop-shadow(0 0 24px #22d3ee)" }}
        animate={{ scale: [1, 1.1, 1], rotate: [-3, 3, -3] }}
        transition={{ duration: 3, repeat: Infinity }}
      >
        🔱
      </motion.div>
      <h1 className="mt-3 font-display text-4xl font-black tracking-wider text-cyan-200" style={{ textShadow: "0 0 18px #06b6d4, 0 0 30px #14b8a6" }}>
        SUNKEN TEMPLE
      </h1>
      <p className="text-cyan-200/80 text-xs uppercase tracking-[0.3em] mt-1 font-bold relative">Diving the deep…</p>
      <div className="mt-6 w-64 h-2 bg-black/60 rounded-full overflow-hidden border-2 border-cyan-400 relative">
        <div className="h-full bg-gradient-to-r from-cyan-300 via-teal-400 to-cyan-300" style={{ width: `${progress}%` }} />
      </div>
      <p className="text-cyan-200/80 text-[10px] mt-2 font-mono font-bold relative">{Math.round(progress)}%</p>
    </div>
  );
}

const theme: SlotTheme = {
  title: "Sunken Temple",
  slug: "sunken-temple",
  shortLabel: "🔱",
  topBarGradient: "from-teal-950 via-cyan-700 to-teal-950",
  topBarBorder: "border-cyan-300",
  bgGradient: "from-[#062a3a] via-[#021a2a] to-black",
  frameBorder: "border-cyan-400",
  frameBg: "from-[#021a2a] via-[#062a3a] to-black",
  accentText: "text-cyan-200",
  spinButtonGradient: "from-cyan-300 via-teal-500 to-blue-900",
  spinButtonBorder: "border-cyan-200",
  symbols: [
    { id: "trident", emoji: "🔱", pay: [5, 20, 80, 400], weight: 1, tier: "premium", label: "Trident" },
    { id: "crystal", emoji: "💎", pay: [3, 12, 50, 200], weight: 4, tier: "premium", label: "Crystal" },
    { id: "shell",   emoji: "🐚", pay: [2, 7, 25, 100], weight: 6, tier: "high", label: "Conch" },
    { id: "octopus", emoji: "🐙", pay: [1.5, 5, 20, 80], weight: 7, tier: "high", label: "Octopus" },
    { id: "fish",    emoji: "🐠", pay: [1.2, 4, 14, 50], weight: 9, tier: "mid", label: "Tropical Fish" },
    { id: "turtle",  emoji: "🐢", pay: [1.2, 4, 14, 50], weight: 9, tier: "mid", label: "Turtle" },
    { id: "anchor",  emoji: "⚓", pay: [1, 3, 12, 40], weight: 10, tier: "mid", label: "Anchor" },
    { id: "amphora", emoji: "🏺", pay: [1, 3, 12, 40], weight: 10, tier: "mid", label: "Amphora" },
    { id: "coral",   emoji: "🪸", pay: [0.8, 2.5, 9, 30], weight: 12, tier: "low", label: "Coral" },
    { id: "starfish", emoji: "⭐", pay: [0.8, 2.5, 9, 30], weight: 12, tier: "low", label: "Starfish" },
    { id: "seaweed", emoji: "🌿", pay: [0.6, 2, 7, 22], weight: 13, tier: "low", label: "Kelp" },
    { id: "pearl",   emoji: "🪙", pay: [0.6, 2, 7, 22], weight: 13, tier: "low", label: "Pearl" },
    { id: "mermaid", emoji: "🧜‍♀️", pay: [5, 18, 70, 300], weight: 1, tier: "wild", label: "WILD MERMAID" },
  ],
  wildId: "mermaid",
  scatterId: "trident",
  bonusTitle: "ATLANTIS DIVE",
  bonusSubtitle: "Pick clams to find pearls — beware the leviathan!",
  bonusBgGradient: "from-teal-950 via-[#021a2a] to-black",
  bonusItemEmoji: "🐚",
  bonusEndEmoji: "🦈",
  bonusEndMessage: "🦈 Leviathan strikes! Bonus ends.",
  bigWinGradient: "from-cyan-100 via-cyan-300 to-teal-600",
  bigWinCoinEmoji: "🪙",
  jackpotColors: [
    "from-cyan-300 to-teal-700",
    "from-teal-300 to-teal-800",
    "from-blue-400 to-cyan-800",
    "from-emerald-400 to-teal-800",
  ],
  loadingScreen: SunkenLoading,
  emojiLeft: "🔱",
  emojiRight: "🐙",
  primaryHsl: "180 80% 60%",
  bonusType: "fishing",
  skin: "aquarium",
};

export default function SunkenTemple() {
  return <SlotGame theme={theme} />;
}