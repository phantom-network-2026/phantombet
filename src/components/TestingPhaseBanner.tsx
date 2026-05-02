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

  const countdown = `${t.days}d ${String(t.hours).padStart(2, "0")}h ${String(t.minutes).padStart(2, "0")}m ${String(t.seconds).padStart(2, "0")}s`;
  const message = (
    <span className="inline-flex items-center gap-2 px-6">
      <AlertTriangle className="h-3.5 w-3.5 text-amber-300 shrink-0" />
      <strong className="text-amber-200">TESTING PHASE</strong>
      <span>— Launching June 20, 2026 in</span>
      <span className="font-mono tabular-nums text-amber-200 font-bold">{countdown}</span>
      <span className="text-amber-200 font-bold uppercase tracking-wider">• ALL DEPOSITS AND WITHDRAWALS HAVE BEEN DISABLED UNTIL LAUNCH!</span>
      <span className="text-amber-100/80">• Visit our Discord for support or to join the community — links available under Info → Links tab.</span>
      <span className="text-amber-300">★</span>
    </span>
  );

  return (
    <div className="sticky top-0 z-[60] w-full bg-gradient-to-r from-yellow-500/20 via-amber-500/30 to-yellow-500/20 border-b border-amber-400/40 backdrop-blur-md overflow-hidden">
      <div className="relative flex overflow-hidden whitespace-nowrap py-1.5 text-[11px] sm:text-xs text-amber-100 font-medium">
        <div className="flex shrink-0 animate-marquee">
          {message}
          {message}
        </div>
      </div>
    </div>
  );
}

export default TestingPhaseBanner;