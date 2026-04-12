import { createClient } from "https://esm.sh/@supabase/supabase-js@2.102.0";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

const TRONGRID_API_KEY = Deno.env.get("TRONGRID_API_KEY")!;
const MASTER_PRIVATE_KEY = Deno.env.get("TRON_MASTER_PRIVATE_KEY")!;
const USDT_CONTRACT = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t"; // USDT TRC20 mainnet
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

    const { amount } = await req.json();
    const withdrawAmount = Number(amount);

    if (!withdrawAmount || withdrawAmount < MIN_WITHDRAWAL) {
      throw new Error(`Minimum withdrawal is $${MIN_WITHDRAWAL}`);
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get user profile
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

    // Create withdrawal record
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
      // Refund balance on error
      await adminClient.from("profiles").update({ balance: profile.balance }).eq("user_id", user.id);
      throw wdError;
    }

    // Convert USD amount to USDT (1:1 peg, 6 decimals)
    const usdtAmount = Math.floor(withdrawAmount * 1e6);

    // Get master wallet address from private key
    const masterAddressRes = await fetch(`${TRONGRID_BASE}/wallet/getaccount`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "TRON-PRO-API-KEY": TRONGRID_API_KEY },
      body: JSON.stringify({ address: await getAddressFromPrivateKey(MASTER_PRIVATE_KEY), visible: true }),
    });

    // Build TRC20 transfer transaction
    const parameter = [
      { type: "address", value: destAddress },
      { type: "uint256", value: usdtAmount },
    ];

    const triggerRes = await fetch(`${TRONGRID_BASE}/wallet/triggersmartcontract`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "TRON-PRO-API-KEY": TRONGRID_API_KEY },
      body: JSON.stringify({
        owner_address: await getAddressFromPrivateKey(MASTER_PRIVATE_KEY),
        contract_address: USDT_CONTRACT,
        function_selector: "transfer(address,uint256)",
        parameter: encodeParameters(parameter),
        fee_limit: 100000000, // 100 TRX max fee
        call_value: 0,
        visible: true,
      }),
    });

    const triggerData = await triggerRes.json();

    if (!triggerData.result?.result) {
      const errMsg = triggerData.result?.message
        ? hexToString(triggerData.result.message)
        : "Contract call failed";
      await adminClient.from("withdrawals").update({ status: "failed", error_message: errMsg }).eq("id", withdrawal.id);
      await adminClient.from("profiles").update({ balance: profile.balance }).eq("user_id", user.id);
      throw new Error(errMsg);
    }

    // Sign transaction
    const signRes = await fetch(`${TRONGRID_BASE}/wallet/gettransactionsign`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "TRON-PRO-API-KEY": TRONGRID_API_KEY },
      body: JSON.stringify({
        transaction: triggerData.transaction,
        privateKey: MASTER_PRIVATE_KEY,
      }),
    });

    const signedTx = await signRes.json();

    // Broadcast transaction
    const broadcastRes = await fetch(`${TRONGRID_BASE}/wallet/broadcasttransaction`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "TRON-PRO-API-KEY": TRONGRID_API_KEY },
      body: JSON.stringify(signedTx),
    });

    const broadcastData = await broadcastRes.json();

    if (broadcastData.result) {
      await adminClient.from("withdrawals").update({
        status: "completed",
        tx_hash: broadcastData.txid || signedTx.txID,
      }).eq("id", withdrawal.id);

      // Record transaction
      await adminClient.from("transactions").insert({
        user_id: user.id,
        amount: -withdrawAmount,
        type: "withdrawal",
        description: `USDT withdrawal to ${destAddress} (tx: ${broadcastData.txid || signedTx.txID})`,
      });

      return new Response(JSON.stringify({
        success: true,
        txHash: broadcastData.txid || signedTx.txID,
        amount: withdrawAmount,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    } else {
      const errMsg = broadcastData.message || "Broadcast failed";
      await adminClient.from("withdrawals").update({ status: "failed", error_message: errMsg }).eq("id", withdrawal.id);
      await adminClient.from("profiles").update({ balance: profile.balance }).eq("user_id", user.id);
      throw new Error(errMsg);
    }
  } catch (err) {
    console.error("process-withdrawal error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// Helper: get base58 address from private key via TronGrid
async function getAddressFromPrivateKey(privateKey: string): Promise<string> {
  // Derive address using the TronGrid API
  const res = await fetch(`${TRONGRID_BASE}/wallet/generateaddress`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "TRON-PRO-API-KEY": TRONGRID_API_KEY },
  });
  // For the master wallet, we use a known address approach
  // The private key holder should know their address
  // We'll use getaddressfromprivatekey endpoint
  const pkRes = await fetch(`${TRONGRID_BASE}/wallet/getaddressfromprivatekey`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "TRON-PRO-API-KEY": TRONGRID_API_KEY },
    body: JSON.stringify({ value: privateKey }),
  });
  if (!pkRes.ok) throw new Error("Failed to derive address from private key");
  const data = await pkRes.json();
  return data.base58 || data.address;
}

// Helper: encode TRC20 transfer parameters
function encodeParameters(params: { type: string; value: string | number }[]): string {
  let encoded = "";
  for (const param of params) {
    if (param.type === "address") {
      // Remove T prefix and pad to 64 chars (hex address without 41 prefix, padded)
      const addr = String(param.value);
      // We pass the address as-is; TronGrid handles visible addresses
      encoded += addr.replace(/^0x/, "").padStart(64, "0");
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
  } catch {
    return hex;
  }
}
