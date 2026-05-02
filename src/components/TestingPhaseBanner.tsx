import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { AlertTriangle } from "lucide-react";

const SOCIAL_ROUTES = ["/friends", "/messages"];
const LAUNCH_DATE = new Date("2026-06-20T00:00:00Z").getTime();

function getRemaining() {
  const diff = Math.max(0, LAUNCH_DATE - Date.now());
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  return { days, hours, minutes, seconds };
}

export function TestingPhaseBanner() {
  const { pathname } = useLocation();
  const isSocial = SOCIAL_ROUTES.some((p) => pathname.startsWith(p));
  const [t, setT] = useState(getRemaining());

  useEffect(() => {
    if (isSocial) return;
    const id = setInterval(() => setT(getRemaining()), 1000);
    return () => clearInterval(id);
  }, [isSocial]);

  if (isSocial) return null;

  return (
    <div className="sticky top-0 z-[60] w-full bg-gradient-to-r from-yellow-500/20 via-amber-500/30 to-yellow-500/20 border-b border-amber-400/40 backdrop-blur-md">
      <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 px-3 py-1.5 text-[11px] sm:text-xs text-amber-100 font-medium text-center">
        <AlertTriangle className="h-3.5 w-3.5 text-amber-300 shrink-0" />
        <span>
          <strong className="text-amber-200">TESTING PHASE</strong> — Launching June 20, 2026 in
        </span>
        <span className="font-mono tabular-nums text-amber-200 tracking-tight">
          <span className="font-bold">{t.days}</span>d{" "}
          <span className="font-bold">{String(t.hours).padStart(2, "0")}</span>h{" "}
          <span className="font-bold">{String(t.minutes).padStart(2, "0")}</span>m{" "}
          <span className="font-bold">{String(t.seconds).padStart(2, "0")}</span>s
        </span>
      </div>
    </div>
  );
}

export default TestingPhaseBanner;