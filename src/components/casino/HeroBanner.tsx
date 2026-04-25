import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useSportsBanner } from "@/hooks/useSportsBanner";

export function HeroBanner() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const bannerUrl = useSportsBanner("home_hero");

  return (
    <div className="relative overflow-hidden rounded-2xl mx-4 mt-4 group">
      <img
        src={bannerUrl}
        alt="PhantomBet Football Betting — Get a £5 Free Bet Builder"
        className="w-full h-40 md:h-56 object-cover"
      />
      <div className="absolute inset-x-0 bottom-0 p-3 flex items-center justify-end gap-2 bg-gradient-to-t from-background/80 to-transparent">
        {user ? (
          <Button variant="gold" size="sm" className="text-xs h-8 px-3" onClick={() => navigate("/sportsbook")}>
            Bet Now
          </Button>
        ) : (
          <Button variant="gold" size="sm" className="text-xs h-8 px-3" onClick={() => navigate("/signup")}>
            Claim £5 Free Bet
          </Button>
        )}
      </div>
    </div>
  );
}
