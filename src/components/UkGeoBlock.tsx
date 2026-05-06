import { useEffect, useState } from "react";
import { ShieldAlert } from "lucide-react";

/**
 * Blocks visitors detected as being in the United Kingdom.
 * Uses Cloudflare's public trace endpoint (no API key, no PII).
 * Result is cached for 24h in localStorage to avoid repeat lookups.
 */
export function UkGeoBlock({ children }: { children: React.ReactNode }) {
  const [blocked, setBlocked] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      try {
        const cached = localStorage.getItem("geo_country_v1");
        if (cached) {
          const { country, ts } = JSON.parse(cached) as { country: string; ts: number };
          if (Date.now() - ts < 24 * 60 * 60 * 1000) {
            if (!cancelled) {
              setBlocked(country === "GB");
              setChecked(true);
            }
            return;
          }
        }

        const res = await fetch("https://www.cloudflare.com/cdn-cgi/trace", { cache: "no-store" });
        const text = await res.text();
        const match = text.match(/loc=([A-Z]{2})/);
        const country = match?.[1] ?? "";
        localStorage.setItem("geo_country_v1", JSON.stringify({ country, ts: Date.now() }));
        if (!cancelled) {
          setBlocked(country === "GB");
          setChecked(true);
        }
      } catch {
        if (!cancelled) setChecked(true);
      }
    };

    check();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!checked) return null;

  if (blocked) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background p-6">
        <div className="max-w-lg w-full rounded-2xl border border-border bg-card p-8 text-center shadow-2xl">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <ShieldAlert className="h-8 w-8 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold mb-3">Service Unavailable in Your Region</h1>
          <p className="text-muted-foreground mb-4">
            Access to this network is currently restricted in the United Kingdom 🇬🇧 in
            order to comply with UK regulations and licensing laws.
          </p>
          <p className="text-sm text-muted-foreground">
            The Phantom Network remains fully active and operational in most other
            regions around the world. We apologise for any inconvenience.
          </p>
          <p className="mt-6 text-xs text-muted-foreground/70">
            If you believe you are seeing this message in error, please disable any
            VPN/proxy and reload the page.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
