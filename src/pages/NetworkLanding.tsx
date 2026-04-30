import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import logo from "@/assets/phantom-network-logo.png";
import promoCasino from "@/assets/promo-casino.jpg";
import promoExchange from "@/assets/promo-exchange.jpg";
import promoWallet from "@/assets/promo-wallet.jpg";
import { LanguagePicker } from "@/components/casino/LanguagePicker";
import { ArrowRight, Gamepad2, TrendingUp, Wallet as WalletIcon, Shield, Crown, Briefcase } from "lucide-react";

const PROMOS = [
  {
    id: "casino",
    name: "PhantomBet Casino",
    tagline: "200+ slots, live roulette, blackjack & sportsbook.",
    cta: "Enter Casino",
    to: "/casino",
    img: promoCasino,
    icon: <Gamepad2 className="w-5 h-5" />,
    glow: "shadow-[0_0_60px_hsl(320_80%_50%/0.35)]",
    border: "border-casino-pink/40",
  },
  {
    id: "exchange",
    name: "Phantom Exchange",
    tagline: "Trade, swap & launch tokens — built for the network.",
    cta: "Open Exchange",
    to: "/exchange",
    img: promoExchange,
    icon: <TrendingUp className="w-5 h-5" />,
    glow: "shadow-[0_0_60px_hsl(190_90%_50%/0.35)]",
    border: "border-cyan-400/40",
  },
  {
    id: "wallet",
    name: "Phantom Wallet",
    tagline: "Self-custody multi-chain wallet. Your keys, your coins.",
    cta: "Open Wallet",
    to: "/wallet",
    img: promoWallet,
    icon: <WalletIcon className="w-5 h-5" />,
    glow: "shadow-[0_0_60px_hsl(150_70%_45%/0.35)]",
    border: "border-emerald-400/40",
  },
];

