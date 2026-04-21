import { motion } from "framer-motion";
import { SlotGame, SlotTheme } from "@/components/casino/SlotEngine";

// ===== Loading: warp star field + orbiting planets =====
function GalacticSpinsLoading({ progress }: { progress: number }) {
  return (
    <div className="absolute inset-0 z-50 bg-gradient-to-br from-[#0b0033] via-[#1a0050] to-black flex flex-col items-center justify-center overflow-hidden">
      {/* warp stars */}
      {Array.from({ length: 60 }).map((_, i) => {
        const angle = (i / 60) * Math.PI * 2;
        return (
          <motion.div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-white"
            style={{ left: "50%", top: "50%", boxShadow: "0 0 6px #fff" }}
            animate={{
              x: [0, Math.cos(angle) * 400],
              y: [0, Math.sin(angle) * 400],
              opacity: [1, 0],
              scale: [0.4, 1.5],
            }}
            transition={{ duration: 2 + (i % 3) * 0.3, repeat: Infinity, delay: (i * 0.04) % 2 }}
          />
        );
      })}
      {/* orbiting planets */}
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="absolute"
          style={{ left: "50%", top: "50%" }}
          animate={{ rotate: 360 }}
          transition={{ duration: 6 + i * 2, repeat: Infinity, ease: "linear" }}
        >
          <div
            className="absolute rounded-full"
            style={{
              width: 18 - i * 2,
              height: 18 - i * 2,
              left: 80 + i * 30,
              top: -8,
              background: i === 0 ? "#fb7185" : i === 1 ? "#22d3ee" : "#a78bfa",
              boxShadow: `0 0 18px ${i === 0 ? "#fb7185" : i === 1 ? "#22d3ee" : "#a78bfa"}`,
            }}
          />
        </motion.div>
      ))}
      {/* spaceship */}
      <motion.div
        className="text-7xl z-10"
        animate={{ y: [0, -10, 0], rotate: [-5, 5, -5] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        🛸
      </motion.div>
      <h1 className="mt-3 font-display text-4xl font-black tracking-wider text-cyan-300" style={{ textShadow: "0 0 14px #06b6d4, 0 0 28px #a78bfa" }}>
        GALACTIC SPINS
      </h1>
      <p className="text-cyan-200/80 text-xs uppercase tracking-[0.3em] mt-1 font-bold">Engaging warp drive…</p>
      <div className="mt-6 w-64 h-2 bg-black/60 rounded-full overflow-hidden border-2 border-cyan-400">
        <motion.div className="h-full bg-gradient-to-r from-cyan-300 via-fuchsia-400 to-cyan-300" style={{ width: `${progress}%` }} animate={{ backgroundPositionX: ["0%", "100%"] }} transition={{ duration: 1, repeat: Infinity }} />
      </div>
      <p className="text-cyan-200/80 text-[10px] mt-2 font-mono font-bold">{Math.round(progress)}%</p>
    </div>
  );
}

const theme: SlotTheme = {
  title: "Galactic Spins",
  slug: "galactic-spins",
  shortLabel: "GS",
  topBarGradient: "from-purple-950 via-fuchsia-700 to-purple-950",
  topBarBorder: "border-cyan-300",
  bgGradient: "from-[#0b0033] via-[#1a0050] to-black",
  frameBorder: "border-cyan-400",
  frameBg: "from-[#1a0050] via-[#0b0033] to-black",
  accentText: "text-cyan-200",
  spinButtonGradient: "from-cyan-300 via-fuchsia-500 to-purple-800",
  spinButtonBorder: "border-cyan-100",
  symbols: [
    { id: "ufo",     emoji: "🛸", pay: [3, 12, 50, 200], weight: 1, tier: "premium", label: "UFO" },
    { id: "rocket",  emoji: "🚀", pay: [2.5, 10, 40, 150], weight: 4, tier: "premium", label: "Rocket" },
    { id: "alien",   emoji: "👽", pay: [2, 7, 25, 100], weight: 6, tier: "high",    label: "Alien" },
    { id: "satellite",emoji: "🛰️", pay: [1.5, 5, 20, 80], weight: 7, tier: "high",  label: "Satellite" },
    { id: "planet",  emoji: "🪐", pay: [1.2, 4, 14, 50], weight: 9, tier: "mid",    label: "Planet" },
    { id: "earth",   emoji: "🌍", pay: [1.2, 4, 14, 50], weight: 9, tier: "mid",    label: "Earth" },
    { id: "moon",    emoji: "🌙", pay: [1, 3, 12, 40], weight: 10, tier: "mid",   label: "Moon" },
    { id: "comet",   emoji: "☄️", pay: [1, 3, 12, 40], weight: 10, tier: "mid",   label: "Comet" },
    { id: "star",    emoji: "⭐", pay: [0.8, 2.5, 9, 30], weight: 12, tier: "low", label: "Star" },
    { id: "sparkle", emoji: "✨", pay: [0.8, 2.5, 9, 30], weight: 12, tier: "low", label: "Sparkle" },
    { id: "telescope",emoji: "🔭", pay: [0.6, 2, 7, 22], weight: 13, tier: "low", label: "Scope" },
    { id: "robot",   emoji: "🤖", pay: [0.6, 2, 7, 22], weight: 13, tier: "low", label: "Bot" },
    { id: "blackhole",emoji: "🌌", pay: [5, 18, 70, 300], weight: 1, tier: "wild",  label: "WILD HOLE" },
  ],
  wildId: "blackhole",
  scatterId: "ufo",
  bonusTitle: "ALIEN INVASION",
  bonusSubtitle: "Blast UFOs with laser cannons!",
  bonusBgGradient: "from-purple-950 via-[#1a0050] to-black",
  bonusItemEmoji: "🛸",
  bonusEndEmoji: "💥",
  bonusEndMessage: "💥 Ship hit! Bonus ends.",
  bigWinGradient: "from-cyan-200 via-fuchsia-400 to-purple-600",
  bigWinCoinEmoji: "✨",
  jackpotColors: [
    "from-cyan-300 to-blue-700",
    "from-fuchsia-400 to-purple-700",
    "from-pink-300 to-rose-600",
    "from-yellow-300 to-amber-600",
  ],
  loadingScreen: GalacticSpinsLoading,
  emojiLeft: "🛸",
  emojiRight: "🪐",
  primaryHsl: "190 90% 55%",
  bonusType: "siege",
};

export default function GalacticSpins() {
  return <SlotGame theme={theme} />;
}