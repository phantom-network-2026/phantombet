import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import logo from "@/assets/phantom-network-logo.png";
import heroNetwork from "@/assets/phantom-network-hero.png";
import heroExchange from "@/assets/phantom-exchange-hero.png";
import heroCasino from "@/assets/phantombet-casino-hero.png";
import heroWallet from "@/assets/phantom-wallet-hero.png";
import heroEncryption from "@/assets/phantom-encryption-hero.jpg";
import { LanguagePicker } from "@/components/casino/LanguagePicker";
import {
  ArrowRight,
  Gamepad2,
  TrendingUp,
  Wallet as WalletIcon,
  Shield,
  Crown,
  Briefcase,
  Lock,
  KeyRound,
  Globe2,
  Sparkles,
  EyeOff,
  ShieldAlert,
  AlertTriangle,
  Fingerprint,
  ServerOff,
} from "lucide-react";

const SERVICES = [
  {
    id: "casino",
    name: "PhantomBet Casino",
    tagline: "200+ slots, live roulette, blackjack, sportsbook & crash games.",
    cta: "Enter Casino",
    to: "/casino",
    img: heroCasino,
    icon: <Gamepad2 className="w-5 h-5" />,
    accent: "from-casino-pink/40 via-primary/30 to-amber-400/30",
    border: "border-casino-pink/40",
  },
  {
    id: "exchange",
    name: "Phantom Exchange",
    tagline: "Trade, swap & earn across 1000+ pairs. Non-KYC. Low fees.",
    cta: "Open Exchange",
    to: "/exchange",
    img: heroExchange,
    icon: <TrendingUp className="w-5 h-5" />,
    accent: "from-cyan-400/40 via-primary/30 to-amber-400/30",
    border: "border-cyan-400/40",
  },
  {
    id: "wallet",
    name: "Phantom Wallet",
    tagline: "Self-custody, multi-chain. Your keys. Your coins. Your network.",
    cta: "Open Wallet",
    to: "/wallet",
    img: heroWallet,
    icon: <WalletIcon className="w-5 h-5" />,
    accent: "from-emerald-400/40 via-primary/30 to-cyan-400/30",
    border: "border-emerald-400/40",
  },
];

