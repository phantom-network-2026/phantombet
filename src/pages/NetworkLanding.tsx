import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import logo from "@/assets/phantom-network-logo.png";
import { LanguagePicker } from "@/components/casino/LanguagePicker";

export default function NetworkLanding() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [flash, setFlash] = useState(0);
  const { signIn, user } = useAuth();
  const navigate = useNavigate();
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Already logged in? Skip straight to the hub.
  useEffect(() => {
    if (user) navigate("/hub", { replace: true });
  }, [user, navigate]);

  // Random lightning flashes
  useEffect(() => {
    let timeout: number;
    const trigger = () => {
      setFlash((f) => f + 1);
      // optional thunder click
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
        g.gain.exponentialRampToValueAtTime(0.08, ctx.currentTime + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6);
        o.connect(g).connect(ctx.destination);
        o.start();
        o.stop(ctx.currentTime + 0.65);
      } catch {}
      timeout = window.setTimeout(trigger, 2500 + Math.random() * 5000);
    };
    timeout = window.setTimeout(trigger, 1500);
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
    <div className="relative min-h-screen overflow-hidden flex items-center justify-center p-4 bg-[hsl(265_60%_4%)]">
      {/* Storm clouds gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-[hsl(265_50%_8%)] via-[hsl(270_60%_6%)] to-black" />
      {/* Drifting animated grid */}
      <div
        className="absolute inset-0 opacity-20 animate-grid-drift"
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
        {Array.from({ length: 22 }).map((_, i) => (
          <span
            key={i}
            className="absolute block rounded-full bg-casino-gold/70 animate-spark"
            style={{
              left: `${(i * 53) % 100}%`,
              bottom: `-${10 + (i % 5) * 6}px`,
              width: `${2 + (i % 3)}px`,
              height: `${2 + (i % 3)}px`,
              animationDuration: `${8 + (i % 7)}s`,
              animationDelay: `${(i * 0.6) % 8}s`,
              boxShadow: "0 0 8px hsl(42 90% 60% / 0.9)",
            }}
          />
        ))}
      </div>

      {/* Lightning bolt SVGs (no white screen flash) */}
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
          opacity="0.95"
        />
        <path
          d={`M${60 + Math.random() * 280} 0 L${80 + Math.random() * 240} 240 L${60 + Math.random() * 240} 260 L${100 + Math.random() * 200} 600`}
          stroke="hsl(270 90% 75%)"
          strokeWidth="1.5"
          fill="none"
          filter="url(#glow)"
          opacity="0.7"
        />
      </svg>

      {/* Subtle purple glow pulse where the bolt struck (replaces white flash) */}
      <div
        key={`f-${flash}`}
        className="pointer-events-none absolute inset-0 animate-storm-glow"
        style={{
          background:
            "radial-gradient(ellipse at 50% 30%, hsl(270 80% 55% / 0.35), transparent 60%)",
        }}
      />

      <div className="absolute top-4 right-4 z-20">
        <LanguagePicker />
      </div>

      <div className="relative z-10 w-full max-w-sm space-y-6">
        <div className="text-center">
          <img
            src={logo}
            alt="Phantom Network"
            width={1024}
            height={1024}
            className="h-44 w-44 mx-auto mb-2 drop-shadow-[0_0_30px_hsl(270_70%_50%/0.7)] animate-logo-pulse"
          />
          <h1 className="font-display text-3xl font-black bg-gradient-to-r from-casino-gold via-amber-300 to-casino-gold bg-clip-text text-transparent">
            Enter the Network
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            One identity. Every Phantom service.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 p-5 rounded-2xl border border-primary/30 bg-card/60 backdrop-blur-xl shadow-[0_0_40px_hsl(270_70%_30%/0.4)]"
        >
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
        </form>

        <p className="text-center text-[10px] text-muted-foreground/60 tracking-widest uppercase">
          PhantomBet · Phantom Exchange · More coming
        </p>
      </div>

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