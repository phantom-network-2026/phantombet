import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify the calling user via getClaims
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authenticatedUserId = claimsData.claims.sub;

    const { userId, amount, gameType, outcome } = await req.json();

    // Validate: user can only settle their own games
    if (userId !== authenticatedUserId) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate amount bounds
    if (typeof amount !== "number" || Math.abs(amount) > 20000) {
      return new Response(JSON.stringify({ error: "Invalid amount" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // Check force_loss setting — if enabled and this is a win, convert to loss
    if (amount > 0) {
      const { data: forceLossSetting } = await admin
        .from("site_settings")
        .select("value")
        .eq("key", "force_loss")
        .maybeSingle();
      const forceActive = forceLossSetting?.value?.enabled === true;
      if (forceActive) {
        // Player tried to win — convert to a loss of their original bet instead
        return new Response(JSON.stringify({ success: true, balance: null, forced_loss: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Get current balance
    const { data: profile } = await admin
      .from("profiles")
      .select("balance")
      .eq("user_id", userId)
      .single();

    if (!profile) {
      return new Response(JSON.stringify({ error: "Profile not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const newBalance = Number(profile.balance) + amount;
    if (newBalance < 0) {
      return new Response(JSON.stringify({ error: "Insufficient balance" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update balance
    const updateData: Record<string, any> = { balance: newBalance };

    // Track biggest win automatically
    if (amount > 0) {
      const { data: currentProfile } = await admin
        .from("profiles")
        .select("biggest_win")
        .eq("user_id", userId)
        .single();
      const currentBiggest = Number(currentProfile?.biggest_win) || 0;
      if (amount > currentBiggest) {
        updateData.biggest_win = amount;
        updateData.biggest_win_game = gameType || "Unknown";
      }
    }

    await admin
      .from("profiles")
      .update(updateData)
      .eq("user_id", userId);

    // Record transaction
    await admin.from("transactions").insert({
      user_id: userId,
      amount,
      type: amount >= 0 ? "game_win" : "game_loss",
      description: `${gameType} - ${outcome}`,
    });

    return new Response(JSON.stringify({ success: true, balance: newBalance }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
