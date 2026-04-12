import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/casino/Header";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Wallet, Copy, CheckCircle, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function Deposit() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [depositAddress, setDepositAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user) return;
    generateOrFetchAddress();
  }, [user]);

  const generateOrFetchAddress = async () => {
    setLoading(true);
    try {
      // Always use edge function — it returns existing or generates new
      const { data, error } = await supabase.functions.invoke("generate-deposit-address");
      if (error) throw error;
      setDepositAddress(data.address);
    } catch (err: any) {
      console.error("Failed to get deposit address:", err);
      toast.error("Failed to generate deposit address");
    }
    setLoading(false);
  };

  const copyAddress = () => {
    if (!depositAddress) return;
    navigator.clipboard.writeText(depositAddress);
    setCopied(true);
    toast.success("Address copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  if (!user) { navigate("/login"); return null; }

  return (
    <div className="min-h-screen gradient-casino-bg">
      <Header />
      <div className="container max-w-md py-6 px-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>

        <div className="text-center mb-6">
          <h1 className="font-display text-2xl font-black text-gold">Deposit USDT</h1>
          <p className="text-muted-foreground text-sm mt-1">TRC-20 Network Only</p>
          <div className="mt-3 inline-flex items-center gap-2 rounded-xl bg-card border border-border px-5 py-3">
            <Wallet className="h-5 w-5 text-casino-gold" />
            <span className="font-display text-xl font-bold text-casino-gold">
              ${profile?.balance?.toFixed(2) ?? "0.00"}
            </span>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center gap-3 py-12">
            <Loader2 className="h-8 w-8 animate-spin text-casino-gold" />
            <p className="text-sm text-muted-foreground">Generating your deposit address...</p>
          </div>
        ) : depositAddress ? (
          <div className="space-y-4">
            <div className="rounded-xl bg-card border border-border p-5 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle className="h-4 w-4 text-casino-green" />
                <p className="text-sm font-semibold">Your USDT Deposit Address</p>
              </div>
              <div
                className="bg-secondary rounded-lg p-3 font-mono text-xs break-all cursor-pointer hover:bg-secondary/80 transition-colors"
                onClick={copyAddress}
              >
                {depositAddress}
              </div>
              <Button
                variant="outline"
                className="w-full border-border"
                onClick={copyAddress}
              >
                {copied ? <CheckCircle className="h-4 w-4 mr-2 text-casino-green" /> : <Copy className="h-4 w-4 mr-2" />}
                {copied ? "Copied!" : "Copy Address"}
              </Button>
            </div>

            <div className="rounded-xl bg-card border border-[hsl(var(--casino-gold))/0.3] p-4 space-y-2">
              <p className="text-sm font-bold text-casino-gold">⚠️ Important</p>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Send <span className="text-casino-gold font-semibold">USDT (TRC-20)</span> only to this address</li>
                <li>• Minimum deposit: <span className="font-semibold">$5.00</span></li>
                <li>• Deposits are credited automatically within minutes</li>
                <li>• Sending any other token will result in permanent loss</li>
              </ul>
            </div>

            <Button variant="pink" className="w-full" onClick={() => navigate("/withdraw")}>
              Withdraw Funds Instead
            </Button>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Failed to generate address.</p>
            <Button variant="outline" className="mt-3" onClick={generateOrFetchAddress}>
              Retry
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
