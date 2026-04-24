import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { AuthGuard } from "@/components/casino/AuthGuard";
import { Header } from "@/components/casino/Header";
import { BottomNav } from "@/components/casino/BottomNav";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { motion, AnimatePresence } from "framer-motion";
import { Gift, Star, Trophy, Flame, Clock } from "lucide-react";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";

// ─── Prize definitions ─────────────────────────────────────────
interface Prize {
  label: string;
  type: "free_spin";
  value: number;
  detail: string;
  icon: string;
  color: string;
  weight: number; // higher = more common
}

const PRIZES: Prize[] = [
  { label: "1 Free Spin", type: "free_spin", value: 1, detail: "Starter reward", icon: "✨", color: "hsl(43,80%,50%)", weight: 34 },
  { label: "3 Free Spins", type: "free_spin", value: 3, detail: "Light streak boost", icon: "🎰", color: "hsl(330,80%,60%)", weight: 24 },
  { label: "5 Free Spins", type: "free_spin", value: 5, detail: "Core daily hit", icon: "🎯", color: "hsl(200,70%,50%)", weight: 18 },
  { label: "10 Free Spins", type: "free_spin", value: 10, detail: "Premium drop", icon: "💎", color: "hsl(270,70%,62%)", weight: 14 },
  { label: "15 Free Spins", type: "free_spin", value: 15, detail: "High-value bonus", icon: "🚀", color: "hsl(145,70%,45%)", weight: 7 },
  { label: "20 Free Spins", type: "free_spin", value: 20, detail: "Elite reward", icon: "👑", color: "hsl(28,90%,58%)", weight: 2.5 },
  { label: "25 Free Spins", type: "free_spin", value: 25, detail: "Top-tier jackpot", icon: "🏆", color: "hsl(52,95%,62%)", weight: 0.5 },
];

// Weighted random – only prizes with weight > 0 can be won on normal spins
function pickPrize(isLoyalty: boolean): Prize {
  const pool = isLoyalty
    ? PRIZES.filter((p) => p.value >= 5)
    : PRIZES.filter((p) => p.weight > 0);
  const totalWeight = pool.reduce((s, p) => s + p.weight, 0);
  let r = Math.random() * totalWeight;
  for (const p of pool) {
    r -= p.weight;
    if (r <= 0) return p;
  }
  return pool[0];
}

function getPrizePresentation(value: number): Prize {
  return PRIZES.find((prize) => prize.value === value) || PRIZES[0];
}

// ─── Reel strip (all prizes shown on the visual reel) ──────────
const REEL_STRIP = Array.from({ length: 40 }, (_, i) => PRIZES[i % PRIZES.length]);