const PILLARS = [
  {
    icon: <Lock className="w-5 h-5" />,
    title: "100% Encrypted Network",
    desc: "Every connection, message and transaction protected end-to-end. Nothing leaves the network in the clear.",
  },
  {
    icon: <KeyRound className="w-5 h-5" />,
    title: "You Hold Your Assets",
    desc: "Self-custody by default. Your coins, your keys, your account — every second of every day.",
  },
  {
    icon: <EyeOff className="w-5 h-5" />,
    title: "No KYC. No Censorship.",
    desc: "Game, trade and hang out without ID checks, regional blocks, or arbitrary limits.",
  },
  {
    icon: <Globe2 className="w-5 h-5" />,
    title: "One Account, Every Service",
    desc: "Casino, Exchange and Wallet — connected by a single Phantom identity.",
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
        g.gain.exponentialRampToValueAtTime(0.05, ctx.currentTime + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6);
        o.connect(g).connect(ctx.destination);
        o.start();
        o.stop(ctx.currentTime + 0.65);
      } catch {}
      timeout = window.setTimeout(trigger, 5000 + Math.random() * 7000);
    };
    timeout = window.setTimeout(trigger, 3000);
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
      {/* Atmosphere */}
      <div className="absolute inset-0 bg-gradient-to-b from-[hsl(265_50%_8%)] via-[hsl(270_60%_5%)] to-black" />
      <div
        className="absolute inset-0 opacity-[0.12] animate-grid-drift"
        style={{
          backgroundImage:
            "linear-gradient(hsl(270 60% 50% / 0.3) 1px, transparent 1px), linear-gradient(90deg, hsl(270 60% 50% / 0.3) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
          maskImage: "radial-gradient(ellipse at center, black 30%, transparent 80%)",
        }}
      />
      <div className="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full bg-primary/30 blur-3xl animate-orb-a" />
      <div className="pointer-events-none absolute -bottom-32 -right-24 h-[28rem] w-[28rem] rounded-full bg-casino-gold/15 blur-3xl animate-orb-b" />
      <div className="pointer-events-none absolute top-1/3 right-1/4 h-72 w-72 rounded-full bg-casino-pink/20 blur-3xl animate-orb-c" />

      {/* Sparks */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {Array.from({ length: 16 }).map((_, i) => (
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

      {/* Lightning */}
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
          strokeWidth="2"
          fill="none"
          filter="url(#glow)"
          opacity="0.85"
        />
      </svg>
      <div
        key={`f-${flash}`}
        className="pointer-events-none absolute inset-0 animate-storm-glow"
        style={{
          background:
            "radial-gradient(ellipse at 50% 30%, hsl(270 80% 55% / 0.28), transparent 60%)",
        }}
      />

      {/* HEADER */}
      <header className="relative z-20 flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <img src={logo} alt="Phantom Network" width={1024} height={1024} className="h-9 w-9 drop-shadow-[0_0_12px_hsl(270_70%_60%/0.7)]" />
          <div className="leading-tight">
            <div className="font-display font-black text-sm tracking-wide bg-gradient-to-r from-casino-gold to-amber-200 bg-clip-text text-transparent">
              PHANTOM
            </div>
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

      <main className="relative z-10 max-w-6xl mx-auto px-4 pb-16">
        {/* HERO BANNER (uses brand artwork) */}
        <section className="mt-2 sm:mt-4 rounded-3xl overflow-hidden border border-primary/40 shadow-[0_0_60px_hsl(270_70%_30%/0.5)] relative group">
          <img
            src={heroNetwork}
            alt="Phantom Network — One Network. Endless Possibilities."
            width={1536}
            height={1024}
            className="w-full h-auto block transition-transform duration-700 group-hover:scale-[1.02]"
          />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/60 to-transparent p-3 sm:p-5 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] sm:text-sm text-foreground/90 tracking-wide">
              <span className="text-casino-gold font-bold">Swap. Trade. Play. Earn.</span>{" "}
              <span className="hidden sm:inline text-muted-foreground">All connected.</span>
            </p>
            <Button size="sm" variant="gold" onClick={() => navigate(user ? "/hub" : "/signup")}>
              {user ? "Open Hub" : "Join the Network"} <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </div>
        </section>

        {/* TAGLINE */}
        <section className="text-center pt-8 pb-6">
          <h1 className="font-display text-2xl sm:text-4xl font-black bg-gradient-to-r from-casino-gold via-amber-200 to-casino-gold bg-clip-text text-transparent">
            One Network. Endless Possibilities.
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base mt-2 max-w-2xl mx-auto">
            A private, encrypted ecosystem to <span className="text-foreground">game</span>,{" "}
            <span className="text-foreground">trade</span> and{" "}
            <span className="text-foreground">hang out</span> — without censorship or limits.
          </p>
        </section>

        {/* STAFF SHORTCUTS */}
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

        {/* SERVICE BANNERS + LOGIN */}
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-5">
            {SERVICES.map((s) => (
              <button
                key={s.id}
                onClick={() => navigate(s.to)}
                className={`group relative w-full text-left rounded-2xl overflow-hidden border ${s.border} bg-card/40 backdrop-blur hover:-translate-y-0.5 transition-transform duration-300 shadow-[0_0_40px_hsl(270_70%_30%/0.35)]`}
              >
                <img
                  src={s.img}
                  alt={s.name}
                  loading="lazy"
                  width={1920}
                  height={820}
                  className="w-full h-auto block transition-transform duration-700 group-hover:scale-[1.03]"
                />
                <div className={`absolute inset-0 bg-gradient-to-r ${s.accent} mix-blend-overlay opacity-40 group-hover:opacity-60 transition-opacity`} />
                <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4 bg-gradient-to-t from-black via-black/60 to-transparent flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="h-8 w-8 shrink-0 rounded-lg bg-background/60 border border-casino-gold/40 flex items-center justify-center text-casino-gold">
                      {s.icon}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-display font-black text-sm sm:text-lg truncate">{s.name}</h3>
                        <span className="hidden sm:inline text-[9px] px-2 py-0.5 rounded-full bg-casino-green/20 text-casino-green border border-casino-green/40">
                          LIVE
                        </span>
                      </div>
                      <p className="text-[11px] sm:text-xs text-muted-foreground truncate">{s.tagline}</p>
                    </div>
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-1 text-[11px] sm:text-xs font-bold text-casino-gold whitespace-nowrap">
                    {s.cta} <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                  </span>
                </div>
              </button>
            ))}
          </div>

          {/* LOGIN PANEL */}
          <div className="lg:col-span-1">
            <form
              onSubmit={handleSubmit}
              className="space-y-4 p-5 rounded-2xl border border-primary/40 bg-card/70 backdrop-blur-xl shadow-[0_0_40px_hsl(270_70%_30%/0.4)] lg:sticky lg:top-4"
            >
              <div className="text-center">
                <Sparkles className="w-5 h-5 mx-auto text-casino-gold mb-1" />
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

        {/* PILLARS — TRUST & FREEDOM */}
        <section className="mt-12">
          <div className="text-center mb-6">
            <h2 className="font-display text-xl sm:text-3xl font-black">
              Built for <span className="bg-gradient-to-r from-casino-gold to-amber-200 bg-clip-text text-transparent">privacy</span>.
              Built for <span className="bg-gradient-to-r from-casino-pink to-purple-300 bg-clip-text text-transparent">freedom</span>.
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-2">
              Phantom Network is engineered around encryption and self-custody — you stay in control at all times.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {PILLARS.map((p) => (
              <div
                key={p.title}
                className="group relative rounded-2xl border border-border/60 bg-card/50 backdrop-blur p-4 hover:border-casino-gold/50 transition-colors"
              >
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/10 via-transparent to-casino-gold/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                <div className="relative flex items-start gap-3">
                  <div className="h-10 w-10 shrink-0 rounded-xl bg-background/60 border border-casino-gold/40 flex items-center justify-center text-casino-gold">
                    {p.icon}
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-sm sm:text-base">{p.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{p.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="mt-12 text-center rounded-2xl border border-casino-gold/40 bg-gradient-to-br from-[hsl(270_60%_10%)] via-[hsl(265_50%_6%)] to-black p-6 shadow-[0_0_50px_hsl(270_70%_30%/0.4)]">
          <h3 className="font-display text-xl sm:text-2xl font-black">
            Game. Trade. Earn. <span className="bg-gradient-to-r from-casino-gold to-amber-200 bg-clip-text text-transparent">All connected.</span>
          </h3>
          <p className="text-xs sm:text-sm text-muted-foreground mt-2 max-w-xl mx-auto">
            Join thousands already on the network. No KYC. No limits. Just one account for everything Phantom.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {!user && (
              <Button variant="gold" onClick={() => navigate("/signup")}>
                Create Account
              </Button>
            )}
            <Button variant="outline" onClick={() => navigate(user ? "/hub" : "/casino")}>
              {user ? "Go to Hub" : "Browse as Guest"}
            </Button>
          </div>
          <p className="mt-5 text-[10px] tracking-widest uppercase text-muted-foreground/60">
            PhantomBet · Phantom Exchange · Phantom Wallet
          </p>
        </section>
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
