import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Sparkles, Zap, Trophy } from "lucide-react";
import casinoBanner from "@/assets/hero-casino-banner.jpg";
import sportsbookBanner from "@/assets/hero-sportsbook-banner.jpg";

interface HeroBannerProps {
  variant?: "casino" | "sportsbook";
}

export function HeroBanner({ variant = "sportsbook" }: HeroBannerProps) {
  const navigate = useNavigate();
  const { user } = useAuth();

  const isCasino = variant === "casino";
  const img = isCasino ? casinoBanner : sportsbookBanner;
  const eyebrow = isCasino ? "PHANTOM CASINO" : "PHANTOM SPORTSBOOK";
  const title = isCasino ? "Spin. Win. Repeat." : "Bet Smarter. Cash Bigger.";
  const subtitle = isCasino
    ? "1000+ slots, live tables & jackpots — all crypto, no KYC."
    : "Live odds, bet builders & in-play markets. Get a $5 free bet.";
  const ctaUserLabel = isCasino ? "Play Now" : "Bet Now";
  const ctaGuestLabel = isCasino ? "Claim $50 Bonus" : "Claim $5 Free Bet";
  const ctaRoute = isCasino ? "/games" : "/sportsbook";
  const Icon = isCasino ? Sparkles : Trophy;

  return (
    <div className="relative overflow-hidden rounded-2xl mx-4 mt-4 group border border-casino-gold/40 shadow-[0_0_30px_hsl(270_60%_25%/0.5)]">
      <img
        src={img}
        alt={`${eyebrow} — ${title}`}
        className="absolute inset-0 w-full h-full object-cover"
        loading="eager"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-black via-black/85 to-black/10 sm:to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
      <div className="absolute -inset-px rounded-2xl pointer-events-none animate-pulse-glow opacity-60" />

      <div className="relative p-4 sm:p-6 min-h-[180px] sm:min-h-[220px] flex flex-col justify-center max-w-[70%] sm:max-w-[55%]">
        <div className="inline-flex items-center gap-1.5 self-start rounded-full border border-casino-gold/50 bg-black/60 backdrop-blur px-2.5 py-1 text-[9px] tracking-[0.25em] uppercase text-casino-gold mb-2">
          <Icon className="w-3 h-3" /> {eyebrow}
        </div>
        <h2 className="font-display text-xl sm:text-3xl font-black bg-gradient-to-r from-casino-gold via-amber-200 to-casino-gold bg-clip-text text-transparent leading-tight">
          {title}
        </h2>
        <p className="text-[11px] sm:text-sm text-foreground/85 mt-1 leading-snug">
          {subtitle}
        </p>
        <div className="mt-3 flex items-center gap-2">
          <Button
            variant="gold"
            size="sm"
            className="text-xs h-8 px-3 shadow-[0_0_15px_hsl(45_95%_55%/0.5)]"
            onClick={() => navigate(user ? ctaRoute : "/signup")}
          >
            <Zap className="w-3 h-3 mr-1" />
            {user ? ctaUserLabel : ctaGuestLabel}
          </Button>
        </div>
      </div>

      <style>{`
        @keyframes pulse-glow {
          0%,100% { box-shadow: inset 0 0 30px hsl(270 80% 50% / 0.15); }
          50% { box-shadow: inset 0 0 60px hsl(45 95% 55% / 0.2); }
        }
        .animate-pulse-glow { animation: pulse-glow 3.5s ease-in-out infinite; }
      `}</style>
    </div>
  );
}
