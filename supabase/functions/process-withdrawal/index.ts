import { createClient } from "https://esm.sh/@supabase/supabase-js@2.102.0";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.102.0/cors";

const TRONGRID_API_KEY = Deno.env.get("TRONGRID_API_KEY")!;
const MASTER_PRIVATE_KEY = Deno.env.get("TRON_MASTER_PRIVATE_KEY")!;
const USDT_CONTRACT = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";
const TRONGRID_BASE = "https://api.trongrid.io";
const MIN_WITHDRAWAL = 10;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No auth header");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const { amount, withdrawalId, adminAction } = body;

    // ── Admin approve/deny flow ──
    if (adminAction && withdrawalId) {
      // Check caller is admin
      const { data: isAdmin } = await adminClient.rpc("has_role", { _user_id: user.id, _role: "admin" });
      if (!isAdmin) throw new Error("Admin access required");

      const { data: wd } = await adminClient
        .from("withdrawals")
        .select("*")
        .eq("id", withdrawalId)
        .eq("status", "pending_approval")
        .single();

      if (!wd) throw new Error("Withdrawal not found or already processed");

      if (adminAction === "deny") {
        // Refund balance
        const { data: prof } = await adminClient.from("profiles").select("balance").eq("user_id", wd.user_id).single();
        if (prof) {
          await adminClient.from("profiles").update({ balance: prof.balance + wd.amount }).eq("user_id", wd.user_id);
        }
        await adminClient.from("withdrawals").update({ status: "denied", error_message: "Denied by admin" }).eq("id", wd.id);
        await adminClient.from("transactions").insert({
          user_id: wd.user_id, amount: wd.amount, type: "withdrawal_refund",
          description: `Withdrawal of $${wd.amount} denied — funds refunded`,
        });
        return new Response(JSON.stringify({ success: true, status: "denied" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (adminAction === "approve") {
        // Process the actual blockchain transaction
        const result = await processOnChain(adminClient, wd);
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      throw new Error("Invalid admin action");
    }

    // ── User withdrawal request flow ──
    const withdrawAmount = Number(amount);
    if (!withdrawAmount || withdrawAmount < MIN_WITHDRAWAL) {
      throw new Error(`Minimum withdrawal is $${MIN_WITHDRAWAL}`);
    }

    const { data: profile } = await adminClient
      .from("profiles")
      .select("balance, withdrawal_address, crypto_address")
      .eq("user_id", user.id)
      .single();

    if (!profile) throw new Error("Profile not found");
    const destAddress = profile.withdrawal_address || profile.crypto_address;
    if (!destAddress) throw new Error("No withdrawal address set");
    if (withdrawAmount > profile.balance) throw new Error("Insufficient balance");

    // Deduct balance first
    const { error: balanceError } = await adminClient
      .from("profiles")
      .update({ balance: profile.balance - withdrawAmount })
      .eq("user_id", user.id);
    if (balanceError) throw balanceError;

    // Check if approval is required
    const { data: settingRow } = await adminClient
      .from("site_settings")
      .select("value")
      .eq("key", "wallet_mode")
      .single();

    const requireApproval = (settingRow?.value as any)?.require_withdrawal_approval === true;

    if (requireApproval) {
      // Create pending_approval withdrawal
      const { error: wdError } = await adminClient
        .from("withdrawals")
        .insert({
          user_id: user.id,
          amount: withdrawAmount,
          destination_address: destAddress,
          status: "pending_approval",
        });

      if (wdError) {
        await adminClient.from("profiles").update({ balance: profile.balance }).eq("user_id", user.id);
        throw wdError;
      }

      await adminClient.from("transactions").insert({
        user_id: user.id, amount: -withdrawAmount, type: "withdrawal_hold",
        description: `Withdrawal of $${withdrawAmount} pending admin approval`,
      });

      return new Response(JSON.stringify({
        success: true,
        status: "pending_approval",
        message: "Your withdrawal request has been submitted for admin approval.",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Auto-process: create withdrawal record and process on-chain
    const { data: withdrawal, error: wdError } = await adminClient
      .from("withdrawals")
      .insert({
        user_id: user.id,
        amount: withdrawAmount,
        destination_address: destAddress,
        status: "processing",
      })
      .select()
      .single();

    if (wdError) {
      await adminClient.from("profiles").update({ balance: profile.balance }).eq("user_id", user.id);
      throw wdError;
    }

    const result = await processOnChain(adminClient, withdrawal);
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("process-withdrawal error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ── On-chain processing helper ──
async function processOnChain(adminClient: any, withdrawal: any) {
  const usdtAmount = Math.floor(withdrawal.amount * 1e6);

  const masterAddress = await getAddressFromPrivateKey(MASTER_PRIVATE_KEY);

  const triggerRes = await fetch(`${TRONGRID_BASE}/wallet/triggersmartcontract`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "TRON-PRO-API-KEY": TRONGRID_API_KEY },
    body: JSON.stringify({
      owner_address: masterAddress,
      contract_address: USDT_CONTRACT,
      function_selector: "transfer(address,uint256)",
      parameter: encodeParameters([
        { type: "address", value: withdrawal.destination_address },
        { type: "uint256", value: usdtAmount },
      ]),
      fee_limit: 100000000,
      call_value: 0,
      visible: true,
    }),
  });

  const triggerData = await triggerRes.json();

  if (!triggerData.result?.result) {
    const errMsg = triggerData.result?.message ? hexToString(triggerData.result.message) : "Contract call failed";
    await adminClient.from("withdrawals").update({ status: "failed", error_message: errMsg }).eq("id", withdrawal.id);
    // Refund
    const { data: prof } = await adminClient.from("profiles").select("balance").eq("user_id", withdrawal.user_id).single();
    if (prof) await adminClient.from("profiles").update({ balance: prof.balance + withdrawal.amount }).eq("user_id", withdrawal.user_id);
    throw new Error(errMsg);
  }

  const signRes = await fetch(`${TRONGRID_BASE}/wallet/gettransactionsign`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "TRON-PRO-API-KEY": TRONGRID_API_KEY },
    body: JSON.stringify({ transaction: triggerData.transaction, privateKey: MASTER_PRIVATE_KEY }),
  });
  const signedTx = await signRes.json();

  const broadcastRes = await fetch(`${TRONGRID_BASE}/wallet/broadcasttransaction`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "TRON-PRO-API-KEY": TRONGRID_API_KEY },
    body: JSON.stringify(signedTx),
  });
  const broadcastData = await broadcastRes.json();

  if (broadcastData.result) {
    const txHash = broadcastData.txid || signedTx.txID;
    await adminClient.from("withdrawals").update({ status: "completed", tx_hash: txHash }).eq("id", withdrawal.id);
    await adminClient.from("transactions").insert({
      user_id: withdrawal.user_id, amount: -withdrawal.amount, type: "withdrawal",
      description: `USDT withdrawal to ${withdrawal.destination_address} (tx: ${txHash})`,
    });
    return { success: true, txHash, amount: withdrawal.amount };
  } else {
    const errMsg = broadcastData.message || "Broadcast failed";
    await adminClient.from("withdrawals").update({ status: "failed", error_message: errMsg }).eq("id", withdrawal.id);
    const { data: prof } = await adminClient.from("profiles").select("balance").eq("user_id", withdrawal.user_id).single();
    if (prof) await adminClient.from("profiles").update({ balance: prof.balance + withdrawal.amount }).eq("user_id", withdrawal.user_id);
    throw new Error(errMsg);
  }
}

async function getAddressFromPrivateKey(privateKey: string): Promise<string> {
  const pkRes = await fetch(`${TRONGRID_BASE}/wallet/getaddressfromprivatekey`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "TRON-PRO-API-KEY": TRONGRID_API_KEY },
    body: JSON.stringify({ value: privateKey }),
  });
  if (!pkRes.ok) throw new Error("Failed to derive address from private key");
  const data = await pkRes.json();
  return data.base58 || data.address;
}

function encodeParameters(params: { type: string; value: string | number }[]): string {
  let encoded = "";
  for (const param of params) {
    if (param.type === "address") {
      encoded += String(param.value).replace(/^0x/, "").padStart(64, "0");
    } else if (param.type === "uint256") {
      encoded += BigInt(param.value).toString(16).padStart(64, "0");
    }
  }
  return encoded;
}

function hexToString(hex: string): string {
  try {
    const bytes = new Uint8Array(hex.match(/.{1,2}/g)!.map(b => parseInt(b, 16)));
    return new TextDecoder().decode(bytes);
  } catch { return hex; }
}
