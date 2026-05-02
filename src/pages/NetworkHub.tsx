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
  Users,
  MessageSquare,
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
    tagline: "Trade, swap & launch tokens.",
    to: "/exchange",
    featured: true,
    image: exchangeImg,
    status: "live",
  },
  {
    id: "phantombet",
    name: "Phantom Casino",
    tagline: "Casino, slots & sportsbook.",
    to: "/casino",
    image: betImg,
    status: "live",
  },
  {
    id: "wallet",
    name: "Phantom Wallet",
    tagline: "Multi-chain self-custody.",
    to: "/wallet",
    image: walletImg,
    status: "live",
  },
  {
    id: "social",
    name: "Phantom Social",
    tagline: "Friends, parties & DMs.",
    to: "/friends",
    image: betImg,
    status: "live",
  },
  {
    id: "forum",
    name: "Phantom Forum",
    tagline: "Threads, guides & releases.",
    to: "/friends?tab=forum",
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

      <main className="relative z-10 max-w-5xl mx-auto px-4 py-4 space-y-5">
        {/* HERO — compact */}
        <section className="relative rounded-2xl overflow-hidden border border-primary/40 shadow-[0_0_40px_hsl(270_70%_30%/0.5)]">
          <img
            src={hubHero}
            alt="Phantom Network encrypted hub"
            className="absolute inset-0 w-full h-full object-cover opacity-60"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/75 to-black/30" />
          <div className="absolute inset-0 animate-hub-pulse pointer-events-none" />
          <div className="relative p-4 sm:p-6 min-h-[150px] sm:min-h-[200px] flex flex-col justify-end">
            <div className="inline-flex items-center gap-2 self-start rounded-full border border-casino-gold/50 bg-black/50 backdrop-blur px-2.5 py-0.5 text-[9px] tracking-[0.25em] uppercase text-casino-gold mb-2">
              <Zap className="w-3 h-3" /> Encrypted • Non-KYC • Uncensored
            </div>
            <h1 className="font-display text-2xl sm:text-4xl font-black bg-gradient-to-r from-casino-gold via-amber-200 to-casino-gold bg-clip-text text-transparent leading-tight">
              Your Network. Your Keys. Your Power.
            </h1>
            <p className="text-xs sm:text-sm text-foreground/80 mt-1 max-w-xl">
              One account. Every Phantom service. Built to give you back control.
            </p>
          </div>
        </section>

        {/* SECURITY STRIP — compact */}
        <section>
          <div className="grid grid-cols-4 gap-2">
            {SECURITY.map((s) => (
              <div
                key={s.title}
                className="relative rounded-xl border border-primary/30 bg-card/50 backdrop-blur p-2 sm:p-3 overflow-hidden group hover:border-casino-gold/50 transition"
              >
                <div className="absolute -inset-px rounded-xl pointer-events-none animate-tile-glow opacity-50 group-hover:opacity-100 transition" />
                <div className="relative">
                  <div className="h-7 w-7 rounded-lg bg-casino-gold/10 border border-casino-gold/40 text-casino-gold flex items-center justify-center mb-1">
                    {s.icon}
                  </div>
                  <h3 className="font-display font-bold text-[11px] sm:text-xs leading-tight">{s.title}</h3>
                  <p className="hidden sm:block text-[10px] text-muted-foreground mt-1 leading-snug line-clamp-2">
                    {s.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* SERVICES — compact grid */}
        <section className="space-y-3">
          <div className="flex items-end justify-between">
            <h2 className="font-display text-lg sm:text-2xl font-black text-foreground">
              Choose Your Service
            </h2>
            <span className="text-[9px] tracking-widest uppercase text-muted-foreground">
              5 services • 1 account
            </span>
          </div>

          {/* All 5 services in a unified compact grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {APPS.map((app) => {
              const Icon = app.id === "social" ? Users : app.id === "forum" ? MessageSquare : null;
              return (
                <button
                  key={app.id}
                  onClick={() => open(app)}
                  className={`group relative text-left rounded-xl border overflow-hidden hover:border-casino-gold/70 transition-all aspect-[4/3] ${
                    app.featured
                      ? "border-casino-gold/50 shadow-[0_0_25px_hsl(45_95%_55%/0.25)] col-span-2 sm:col-span-1"
                      : "border-border/60"
                  }`}
                >
                  <img
                    src={app.image}
                    alt={app.name}
                    loading="lazy"
                    className="absolute inset-0 w-full h-full object-cover opacity-55 group-hover:opacity-80 group-hover:scale-110 transition-all duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-transparent" />
                  {Icon && (
                    <div className="absolute top-2 left-2 h-7 w-7 rounded-lg bg-black/60 border border-casino-gold/40 text-casino-gold flex items-center justify-center backdrop-blur">
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                  )}
                  <span className="absolute top-2 right-2 text-[8px] px-1.5 py-0.5 rounded-full bg-casino-green/20 text-casino-green border border-casino-green/40 font-bold tracking-widest">
                    LIVE
                  </span>
                  <div className="absolute inset-x-0 bottom-0 p-2.5">
                    <h3 className="font-display font-black text-sm leading-tight">
                      {app.name}
                    </h3>
                    <div className="flex items-center justify-between gap-1 mt-0.5">
                      <p className="text-[10px] text-foreground/75 truncate">
                        {app.tagline}
                      </p>
                      <ArrowRight className="w-3.5 h-3.5 text-casino-gold shrink-0 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* SOCIAL & FORUM BANNERS */}
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={() => navigate("/friends")}
            className="group relative text-left rounded-2xl border border-primary/50 overflow-hidden hover:border-casino-gold/70 transition-all min-h-[120px] shadow-[0_0_30px_hsl(280_70%_30%/0.4)]"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[hsl(280_70%_25%)] via-[hsl(265_60%_15%)] to-black" />
            <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-fuchsia-500/30 blur-2xl group-hover:bg-fuchsia-500/50 transition" />
            <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 80% 20%, hsl(300 90% 60% / 0.5), transparent 50%)" }} />
            <div className="relative p-4 flex items-center gap-4 h-full">
              <div className="h-14 w-14 rounded-xl bg-fuchsia-500/20 border border-fuchsia-400/50 text-fuchsia-300 flex items-center justify-center shrink-0 backdrop-blur">
                <Users className="w-7 h-7" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[9px] tracking-[0.25em] uppercase text-fuchsia-300/80 mb-0.5">Phantom Social</div>
                <h3 className="font-display font-black text-base sm:text-lg leading-tight">Connect. Chat. Party.</h3>
                <p className="text-[11px] text-foreground/70 mt-0.5 line-clamp-2">Add friends, send DMs and join live parties across the network.</p>
              </div>
              <ArrowRight className="w-5 h-5 text-casino-gold shrink-0 group-hover:translate-x-1 transition" />
            </div>
          </button>

          <button
            onClick={() => navigate("/friends?tab=forum")}
            className="group relative text-left rounded-2xl border border-primary/50 overflow-hidden hover:border-casino-gold/70 transition-all min-h-[120px] shadow-[0_0_30px_hsl(45_70%_30%/0.35)]"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[hsl(45_70%_20%)] via-[hsl(265_60%_12%)] to-black" />
            <div className="absolute -left-6 -bottom-6 h-32 w-32 rounded-full bg-amber-500/30 blur-2xl group-hover:bg-amber-500/50 transition" />
            <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 20% 80%, hsl(45 95% 60% / 0.5), transparent 50%)" }} />
            <div className="relative p-4 flex items-center gap-4 h-full">
              <div className="h-14 w-14 rounded-xl bg-amber-500/15 border border-casino-gold/50 text-casino-gold flex items-center justify-center shrink-0 backdrop-blur">
                <MessageSquare className="w-7 h-7" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[9px] tracking-[0.25em] uppercase text-casino-gold/80 mb-0.5">Phantom Forum</div>
                <h3 className="font-display font-black text-base sm:text-lg leading-tight">Threads. Guides. Drops.</h3>
                <p className="text-[11px] text-foreground/70 mt-0.5 line-clamp-2">Discuss strategies, post guides and stay ahead with the community.</p>
              </div>
              <ArrowRight className="w-5 h-5 text-casino-gold shrink-0 group-hover:translate-x-1 transition" />
            </div>
          </button>
        </section>

        {/* KEY WARNING — compact */}
        <section className="relative rounded-xl border border-destructive/60 bg-destructive/10 p-3 overflow-hidden">
          <div className="absolute inset-0 animate-warn-pulse pointer-events-none" />
          <div className="relative flex items-start gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-destructive/20 border border-destructive/60 flex items-center justify-center text-destructive shrink-0">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-display font-black text-xs sm:text-sm text-destructive">
                Warning — You Are Your Own Bank
              </h3>
              <p className="text-[11px] sm:text-xs text-foreground/80 mt-0.5 leading-snug">
                Lose your <span className="font-bold text-foreground">10-word key</span> and your account is{" "}
                <span className="font-bold text-destructive">permanently lost</span>. Store it offline, store it safe.
              </p>
            </div>
          </div>
        </section>

        <p className="text-center text-[9px] tracking-widest uppercase text-muted-foreground/60">
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