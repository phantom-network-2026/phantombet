import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import fallback from "@/assets/football-banner.jpeg";

export type SportsBannerSlot = "home_hero" | "football_top";

export interface SportsBanners {
  home_hero?: string;
  football_top?: string;
}

export function useSportsBanner(slot: SportsBannerSlot): string {
  const [url, setUrl] = useState<string>(fallback);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase.functions.invoke("get-public-settings", {
          body: { keys: ["sports_promo_banners"] },
        });
        const banners: SportsBanners | undefined = data?.settings?.sports_promo_banners;
        const candidate = banners?.[slot];
        if (!cancelled && candidate) setUrl(candidate);
      } catch {
        // fallback already set
      }
    })();
    return () => { cancelled = true; };
  }, [slot]);
  return url;
}