// ─── Slot Reel Component ────────────────────────────────────────
function SlotReel({
  spinning,
  targetIndex,
  onComplete,
  reelHeight,
  itemHeight,
}: {
  spinning: boolean;
  targetIndex: number;
  onComplete: () => void;
  reelHeight: number;
  itemHeight: number;
}) {
  const [offset, setOffset] = useState(0);
  const animRef = useRef<number>(0);
  const startTimeRef = useRef(0);

  useEffect(() => {
    if (!spinning) return;

    const totalItems = REEL_STRIP.length;
    const fullCycles = 3;
    const targetOffset = (fullCycles * totalItems + targetIndex) * itemHeight;
    const duration = 4000;
    startTimeRef.current = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setOffset(eased * targetOffset);

      if (progress < 1) {
        animRef.current = requestAnimationFrame(animate);
      } else {
        onComplete();
      }
    };

    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, [spinning, targetIndex, itemHeight, onComplete]);

  // Build visible items
  const totalItems = REEL_STRIP.length;
  const visibleCount = Math.ceil(reelHeight / itemHeight) + 2;

  const items: { prize: Prize; key: number }[] = [];
  const baseIdx = Math.floor(offset / itemHeight);
  for (let i = -1; i < visibleCount; i++) {
    const idx = (baseIdx + i) % totalItems;
    items.push({ prize: REEL_STRIP[idx < 0 ? idx + totalItems : idx], key: baseIdx + i });
  }

  const pixelOffset = offset % itemHeight;

  return (
    <div
      className="relative overflow-hidden rounded-xl border-2"
      style={{
        height: reelHeight,
        background: "linear-gradient(180deg, hsl(270,40%,8%), hsl(270,30%,12%), hsl(270,40%,8%))",
        borderColor: "hsl(43,80%,45%)",
        boxShadow: "inset 0 0 30px hsl(270,50%,10%), 0 0 20px hsl(43,80%,50%,0.2)",
      }}
    >
      {/* Gradient overlays for depth */}
      <div className="absolute inset-x-0 top-0 h-12 z-10 pointer-events-none"
        style={{ background: "linear-gradient(to bottom, hsl(270,40%,8%), transparent)" }} />
      <div className="absolute inset-x-0 bottom-0 h-12 z-10 pointer-events-none"
        style={{ background: "linear-gradient(to top, hsl(270,40%,8%), transparent)" }} />

      {/* Center indicator line */}
      <div className="absolute inset-x-0 z-20 pointer-events-none"
        style={{
          top: reelHeight / 2 - itemHeight / 2 - 2,
          height: itemHeight + 4,
          border: "2px solid hsl(43,80%,55%)",
          borderRadius: 8,
          boxShadow: "0 0 15px hsl(43,80%,50%,0.5), inset 0 0 15px hsl(43,80%,50%,0.1)",
        }}
      />

      <div style={{ transform: `translateY(${reelHeight / 2 - itemHeight / 2 - pixelOffset}px)` }}>
        {items.map(({ prize, key }) => (
          <div
            key={key}
            className="flex items-center justify-center gap-2 px-3"
            style={{ height: itemHeight }}
          >
            <span className="text-2xl md:text-3xl">{prize.icon}</span>
            <div className="text-center min-w-0">
              <div className="font-bold text-white text-xs md:text-sm truncate">{prize.label}</div>
              <div className="text-[10px] md:text-xs" style={{ color: prize.color }}>{prize.detail}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Confetti burst (lightweight, no deps) ─────────────────────
function ConfettiBurst({ count = 60 }: { count?: number }) {
  // Pre-compute particle properties so they're stable across renders
  const particles = Array.from({ length: count }).map((_, i) => {
    const angle = (i / count) * Math.PI * 2 + Math.random() * 0.4;
    const distance = 140 + Math.random() * 200;
    const size = 6 + Math.random() * 8;
    const palette = [
      "hsl(43,90%,60%)",   // gold
      "hsl(43,100%,75%)",  // light gold
      "hsl(280,75%,65%)",  // purple
      "hsl(330,80%,65%)",  // pink
      "hsl(0,0%,100%)",    // white
    ];
    return {
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance,
      rotate: Math.random() * 720 - 360,
      delay: Math.random() * 0.15,
      duration: 1.6 + Math.random() * 0.9,
      size,
      color: palette[i % palette.length],
      shape: i % 3,
    };
  });
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
      {particles.map((p, i) => (
        <motion.div
          key={i}
          initial={{ x: 0, y: 0, opacity: 1, scale: 0, rotate: 0 }}
          animate={{
            x: p.x,
            y: p.y + 200, // gravity
            opacity: [1, 1, 0],
            scale: [0, 1, 0.7],
            rotate: p.rotate,
          }}
          transition={{ duration: p.duration, delay: p.delay, ease: "easeOut" }}
          className="absolute"
          style={{
            width: p.size,
            height: p.shape === 1 ? p.size * 1.6 : p.size,
            background: p.color,
            borderRadius: p.shape === 0 ? "50%" : p.shape === 2 ? "2px" : "0",
            boxShadow: `0 0 8px ${p.color}`,
          }}
        />
      ))}
    </div>
  );
}

// ─── Prize Splash ───────────────────────────────────────────────
function PrizeSplash({
  prize,
  isLoyalty,
  onClose,
}: {
  prize: Prize;
  isLoyalty: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onClose, 5000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      {/* Confetti behind the card */}
      <ConfettiBurst count={70} />

      {/* Radial light burst */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: [0, 0.8, 0], scale: [0.5, 2, 2.5] }}
        transition={{ duration: 1.4, ease: "easeOut" }}
        style={{
          background:
            "radial-gradient(circle at center, hsl(43,90%,60%,0.45), transparent 60%)",
        }}
      />

      <motion.div
        className="relative text-center p-6 md:p-8 rounded-3xl min-w-[280px] max-w-[360px] overflow-hidden"
        style={{
          background:
            "radial-gradient(ellipse at top, hsl(280,55%,22%), hsl(270,40%,9%) 70%)",
          border: "1px solid hsl(43,80%,55%,0.6)",
          boxShadow:
            "0 0 80px hsl(43,80%,55%,0.45), 0 0 40px hsl(280,70%,45%,0.4), inset 0 1px 0 hsl(43,90%,75%,0.4)",
        }}
        initial={{ scale: 0.4, y: 60, rotate: -3 }}
        animate={{ scale: 1, y: 0, rotate: 0 }}
        exit={{ scale: 0.5, opacity: 0, y: 20 }}
        transition={{ type: "spring", damping: 14, stiffness: 220 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Decorative gold corner accents */}
        <span className="absolute top-3 left-3 w-5 h-5 border-t-2 border-l-2 border-[hsl(43,90%,65%)] rounded-tl-lg opacity-70" />
        <span className="absolute top-3 right-3 w-5 h-5 border-t-2 border-r-2 border-[hsl(43,90%,65%)] rounded-tr-lg opacity-70" />
        <span className="absolute bottom-3 left-3 w-5 h-5 border-b-2 border-l-2 border-[hsl(43,90%,65%)] rounded-bl-lg opacity-70" />
        <span className="absolute bottom-3 right-3 w-5 h-5 border-b-2 border-r-2 border-[hsl(43,90%,65%)] rounded-br-lg opacity-70" />

        {/* Inner light sweep */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          initial={{ x: "-120%" }}
          animate={{ x: "120%" }}
          transition={{ duration: 1.4, delay: 0.3, ease: "easeInOut" }}
          style={{
            background:
              "linear-gradient(115deg, transparent 30%, hsl(43,90%,75%,0.25) 50%, transparent 70%)",
          }}
        />

        {isLoyalty && (
          <motion.div
            className="relative text-[10px] font-bold uppercase tracking-[0.2em] mb-3 px-3 py-1 rounded-full inline-block"
            style={{
              background: "linear-gradient(90deg, hsl(43,90%,60%), hsl(43,75%,40%))",
              color: "hsl(270,50%,8%)",
              boxShadow: "0 0 16px hsl(43,90%,55%,0.6)",
            }}
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
          >
            🏆 Loyalty Reward Pool
          </motion.div>
        )}

        <motion.div
          className="relative text-6xl md:text-7xl mb-4 inline-block"
          animate={{ rotate: [0, -12, 12, -6, 6, 0], scale: [0.5, 1.4, 1] }}
          transition={{ duration: 0.8, delay: 0.2, ease: "backOut" }}
        >
          <span className="absolute inset-0 blur-2xl opacity-90" style={{ color: prize.color }}>{prize.icon}</span>
          <span className="absolute inset-0 blur-3xl opacity-60" style={{ color: "hsl(43,90%,60%)" }}>{prize.icon}</span>
          <span className="relative drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]">{prize.icon}</span>
        </motion.div>

        <motion.p
          className="relative text-[11px] text-[hsl(43,90%,70%)] font-semibold uppercase tracking-[0.4em] mb-1"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          ✦ You Won ✦
        </motion.p>

        <motion.p
          className="relative font-display text-3xl md:text-4xl font-black mb-2"
          style={{
            background: `linear-gradient(180deg, ${prize.color}, hsl(43,90%,55%))`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            filter: `drop-shadow(0 0 24px ${prize.color})`,
          }}
          initial={{ scale: 0 }}
          animate={{ scale: [0, 1.3, 1] }}
          transition={{ delay: 0.25, duration: 0.55, ease: "backOut" }}
        >
          {prize.label}
        </motion.p>

        <p className="relative text-sm text-white/70">
          {isLoyalty ? `7-day streak reward · ${prize.detail}` : prize.detail}
        </p>

        {/* Sparkles row */}
        <motion.div
          className="relative flex justify-center gap-3 mt-5 text-2xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          {["✨", "🎉", "✨"].map((emoji, i) => (
            <motion.span
              key={i}
              animate={{ y: [0, -10, 0], rotate: [0, 12, -12, 0] }}
              transition={{ repeat: Infinity, duration: 1.4, delay: i * 0.15 }}
            >
              {emoji}
            </motion.span>
          ))}
        </motion.div>

        <button
          onClick={onClose}
          className="relative mt-5 px-6 py-2 rounded-full text-xs font-bold uppercase tracking-[0.2em] transition-transform hover:scale-105 active:scale-95"
          style={{
            background: "linear-gradient(135deg, hsl(43,90%,58%), hsl(43,70%,38%))",
            color: "hsl(270,50%,8%)",
            boxShadow: "0 4px 16px hsl(43,90%,50%,0.5), inset 0 1px 0 hsl(43,100%,80%,0.6)",
          }}
        >
          Claim Reward
        </button>
      </motion.div>
    </motion.div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────
export default function PrizeReel() {
  return (
    <AuthGuard>
      <PrizeReelInner />
    </AuthGuard>
  );
}

function PrizeReelInner() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [spinning, setSpinning] = useState(false);
  const [canSpin, setCanSpin] = useState(false);
  const [nextSpinAt, setNextSpinAt] = useState<Date | null>(null);
  const [streak, setStreak] = useState(0);
  const [isLoyaltySpin, setIsLoyaltySpin] = useState(false);
  const [wonPrize, setWonPrize] = useState<Prize | null>(null);
  const [targetIndex, setTargetIndex] = useState(0);
  const [showSplash, setShowSplash] = useState(false);
  const [countdown, setCountdown] = useState("");
  const [spinHistory, setSpinHistory] = useState<any[]>([]);

  const itemHeight = isMobile ? 60 : 80;
  const reelHeight = isMobile ? 240 : 360;

  // Load spin history and determine eligibility
  const loadSpinData = useCallback(async () => {
    if (!user) return;

    const { data: spins } = await supabase
      .from("daily_spins")
      .select("*")
      .eq("user_id", user.id)
      .order("spun_at", { ascending: false })
      .limit(30);

    if (spins) setSpinHistory(spins.slice(0, 10));

    // Check last spin time
    const lastSpin = spins?.[0];
    if (lastSpin) {
      const lastSpinDate = new Date(lastSpin.spun_at);
      const now = new Date();
      const hoursSinceLast = (now.getTime() - lastSpinDate.getTime()) / (1000 * 60 * 60);

      if (hoursSinceLast < 24) {
        setCanSpin(false);
        const next = new Date(lastSpinDate.getTime() + 24 * 60 * 60 * 1000);
        setNextSpinAt(next);
      } else {
        setCanSpin(true);
        setNextSpinAt(null);
      }

      // Calculate streak
      let currentStreak = 0;
      if (spins) {
        for (let i = 0; i < spins.length; i++) {
          const spinDate = new Date(spins[i].spun_at);
          const expectedDate = new Date();
          expectedDate.setDate(expectedDate.getDate() - i);
          // Same calendar day check (with 2h buffer)
          const dayDiff = Math.abs(
            Math.floor(spinDate.getTime() / (1000 * 60 * 60 * 24)) -
            Math.floor(expectedDate.getTime() / (1000 * 60 * 60 * 24))
          );
          if (dayDiff <= 1) {
            currentStreak++;
          } else {
            break;
          }
        }
      }
      setStreak(Math.min(currentStreak, 7));
      setIsLoyaltySpin(currentStreak >= 7);
    } else {
      setCanSpin(true);
      setStreak(0);
      setIsLoyaltySpin(false);
    }
  }, [user]);

  useEffect(() => {
    loadSpinData();
  }, [loadSpinData]);

  // Countdown timer
  useEffect(() => {
    if (!nextSpinAt) { setCountdown(""); return; }
    const interval = setInterval(() => {
      const now = new Date();
      const diff = nextSpinAt.getTime() - now.getTime();
      if (diff <= 0) {
        setCanSpin(true);
        setNextSpinAt(null);
        setCountdown("");
        clearInterval(interval);
        return;
      }
      const h = Math.floor(diff / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);
      setCountdown(`${h}h ${m}m ${s}s`);
    }, 1000);
    return () => clearInterval(interval);
  }, [nextSpinAt]);

  const handleSpin = useCallback(async () => {
    if (!user || spinning || !canSpin) return;

    setSpinning(true);
    setShowSplash(false);
    setWonPrize(null);

    try {
      // Use server-side RPC for spin
      const { data, error } = await supabase.rpc("perform_daily_spin" as any, {
        p_user_id: user.id,
      });

      if (error) {
        toast.error(error.message || "Spin failed");
        setSpinning(false);
        return;
      }

      const result = Array.isArray(data) ? data[0] : data;
      const presentation = getPrizePresentation(Number(result.prize_value));
      // Map server result to a display prize
      const displayPrize: Prize = {
        label: result.prize_detail || presentation.label,
        type: "free_spin",
        value: Number(result.prize_value),
        detail: Number(result.prize_value) >= 20 ? "Vault-tier free spin drop" : presentation.detail,
        icon: presentation.icon,
        color: presentation.color,
        weight: 1,
      };

      const prizeIdx = REEL_STRIP.findIndex(p => p.label === displayPrize.label);
      setTargetIndex(prizeIdx >= 0 ? prizeIdx : Math.floor(Math.random() * REEL_STRIP.length));
      setWonPrize(displayPrize);
    } catch (e) {
      console.error("Failed to spin:", e);
      toast.error("Spin failed. Please try again.");
      setSpinning(false);
    }
  }, [user, spinning, canSpin]);

  const onReelComplete = useCallback(() => {
    setSpinning(false);
    setShowSplash(true);
    setCanSpin(false);
    const next = new Date(Date.now() + 24 * 60 * 60 * 1000);
    setNextSpinAt(next);
    loadSpinData();
  }, [loadSpinData]);

  const streakProgress = (streak / 7) * 100;
  const daysArray = [1, 2, 3, 4, 5, 6, 7];

  return (
    <div className="min-h-screen gradient-casino-bg pb-20 md:pb-0">
      <Header />
      <div className="container max-w-2xl py-4 px-4 space-y-4 md:space-y-6">
        {/* Title */}
        <div className="text-center">
          <motion.h1
            className="font-display text-3xl md:text-4xl font-black"
            style={{ color: "hsl(43,80%,55%)", textShadow: "0 0 20px hsl(43,80%,50%,0.4)" }}
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
          >
            🎰 Prize Reel
          </motion.h1>
          <p className="text-muted-foreground text-sm mt-1">Daily Free Spin – Win prizes every day!</p>
        </div>

        {/* Streak Progress */}
        <motion.div
          className="rounded-xl p-4 space-y-3"
          style={{
            background: "linear-gradient(135deg, hsl(270,30%,12%), hsl(270,25%,8%))",
            border: "1px solid hsl(270,30%,25%)",
          }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flame className="h-4 w-4 text-[hsl(15,80%,55%)]" />
              <span className="text-sm font-bold text-foreground">Daily Streak</span>
            </div>
            <span className="text-xs font-semibold" style={{ color: "hsl(43,80%,55%)" }}>
              {streak}/7 days
            </span>
          </div>

          {/* Day dots */}
          <div className="flex justify-between gap-1">
            {daysArray.map(day => (
              <div key={day} className="flex flex-col items-center gap-1">
                <motion.div
                  className="rounded-full flex items-center justify-center text-[10px] md:text-xs font-bold"
                  style={{
                    width: isMobile ? 32 : 40,
                    height: isMobile ? 32 : 40,
                    background: day <= streak
                      ? "linear-gradient(135deg, hsl(43,80%,50%), hsl(43,70%,35%))"
                      : day === 7
                        ? "linear-gradient(135deg, hsl(280,60%,40%), hsl(280,50%,25%))"
                        : "hsl(270,20%,18%)",
                    border: day <= streak
                      ? "2px solid hsl(43,80%,60%)"
                      : day === 7
                        ? "2px solid hsl(280,60%,50%)"
                        : "2px solid hsl(270,20%,30%)",
                    color: day <= streak ? "hsl(270,40%,8%)" : "hsl(270,20%,50%)",
                    boxShadow: day <= streak ? "0 0 8px hsl(43,80%,50%,0.4)" : "none",
                  }}
                  animate={day <= streak ? { scale: [1, 1.05, 1] } : {}}
                  transition={{ repeat: Infinity, duration: 2, delay: day * 0.1 }}
                >
                  {day === 7 ? <Trophy className="h-3 w-3 md:h-4 md:w-4" /> : day <= streak ? "✓" : day}
                </motion.div>
                <span className="text-[8px] md:text-[10px] text-muted-foreground">
                  {day === 7 ? "Bonus" : `Day ${day}`}
                </span>
              </div>
            ))}
          </div>

          <Progress value={streakProgress} className="h-2" />

          {isLoyaltySpin && canSpin && (
            <motion.div
              className="text-center text-xs font-bold px-3 py-1.5 rounded-lg"
              style={{
                background: "linear-gradient(90deg, hsl(43,80%,50%), hsl(280,60%,50%))",
                color: "white",
              }}
              animate={{ scale: [1, 1.03, 1] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            >
              🏆 Loyalty Bonus Active! Premium free-spin pool unlocked!
            </motion.div>
          )}
        </motion.div>

        {/* Slot Machine */}
        <motion.div
          className="rounded-2xl p-3 md:p-6"
          style={{
            background: "linear-gradient(180deg, hsl(270,30%,15%), hsl(270,25%,8%))",
            border: "2px solid hsl(43,80%,45%)",
            boxShadow: "0 0 40px hsl(270,50%,15%,0.5), 0 0 15px hsl(43,80%,50%,0.15)",
          }}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
        >
          {/* Machine top decoration */}
          <div className="flex justify-center mb-3">
            <div
              className="px-4 py-1 rounded-full text-xs md:text-sm font-bold uppercase tracking-wider"
              style={{
                background: "linear-gradient(90deg, hsl(43,80%,50%), hsl(43,70%,40%))",
                color: "hsl(270,40%,8%)",
                boxShadow: "0 0 12px hsl(43,80%,50%,0.4)",
              }}
            >
                ★ DAILY FREE SPINS · 1 TO 25 ★
            </div>
          </div>

          {/* Reel */}
          <SlotReel
            spinning={spinning}
            targetIndex={targetIndex}
            onComplete={onReelComplete}
            reelHeight={reelHeight}
            itemHeight={itemHeight}
          />

          {/* Spin Button */}
          <div className="mt-4 flex flex-col items-center gap-2">
            {canSpin ? (
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  onClick={handleSpin}
                  disabled={spinning}
                  className="w-full max-w-[240px] h-12 md:h-14 text-lg md:text-xl font-black rounded-xl"
                  style={{
                    background: spinning
                      ? "hsl(270,20%,25%)"
                      : "linear-gradient(135deg, hsl(43,80%,50%), hsl(43,70%,35%))",
                    color: spinning ? "hsl(270,20%,50%)" : "hsl(270,40%,8%)",
                    boxShadow: spinning
                      ? "none"
                      : "0 0 20px hsl(43,80%,50%,0.4), 0 4px 15px hsl(0,0%,0%,0.3)",
                  }}
                >
                  {spinning ? (
                    <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
                      ⏳
                    </motion.span>
                  ) : (
                    <>
                      <Gift className="h-5 w-5 mr-2" />
                       {isLoyaltySpin ? "LOYALTY SPIN" : "SPIN NOW"}
                    </>
                  )}
                </Button>
              </motion.div>
            ) : (
              <div className="text-center space-y-1">
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Clock className="h-4 w-4" />
                  <span>Next spin in</span>
                </div>
                <div
                  className="font-mono text-xl md:text-2xl font-bold"
                  style={{ color: "hsl(43,80%,55%)" }}
                >
                  {countdown || "Loading..."}
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* Prize Table */}
        <motion.div
          className="rounded-xl p-4 space-y-2"
          style={{
            background: "linear-gradient(135deg, hsl(270,30%,12%), hsl(270,25%,8%))",
            border: "1px solid hsl(270,30%,25%)",
          }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Star className="h-4 w-4" style={{ color: "hsl(43,80%,55%)" }} />
            Prize Table
          </h3>
          <div className="grid grid-cols-2 gap-1.5">
            {PRIZES.map((p, i) => (
              <div
                key={i}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs"
                style={{
                  background: p.weight > 0 ? "hsl(270,20%,16%)" : "hsl(270,15%,12%)",
                  opacity: p.weight > 0 ? 1 : 0.5,
                }}
              >
                <span className="text-base">{p.icon}</span>
                <div className="min-w-0">
                  <div className="font-semibold text-foreground truncate">{p.label}</div>
                  <div className="text-[10px] text-muted-foreground">{p.detail}</div>
                </div>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground text-center mt-2">
            The 7-day loyalty spin leans toward the 5 to 25 free-spin rewards.
          </p>
        </motion.div>

        {/* Spin History */}
        {spinHistory.length > 0 && (
          <motion.div
            className="rounded-xl p-4 space-y-2"
            style={{
              background: "linear-gradient(135deg, hsl(270,30%,12%), hsl(270,25%,8%))",
              border: "1px solid hsl(270,30%,25%)",
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <h3 className="text-sm font-bold text-foreground">Recent Spins</h3>
            <div className="space-y-1">
              {spinHistory.map((spin: any, i: number) => (
                <div key={spin.id || i} className="flex items-center justify-between text-xs py-1 border-b border-border/30 last:border-0">
                  <span className="text-muted-foreground">
                    {new Date(spin.spun_at).toLocaleDateString()}
                  </span>
                  <span className="font-semibold text-foreground">{spin.prize_detail}</span>
                  {spin.is_loyalty_spin && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "hsl(43,80%,50%)", color: "hsl(270,40%,8%)" }}>
                      x2
                    </span>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>

      {/* Prize Splash Overlay */}
      <AnimatePresence>
        {showSplash && wonPrize && (
          <PrizeSplash
            prize={wonPrize}
            isLoyalty={isLoyaltySpin}
            onClose={() => setShowSplash(false)}
          />
        )}
      </AnimatePresence>

      <BottomNav />
    </div>
  );
}
