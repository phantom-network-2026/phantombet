import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FEE_BPS = 30; // 0.30% trading fee

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: authErr } = await supabase.auth.getClaims(token);
    if (authErr || !claims?.claims) return json({ error: "Unauthorized" }, 401);
    const userId = claims.claims.sub as string;

    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? "swap"); // "quote" | "swap"
    const fromSymbol = String(body.from_symbol ?? "").toUpperCase().trim();
    const toSymbol = String(body.to_symbol ?? "").toUpperCase().trim();
    const fromAmount = Number(body.from_amount);

    if (!fromSymbol || !toSymbol || fromSymbol === toSymbol) {
      return json({ error: "Invalid pair" }, 400);
    }
    if (!Number.isFinite(fromAmount) || fromAmount <= 0) {
      return json({ error: "Invalid amount" }, 400);
    }

    // Load both coin prices
    const { data: coins, error: coinErr } = await admin
      .from("exchange_coins")
      .select("symbol,price_usd,is_trading_enabled,status")
      .in("symbol", [fromSymbol, toSymbol]);
    if (coinErr) return json({ error: coinErr.message }, 500);

    const fromCoin = coins?.find((c) => c.symbol === fromSymbol);
    const toCoin = coins?.find((c) => c.symbol === toSymbol);
    if (!fromCoin || !toCoin) return json({ error: "Coin not listed" }, 404);
    if (!fromCoin.is_trading_enabled || !toCoin.is_trading_enabled) {
      return json({ error: "Trading disabled for this pair" }, 403);
    }
    if (Number(fromCoin.price_usd) <= 0 || Number(toCoin.price_usd) <= 0) {
      return json({ error: "Price unavailable" }, 503);
    }

    const grossUsd = fromAmount * Number(fromCoin.price_usd);
    const feeUsd = grossUsd * (FEE_BPS / 10_000);
    const netUsd = grossUsd - feeUsd;
    const toAmount = netUsd / Number(toCoin.price_usd);
    const rate = toAmount / fromAmount;

    if (action === "quote") {
      return json({
        from_symbol: fromSymbol,
        to_symbol: toSymbol,
        from_amount: fromAmount,
        to_amount: toAmount,
        rate,
        fee_usd: feeUsd,
        gross_usd: grossUsd,
        net_usd: netUsd,
        fee_bps: FEE_BPS,
      });
    }

    // Execute swap: debit from, credit to
    const { data: fromBal } = await admin
      .from("user_coin_balances")
      .select("available")
      .eq("user_id", userId)
      .eq("symbol", fromSymbol)
      .maybeSingle();

    const available = Number(fromBal?.available ?? 0);
    if (available < fromAmount) {
      return json({ error: `Insufficient ${fromSymbol} balance` }, 400);
    }

    // Debit
    const { error: debitErr } = await admin
      .from("user_coin_balances")
      .update({ available: available - fromAmount })
      .eq("user_id", userId)
      .eq("symbol", fromSymbol);
    if (debitErr) return json({ error: debitErr.message }, 500);

    // Credit (upsert)
    const { data: toBal } = await admin
      .from("user_coin_balances")
      .select("available")
      .eq("user_id", userId)
      .eq("symbol", toSymbol)
      .maybeSingle();

    if (toBal) {
      const { error: creditErr } = await admin
        .from("user_coin_balances")
        .update({ available: Number(toBal.available) + toAmount })
        .eq("user_id", userId)
        .eq("symbol", toSymbol);
      if (creditErr) {
        // best-effort rollback
        await admin.from("user_coin_balances").update({ available }).eq("user_id", userId).eq("symbol", fromSymbol);
        return json({ error: creditErr.message }, 500);
      }
    } else {
      const { error: insErr } = await admin
        .from("user_coin_balances")
        .insert({ user_id: userId, symbol: toSymbol, available: toAmount, locked: 0 });
      if (insErr) {
        await admin.from("user_coin_balances").update({ available }).eq("user_id", userId).eq("symbol", fromSymbol);
        return json({ error: insErr.message }, 500);
      }
    }

    // Log swap
    const { data: swap } = await admin
      .from("coin_swaps")
      .insert({
        user_id: userId,
        from_symbol: fromSymbol,
        from_amount: fromAmount,
        to_symbol: toSymbol,
        to_amount: toAmount,
        rate,
        fee_usd: feeUsd,
        status: "completed",
      })
      .select()
      .single();

    return json({ success: true, swap, to_amount: toAmount, rate, fee_usd: feeUsd });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }

  function json(obj: unknown, status = 200) {
    return new Response(JSON.stringify(obj), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});