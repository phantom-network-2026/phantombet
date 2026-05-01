import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import logo from "@/assets/phantom-network-logo.png";
import hubHero from "@/assets/hub-hero.jpg";
import exchangeImg from "@/assets/hub-exchange-tile.jpg";
import betImg from "@/assets/hub-bet-tile.jpg";
import walletImg from "@/assets/hub-wallet-tile.jpg";
import {
  ArrowRight,
  LogOut,
  ShieldCheck,
  KeyRound,
  EyeOff,
  Zap,
  Lock,
  Globe,
} from "lucide-react";

type App = {
  id: string;
  name: string;
  tagline: string;
  to: string;
  external?: boolean;
  featured?: boolean;
  image: string;
  status?: "live" | "soon";
};

const APPS: App[] = [
  {
    id: "exchange",
    name: "Phantom Exchange",
    tagline: "Trade, swap & launch tokens across the Phantom ecosystem.",
    to: "https://www.phantomexchange.online/exchange",
    external: true,
    featured: true,
    image: exchangeImg,
    status: "live",
  },
  {
    id: "phantombet",
    name: "PhantomBet",
    tagline: "Casino, slots, sportsbook and live games.",
    to: "/casino",
    image: betImg,
    status: "live",
  },
  {
    id: "wallet",
    name: "Phantom Wallet",
    tagline: "Multi-crypto self-custody wallet.",
    to: "/wallet",
    image: walletImg,
    status: "live",
  },
];

const SECURITY = [
  {
    icon: <ShieldCheck className="w-5 h-5" />,
    title: "Fully Encrypted",
    body: "End-to-end encryption across the entire network. Every session, every transfer.",
  },
  {
    icon: <EyeOff className="w-5 h-5" />,
    title: "Non-KYC",
    body: "Zero verification. Zero ID. Zero data leaks. Stay anonymous, always.",
  },
  {
    icon: <Globe className="w-5 h-5" />,
    title: "Zero Censorship",
    body: "No regional blocks. No frozen accounts. No middlemen with the power to stop you.",
  },
  {
    icon: <KeyRound className="w-5 h-5" />,
    title: "You Hold The Keys",
    body: "Self-custodial by design. Your encryption keys, your assets — never ours.",
  },
];

