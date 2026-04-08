import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import logo from "@/assets/phantombet-logo.svg";

export default function ForgotPassword() {
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Resolve username to email via edge function
      const { data, error: fnError } = await supabase.functions.invoke("resolve-username", {
        body: { username },
      });

      if (fnError || !data?.email) {
        setError("Username not found");
        setLoading(false);
        return;
      }

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (resetError) {
        setError(resetError.message);
      } else {
        setSent(true);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    }

    setLoading(false);
  };

  if (sent) {
    return (
      <div className="min-h-screen gradient-casino-bg flex items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-6 text-center">
          <img src={logo} alt="PhantomBet" className="h-16 w-16 mx-auto mb-3" />
          <h1 className="font-display text-2xl font-black text-gold">Check Your Email</h1>
          <p className="text-muted-foreground text-sm">
            We've sent a password reset link to the email associated with your account. Check your inbox and follow the link to reset your password.
          </p>
          <Link to="/login">
            <Button variant="outline" className="w-full mt-4">Back to Login</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-casino-bg flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <img src={logo} alt="PhantomBet" className="h-16 w-16 mx-auto mb-3" />
          <h1 className="font-display text-2xl font-black text-gold">Forgot Password</h1>
          <p className="text-muted-foreground text-sm mt-1">Enter your username and we'll send a reset link to your email</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="username">Username</Label>
            <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} required className="bg-secondary border-border" placeholder="Enter your username" />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" variant="gold" className="w-full" disabled={loading}>
            {loading ? "Sending..." : "Send Reset Link"}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Remember your password?{" "}
          <Link to="/login" className="text-casino-gold hover:underline">Log in</Link>
        </p>
      </div>
    </div>
  );
}
