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
    <div className="min-h-screen gradient-casino-bg flex items-center justify-center p-4">
      {showSplash && (
        <ConnectingSplash onComplete={() => navigate("/hub")} />
      )}
      <div className="absolute top-4 right-4">
        <LanguagePicker />
      </div>
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <img src={logo} alt="PhantomBet" className="h-48 w-48 mx-auto mb-3" />
          <h1 className="font-display text-3xl font-black text-gold">Welcome Back</h1>
          <p className="text-muted-foreground text-sm mt-1">Log in to your Phantom Casino account</p>
        </div>

        <WelcomeBanner variant="login" />

        <div className="rounded-lg border border-amber-400/40 bg-amber-500/10 p-3 text-xs text-amber-100 space-y-1.5">
          <p className="font-bold text-amber-300 uppercase tracking-wide">🔒 VPN Notice (Once Live)</p>
          <p>
            Once we go live, all users on <span className="font-semibold">iPhone</span> or a{" "}
            <span className="font-semibold">PC web browser</span> must connect through a VPN to access the network.
          </p>
          <p>
            <span className="font-semibold">Android users</span> are covered automatically — our Android app ships with a
            built-in VPN that handles country gambling regulations by default.
          </p>
          <p className="text-amber-200/80">
            This is an additional security measure to protect our network and our users.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="username">Username</Label>
            <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} required className="bg-secondary border-border" placeholder="Enter your username" />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="bg-secondary border-border" />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" variant="gold" className="w-full" disabled={loading}>
            {loading ? "Logging in..." : "Log In"}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          <Link to="/forgot-password" className="text-casino-gold hover:underline">Forgot password?</Link>
        </p>
        <p className="text-center text-sm text-muted-foreground">
          Don't have an account?{" "}
          <Link to="/signup" className="text-casino-gold hover:underline">Sign up</Link>
        </p>
      </div>
    </div>
  );
}
