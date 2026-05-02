import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import freeBetBuilderBanner from "@/assets/free-bet-builder-banner.png";

export function HeroBanner() {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="relative overflow-hidden rounded-2xl mx-4 mt-4 group animate-border-gold">
      <img
        src={freeBetBuilderBanner}
        alt="Phantom Casino Football Betting — Get a $5 Free Bet Builder"
        className="w-full h-auto block bg-background"
        loading="eager"
      />
      <div className="absolute left-2 bottom-2 flex items-center justify-start gap-2">
        {user ? (
          <Button variant="gold" size="sm" className="text-[10px] h-6 px-2" onClick={() => navigate("/sportsbook")}>
            Bet Now
          </Button>
        ) : (
          <Button variant="gold" size="sm" className="text-[10px] h-6 px-2" onClick={() => navigate("/signup")}>
            Claim $5 Free Bet
          </Button>
        )}
      </div>
    </div>
  );
}
