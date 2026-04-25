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
        className="w-full h-40 md:h-56 object-contain bg-background"
      />
      <div className="absolute left-0 bottom-0 p-2 flex items-center justify-start gap-2">
        {user ? (
          <Button variant="gold" size="sm" className="text-[10px] h-6 px-2" onClick={() => navigate("/sportsbook")}>
            Bet Now
          </Button>
        ) : (
          <Button variant="gold" size="sm" className="text-[10px] h-6 px-2" onClick={() => navigate("/signup")}>
            Claim £5 Free Bet
          </Button>
        )}
      </div>
    </div>
  );
}