export default function NetworkLanding() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [flash, setFlash] = useState(0);
  const { signIn, user, isAdmin, isOwner, hasStaffAccess } = useAuth();
  const navigate = useNavigate();
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Random lightning flashes (no white screen flash)
  useEffect(() => {
    let timeout: number;
    const trigger = () => {
      setFlash((f) => f + 1);
      try {
        if (!audioCtxRef.current) {
          // @ts-ignore
          audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        const ctx = audioCtxRef.current!;
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = "sawtooth";
        o.frequency.setValueAtTime(60 + Math.random() * 30, ctx.currentTime);
        g.gain.setValueAtTime(0.0001, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.06, ctx.currentTime + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6);
        o.connect(g).connect(ctx.destination);
        o.start();
        o.stop(ctx.currentTime + 0.65);
      } catch {}
      timeout = window.setTimeout(trigger, 4000 + Math.random() * 6000);
    };
    timeout = window.setTimeout(trigger, 2500);
    return () => window.clearTimeout(timeout);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error } = await signIn(username, password);
    setLoading(false);
    if (error) setError(error.message);
    else navigate("/hub");
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[hsl(265_60%_4%)] text-foreground">
      {/* Storm clouds gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-[hsl(265_50%_8%)] via-[hsl(270_60%_6%)] to-black" />
      {/* Drifting animated grid */}
      <div
        className="absolute inset-0 opacity-15 animate-grid-drift"
        style={{
          backgroundImage:
            "linear-gradient(hsl(270 60% 50% / 0.25) 1px, transparent 1px), linear-gradient(90deg, hsl(270 60% 50% / 0.25) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
          maskImage: "radial-gradient(ellipse at center, black 30%, transparent 75%)",
        }}
      />

      {/* Drifting nebula orbs */}
      <div className="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full bg-primary/30 blur-3xl animate-orb-a" />
      <div className="pointer-events-none absolute -bottom-32 -right-24 h-[28rem] w-[28rem] rounded-full bg-casino-gold/15 blur-3xl animate-orb-b" />
      <div className="pointer-events-none absolute top-1/3 right-1/4 h-72 w-72 rounded-full bg-casino-pink/20 blur-3xl animate-orb-c" />

      {/* Floating spark particles */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {Array.from({ length: 18 }).map((_, i) => (
          <span
            key={i}
            className="absolute block rounded-full bg-casino-gold/70 animate-spark"
            style={{
              left: `${(i * 53) % 100}%`,
              bottom: `-${10 + (i % 5) * 6}px`,
              width: `${2 + (i % 3)}px`,
              height: `${2 + (i % 3)}px`,
              animationDuration: `${10 + (i % 7)}s`,
              animationDelay: `${(i * 0.6) % 8}s`,
              boxShadow: "0 0 8px hsl(42 90% 60% / 0.9)",
            }}
          />
        ))}
      </div>

      {/* Lightning bolt SVGs */}
      <svg
        key={flash}
        className="pointer-events-none absolute inset-0 w-full h-full animate-bolt"
        viewBox="0 0 400 800"
        preserveAspectRatio="none"
      >
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <path
          d={`M${80 + Math.random() * 240} 0 L${100 + Math.random() * 200} 180 L${80 + Math.random() * 200} 200 L${120 + Math.random() * 180} 420 L${90 + Math.random() * 200} 440 L${130 + Math.random() * 160} 800`}
          stroke="hsl(42 95% 70%)"
          strokeWidth="2.5"
          fill="none"
          filter="url(#glow)"
          opacity="0.9"
        />
      </svg>

      <div
        key={`f-${flash}`}
        className="pointer-events-none absolute inset-0 animate-storm-glow"
        style={{
          background:
            "radial-gradient(ellipse at 50% 30%, hsl(270 80% 55% / 0.3), transparent 60%)",
        }}
      />

      {/* HEADER */}
      <header className="relative z-20 flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <img src={logo} alt="Phantom Network" width={1024} height={1024} className="h-9 w-9 drop-shadow-[0_0_12px_hsl(270_70%_60%/0.7)]" />
          <div className="leading-tight">
            <div className="font-display font-black text-sm tracking-wide bg-gradient-to-r from-casino-gold to-amber-200 bg-clip-text text-transparent">PHANTOM</div>
            <div className="text-[9px] tracking-[0.3em] text-muted-foreground -mt-0.5">NETWORK</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {user && (
            <Button size="sm" variant="gold" onClick={() => navigate("/hub")}>
              Hub <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          )}
          <LanguagePicker />
        </div>
      </header>

      <main className="relative z-10 max-w-6xl mx-auto px-4 pb-12">
        {/* HERO */}
        <section className="text-center pt-6 pb-8 sm:pt-10 sm:pb-12">
          <img
            src={logo}
            alt="Phantom Network"
            width={1024}
            height={1024}
            className="h-28 w-28 sm:h-36 sm:w-36 mx-auto mb-3 drop-shadow-[0_0_30px_hsl(270_70%_50%/0.7)] animate-logo-pulse"
          />
          <h1 className="font-display text-3xl sm:text-5xl font-black bg-gradient-to-r from-casino-gold via-amber-200 to-casino-gold bg-clip-text text-transparent">
            One Network. Every Service.
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base mt-2 max-w-xl mx-auto">
            Casino, Exchange & Wallet — sharing one Phantom account.
          </p>
        </section>

        {/* ADMIN / OWNER / STAFF SHORTCUTS */}
        {user && (isAdmin || isOwner || hasStaffAccess) && (
          <section className="mb-8 rounded-2xl border border-casino-gold/40 bg-card/60 backdrop-blur p-4 shadow-[0_0_30px_hsl(42_90%_50%/0.2)]">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-4 h-4 text-casino-gold" />
              <h2 className="font-display font-bold text-sm tracking-wide text-casino-gold uppercase">
                Staff Access
              </h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(isAdmin || isOwner) && (
                <Button size="sm" variant="outline" onClick={() => navigate("/cpanel")}>
                  <Briefcase className="w-4 h-4 mr-1" /> cPanel
                </Button>
              )}
              {(isAdmin || isOwner) && (
                <Button size="sm" variant="outline" onClick={() => navigate("/cpanel/exchange")}>
                  <TrendingUp className="w-4 h-4 mr-1" /> Exchange Admin
                </Button>
              )}
              {isOwner && (
                <Button size="sm" variant="outline" onClick={() => navigate("/owner-panel")}>
                  <Crown className="w-4 h-4 mr-1" /> Owner Panel
                </Button>
              )}
              {hasStaffAccess && (
                <Button size="sm" variant="outline" onClick={() => navigate("/staff-panel")}>
                  <Shield className="w-4 h-4 mr-1" /> Staff Panel
                </Button>
              )}
            </div>
          </section>
        )}

        {/* PROMO GRID + LOGIN */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Promo cards (2 cols on lg) */}
          <div className="lg:col-span-2 grid sm:grid-cols-2 gap-4">
            {/* Featured large card */}
            <button
              onClick={() => navigate(PROMOS[0].to)}
              className={`group relative sm:col-span-2 text-left rounded-2xl overflow-hidden border ${PROMOS[0].border} ${PROMOS[0].glow} transition-transform hover:-translate-y-1 hover:scale-[1.01] duration-300`}
            >
              <img
                src={PROMOS[0].img}
                alt={PROMOS[0].name}
                width={1024}
                height={768}
                className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
              <div className="relative p-5 min-h-[220px] flex flex-col justify-end">
                <div className="flex items-center gap-2 mb-1">
                  <span className="h-8 w-8 rounded-lg bg-background/60 border border-casino-gold/40 flex items-center justify-center text-casino-gold">
                    {PROMOS[0].icon}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-casino-green/20 text-casino-green border border-casino-green/40">
                    LIVE
                  </span>
                </div>
                <h3 className="font-display font-black text-2xl text-foreground">{PROMOS[0].name}</h3>
                <p className="text-sm text-muted-foreground mt-1 mb-3 max-w-md">{PROMOS[0].tagline}</p>
                <span className="inline-flex items-center gap-1 text-sm font-bold text-casino-gold">
                  {PROMOS[0].cta} <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </span>
              </div>
            </button>

            {PROMOS.slice(1).map((p) => (
              <button
                key={p.id}
                onClick={() => navigate(p.to)}
                className={`group relative text-left rounded-2xl overflow-hidden border ${p.border} ${p.glow} transition-transform hover:-translate-y-1 hover:scale-[1.02] duration-300`}
              >
                <img
                  src={p.img}
                  alt={p.name}
                  loading="lazy"
                  width={1024}
                  height={768}
                  className="absolute inset-0 w-full h-full object-cover opacity-75 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-transparent" />
                <div className="relative p-4 min-h-[180px] flex flex-col justify-end">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="h-7 w-7 rounded-lg bg-background/60 border border-casino-gold/40 flex items-center justify-center text-casino-gold">
                      {p.icon}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-casino-green/20 text-casino-green border border-casino-green/40">
                      LIVE
                    </span>
                  </div>
                  <h3 className="font-display font-black text-lg">{p.name}</h3>
                  <p className="text-xs text-muted-foreground mt-1 mb-2 line-clamp-2">{p.tagline}</p>
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-casino-gold">
                    {p.cta} <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                  </span>
                </div>
              </button>
            ))}
          </div>

          {/* LOGIN PANEL */}
          <div className="lg:col-span-1">
            <form
              onSubmit={handleSubmit}
              className="space-y-4 p-5 rounded-2xl border border-primary/40 bg-card/70 backdrop-blur-xl shadow-[0_0_40px_hsl(270_70%_30%/0.4)] sticky top-4"
            >
              <div className="text-center">
                <h2 className="font-display text-xl font-black bg-gradient-to-r from-casino-gold to-amber-200 bg-clip-text text-transparent">
                  {user ? "Welcome back" : "Enter the Network"}
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  {user ? "You're signed in." : "One identity. Every Phantom service."}
                </p>
              </div>

              {!user && (
                <>
                  <div>
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      className="bg-secondary/70 border-border"
                      placeholder="Enter your username"
                    />
                  </div>
                  <div>
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="bg-secondary/70 border-border"
                    />
                  </div>
                  {error && <p className="text-sm text-destructive">{error}</p>}
                  <Button type="submit" variant="gold" className="w-full" disabled={loading}>
                    {loading ? "Connecting..." : "⚡ Enter Network"}
                  </Button>

                  <div className="flex items-center justify-between text-xs">
                    <Link to="/forgot-password" className="text-casino-gold hover:underline">
                      Forgot password?
                    </Link>
                    <Link to="/signup" className="text-casino-gold hover:underline">
                      Create account
                    </Link>
                  </div>

                  <button
                    type="button"
                    onClick={() => navigate("/hub")}
                    className="w-full text-xs text-muted-foreground hover:text-foreground transition pt-1"
                  >
                    Continue as guest →
                  </button>
                </>
              )}

              {user && (
                <Button variant="gold" className="w-full" onClick={() => navigate("/hub")}>
                  Open Hub <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              )}
            </form>
          </div>
        </div>

        <p className="text-center text-[10px] text-muted-foreground/60 tracking-widest uppercase pt-10">
          PhantomBet · Phantom Exchange · Phantom Wallet
        </p>
      </main>

      <style>{`
        @keyframes storm-glow {
          0% { opacity: 0; }
          15% { opacity: 1; }
          60% { opacity: 0.3; }
          100% { opacity: 0; }
        }
        .animate-storm-glow { animation: storm-glow 1.2s ease-out; }

        @keyframes bolt {
          0% { opacity: 0; }
          5% { opacity: 1; }
          15% { opacity: 0.2; }
          25% { opacity: 1; }
          35% { opacity: 0; }
          100% { opacity: 0; }
        }
        .animate-bolt { animation: bolt 0.7s ease-out; }

        @keyframes logo-pulse {
          0%, 100% { filter: drop-shadow(0 0 30px hsl(270 70% 50% / 0.7)); transform: scale(1); }
          50% { filter: drop-shadow(0 0 50px hsl(42 90% 55% / 0.6)); transform: scale(1.02); }
        }
        .animate-logo-pulse { animation: logo-pulse 4s ease-in-out infinite, logo-float 7s ease-in-out infinite; }

        @keyframes logo-float {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-10px) rotate(0.6deg); }
        }

        @keyframes grid-drift {
          0% { background-position: 0 0, 0 0; }
          100% { background-position: 60px 60px, 60px 60px; }
        }
        .animate-grid-drift { animation: grid-drift 18s linear infinite; }

        @keyframes orb-a {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(60px, 40px) scale(1.15); }
        }
        .animate-orb-a { animation: orb-a 14s ease-in-out infinite; }

        @keyframes orb-b {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-80px, -50px) scale(1.1); }
        }
        .animate-orb-b { animation: orb-b 18s ease-in-out infinite; }

        @keyframes orb-c {
          0%, 100% { transform: translate(0, 0) scale(0.95); opacity: 0.5; }
          50% { transform: translate(-40px, 60px) scale(1.2); opacity: 0.85; }
        }
        .animate-orb-c { animation: orb-c 12s ease-in-out infinite; }

        @keyframes spark {
          0% { transform: translateY(0) translateX(0); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 0.8; }
          100% { transform: translateY(-110vh) translateX(20px); opacity: 0; }
        }
        .animate-spark { animation-name: spark; animation-timing-function: linear; animation-iteration-count: infinite; }
      `}</style>
    </div>
  );
}
