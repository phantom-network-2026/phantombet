import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import WelcomeBanner from "@/components/casino/WelcomeBanner";
import logo from "@/assets/phantombet-logo.png";
import { LanguagePicker } from "@/components/casino/LanguagePicker";
import ConnectingSplash from "@/components/casino/ConnectingSplash";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSplash, setShowSplash] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error } = await signIn(username, password);
    setLoading(false);
    if (error) setError(error.message);
    else setShowSplash(true);
  };

  return (
    <div className="min-h-screen gradient-casino-bg flex items-start justify-center px-4 pt-6 pb-8">
      {showSplash && (
        <ConnectingSplash onComplete={() => navigate("/hub")} />
      )}
      <div className="absolute top-3 right-3">
        <LanguagePicker />
      </div>
      <div className="w-full max-w-sm space-y-3">
        {/* Compact header tile */}
        <div className="flex items-center gap-3 rounded-xl border border-casino-gold/30 bg-card/40 p-3">
          <img src={logo} alt="PhantomBet" className="h-14 w-14 shrink-0" />
          <div className="min-w-0">
            <h1 className="font-display text-xl font-black text-gold leading-tight">Welcome Back</h1>
            <p className="text-muted-foreground text-[11px] leading-tight">Log in to your Phantom Casino account</p>
          </div>
        </div>

        {/* Login form tile */}
        <form onSubmit={handleSubmit} className="rounded-xl border border-border bg-card/40 p-3 space-y-2.5">
          <div className="space-y-1">
            <Label htmlFor="username" className="text-xs">Username</Label>
            <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} required className="h-9 bg-secondary border-border" placeholder="Enter your username" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="password" className="text-xs">Password</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="h-9 bg-secondary border-border" />
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <Button type="submit" variant="gold" className="w-full h-9" disabled={loading}>
            {loading ? "Logging in..." : "Log In"}
          </Button>
          <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-0.5">
            <Link to="/forgot-password" className="text-casino-gold hover:underline">Forgot password?</Link>
            <Link to="/signup" className="text-casino-gold hover:underline">Sign up</Link>
          </div>
        </form>

        {/* Tiled info row */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-amber-400/40 bg-amber-500/10 p-2.5 text-[10px] leading-snug text-amber-100">
            <p className="font-bold text-amber-300 uppercase tracking-wide text-[10px] mb-1">🔒 VPN (iPhone/PC)</p>
            <p>Once live, iPhone &amp; PC users must connect via VPN to access the network.</p>
          </div>
          <div className="rounded-xl border border-emerald-400/40 bg-emerald-500/10 p-2.5 text-[10px] leading-snug text-emerald-100">
            <p className="font-bold text-emerald-300 uppercase tracking-wide text-[10px] mb-1">📱 Android</p>
            <p>Android app includes a built-in VPN — no setup required.</p>
          </div>
        </div>

        {/* Welcome banner tile (compact) */}
        <div className="rounded-xl overflow-hidden">
          <WelcomeBanner variant="login" />
        </div>
      </div>
    </div>
  );
}
