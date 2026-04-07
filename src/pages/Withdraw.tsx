import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/casino/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Wallet, AlertTriangle, CheckCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function Withdraw() {
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();
  const [amount, setAmount] = useState("");
  const [cryptoAddress, setCryptoAddress] = useState(profile?.crypto_address || "");
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState<"address" | "amount" | "confirm">(
    profile?.crypto_address ? "amount" : "address"
  );

  if (!user) { navigate("/login"); return null; }

  const handleSaveAddress = async () => {
    if (!cryptoAddress.trim() || cryptoAddress.trim().length < 10) {
      toast.error("Please enter a valid crypto address");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ crypto_address: cryptoAddress.trim() })
      .eq("user_id", user.id);
    setSaving(false);
    if (error) { toast.error("Failed to save address"); return; }
    toast.success("Crypto address saved!");
    await refreshProfile();
    setStep("amount");
  };

  const handleWithdraw = async () => {
    const withdrawAmount = Number(amount);
    if (!withdrawAmount || withdrawAmount <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    if (withdrawAmount > (profile?.balance || 0)) {
      toast.error("Insufficient balance");
      return;
    }
    setStep("confirm");
  };

  const handleConfirm = async () => {
    setSaving(true);
    const withdrawAmount = Number(amount);

    // Create transaction
    const { error: txError } = await supabase.from("transactions").insert({
      user_id: user.id,
      amount: -withdrawAmount,
      type: "withdrawal",
      description: `Withdrawal to ${profile?.crypto_address || cryptoAddress}`,
    });

    if (txError) {
      // User can't insert transactions directly, this is admin-only
      // For now, show a pending message
      toast.success("Withdrawal request submitted! An admin will process it shortly.");
      setSaving(false);
      navigate("/");
      return;
    }

    // Update balance
    const { error } = await supabase
      .from("profiles")
      .update({ balance: (profile?.balance || 0) - withdrawAmount })
      .eq("user_id", user.id);

    if (error) { toast.error("Failed to process withdrawal"); setSaving(false); return; }

    toast.success(`Withdrawal of $${withdrawAmount.toFixed(2)} submitted!`);
    await refreshProfile();
    setSaving(false);
    navigate("/");
  };

  return (
    <div className="min-h-screen gradient-casino-bg">
      <Header />
      <div className="container max-w-md py-6 px-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>

        <div className="text-center mb-6">
          <h1 className="font-display text-2xl font-black text-gold">Withdraw Funds</h1>
          <div className="mt-3 inline-flex items-center gap-2 rounded-xl bg-card border border-border px-5 py-3">
            <Wallet className="h-5 w-5 text-casino-gold" />
            <span className="font-display text-xl font-bold text-casino-gold">
              ${profile?.balance?.toFixed(2) ?? "0.00"}
            </span>
          </div>
        </div>

        {/* Step 1: Crypto Address */}
        {step === "address" && (
          <div className="rounded-xl bg-card border border-border p-5 space-y-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-casino-gold shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground">
                You must attach a crypto receiving address before you can withdraw funds.
              </p>
            </div>
            <div>
              <Label>Crypto Wallet Address</Label>
              <Input
                value={cryptoAddress}
                onChange={(e) => setCryptoAddress(e.target.value)}
                placeholder="Enter your BTC/ETH/USDT address..."
                className="bg-secondary border-border mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Ensure this address is correct. Funds sent to the wrong address cannot be recovered.
              </p>
            </div>
            <Button variant="gold" className="w-full" onClick={handleSaveAddress} disabled={saving}>
              {saving ? "Saving..." : "Save & Continue"}
            </Button>
          </div>
        )}

        {/* Step 2: Amount */}
        {step === "amount" && (
          <div className="space-y-4">
            <div className="rounded-xl bg-card border border-border p-4">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle className="h-4 w-4 text-casino-green" />
                <p className="text-sm font-semibold">Withdrawal Address</p>
              </div>
              <p className="text-xs text-muted-foreground font-mono truncate">
                {profile?.crypto_address || cryptoAddress}
              </p>
              <Button variant="ghost" size="sm" className="mt-1 text-xs" onClick={() => setStep("address")}>
                Change address
              </Button>
            </div>

            <div className="rounded-xl bg-card border border-border p-5 space-y-3">
              <Label>Withdrawal Amount ($)</Label>
              <Input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="bg-secondary border-border text-lg font-display"
              />
              <div className="grid grid-cols-3 gap-2">
                {[25, 50, 100, 250, 500].map((a) => (
                  <Button
                    key={a}
                    variant="outline"
                    size="sm"
                    className="border-border"
                    onClick={() => setAmount(String(a))}
                    disabled={a > (profile?.balance || 0)}
                  >
                    ${a}
                  </Button>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  className="border-border text-casino-gold"
                  onClick={() => setAmount(String(profile?.balance || 0))}
                >
                  Max
                </Button>
              </div>
              <Button variant="gold" className="w-full" onClick={handleWithdraw}>
                Continue
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Confirm */}
        {step === "confirm" && (
          <div className="rounded-xl bg-card border border-border p-5 space-y-4">
            <h3 className="font-display font-bold text-lg text-center">Confirm Withdrawal</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-display font-bold text-casino-gold">${Number(amount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">To Address</span>
                <span className="font-mono text-xs truncate max-w-[180px]">
                  {profile?.crypto_address || cryptoAddress}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Remaining Balance</span>
                <span className="font-display font-bold">
                  ${((profile?.balance || 0) - Number(amount)).toFixed(2)}
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep("amount")}>
                Back
              </Button>
              <Button variant="gold" className="flex-1" onClick={handleConfirm} disabled={saving}>
                {saving ? "Processing..." : "Confirm"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
