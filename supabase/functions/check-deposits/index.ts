import { createClient } from "https://esm.sh/@supabase/supabase-js@2.102.0";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

const TRONGRID_API_KEY = Deno.env.get("TRONGRID_API_KEY")!;
const USDT_CONTRACT = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";
const TRONGRID_BASE = "https://api.trongrid.io";
const MIN_DEPOSIT_USD = 5;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get all active deposit addresses
    const { data: addresses, error } = await adminClient
      .from("deposit_addresses")
      .select("*")
      .eq("is_active", true);

    if (error) throw error;
    if (!addresses || addresses.length === 0) {
      return new Response(JSON.stringify({ message: "No active addresses", credited: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let totalCredited = 0;

    for (const addr of addresses) {
      try {
        // Check TRC20 transactions for this address
        const txRes = await fetch(
          `${TRONGRID_BASE}/v1/accounts/${addr.tron_address}/transactions/trc20?limit=50&contract_address=${USDT_CONTRACT}`,
          { headers: { "TRON-PRO-API-KEY": TRONGRID_API_KEY } }
        );

        if (!txRes.ok) continue;
        const txData = await txRes.json();

        if (!txData.data || txData.data.length === 0) continue;

        for (const tx of txData.data) {
          // Only process incoming transfers TO this address
          if (tx.to !== addr.tron_address) continue;

          const txId = tx.transaction_id;

          // Check if we already processed this deposit
          const { data: existingDeposit } = await adminClient
            .from("deposits")
            .select("id")
            .eq("payment_id", txId)
            .single();

          if (existingDeposit) continue;

          // USDT has 6 decimals
          const usdtAmount = Number(tx.value) / 1e6;

          if (usdtAmount < MIN_DEPOSIT_USD) continue;

          // Credit the user (real crypto balance — auto-syncs to user_coin_balances USDT via trigger)
          const { data: profile } = await adminClient
            .from("profiles")
            .select("real_balance")
            .eq("user_id", addr.user_id)
            .single();

          if (!profile) continue;

          await adminClient
            .from("profiles")
            .update({ real_balance: Number(profile.real_balance) + usdtAmount })
            .eq("user_id", addr.user_id);

          // Record deposit
          await adminClient.from("deposits").insert({
            user_id: addr.user_id,
            amount_usd: usdtAmount,
            crypto_currency: "USDT_TRC20",
            payment_id: txId,
            payment_address: addr.tron_address,
            payment_amount: usdtAmount,
            status: "completed",
          });

          // Record transaction
          await adminClient.from("transactions").insert({
            user_id: addr.user_id,
            amount: usdtAmount,
            type: "deposit",
            description: `USDT deposit of $${usdtAmount.toFixed(2)} (tx: ${txId})`,
          });

          // Grant XP: 10 XP per dollar deposited
          await adminClient.rpc("grant_xp", { p_user_id: addr.user_id, p_amount: Math.round(usdtAmount * 10) });

          // Bump free bet welcome promo progress (best-effort)
          try {
            await adminClient.rpc("bump_free_bet_progress", {
              p_user_id: addr.user_id,
              p_deposit_amount: usdtAmount,
              p_wager_amount: 0,
            });
          } catch (_) { /* non-fatal */ }

          totalCredited++;
          console.log(`Credited $${usdtAmount} to user ${addr.user_id} from tx ${txId}`);
        }
      } catch (addrErr) {
        console.error(`Error checking address ${addr.tron_address}:`, addrErr);
      }
    }

    return new Response(JSON.stringify({ message: "Deposit check complete", credited: totalCredited }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    console.error("check-deposits error:", err);
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
