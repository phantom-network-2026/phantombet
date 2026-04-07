import { useNavigate } from "react-router-dom";
import { Header } from "@/components/casino/Header";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CreditCard, Wallet, ArrowDownToLine } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function Deposit() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  if (!user) { navigate("/login"); return null; }

  return (
    <div className="min-h-screen gradient-casino-bg">
      <Header />
      <div className="container max-w-md py-6 px-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>

        <div className="text-center mb-6">
          <h1 className="font-display text-2xl font-black text-gold">Deposit Funds</h1>
          <div className="mt-3 inline-flex items-center gap-2 rounded-xl bg-card border border-border px-5 py-3">
            <Wallet className="h-5 w-5 text-casino-gold" />
            <span className="font-display text-xl font-bold text-casino-gold">
              ${profile?.balance?.toFixed(2) ?? "0.00"}
            </span>
          </div>
        </div>

        <div className="space-y-3">
          {[10, 25, 50, 100, 250, 500].map((amount) => (
            <Button
              key={amount}
              variant="outline"
              className="w-full justify-between text-lg font-display border-border hover:border-casino-gold hover:text-casino-gold"
              onClick={() => {/* Payment integration would go here */}}
            >
              <span>${amount}</span>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </Button>
          ))}
        </div>

        <div className="text-center mt-6 space-y-2">
          <Button variant="pink" className="w-full" onClick={() => navigate("/withdraw")}>
            <ArrowDownToLine className="h-4 w-4 mr-1" /> Withdraw Funds Instead
          </Button>
          <p className="text-xs text-muted-foreground">
            Demo mode — contact admin for balance adjustments.
          </p>
        </div>
      </div>
    </div>
  );
}
