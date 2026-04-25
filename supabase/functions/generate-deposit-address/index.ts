import { createClient } from "https://esm.sh/@supabase/supabase-js@2.102.0";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.102.0/cors";
import * as secp256k1 from "https://esm.sh/@noble/secp256k1@2.1.0";
import { keccak_256 } from "https://esm.sh/@noble/hashes@1.4.0/sha3";
import { sha256 } from "https://esm.sh/@noble/hashes@1.4.0/sha256";

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

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

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

function generateTronAddress(): { privateKey: string; address: string } {
  // Generate random 32-byte private key
  const privKeyBytes = secp256k1.utils.randomPrivateKey();
  const privateKey = bytesToHex(privKeyBytes);

  // Get uncompressed public key (65 bytes, starts with 0x04)
  const pubKey = secp256k1.getPublicKey(privKeyBytes, false);
  
  // Keccak-256 of public key bytes (skip first byte 0x04)
  const hash = keccak_256(pubKey.slice(1));
  
  // Take last 20 bytes, prepend 0x41 (TRON mainnet prefix)
  const addressBytes = new Uint8Array(21);
  addressBytes[0] = 0x41;
  addressBytes.set(hash.slice(12), 1);
  
  // Base58Check encode: double SHA-256, take first 4 bytes as checksum
  const firstHash = sha256(addressBytes);
  const secondHash = sha256(firstHash);
  const checksum = secondHash.slice(0, 4);
  
  const addressWithChecksum = new Uint8Array(25);
  addressWithChecksum.set(addressBytes);
  addressWithChecksum.set(checksum, 21);
  
  const address = base58Encode(addressWithChecksum);
  
  return { privateKey, address };
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

    // Generate TRON address offline
    const { privateKey, address } = generateTronAddress();

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
  } catch (err: unknown) {
    console.error("generate-deposit-address error:", err);
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
