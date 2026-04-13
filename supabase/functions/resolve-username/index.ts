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
    const { username, seed_phrase, action } = body;

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Action: recover by seed phrase
    if (action === "recover_by_seed") {
      if (!seed_phrase || !username) {
        return new Response(JSON.stringify({ error: "Username and seed phrase required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: profile, error: profileError } = await supabaseAdmin
        .from("profiles")
        .select("user_id, seed_phrase")
        .eq("username", username)
        .single();

      if (profileError || !profile) {
        return new Response(JSON.stringify({ error: "Username not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Hash the provided seed phrase and compare with stored hash
      const hashedInput = await hashSeedPhrase(seed_phrase);

      if (!profile.seed_phrase || profile.seed_phrase !== hashedInput) {
        return new Response(JSON.stringify({ error: "Invalid recovery key" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ verified: true, user_id: profile.user_id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Action: reset password after seed verification
    if (action === "reset_password") {
      const { user_id, new_password } = body;
      if (!user_id || !new_password) {
        return new Response(JSON.stringify({ error: "user_id and new_password required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error } = await supabaseAdmin.auth.admin.updateUserById(user_id, { password: new_password });
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

    // Default: resolve username to email
    if (!username) {
      return new Response(JSON.stringify({ error: "Username required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

    const { data: { user }, error: userError } = await supabaseAdmin.auth.admin.getUserById(profile.user_id);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "User not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ email: user.email }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