export default function NetworkHub() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const open = (a: App) =>
    a.external ? window.location.assign(a.to) : navigate(a.to);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[hsl(265_60%_4%)] text-foreground pb-24">
      {/* base gradient + grid */}
      <div className="absolute inset-0 bg-gradient-to-b from-[hsl(265_50%_10%)] via-[hsl(270_55%_6%)] to-black" />
      <div
        className="absolute inset-0 opacity-15 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(hsl(270 60% 50% / 0.25) 1px, transparent 1px), linear-gradient(90deg, hsl(270 60% 50% / 0.25) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
          maskImage:
            "radial-gradient(ellipse at top, black 20%, transparent 80%)",
        }}
      />

      <header className="relative z-10 flex items-center justify-between px-4 py-3 border-b border-border/40 backdrop-blur">
        <div className="flex items-center gap-2">
          <img src={logo} alt="Phantom Network" className="h-10 w-10" />
          <div className="leading-tight">
            <div className="font-display font-black text-sm tracking-wide text-gold">
              PHANTOM
            </div>
            <div className="text-[10px] tracking-[0.3em] text-muted-foreground -mt-0.5">
              NETWORK
            </div>
          </div>
        </div>
        {user ? (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => signOut().then(() => navigate("/"))}
          >
            <LogOut className="w-4 h-4 mr-1" /> Exit
          </Button>
        ) : (
          <Button size="sm" variant="gold" onClick={() => navigate("/")}>
            Sign in
          </Button>
        )}
      </header>

      <main className="relative z-10 max-w-5xl mx-auto px-4 py-6 space-y-10">
        {/* HERO */}
        <section className="relative rounded-3xl overflow-hidden border border-primary/40 shadow-[0_0_60px_hsl(270_70%_30%/0.5)]">
          <img
            src={hubHero}
            alt="Phantom Network encrypted hub"
            className="absolute inset-0 w-full h-full object-cover opacity-70"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-transparent" />
          <div className="absolute inset-0 animate-hub-pulse pointer-events-none" />
          <div className="relative p-6 sm:p-10 min-h-[280px] sm:min-h-[360px] flex flex-col justify-end">
            <div className="inline-flex items-center gap-2 self-start rounded-full border border-casino-gold/50 bg-black/50 backdrop-blur px-3 py-1 text-[10px] tracking-[0.25em] uppercase text-casino-gold mb-3">
              <Zap className="w-3 h-3" /> Encrypted • Non-KYC • Uncensored
            </div>
            <h1 className="font-display text-3xl sm:text-5xl font-black bg-gradient-to-r from-casino-gold via-amber-200 to-casino-gold bg-clip-text text-transparent leading-tight">
              Your Network. Your Keys. Your Power.
            </h1>
            <p className="text-sm sm:text-base text-foreground/80 mt-2 max-w-xl">
              One account, one identity, every Phantom service. Game, trade and
              connect on a network built to give you back the control they took.
            </p>
          </div>
        </section>

        {/* SECURITY STRIP */}
        <section>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {SECURITY.map((s) => (
              <div
                key={s.title}
                className="relative rounded-2xl border border-primary/30 bg-card/50 backdrop-blur p-4 overflow-hidden group hover:border-casino-gold/50 transition"
              >
                <div className="absolute -inset-px rounded-2xl pointer-events-none animate-tile-glow opacity-50 group-hover:opacity-100 transition" />
                <div className="relative">
                  <div className="h-9 w-9 rounded-xl bg-casino-gold/10 border border-casino-gold/40 text-casino-gold flex items-center justify-center mb-2">
                    {s.icon}
                  </div>
                  <h3 className="font-display font-bold text-sm">{s.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1 leading-snug">
                    {s.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* SERVICES */}
        <section className="space-y-4">
          <div className="flex items-end justify-between">
            <h2 className="font-display text-2xl sm:text-3xl font-black text-foreground">
              Choose Your Service
            </h2>
            <span className="text-[10px] tracking-widest uppercase text-muted-foreground">
              All connected • One account
            </span>
          </div>

          {/* Featured */}
          {APPS.filter((a) => a.featured).map((app) => (
            <button
              key={app.id}
              onClick={() => open(app)}
              className="group relative w-full text-left rounded-3xl border border-primary/40 overflow-hidden hover:border-casino-gold/60 transition-all shadow-[0_0_40px_hsl(270_70%_30%/0.4)]"
            >
              <img
                src={app.image}
                alt={app.name}
                loading="lazy"
                className="absolute inset-0 w-full h-full object-cover opacity-70 group-hover:opacity-90 group-hover:scale-105 transition-all duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/60 to-black/30" />
              <div className="relative flex items-center gap-4 p-6 min-h-[180px]">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-display font-black text-2xl">
                      {app.name}
                    </h3>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-casino-green/20 text-casino-green border border-casino-green/40">
                      LIVE
                    </span>
                  </div>
                  <p className="text-sm text-foreground/80 mt-1 max-w-md">
                    {app.tagline}
                  </p>
                </div>
                <ArrowRight className="w-7 h-7 text-casino-gold group-hover:translate-x-1 transition-transform" />
              </div>
            </button>
          ))}

          {/* Others */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {APPS.filter((a) => !a.featured).map((app) => (
              <button
                key={app.id}
                onClick={() => open(app)}
                className="group relative text-left rounded-2xl border border-border/60 overflow-hidden hover:border-primary/60 transition-all min-h-[160px]"
              >
                <img
                  src={app.image}
                  alt={app.name}
                  loading="lazy"
                  className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-80 group-hover:scale-105 transition-all duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-tr from-black/90 via-black/60 to-transparent" />
                <div className="relative p-4 h-full flex items-end gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-display font-bold text-lg">
                      {app.name}
                    </h3>
                    <p className="text-xs text-foreground/80 line-clamp-2">
                      {app.tagline}
                    </p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-casino-gold group-hover:translate-x-1 transition-transform" />
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* KEY WARNING */}
        <section className="relative rounded-2xl border border-destructive/60 bg-destructive/10 p-5 overflow-hidden">
          <div className="absolute inset-0 animate-warn-pulse pointer-events-none" />
          <div className="relative flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-destructive/20 border border-destructive/60 flex items-center justify-center text-destructive shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-black text-base text-destructive">
                Warning — You Are Your Own Bank
              </h3>
              <p className="text-xs sm:text-sm text-foreground/80 mt-1">
                Phantom Network is fully self-custodial. If you lose your{" "}
                <span className="font-bold text-foreground">
                  10-word encryption key
                </span>
                , your account and all assets within it will be{" "}
                <span className="font-bold text-destructive">
                  permanently lost and unrecoverable
                </span>
                . There is no support team, no reset link, no exception. Store
                it offline, store it safely.
              </p>
            </div>
          </div>
        </section>

        <p className="text-center text-[10px] tracking-widest uppercase text-muted-foreground/60 pt-2">
          More services joining the network soon
        </p>
      </main>

      <style>{`
        @keyframes hub-pulse {
          0%,100% { box-shadow: inset 0 0 60px hsl(270 80% 50% / 0.2); }
          50% { box-shadow: inset 0 0 120px hsl(42 95% 55% / 0.25); }
        }
        .animate-hub-pulse { animation: hub-pulse 4s ease-in-out infinite; }
        @keyframes tile-glow {
          0%,100% { box-shadow: 0 0 0 1px hsl(270 80% 55% / 0.0), 0 0 20px hsl(270 80% 55% / 0.0); }
          50% { box-shadow: 0 0 0 1px hsl(42 95% 55% / 0.4), 0 0 24px hsl(42 95% 55% / 0.25); }
        }
        .animate-tile-glow { animation: tile-glow 3.5s ease-in-out infinite; }
        @keyframes warn-pulse {
          0%,100% { background: hsl(0 80% 50% / 0.05); }
          50% { background: hsl(0 80% 50% / 0.15); }
        }
        .animate-warn-pulse { animation: warn-pulse 2.4s ease-in-out infinite; }
      `}</style>
    </div>
  );
}