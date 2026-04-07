import { Header } from "@/components/casino/Header";
import { BottomNav } from "@/components/casino/BottomNav";
import { Button } from "@/components/ui/button";
import { Gift, Star, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const promos = [
  { icon: Gift, title: "Welcome Bonus", desc: "Get up to $500 on your first deposit!", color: "text-casino-gold" },
  { icon: Star, title: "VIP Rewards", desc: "Earn loyalty points on every bet", color: "text-casino-pink" },
  { icon: Zap, title: "Daily Spins", desc: "Free spins every day for active players", color: "text-casino-purple-light" },
];

export default function Promotions() {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="min-h-screen gradient-casino-bg pb-20 md:pb-0">
      <Header />
      <div className="container max-w-2xl py-6 px-4">
        <h1 className="font-display text-2xl font-black text-gold mb-6">🎁 Promotions</h1>
        <div className="space-y-4">
          {promos.map((promo) => (
            <div key={promo.title} className="rounded-xl bg-card border border-border p-5 flex gap-4 items-start">
              <div className={`rounded-lg bg-secondary p-3 ${promo.color}`}>
                <promo.icon className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-display font-bold text-lg">{promo.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">{promo.desc}</p>
                <Button
                  variant="gold"
                  size="sm"
                  className="mt-3"
                  onClick={() => navigate(user ? "/deposit" : "/signup")}
                >
                  {user ? "Claim Now" : "Sign Up"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
