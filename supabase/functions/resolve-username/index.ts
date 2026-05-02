import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function hashSeedPhrase(seed: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(seed.trim().toLowerCase());
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { username, seed_phrase, action, password } = body;

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Action: server-side sign in by username + password.
    // This avoids exposing the user's email to unauthenticated callers,
    // which previously enabled username -> email enumeration.
    if (action === "signin") {
      if (!username || !password) {
        return new Response(JSON.stringify({ error: "Username and password required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("user_id")
        .eq("username", username)
        .maybeSingle();

      // Generic error to prevent username enumeration
      const genericError = () =>
        new Response(JSON.stringify({ error: "Invalid username or password" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

      if (!profile) return genericError();

      const { data: userInfo } = await supabaseAdmin.auth.admin.getUserById(profile.user_id);
      const email = userInfo?.user?.email;
      if (!email) return genericError();

      // Use a separate client (no service role) to perform an actual password sign-in
      const supabasePublic = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!
      );
      const { data: signInData, error: signInError } =
        await supabasePublic.auth.signInWithPassword({ email, password });

      if (signInError || !signInData?.session) return genericError();

      return new Response(
        JSON.stringify({ session: signInData.session }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Action: recover by seed phrase
    if (action === "recover_by_seed") {
      if (!seed_phrase || !username) {
        return new Response(JSON.stringify({ error: "Username and seed phrase required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Look up user_id from profiles
      const { data: profile, error: profileError } = await supabaseAdmin
        .from("profiles")
        .select("user_id")
        .eq("username", username)
        .single();

      if (profileError || !profile) {
        return new Response(JSON.stringify({ error: "Username not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Look up seed hash from dedicated table
      const { data: seedData, error: seedError } = await supabaseAdmin
        .from("user_seed_phrases")
        .select("seed_hash")
        .eq("user_id", profile.user_id)
        .single();

      const hashedInput = await hashSeedPhrase(seed_phrase);

      if (seedError || !seedData || seedData.seed_hash !== hashedInput) {
        return new Response(JSON.stringify({ error: "Invalid recovery key" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Issue short-lived single-use reset nonce (10 minutes)
      const nonceBytes = new Uint8Array(32);
      crypto.getRandomValues(nonceBytes);
      const nonce = Array.from(nonceBytes).map((b) => b.toString(16).padStart(2, "0")).join("");
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

      const { error: nonceErr } = await supabaseAdmin
        .from("password_reset_nonces")
        .insert({ nonce, user_id: profile.user_id, expires_at: expiresAt });

      if (nonceErr) {
        return new Response(JSON.stringify({ error: "Failed to issue reset token" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ verified: true, reset_token: nonce }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Action: reset password after seed verification
    if (action === "reset_password") {
      const { reset_token, new_password } = body;
      if (!reset_token || !new_password) {
        return new Response(JSON.stringify({ error: "reset_token and new_password required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Validate nonce: must exist, not used, not expired
      const { data: nonceRow, error: nonceLookupErr } = await supabaseAdmin
        .from("password_reset_nonces")
        .select("user_id, used, expires_at")
        .eq("nonce", reset_token)
        .maybeSingle();

      if (nonceLookupErr || !nonceRow || nonceRow.used || new Date(nonceRow.expires_at) < new Date()) {
        return new Response(JSON.stringify({ error: "Invalid or expired reset token" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Mark nonce as used immediately (single-use)
      await supabaseAdmin
        .from("password_reset_nonces")
        .update({ used: true })
        .eq("nonce", reset_token);

      const { error } = await supabaseAdmin.auth.admin.updateUserById(nonceRow.user_id, { password: new_password });
      if (error) {
        return new Response(JSON.stringify({ error: "Failed to update password" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // No matching action — never disclose user/email information from the default path.
    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("resolve-username error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
