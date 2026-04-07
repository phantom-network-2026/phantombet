import heroBanner from "@/assets/hero-banner.jpg";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

export function HeroBanner() {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="relative overflow-hidden rounded-2xl mx-4 mt-4">
      <img src={heroBanner} alt="BitBet Casino - Win Big!" className="w-full h-40 md:h-56 object-cover" />
      <div className="absolute inset-0 bg-gradient-to-r from-background/80 to-transparent flex flex-col justify-center p-6">
        <h2 className="font-display text-2xl md:text-4xl font-black text-gold leading-tight">
          WIN BIG<br />AT BITBET
        </h2>
        <p className="text-sm text-foreground/80 mt-1 mb-3">Up to $500 welcome bonus!</p>
        <Button
          variant="gold"
          size="sm"
          className="w-fit"
          onClick={() => navigate(user ? "/deposit" : "/signup")}
        >
          {user ? "Deposit Now" : "Join Now"}
        </Button>
      </div>
    </div>
  );
}
