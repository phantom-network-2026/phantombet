import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type LiveCoin = {
  symbol: string;
  name: string;
  network: string;
  sector: string;
  price: string;
  change: string;
  volume: string;
  status: string;
  risk: number;
  price_usd: number;
  change_24h: number;
  last_price_sync_at: string | null;
};

function fmtPrice(p: number): string {
  if (p >= 1000) return `$${p.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  if (p >= 1) return `$${p.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  if (p >= 0.01) return `$${p.toFixed(4)}`;
  return `$${p.toFixed(8).replace(/0+$/, "")}`;
}
function fmtVolume(v: number): string {
  if (v >= 1e9) return `${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
  return `${v.toFixed(0)}`;
}
function fmtChange(c: number): string {
  const sign = c >= 0 ? "+" : "";
  return `${sign}${c.toFixed(2)}%`;
}

export function useExchangeCoins() {
  const [coins, setCoins] = useState<LiveCoin[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      const { data, error } = await supabase
        .from("exchange_coins")
        .select("symbol,name,network,sector,price_usd,change_24h,volume_24h,status,risk_score,last_price_sync_at")
        .neq("status", "delisted")
        .order("display_order", { ascending: true });
      if (error || !mounted) {
        setLoading(false);
        return;
      }
      setCoins(
        (data ?? []).map((c) => ({
          symbol: c.symbol,
          name: c.name,
          network: c.network,
          sector: c.sector,
          status: c.status,
          risk: c.risk_score ?? 30,
          price_usd: Number(c.price_usd) || 0,
          change_24h: Number(c.change_24h) || 0,
          price: fmtPrice(Number(c.price_usd) || 0),
          change: fmtChange(Number(c.change_24h) || 0),
          volume: fmtVolume(Number(c.volume_24h) || 0),
          last_price_sync_at: c.last_price_sync_at,
        })),
      );
      setLoading(false);
    };

    load();

    const channel = supabase
      .channel("exchange-coins-live")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "exchange_coins" },
        () => load(),
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  return { coins, loading };
}