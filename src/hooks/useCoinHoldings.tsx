import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface CoinHolding {
  symbol: string;
  available: number;
  locked: number;
}

export function useCoinHoldings() {
  const [holdings, setHoldings] = useState<CoinHolding[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) { if (active) { setHoldings([]); setLoading(false); } return; }
      if (active) setUserId(auth.user.id);

      const { data, error } = await supabase
        .from("user_coin_balances")
        .select("symbol, available, locked")
        .eq("user_id", auth.user.id)
        .order("available", { ascending: false });

      if (!active) return;
      if (error) { setHoldings([]); setLoading(false); return; }
      setHoldings(
        (data ?? [])
          .map((r) => ({
            symbol: r.symbol,
            available: Number(r.available) || 0,
            locked: Number(r.locked) || 0,
          }))
          .filter((h) => h.available > 0 || h.locked > 0),
      );
      setLoading(false);
    }

    load();

    const channel = supabase
      .channel("user-coin-balances-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_coin_balances" },
        () => load(),
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, []);

  return { holdings, loading, userId };
}