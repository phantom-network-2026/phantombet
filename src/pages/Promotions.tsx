import { useState, useEffect } from "react";
import { Header } from "@/components/casino/Header";
import { BottomNav } from "@/components/casino/BottomNav";
import { Button } from "@/components/ui/button";
import { Gift, Star, Zap, DollarSign, Trophy, Flame, Diamond, Crown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const ICON_MAP: Record<string, React.ElementType> = {
  gift: Gift, star: Star, zap: Zap, dollar: DollarSign,
  trophy: Trophy, fire: Flame, diamond: Diamond, crown: Crown,
};

const defaultPromos = [
  { id: "1", title: "Welcome Bonus", description: "Get up to $500 on your first deposit!", icon: "gift", color: "text-casino-gold", active: true, ctaText: "Claim Now", ctaLink: "/deposit" },
  { id: "2", title: "VIP Rewards", description: "Earn loyalty points on every bet", icon: "star", color: "text-casino-pink", active: true, ctaText: "Learn More", ctaLink: "/deposit" },
  { id: "3", title: "Daily Spins", description: "Free spins every day for active players", icon: "zap", color: "text-casino-purple-light", active: true, ctaText: "Spin Now", ctaLink: "/prize-reel" },
];

export default function Promotions() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [promos, setPromos] = useState(defaultPromos);

  useEffect(() => {
    supabase.functions.invoke("get-public-settings", {
      body: { keys: ["promotions_config"] },
    }).then(({ data }) => {
      if (data?.settings?.promotions_config) {
        const saved = data.settings.promotions_config.promotions || [];
        const active = saved.filter((p: any) => p.active);
        if (active.length > 0) setPromos(active);
      }
    });
  }, []);

  return (
    <div className="min-h-screen gradient-casino-bg pb-20 md:pb-0">
      <Header />
      <div className="container max-w-2xl py-6 px-4">
        <h1 className="font-display text-2xl font-black text-gold mb-6">🎁 Promotions</h1>
        <div className="space-y-4">
          {promos.map((promo) => {
            const IconComp = ICON_MAP[promo.icon] || Gift;
            return (
              <div key={promo.id} className="rounded-xl bg-card border border-border p-5 flex gap-4 items-start">
                <div className={`rounded-lg bg-secondary p-3 ${promo.color}`}>
                  <IconComp className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <h3 className="font-display font-bold text-lg">{promo.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{promo.description}</p>
                  <Button
                    variant="gold"
                    size="sm"
                    className="mt-3"
                    onClick={() => navigate(user ? (promo.ctaLink || "/deposit") : "/signup")}
                  >
                    {user ? promo.ctaText : "Sign Up"}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
