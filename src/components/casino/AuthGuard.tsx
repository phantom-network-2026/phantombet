import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/casino/Header";
import { BottomNav } from "@/components/casino/BottomNav";
import { Lock } from "lucide-react";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="min-h-screen gradient-casino-bg flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen gradient-casino-bg pb-20 md:pb-0">
        <Header />
        <div className="container max-w-md py-16 px-4 text-center space-y-6">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
            <Lock className="h-8 w-8 text-primary" />
          </div>
          <h1 className="font-display text-2xl font-black text-foreground">Login Required</h1>
          <p className="text-muted-foreground">
            You need to be logged in to play games. Create a free account and get $100 in mock funds!
          </p>
          <div className="flex flex-col gap-3 max-w-xs mx-auto">
            <Button variant="gold" size="lg" onClick={() => navigate("/signup")}>
              Sign Up To Claim Free Spins Or Up To $50 Welcome Bonus
            </Button>
            <Button variant="outline" size="lg" onClick={() => navigate("/login")}>
              Already have an account? Log In
            </Button>
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  return <>{children}</>;
}
