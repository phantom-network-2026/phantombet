import { Header } from "@/components/casino/Header";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function DisabledFeature({ feature }: { feature: string }) {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen gradient-casino-bg">
      <Header />
      <div className="container max-w-md py-10 px-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <div className="rounded-2xl border border-amber-400/40 bg-gradient-to-br from-amber-500/10 to-yellow-500/5 p-8 text-center space-y-4">
          <div className="mx-auto w-14 h-14 rounded-full bg-amber-500/20 flex items-center justify-center">
            <Lock className="h-7 w-7 text-amber-300" />
          </div>
          <h1 className="text-2xl font-bold text-amber-100">{feature} Disabled</h1>
          <p className="text-sm text-muted-foreground">
            Phantom Network is currently in its <strong className="text-amber-200">testing phase</strong>.
            {` `}{feature} functionality is temporarily disabled.
          </p>
          <p className="text-xs text-muted-foreground">
            Targeting full launch <strong className="text-amber-200">early June 2026</strong>.
          </p>
        </div>
      </div>
    </div>
  );
}