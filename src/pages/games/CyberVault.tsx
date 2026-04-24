import { motion } from "framer-motion";
import { SlotGame, SlotTheme } from "@/components/casino/SlotEngine";

function CyberLoading({ progress }: { progress: number }) {
  return (
    <div className="absolute inset-0 z-50 bg-black flex flex-col items-center justify-center overflow-hidden">
      {/* matrix grid */}
      <div
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(hsla(180,100%,50%,0.4) 1px, transparent 1px), linear-gradient(90deg, hsla(180,100%,50%,0.4) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />
      {/* falling code rain */}
      {Array.from({ length: 14 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute font-mono text-xs text-cyan-400"
          style={{ left: `${(i * 7) % 100}%`, textShadow: "0 0 6px #22d3ee" }}
          animate={{ y: ["-10%", "110%"], opacity: [0, 1, 0] }}
          transition={{ duration: 3 + (i % 3), repeat: Infinity, delay: i * 0.2, ease: "linear" }}
        >
          01101
        </motion.div>
      ))}
      <motion.div
        className="text-7xl relative"
        style={{ filter: "drop-shadow(0 0 24px #ec4899)" }}
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        🔒
      </motion.div>
      <h1 className="mt-3 font-display text-4xl font-black tracking-wider text-pink-300" style={{ textShadow: "0 0 18px #ec4899, 0 0 30px #06b6d4" }}>
        CYBER VAULT
      </h1>
      <p className="text-pink-200/80 text-xs uppercase tracking-[0.4em] mt-1 font-mono">Bypassing firewall…</p>
      <div className="mt-6 w-64 h-2 bg-black/60 rounded-full overflow-hidden border border-pink-500">
        <div className="h-full bg-gradient-to-r from-pink-400 via-cyan-400 to-pink-400" style={{ width: `${progress}%`, boxShadow: "0 0 10px #ec4899" }} />
      </div>
      <p className="text-cyan-300 text-[10px] mt-2 font-mono">{Math.round(progress)}%</p>
    </div>
  );
}

const theme: SlotTheme = {
  title: "Cyber Vault",
  slug: "cyber-vault",
  shortLabel: "01",
  topBarGradient: "from-pink-950 via-cyan-700 to-pink-950",
  topBarBorder: "border-pink-400",
  bgGradient: "from-black via-[#0a0220] to-black",
  frameBorder: "border-pink-500",
  frameBg: "from-[#0a0220] via-black to-[#02141a]",
  accentText: "text-pink-300",
  spinButtonGradient: "from-pink-400 via-cyan-500 to-pink-700",
  spinButtonBorder: "border-pink-200",
  symbols: [
    { id: "vault",  emoji: "🔒", pay: [5, 20, 80, 400], weight: 1, tier: "premium", label: "Vault Core" },
    { id: "chip",   emoji: "💾", pay: [3, 12, 50, 200], weight: 4, tier: "premium", label: "Data Chip" },
    { id: "robot",  emoji: "🤖", pay: [2, 7, 25, 100], weight: 6, tier: "high", label: "Bot" },
    { id: "key",    emoji: "🔑", pay: [1.5, 5, 20, 80], weight: 7, tier: "high", label: "Key Card" },
    { id: "phone",  emoji: "📱", pay: [1.2, 4, 14, 50], weight: 9, tier: "mid", label: "Hack Phone" },
    { id: "laptop", emoji: "💻", pay: [1.2, 4, 14, 50], weight: 9, tier: "mid", label: "Laptop" },
    { id: "drone",  emoji: "🛸", pay: [1, 3, 12, 40], weight: 10, tier: "mid", label: "Drone" },
    { id: "shades", emoji: "🕶️", pay: [1, 3, 12, 40], weight: 10, tier: "mid", label: "Shades" },
    { id: "battery", emoji: "🔋", pay: [0.8, 2.5, 9, 30], weight: 12, tier: "low", label: "Battery" },
    { id: "bulb",   emoji: "💡", pay: [0.8, 2.5, 9, 30], weight: 12, tier: "low", label: "Neon Bulb" },
    { id: "gear",   emoji: "⚙️", pay: [0.6, 2, 7, 22], weight: 13, tier: "low", label: "Gear" },
    { id: "plug",   emoji: "🔌", pay: [0.6, 2, 7, 22], weight: 13, tier: "low", label: "Plug" },
    { id: "wifi",   emoji: "📡", pay: [5, 18, 70, 300], weight: 1, tier: "wild", label: "WILD SIGNAL" },
  ],
  wildId: "wifi",
  scatterId: "vault",
  bonusTitle: "DATA HEIST",
  bonusSubtitle: "Pick servers to extract data — avoid the kill-switch!",
  bonusBgGradient: "from-pink-950 via-black to-cyan-950",
  bonusItemEmoji: "🖥️",
  bonusEndEmoji: "⚠️",
  bonusEndMessage: "⚠️ Trace detected! System wipes the score.",
  bigWinGradient: "from-pink-200 via-pink-400 to-cyan-500",
  bigWinCoinEmoji: "💾",
  jackpotColors: [
    "from-pink-300 to-pink-700",
    "from-cyan-300 to-cyan-700",
    "from-fuchsia-400 to-purple-700",
    "from-blue-400 to-cyan-800",
  ],
  loadingScreen: CyberLoading,
  emojiLeft: "🔒",
  emojiRight: "💾",
  primaryHsl: "320 90% 60%",
  bonusType: "wheel",
  skin: "cosmic",
};

export default function CyberVault() {
  return <SlotGame theme={theme} />;
}