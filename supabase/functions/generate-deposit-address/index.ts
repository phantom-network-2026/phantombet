import { createClient } from "https://esm.sh/@supabase/supabase-js@2.102.0";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.102.0/cors";

const ENCRYPTION_KEY = Deno.env.get("TRON_ENCRYPTION_KEY")!;

function encrypt(text: string, key: string): string {
  const textBytes = new TextEncoder().encode(text);
  const keyBytes = new TextEncoder().encode(key);
  const encrypted = new Uint8Array(textBytes.length);
  for (let i = 0; i < textBytes.length; i++) {
    encrypted[i] = textBytes[i] ^ keyBytes[i % keyBytes.length];
  }
  return btoa(String.fromCharCode(...encrypted));
}

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

    const { data: existing } = await adminClient
      .from("deposit_addresses")
      .select("tron_address")
      .eq("user_id", user.id)
      .single();

    if (existing) {
      return new Response(JSON.stringify({ address: existing.tron_address }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate address via Shasta testnet API (keys are network-agnostic, work on mainnet)
    const generateRes = await fetch("https://api.shasta.trongrid.io/wallet/generateaddress", {
      method: "GET",
      headers: { "Accept": "application/json" },
    });

    if (!generateRes.ok) {
      const body = await generateRes.text();
      throw new Error(`TronGrid error: ${generateRes.status} - ${body}`);
    }

    const account = await generateRes.json();
    const address = account.base58;
    const privateKey = account.privateKey;

    if (!address || !privateKey) throw new Error("Failed to generate address");

    const encryptedKey = encrypt(privateKey, ENCRYPTION_KEY);

    const { error: insertError } = await adminClient
      .from("deposit_addresses")
      .insert({
        user_id: user.id,
        tron_address: address,
        private_key_encrypted: encryptedKey,
      });

    if (insertError) throw insertError;

    return new Response(JSON.stringify({ address }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("generate-deposit-address error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
