import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function useWatchlist() {
  const { user } = useAuth();
  const [symbols, setSymbols] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) {
      setSymbols(new Set());
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("exchange_watchlist")
      .select("symbol")
      .eq("user_id", user.id);
    setSymbols(new Set((data ?? []).map((r) => r.symbol)));
    setLoading(false);
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const toggle = useCallback(
    async (symbol: string) => {
      if (!user) return false;
      if (symbols.has(symbol)) {
        await supabase
          .from("exchange_watchlist")
          .delete()
          .eq("user_id", user.id)
          .eq("symbol", symbol);
        setSymbols((s) => {
          const n = new Set(s);
          n.delete(symbol);
          return n;
        });
        return false;
      }
      await supabase
        .from("exchange_watchlist")
        .insert({ user_id: user.id, symbol });
      setSymbols((s) => new Set(s).add(symbol));
      return true;
    },
    [symbols, user]
  );

  return { symbols, toggle, loading, refresh, has: (s: string) => symbols.has(s) };
}