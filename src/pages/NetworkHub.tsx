import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import logo from "@/assets/phantom-network-logo.png";
import { ArrowRight, Gamepad2, TrendingUp, LogOut, Sparkles } from "lucide-react";

type App = {
  id: string;
  name: string;
  tagline: string;
  to: string;
  featured?: boolean;
  icon: React.ReactNode;
  status?: "live" | "soon";
  accent: string;
};

const APPS: App[] = [
  {
    id: "exchange",
    name: "Phantom Exchange",
    tagline: "Trade, swap & launch tokens across the Phantom ecosystem.",
    to: "/exchange",
    featured: true,
    icon: <TrendingUp className="w-7 h-7" />,
    status: "live",
    accent: "from-cyan-400/40 via-primary/40 to-amber-400/40",
  },
  {
    id: "phantombet",
    name: "PhantomBet",
    tagline: "Casino, slots, sportsbook and live games.",
    to: "/casino",
    icon: <Gamepad2 className="w-6 h-6" />,
    status: "live",
    accent: "from-pink-500/40 via-primary/40 to-purple-500/40",
  },
  {
    id: "wallet",
    name: "Phantom Wallet",
    tagline: "Multi-crypto self-custody wallet.",
    to: "/wallet",
    icon: <Sparkles className="w-6 h-6" />,
    status: "live",
    accent: "from-emerald-400/40 via-primary/40 to-cyan-400/40",
  },
];

export default function NetworkHub() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  return (
    <div className="relative min-h-screen overflow-hidden bg-[hsl(265_60%_4%)] text-foreground">
      <div className="absolute inset-0 bg-gradient-to-b from-[hsl(265_50%_10%)] via-[hsl(270_55%_6%)] to-black" />
      <div
        className="absolute inset-0 opacity-15"
        style={{
          backgroundImage:
            "linear-gradient(hsl(270 60% 50% / 0.25) 1px, transparent 1px), linear-gradient(90deg, hsl(270 60% 50% / 0.25) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
          maskImage: "radial-gradient(ellipse at top, black 20%, transparent 80%)",
        }}
      />

      <header className="relative z-10 flex items-center justify-between px-4 py-3 border-b border-border/40 backdrop-blur">
        <div className="flex items-center gap-2">
          <img src={logo} alt="Phantom Network" width={1024} height={1024} className="h-10 w-10" />
          <div className="leading-tight">
            <div className="font-display font-black text-sm tracking-wide text-gold">PHANTOM</div>
            <div className="text-[10px] tracking-[0.3em] text-muted-foreground -mt-0.5">NETWORK</div>
          </div>
        </div>
        {user ? (
          <Button size="sm" variant="ghost" onClick={() => signOut().then(() => navigate("/"))}>
            <LogOut className="w-4 h-4 mr-1" /> Exit
          </Button>
        ) : (
          <Button size="sm" variant="gold" onClick={() => navigate("/")}>
            Sign in
          </Button>
        )}
      </header>

      <main className="relative z-10 max-w-3xl mx-auto px-4 py-8 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="font-display text-3xl sm:text-4xl font-black bg-gradient-to-r from-casino-gold via-amber-200 to-casino-gold bg-clip-text text-transparent">
            Choose Your Service
          </h1>
          <p className="text-sm text-muted-foreground">
            All connected. One account. Tap an app to enter.
          </p>
        </div>

        {/* Featured tile */}
        {APPS.filter((a) => a.featured).map((app) => (
          <button
            key={app.id}
            onClick={() => navigate(app.to)}
            className="group relative w-full text-left rounded-3xl border border-primary/40 bg-card/70 backdrop-blur-xl p-6 overflow-hidden hover:border-casino-gold/60 transition-all shadow-[0_0_40px_hsl(270_70%_30%/0.4)]"
          >
            <div
              className={`absolute inset-0 bg-gradient-to-br ${app.accent} opacity-50 group-hover:opacity-80 transition-opacity`}
            />
            <div className="relative flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-background/60 border border-casino-gold/40 flex items-center justify-center text-casino-gold">
                {app.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="font-display font-black text-xl">{app.name}</h2>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-casino-green/20 text-casino-green border border-casino-green/40">
                    LIVE
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{app.tagline}</p>
              </div>
              <ArrowRight className="w-6 h-6 text-casino-gold group-hover:translate-x-1 transition-transform" />
            </div>
          </button>
        ))}

        {/* Other tiles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {APPS.filter((a) => !a.featured).map((app) => (
            <button
              key={app.id}
              onClick={() => navigate(app.to)}
              className="group relative text-left rounded-2xl border border-border/60 bg-card/60 backdrop-blur p-4 overflow-hidden hover:border-primary/60 transition-all"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${app.accent} opacity-20 group-hover:opacity-40 transition-opacity`} />
              <div className="relative flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-background/60 border border-border flex items-center justify-center text-casino-gold">
                  {app.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-display font-bold text-base truncate">{app.name}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-2">{app.tagline}</p>
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-casino-gold transition-colors" />
              </div>
            </button>
          ))}
        </div>

        <p className="text-center text-[10px] tracking-widest uppercase text-muted-foreground/50 pt-4">
          More services joining the network soon
        </p>
      </main>
    </div>
  );
}