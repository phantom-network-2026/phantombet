import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import logo from "@/assets/phantombet-logo.svg";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error } = await signUp(email, password, username);
    setLoading(false);
    if (error) setError(error.message);
    else navigate("/");
  };

  return (
    <div className="min-h-screen gradient-casino-bg flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <img src={logo} alt="PhantomBet" className="h-16 w-16 mx-auto mb-3" />
          <h1 className="font-display text-3xl font-black text-gold">Join PhantomBet</h1>
          <p className="text-muted-foreground text-sm mt-1">Create your account & start winning</p>
        </div>

        {/* Early access banner */}
        <div className="rounded-xl border border-[hsl(var(--casino-gold))/0.3] bg-[hsl(var(--casino-gold))/0.08] p-4 space-y-2">
          <p className="text-sm font-bold text-[hsl(var(--casino-gold))]">🚧 Early Access — Development Mode</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            PhantomBet is still in development. Real deposits are not available yet. Every new account receives <span className="text-[hsl(var(--casino-gold))] font-bold">$100 in mock funds</span> to explore our games!
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            🎁 <span className="text-[hsl(var(--casino-green))] font-semibold">Loyal members who register now will receive a free 3-month VIP subscription on launch day!</span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="username">Username</Label>
            <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} required className="bg-secondary border-border" />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="bg-secondary border-border" />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={1} className="bg-secondary border-border" />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" variant="gold" className="w-full" disabled={loading}>
            {loading ? "Creating account..." : "Sign Up & Get $100 Free"}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link to="/login" className="text-casino-gold hover:underline">Log in</Link>
        </p>
      </div>
    </div>
  );
}
