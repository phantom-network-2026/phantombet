import { useEffect, useMemo, useState } from "react";
import { ShieldAlert, X, Monitor, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

// v2 — reset prior dismissals so all users see the new device/browser message
const STORAGE_KEY = "phantom_vpn_warning_dismissed_forever_v2";
const INTERVAL_MS = 60 * 1000;

function detectClient() {
  const ua = navigator.userAgent;
  // Browser
  let browser = "Unknown Browser";
  if (/Edg\//.test(ua)) browser = "Microsoft Edge";
  else if (/OPR\//.test(ua) || /Opera/.test(ua)) browser = "Opera";
  else if (/Chrome\//.test(ua) && !/Chromium/.test(ua)) browser = "Google Chrome";
  else if (/Firefox\//.test(ua)) browser = "Mozilla Firefox";
  else if (/Safari\//.test(ua) && /Version\//.test(ua)) browser = "Safari";
  const vMatch = ua.match(/(Edg|OPR|Chrome|Firefox|Version)\/([\d.]+)/);
  if (vMatch) browser += ` ${vMatch[2].split(".")[0]}`;

  // Device / OS
  let device = "Unknown Device";
  if (/iPhone/.test(ua)) device = "Apple iPhone";
  else if (/iPad/.test(ua)) device = "Apple iPad";
  else if (/Macintosh/.test(ua)) device = "Apple Mac";
  else if (/Android/.test(ua)) {
    const m = ua.match(/Android[^;]*;\s*([^)]+?)(?:\sBuild|\))/);
    device = m ? `Android — ${m[1].trim()}` : "Android Device";
  } else if (/Windows NT 10/.test(ua)) device = "Windows 10/11 PC";
  else if (/Windows/.test(ua)) device = "Windows PC";
  else if (/Linux/.test(ua)) device = "Linux Device";

  return { browser, device };
}

export function VpnWarningPopup() {
  const [open, setOpen] = useState(false);
  const [neverShow, setNeverShow] = useState(false);
  const { browser, device } = useMemo(detectClient, []);

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY) === "true") return;
    const tick = () => setOpen(true);
    const t = setTimeout(tick, 5000); // first show after 5s
    const i = setInterval(() => {
      if (localStorage.getItem(STORAGE_KEY) === "true") return;
      setOpen(true);
    }, INTERVAL_MS);
    return () => { clearTimeout(t); clearInterval(i); };
  }, []);

  const dismiss = () => {
    if (neverShow) localStorage.setItem(STORAGE_KEY, "true");
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-2xl border-2 border-destructive/70 bg-[hsl(265_60%_6%)] shadow-[0_0_50px_hsl(0_80%_50%/0.4)] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-destructive/15 via-transparent to-transparent pointer-events-none" />
        <button
          onClick={dismiss}
          aria-label="Dismiss warning"
          className="absolute top-2 right-2 z-10 h-8 w-8 rounded-full bg-black/40 hover:bg-black/70 flex items-center justify-center text-foreground/70 hover:text-foreground transition"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="relative p-5 sm:p-6">
          <div className="flex items-start gap-3 mb-3">
            <div className="h-12 w-12 rounded-xl bg-destructive/20 border border-destructive/60 flex items-center justify-center text-destructive shrink-0 animate-pulse">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <div>
              <div className="text-[10px] tracking-[0.25em] uppercase text-destructive/80 mb-0.5">Security Warning</div>
              <h2 className="font-display font-black text-lg leading-tight">You Are Not Using A VPN</h2>
            </div>
          </div>

          <div className="space-y-2 text-sm text-foreground/85 leading-snug">
            <p>
              Your connection is <span className="font-bold text-destructive">unprotected</span>. Without a VPN your IP, location and traffic are exposed to your ISP and any observer.
            </p>
            <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-2.5 space-y-1.5">
              <div className="text-[10px] tracking-[0.2em] uppercase text-destructive/80 font-bold">Exposed Fingerprint</div>
              <div className="flex items-center gap-2 text-xs">
                <Monitor className="h-3.5 w-3.5 text-destructive shrink-0" />
                <span className="text-foreground/60">Device:</span>
                <span className="font-mono font-bold text-foreground truncate">{device}</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <Globe className="h-3.5 w-3.5 text-destructive shrink-0" />
                <span className="text-foreground/60">Browser:</span>
                <span className="font-mono font-bold text-foreground truncate">{browser}</span>
              </div>
            </div>
            <p className="text-xs text-foreground/70 border-l-2 border-casino-gold/60 pl-2.5 py-1 bg-casino-gold/5 rounded-r">
              <span className="font-bold text-casino-gold">At launch</span>, access to the Phantom Network <span className="font-bold">will not be granted</span> unless you are running a VPN. Set one up now to avoid disruption.
            </p>
          </div>

          <label className="mt-4 flex items-center gap-2 cursor-pointer group">
            <Checkbox
              checked={neverShow}
              onCheckedChange={(v) => setNeverShow(v === true)}
              className="border-foreground/40 data-[state=checked]:bg-casino-gold data-[state=checked]:text-black"
            />
            <span className="text-xs text-foreground/80 group-hover:text-foreground transition">Never show this again</span>
          </label>

          <div className="mt-4 flex gap-2">
            <Button variant="gold" size="sm" className="flex-1" onClick={dismiss}>
              I Understand
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
