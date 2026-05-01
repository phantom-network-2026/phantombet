import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check } from "lucide-react";
import logo from "@/assets/phantom-logo-ghost.jpeg";

interface ConnectingSplashProps {
  onComplete: () => void;
  duration?: number; // total ms, default 10000
}

const PHASES = [
  { from: 0, to: 20, label: "Connecting to station" },
  { from: 20, to: 45, label: "Connecting to mainframe" },
  { from: 45, to: 80, label: "Initialising servers" },
  { from: 80, to: 99, label: "Initialising encryption keys" },
  { from: 99, to: 100, label: "Successfully connected to the Phantom Network" },
];

function getPhaseLabel(pct: number) {
  for (const p of PHASES) {
    if (pct >= p.from && pct <= p.to) return p.label;
  }
  return PHASES[PHASES.length - 1].label;
}

export default function ConnectingSplash({ onComplete, duration = 10000 }: ConnectingSplashProps) {
  const [pct, setPct] = useState(0);

  useEffect(() => {
    const start = performance.now();
    let raf: number;
    const tick = (now: number) => {
      const elapsed = now - start;
      // Ease-out so it slows nicely toward 100
      const t = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - t, 2.2);
      const value = Math.floor(eased * 100);
      setPct(value);
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        setPct(100);
        setTimeout(onComplete, 650);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [duration, onComplete]);

  // Circle math
  const size = 220;
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (pct / 100) * circumference;

  const label = getPhaseLabel(pct);
  const isDone = pct >= 100;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
      className="fixed inset-0 z-[9999] overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse at 50% 30%, hsl(270 60% 18%) 0%, hsl(265 70% 8%) 55%, hsl(260 80% 4%) 100%)",
      }}
    >
      {/* Animated grid backdrop */}
      <div
        className="absolute inset-0 opacity-25"
        style={{
          backgroundImage:
            "linear-gradient(hsl(280 90% 60% / 0.25) 1px, transparent 1px), linear-gradient(90deg, hsl(280 90% 60% / 0.25) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
          maskImage: "radial-gradient(ellipse at center, black 30%, transparent 75%)",
          WebkitMaskImage: "radial-gradient(ellipse at center, black 30%, transparent 75%)",
        }}
      />

      {/* Floating orbs */}
      {[0, 1, 2, 3, 4].map((i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width: 6 + (i % 3) * 4,
            height: 6 + (i % 3) * 4,
            background: i % 2 === 0 ? "hsl(280 95% 70%)" : "hsl(45 95% 60%)",
            boxShadow: i % 2 === 0 ? "0 0 18px hsl(280 95% 70%)" : "0 0 18px hsl(45 95% 60%)",
            left: `${15 + i * 16}%`,
            top: `${20 + (i * 12) % 60}%`,
          }}
          animate={{
            y: [0, -22, 0],
            opacity: [0.3, 1, 0.3],
          }}
          transition={{
            duration: 2.6 + i * 0.4,
            repeat: Infinity,
            delay: i * 0.25,
            ease: "easeInOut",
          }}
        />
      ))}

      {/* Main content */}
      <div className="relative h-full w-full flex flex-col items-center justify-center px-6">
        {/* Outer ring + ghost */}
        <div className="relative" style={{ width: size, height: size }}>
          {/* Spinning aura */}
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{
              background:
                "conic-gradient(from 0deg, hsl(280 95% 65% / 0.6), hsl(45 95% 60% / 0.3), hsl(280 95% 65% / 0.6))",
              filter: "blur(16px)",
            }}
            animate={{ rotate: 360 }}
            transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
          />

          {/* Progress ring */}
          <svg width={size} height={size} className="relative -rotate-90">
            <defs>
              <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="hsl(280 95% 70%)" />
                <stop offset="100%" stopColor="hsl(45 95% 60%)" />
              </linearGradient>
            </defs>
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke="hsl(280 30% 25% / 0.6)"
              strokeWidth={stroke}
              fill="none"
            />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke="url(#ringGrad)"
              strokeWidth={stroke}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              style={{
                transition: "stroke-dashoffset 0.18s linear",
                filter: "drop-shadow(0 0 8px hsl(280 95% 65%))",
              }}
            />
          </svg>

          {/* Ghost in center */}
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            animate={{
              y: [0, -8, 0],
              scale: [1, 1.04, 1],
            }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          >
            <div
              className="rounded-full overflow-hidden"
              style={{
                width: size * 0.55,
                height: size * 0.55,
                boxShadow: "0 0 40px hsl(280 95% 65% / 0.7), inset 0 0 30px hsl(280 95% 35% / 0.5)",
              }}
            >
              <img src={logo} alt="Phantom" className="w-full h-full object-cover" />
            </div>
          </motion.div>

          {/* % counter overlay (top of ring) */}
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 translate-y-full">
            <div
              className="font-display text-5xl font-black tracking-tight"
              style={{
                background: "linear-gradient(135deg, hsl(280 95% 75%), hsl(45 95% 65%))",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                textShadow: "0 0 20px hsl(280 95% 60% / 0.4)",
              }}
            >
              {pct}%
            </div>
          </div>
        </div>

        {/* Phase label */}
        <div className="mt-32 h-14 flex items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
              className="flex items-center gap-2 text-center"
            >
              {isDone && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 220, damping: 12 }}
                  className="rounded-full p-1"
                  style={{ background: "hsl(140 70% 45%)", boxShadow: "0 0 14px hsl(140 70% 45%)" }}
                >
                  <Check className="h-4 w-4 text-white" strokeWidth={3} />
                </motion.div>
              )}
              <span
                className="text-base sm:text-lg font-medium tracking-wide"
                style={{ color: isDone ? "hsl(140 80% 75%)" : "hsl(280 30% 92%)" }}
              >
                {label}
              </span>
              {!isDone && (
                <motion.span
                  className="inline-flex gap-0.5 ml-1"
                  aria-hidden
                >
                  {[0, 1, 2].map((d) => (
                    <motion.span
                      key={d}
                      className="h-1 w-1 rounded-full bg-casino-gold"
                      animate={{ opacity: [0.2, 1, 0.2] }}
                      transition={{ duration: 1, repeat: Infinity, delay: d * 0.18 }}
                    />
                  ))}
                </motion.span>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Branding line */}
        <div className="mt-2 text-[11px] uppercase tracking-[0.4em] text-purple-200/40 font-display">
          Phantom Network · Secure Channel
        </div>

        {/* Linear progress */}
        <div className="mt-6 w-full max-w-xs h-1 rounded-full bg-purple-950/60 overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{
              width: `${pct}%`,
              background: "linear-gradient(90deg, hsl(280 95% 65%), hsl(45 95% 60%))",
              boxShadow: "0 0 10px hsl(280 95% 65%)",
            }}
            transition={{ duration: 0.18, ease: "linear" }}
          />
        </div>
      </div>
    </motion.div>
  );
}