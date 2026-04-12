import { Shield, Eye, Infinity } from "lucide-react";
import { motion } from "framer-motion";

const features = [
  { icon: Shield, label: "No KYC Required", delay: 0 },
  { icon: Eye, label: "Full Privacy", delay: 0.1 },
  { icon: Infinity, label: "Unlimited Withdrawals", delay: 0.2 },
];

export default function SignupPrivacyBanner() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="relative overflow-hidden rounded-2xl border border-[hsl(var(--casino-gold))/0.2] bg-gradient-to-br from-[hsl(var(--casino-gold))/0.06] via-transparent to-[hsl(var(--casino-green))/0.06] p-4"
    >
      {/* Animated glow effect */}
      <motion.div
        className="absolute -top-8 -right-8 h-24 w-24 rounded-full bg-[hsl(var(--casino-gold))/0.08] blur-2xl"
        animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="relative flex items-center gap-3">
        <motion.div
          animate={{ rotate: [0, 5, -5, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="shrink-0 rounded-xl bg-[hsl(var(--casino-gold))/0.12] p-2.5"
        >
          <Shield className="h-5 w-5 text-[hsl(var(--casino-gold))]" />
        </motion.div>
        <div>
          <p className="text-sm font-bold text-[hsl(var(--casino-gold))]">
            Play With Full Privacy
          </p>
          <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">
            No ID checks. No limits. Just play.
          </p>
        </div>
      </div>

      <div className="relative mt-3 flex flex-wrap gap-2">
        {features.map(({ icon: Icon, label, delay }) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 + delay, duration: 0.3 }}
            className="flex items-center gap-1.5 rounded-full bg-secondary/60 border border-border/40 px-2.5 py-1"
          >
            <Icon className="h-3 w-3 text-[hsl(var(--casino-green))]" />
            <span className="text-[10px] font-semibold text-foreground/80">{label}</span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
