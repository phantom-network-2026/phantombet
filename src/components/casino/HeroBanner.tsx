import heroBanner from "@/assets/hero-banner.jpg";
import logo from "@/assets/phantombet-logo.png";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

export function HeroBanner() {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="relative overflow-hidden rounded-2xl mx-4 mt-4">
      <img src={heroBanner} alt="PhantomBet Casino - Win Big!" className="w-full h-56 md:h-64 object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/40 to-transparent flex flex-col justify-end p-5">
        <div className="flex items-end justify-between gap-4">
          <div className="flex-1">
            <h2 className="font-display text-2xl md:text-4xl font-black text-casino-gold leading-none tracking-tight">
              WIN BIG AT PHANTOMBET
            </h2>
            <p className="text-xs md:text-sm text-foreground/80 mt-2 mb-3 max-w-[280px] md:max-w-none">Up to $50 welcome bonus or 50 free spins — no wagering requirements!</p>
            <div className="flex gap-2">
              {user ? (
                <>
                  <Button variant="gold" size="sm" className="text-xs h-8 px-3" onClick={() => navigate("/deposit")}>
                    Deposit
                  </Button>
                  <Button variant="pink" size="sm" className="text-xs h-8 px-3" onClick={() => navigate("/withdraw")}>
                    Withdraw
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="gold" size="sm" className="text-xs h-8 px-3" onClick={() => navigate("/signup")}>
                    Sign Up & Claim
                  </Button>
                  <Button variant="outline" size="sm" className="text-xs h-8 px-3" onClick={() => navigate("/login")}>
                    Log In
                  </Button>
                </>
              )}
            </div>
          </div>
          <div className="shrink-0 overflow-hidden" style={{ height: '7rem', width: '7rem' }}>
            <img src={logo} alt="PhantomBet" className="w-full drop-shadow-lg" style={{ clipPath: 'inset(0 0 35% 0)' }} />
          </div>
        </div>
      </div>
    </div>
  );
}
