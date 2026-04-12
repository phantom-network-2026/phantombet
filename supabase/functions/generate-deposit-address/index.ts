import { createClient } from "https://esm.sh/@supabase/supabase-js@2.102.0";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.102.0/cors";
import { encode as hexEncode } from "https://deno.land/std@0.224.0/encoding/hex.ts";
import { crypto } from "https://deno.land/std@0.224.0/crypto/mod.ts";

const ENCRYPTION_KEY = Deno.env.get("TRON_ENCRYPTION_KEY")!;

// Simple XOR-based encryption for private keys (stored encrypted at rest)
function encrypt(text: string, key: string): string {
  const textBytes = new TextEncoder().encode(text);
  const keyBytes = new TextEncoder().encode(key);
  const encrypted = new Uint8Array(textBytes.length);
  for (let i = 0; i < textBytes.length; i++) {
    encrypted[i] = textBytes[i] ^ keyBytes[i % keyBytes.length];
  }
  return btoa(String.fromCharCode(...encrypted));
}

// SHA-256 helper
async function sha256(data: Uint8Array): Promise<Uint8Array> {
  const hash = await crypto.subtle.digest("SHA-256", data);
  return new Uint8Array(hash);
}

// Base58 encoding (Bitcoin-style)
const BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
function base58Encode(buffer: Uint8Array): string {
  const digits = [0];
  for (const byte of buffer) {
    let carry = byte;
    for (let j = 0; j < digits.length; j++) {
      carry += digits[j] << 8;
      digits[j] = carry % 58;
      carry = (carry / 58) | 0;
    }
    while (carry > 0) {
      digits.push(carry % 58);
      carry = (carry / 58) | 0;
    }
  }
  let result = "";
  for (const byte of buffer) {
    if (byte !== 0) break;
    result += "1";
  }
  for (let i = digits.length - 1; i >= 0; i--) {
    result += BASE58_ALPHABET[digits[i]];
  }
  return result;
}

// Generate a TRON address from a random private key using secp256k1
async function generateTronAddress(): Promise<{ privateKey: string; address: string }> {
  // Generate a random 32-byte private key
  const privKeyBytes = new Uint8Array(32);
  crypto.getRandomValues(privKeyBytes);
  const privateKey = Array.from(privKeyBytes).map(b => b.toString(16).padStart(2, '0')).join('');

  // Use Web Crypto to import as ECDSA key and get public key
  const keyPair = await crypto.subtle.importKey(
    "pkcs8",
    buildPkcs8(privKeyBytes),
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign"]
  );
  
  // For TRON we actually need secp256k1 which Web Crypto doesn't support natively
  // Use a simpler approach: call the Shasta testnet API which does support generateaddress
  // then use the keys it returns (they work on mainnet too - keys are network-agnostic)
  const generateRes = await fetch("https://api.shasta.trongrid.io/wallet/generateaddress", {
    method: "GET",
    headers: { "Accept": "application/json" },
  });

  if (!generateRes.ok) {
    throw new Error(`TronGrid Shasta error: ${generateRes.status}`);
  }

  const account = await generateRes.json();
  return {
    privateKey: account.privateKey,
    address: account.base58,
  };
}

// Not actually used since we use Shasta API, but kept for reference
function buildPkcs8(_privKey: Uint8Array): ArrayBuffer {
  return new ArrayBuffer(0);
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

    // Check if user already has a deposit address
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

    // Generate new TRON address via Shasta API (keys are network-agnostic)
    const { privateKey, address } = await generateTronAddress();

    if (!address || !privateKey) throw new Error("Failed to generate address");

    // Store encrypted private key
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
