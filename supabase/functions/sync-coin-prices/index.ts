// Live price sync from CoinGecko (free, no API key required).
// Updates exchange_coins.price_usd / change_24h / volume_24h / market_cap
// and appends a snapshot to coin_price_history.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Fetch coins that have a coingecko_id mapped
    const { data: coins, error } = await supabase
      .from("exchange_coins")
      .select("id, symbol, coingecko_id")
      .not("coingecko_id", "is", null);

    if (error) throw error;
    if (!coins || coins.length === 0) {
      return new Response(JSON.stringify({ updated: 0, note: "no coins with coingecko_id" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ids = [...new Set(coins.map((c) => c.coingecko_id).filter(Boolean))];
    const url =
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(",")}` +
      `&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true&include_market_cap=true`;

    const res = await fetch(url, { headers: { "Accept": "application/json" } });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`CoinGecko ${res.status}: ${text.slice(0, 200)}`);
    }
    const prices = await res.json() as Record<string, {
      usd?: number; usd_24h_change?: number; usd_24h_vol?: number; usd_market_cap?: number;
    }>;

    const now = new Date().toISOString();
    let updated = 0;
    const historyRows: { symbol: string; price_usd: number; recorded_at: string }[] = [];

    for (const coin of coins) {
      const p = coin.coingecko_id ? prices[coin.coingecko_id] : undefined;
      if (!p?.usd) continue;

      const { error: updErr } = await supabase
        .from("exchange_coins")
        .update({
          price_usd: p.usd,
          change_24h: p.usd_24h_change ?? 0,
          volume_24h: p.usd_24h_vol ?? 0,
          market_cap: p.usd_market_cap ?? 0,
          last_price_sync_at: now,
        })
        .eq("id", coin.id);
      if (updErr) console.error("update fail", coin.symbol, updErr.message);
      else updated++;

      historyRows.push({ symbol: coin.symbol, price_usd: p.usd, recorded_at: now });
    }

    if (historyRows.length > 0) {
      const { error: histErr } = await supabase.from("coin_price_history").insert(historyRows);
      if (histErr) console.error("history insert fail", histErr.message);
    }

    return new Response(JSON.stringify({ updated, total: coins.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("sync-coin-prices error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});