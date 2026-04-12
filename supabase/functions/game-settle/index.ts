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

    if (userId !== authenticatedUserId) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (typeof amount !== "number" || Math.abs(amount) > 20000) {
      return new Response(JSON.stringify({ error: "Invalid amount" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // Check force_loss setting
    if (amount > 0) {
      const { data: forceLossSetting } = await admin
        .from("site_settings")
        .select("value")
        .eq("key", "force_loss")
        .maybeSingle();
      const forceActive = forceLossSetting?.value?.enabled === true;
      if (forceActive) {
        return new Response(JSON.stringify({ success: true, balance: null, forced_loss: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Check game win probability setting
    if (amount > 0) {
      const { data: probSetting } = await admin
        .from("site_settings")
        .select("value")
        .eq("key", "game_win_probability")
        .maybeSingle();

      if (probSetting?.value) {
        const cfg = probSetting.value as any;
        let winProbability: number | null = null;

        // Check per-game override first
        const perGame = (cfg.perGame || []) as any[];
        const gameOverride = perGame.find(
          (g: any) => g.enabled && g.gameName?.toLowerCase() === (gameType || "").toLowerCase()
        );
        if (gameOverride) {
          winProbability = gameOverride.probability;
        } else if (cfg.globalEnabled) {
          winProbability = cfg.globalProbability;
        }

        // Apply probability: roll a random number 0-100, if above threshold, convert win to loss
        if (winProbability !== null && winProbability < 100) {
          const roll = Math.random() * 100;
          if (roll >= winProbability) {
            // Block this win - return as if nothing happened (no payout)
            return new Response(JSON.stringify({ success: true, balance: null, forced_loss: true }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        }
      }
    }

    // Apply house edge on wins
    let adjustedAmount = amount;
    if (amount > 0) {
      const { data: edgeSetting } = await admin
        .from("site_settings")
        .select("value")
        .eq("key", "house_edge_config")
        .maybeSingle();

      if (edgeSetting?.value) {
        const cfg = edgeSetting.value as any;
        if (cfg.globalEnabled) {
          let edgePercent = cfg.globalEdge ?? 0;

          // Check for per-game override
          const perGame = (cfg.perGame || []) as any[];
          const gameOverride = perGame.find(
            (g: any) => g.enabled && g.name?.toLowerCase() === (gameType || "").toLowerCase()
          );
          if (gameOverride) {
            edgePercent = gameOverride.edge;
          }

          // Apply edge: positive edge = house takes %, negative = player gets bonus
          if (edgePercent !== 0) {
            const multiplier = 1 - edgePercent / 100;
            adjustedAmount = Math.max(0.01, Math.round(amount * multiplier * 100) / 100);
          }
        }
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

    const newBalance = Number(profile.balance) + adjustedAmount;
    if (newBalance < 0) {
      return new Response(JSON.stringify({ error: "Insufficient balance" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const updateData: Record<string, any> = { balance: newBalance };

    // Track biggest win
    if (adjustedAmount > 0) {
      const { data: currentProfile } = await admin
        .from("profiles")
        .select("biggest_win")
        .eq("user_id", userId)
        .single();
      const currentBiggest = Number(currentProfile?.biggest_win) || 0;
      if (adjustedAmount > currentBiggest) {
        updateData.biggest_win = adjustedAmount;
        updateData.biggest_win_game = gameType || "Unknown";
      }
    }

    await admin
      .from("profiles")
      .update(updateData)
      .eq("user_id", userId);

    // Grant XP: 10 XP per dollar on wins
    if (adjustedAmount > 0) {
      await admin.rpc("grant_xp", { p_user_id: userId, p_amount: Math.round(adjustedAmount * 10) });
    }

    // Record transaction with adjusted amount
    await admin.from("transactions").insert({
      user_id: userId,
      amount: adjustedAmount,
      type: adjustedAmount >= 0 ? "game_win" : "game_loss",
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
