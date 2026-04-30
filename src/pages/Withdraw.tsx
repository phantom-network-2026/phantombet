import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/casino/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Wallet, AlertTriangle, CheckCircle, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function Withdraw() {
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();
  const [amount, setAmount] = useState("");
  const [cryptoAddress, setCryptoAddress] = useState(profile?.withdrawal_address || profile?.crypto_address || "");
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState<"address" | "amount" | "confirm">(
    (profile?.withdrawal_address || profile?.crypto_address) ? "amount" : "address"
  );

  if (!user) { navigate("/login"); return null; }

  const handleSaveAddress = async () => {
    if (!cryptoAddress.trim() || cryptoAddress.trim().length < 10) {
      toast.error("Please enter a valid USDT (TRC-20) address");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ withdrawal_address: cryptoAddress.trim() })
      .eq("user_id", user.id);
    setSaving(false);
    if (error) { toast.error("Failed to save address"); return; }
    toast.success("Withdrawal address saved!");
    await refreshProfile();
    setStep("amount");
  };

  const handleWithdraw = () => {
    const withdrawAmount = Number(amount);
    if (!withdrawAmount || withdrawAmount < 10) {
      toast.error("Minimum withdrawal is $10");
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
    try {
      const { data, error } = await supabase.functions.invoke("process-withdrawal", {
        body: { amount: Number(amount) },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (data?.status === "pending_approval") {
        toast.success("Withdrawal submitted for admin approval!");
        await refreshProfile();
        navigate("/casino");
      } else {
        toast.success(`Withdrawal of $${Number(amount).toFixed(2)} processed! TX: ${data.txHash?.slice(0, 12)}...`);
        await refreshProfile();
        navigate("/casino");
      }
    } catch (err: any) {
      toast.error(err.message || "Withdrawal failed");
    }
    setSaving(false);
  };

  const destAddress = profile?.withdrawal_address || profile?.crypto_address || cryptoAddress;

  return (
    <div className="min-h-screen gradient-casino-bg">
      <Header />
      <div className="container max-w-md py-6 px-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>

        <div className="text-center mb-6">
          <h1 className="font-display text-2xl font-black text-gold">Withdraw USDT</h1>
          <p className="text-muted-foreground text-sm mt-1">TRC-20 Network • Auto-processed</p>
          <div className="mt-3 inline-flex items-center gap-2 rounded-xl bg-card border border-border px-5 py-3">
            <Wallet className="h-5 w-5 text-casino-gold" />
            <span className="font-display text-xl font-bold text-casino-gold">
              ${profile?.balance?.toFixed(2) ?? "0.00"}
            </span>
          </div>
        </div>

        {step === "address" && (
          <div className="rounded-xl bg-card border border-border p-5 space-y-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-casino-gold shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground">
                Enter your USDT (TRC-20) receiving address for withdrawals.
              </p>
            </div>
            <div>
              <Label>USDT Withdrawal Address (TRC-20)</Label>
              <Input
                value={cryptoAddress}
                onChange={(e) => setCryptoAddress(e.target.value)}
                placeholder="T... (TRON address)"
                className="bg-secondary border-border mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Ensure this is a valid TRC-20 address. Funds sent to wrong addresses cannot be recovered.
              </p>
            </div>
            <Button variant="gold" className="w-full" onClick={handleSaveAddress} disabled={saving}>
              {saving ? "Saving..." : "Save & Continue"}
            </Button>
          </div>
        )}

        {step === "amount" && (
          <div className="space-y-4">
            <div className="rounded-xl bg-card border border-border p-4">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle className="h-4 w-4 text-casino-green" />
                <p className="text-sm font-semibold">Withdrawal Address</p>
              </div>
              <p className="text-xs text-muted-foreground font-mono truncate">{destAddress}</p>
              <Button variant="ghost" size="sm" className="mt-1 text-xs" onClick={() => setStep("address")}>
                Change address
              </Button>
            </div>

            <div className="rounded-xl bg-card border border-border p-5 space-y-3">
              <Label>Withdrawal Amount (USDT)</Label>
              <Input
                type="number"
                step="0.01"
                min="10"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Min $10.00"
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

        {step === "confirm" && (
          <div className="rounded-xl bg-card border border-border p-5 space-y-4">
            <h3 className="font-display font-bold text-lg text-center">Confirm Withdrawal</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-display font-bold text-casino-gold">${Number(amount).toFixed(2)} USDT</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">To Address</span>
                <span className="font-mono text-xs truncate max-w-[180px]">{destAddress}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Network</span>
                <span className="font-semibold">TRC-20 (TRON)</span>
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
                {saving ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Processing...</> : "Confirm Withdrawal"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
