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
      <img src={heroBanner} alt="PhantomBet Casino - Win Big!" className="w-full h-44 md:h-56 object-cover" />
      <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/60 to-transparent flex flex-col justify-center p-5">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="font-display text-xl md:text-4xl font-black text-gold leading-tight">
              WIN BIG<br />AT PHANTOMBET
            </h2>
            <p className="text-[11px] md:text-sm text-foreground/80 mt-1 mb-3 max-w-[200px] md:max-w-none">Up to $50 welcome bonus or 50 free spins — no wagering requirements!</p>
          </div>
          <img src={logo} alt="PhantomBet" className="h-32 md:h-44 w-auto drop-shadow-lg shrink-0 -mr-2" />
        </div>
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
            <div className="flex gap-2">
              <Button variant="gold" size="sm" className="text-[10px] h-7 px-2.5" onClick={() => navigate("/signup")}>
                Sign Up & Claim
              </Button>
              <Button variant="outline" size="sm" className="text-[10px] h-7 px-2.5" onClick={() => navigate("/login")}>
                Log In
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
