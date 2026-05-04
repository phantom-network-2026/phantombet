import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { BottomNav } from "@/components/casino/BottomNav";
import { Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [bypass, setBypass] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "auth_bypass")
        .maybeSingle();
      if (!mounted) return;
      const v = data?.value as any;
      setBypass(v?.enabled === true);
    })();
    return () => { mounted = false; };
  }, []);

  if (loading || bypass === null) {
    return (
      <div className="min-h-screen gradient-casino-bg flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user && !bypass) {
    return (
      <div className="min-h-screen gradient-casino-bg pb-20 md:pb-0">
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
              Sign Up To Claim Free Spins Or Up To $50
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
