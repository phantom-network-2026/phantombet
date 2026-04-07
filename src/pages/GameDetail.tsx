import { useParams, useNavigate } from "react-router-dom";
import { Header } from "@/components/casino/Header";
import { BottomNav } from "@/components/casino/BottomNav";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Play } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

import slotsImg from "@/assets/game-slots.jpg";

export default function GameDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

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
            <h1 className="font-display text-2xl font-black text-gold">Game Preview</h1>
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
