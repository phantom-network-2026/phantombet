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
      <div className="flex flex-col items-center justify-center gap-1 px-3 py-2 text-[10px] sm:text-[11px] text-amber-100 font-medium text-center max-w-4xl mx-auto leading-tight">
        <div className="flex items-center justify-center gap-2">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-300 shrink-0" />
          <span>
            <strong className="text-amber-200">TESTING PHASE</strong> — Launching June 20, 2026 in
          </span>
        </div>
        <div className="text-amber-200/90 whitespace-pre-line uppercase tracking-wider font-bold text-[9px] sm:text-[10px]">
          ALL DEPOSITS AND WITHDRAWALS HAVE BEEN DISABLED UNTIL LAUNCH! 
          <br />
          <span className="text-amber-100/70 font-medium normal-case tracking-normal">
            For now, visit our discord server for support or to simply join our community. 
            Links to our platforms can be found by clicking info then clicking the links tab.
          </span>
        </div>
        <div className="font-mono tabular-nums text-amber-200 tracking-widest text-sm sm:text-base bg-black/20 px-3 py-0.5 rounded-full mt-1 border border-amber-400/20">
          <span className="font-bold">{t.days}</span>d{" "}
          <span className="font-bold">{String(t.hours).padStart(2, "0")}</span>h{" "}
          <span className="font-bold">{String(t.minutes).padStart(2, "0")}</span>m{" "}
          <span className="font-bold">{String(t.seconds).padStart(2, "0")}</span>s
        </div>
      </div>
    </div>
  );
}

export default TestingPhaseBanner;