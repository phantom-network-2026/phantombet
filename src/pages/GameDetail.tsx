import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Header } from "@/components/casino/Header";
import { BottomNav } from "@/components/casino/BottomNav";
import { AuthGuard } from "@/components/casino/AuthGuard";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Play } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

import slotsImg from "@/assets/game-slots.jpg";

const GAME_ROUTES: Record<string, string> = {
  "Blackjack": "/blackjack",
  "Lucky Scratch Card": "/scratch-card",
  "Slot Cowboy": "/slot-cowboy",
  "Roulette": "/roulette",
  "Penny Roulette": "/penny-roulette",
  "Prize Reel": "/prize-reel",
  "Chicken Cross": "/chicken-cross",
  "Scratch Royale": "/scratch-royale",
  "Crypto Call": "/crypto-call",
  "Cut Wire Pro": "/cut-wire-pro",
  "Head & Tail": "/head-and-tail",
  "Hero Casino": "/hero-casino",
  "Meter Crash": "/meter-crash",
  "Dream 11": "/dream-11",
  "Jackpot Highway": "/jackpot-highway",
  "Marvel Betting": "/marvel-betting",
  "Neon Bounce": "/neon-bounce",
  "Plane Crash": "/plane-crash",
  "Plinko Pro": "/plinko-pro",
  "Race Kings": "/race-kings",
  "Royal Derby": "/royal-derby",
  "Royal Heist": "/royal-heist",
  "Safe Door": "/safe-door",
  "Spin Wheel Royale": "/spin-wheel-royale",
  "Stack Up Casino": "/stack-up-casino",
  "Stake Mines": "/stake-mines",
};

export default function GameDetail() {
  return <AuthGuard><GameDetailInner /></AuthGuard>;
}

function GameDetailInner() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [gameName, setGameName] = useState("");

  useEffect(() => {
    if (!id) return;
    supabase.from("games").select("name").eq("id", id).single().then(({ data }) => {
      if (data?.name) {
        setGameName(data.name);
        const route = GAME_ROUTES[data.name];
        if (route) navigate(route, { replace: true });
      }
    });
  }, [id, navigate]);

  return (
    <div className="min-h-screen gradient-casino-bg pb-20 md:pb-0">
      <Header />
      <div className="container max-w-2xl py-4 px-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <div className="rounded-2xl overflow-hidden bg-card border border-border">
          <img src={slotsImg} alt="Game" className="w-full h-48 md:h-64 object-cover" />
          <div className="p-6 text-center space-y-4">
            <h1 className="font-display text-2xl font-black text-gold">{gameName || "Game Preview"}</h1>
            <p className="text-muted-foreground">
              This is a demo casino. Game functionality will be available soon!
            </p>
            {user ? (
              <Button variant="gold" size="lg" className="w-full max-w-xs">
                <Play className="h-5 w-5 mr-2" /> Play Now
              </Button>
            ) : (
              <Button variant="gold" size="lg" onClick={() => navigate("/signup")} className="w-full max-w-xs">
                Sign Up to Play
              </Button>
            )}
          </div>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
