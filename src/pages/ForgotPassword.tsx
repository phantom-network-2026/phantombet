import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, KeyRound } from "lucide-react";
import { toast } from "sonner";
import logo from "@/assets/phantombet-logo.png";

export default function ForgotPassword() {
  const [username, setUsername] = useState("");
  const [seedPhrase, setSeedPhrase] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"enter-key" | "new-password" | "done">("enter-key");
  const [verifiedUserId, setVerifiedUserId] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleVerifySeed = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("resolve-username", {
        body: { username, seed_phrase: seedPhrase.trim().toLowerCase(), action: "recover_by_seed" },
      });

      if (fnError || !data?.verified) {
        setError(data?.error || "Invalid username or recovery key");
        setLoading(false);
        return;
      }

      setVerifiedUserId(data.user_id);
      setStep("new-password");
    } catch {
      setError("Something went wrong. Please try again.");
    }
    setLoading(false);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (!newPassword.trim()) {
      setError("Password cannot be empty");
      return;
    }

    setLoading(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("resolve-username", {
        body: { action: "reset_password", user_id: verifiedUserId, new_password: newPassword },
      });

      if (fnError || data?.error) {
        setError(data?.error || "Failed to reset password");
        setLoading(false);
        return;
      }

      setStep("done");
      toast.success("Password reset successfully!");
    } catch {
      setError("Something went wrong.");
    }
    setLoading(false);
  };

  if (step === "done") {
    return (
      <div className="min-h-screen gradient-casino-bg flex items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-6 text-center">
          <img src={logo} alt="PhantomBet" className="h-16 w-16 mx-auto mb-3" />
          <h1 className="font-display text-2xl font-black text-gold">Password Reset!</h1>
          <p className="text-muted-foreground text-sm">
            Your password has been updated. You can now log in with your new password.
          </p>
          <Link to="/login">
            <Button variant="gold" className="w-full mt-4">Go to Login</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (step === "new-password") {
    return (
      <div className="min-h-screen gradient-casino-bg flex items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center">
            <img src={logo} alt="PhantomBet" className="h-16 w-16 mx-auto mb-3" />
            <h1 className="font-display text-2xl font-black text-gold">Set New Password</h1>
            <p className="text-muted-foreground text-sm mt-1">Recovery key verified! Enter your new password.</p>
          </div>

          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <Label htmlFor="newPassword">New Password</Label>
              <Input id="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required className="bg-secondary border-border" />
            </div>
            <div>
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className="bg-secondary border-border" />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" variant="gold" className="w-full" disabled={loading}>
              {loading ? "Resetting..." : "Reset Password"}
            </Button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-casino-bg flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <img src={logo} alt="PhantomBet" className="h-16 w-16 mx-auto mb-3" />
          <h1 className="font-display text-2xl font-black text-gold flex items-center justify-center gap-2">
            <KeyRound className="h-6 w-6" /> Account Recovery
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Enter your username and the 10-word recovery key you received at signup</p>
        </div>

        <form onSubmit={handleVerifySeed} className="space-y-4">
          <div>
            <Label htmlFor="username">Username</Label>
            <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} required className="bg-secondary border-border" placeholder="Enter your username" />
          </div>
          <div>
            <Label htmlFor="seedPhrase" className="flex items-center gap-2">
              <Shield className="h-3 w-3 text-casino-gold" /> Recovery Key
            </Label>
            <Input 
              id="seedPhrase" 
              value={seedPhrase} 
              onChange={(e) => setSeedPhrase(e.target.value)} 
              required 
              className="bg-secondary border-border" 
              placeholder="Enter all 10 words separated by spaces" 
            />
            <p className="text-[10px] text-muted-foreground mt-1">The 10-word key you were given when you registered</p>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" variant="gold" className="w-full" disabled={loading}>
            {loading ? "Verifying..." : "Verify Recovery Key"}
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
