import { useLocation } from "react-router-dom";
import { AlertTriangle } from "lucide-react";

const SOCIAL_ROUTES = ["/friends", "/messages"];

export function TestingPhaseBanner() {
  const { pathname } = useLocation();
  const isSocial = SOCIAL_ROUTES.some((p) => pathname.startsWith(p));
  if (isSocial) return null;

  return (
    <div className="sticky top-0 z-[60] w-full bg-gradient-to-r from-yellow-500/20 via-amber-500/30 to-yellow-500/20 border-b border-amber-400/40 backdrop-blur-md">
      <div className="flex items-center justify-center gap-2 px-3 py-1.5 text-[11px] sm:text-xs text-amber-100 font-medium text-center">
        <AlertTriangle className="h-3.5 w-3.5 text-amber-300 shrink-0" />
        <span>
          <strong className="text-amber-200">TESTING PHASE</strong> — Phantom Network is not live. Targeting full launch <strong>early June 2026</strong>.
        </span>
      </div>
    </div>
  );
}

export default TestingPhaseBanner;