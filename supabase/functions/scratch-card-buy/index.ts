import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2/cors";

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

    // Verify user
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const betTier = Number(body.betTier);
    const validTiers = [1, 2, 3, 4, 5];
    if (!validTiers.includes(betTier) || betTier > 5) {
      return new Response(JSON.stringify({ error: "Invalid bet tier" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // Get user balance
    const { data: profile } = await admin
      .from("profiles")
      .select("balance")
      .eq("user_id", user.id)
      .single();

    if (!profile || Number(profile.balance) < betTier) {
      return new Response(JSON.stringify({ error: "Insufficient balance" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Claim a random unclaimed card from the pool for this tier
    // Use a raw SQL approach to atomically grab one card
    const { data: cards, error: claimErr } = await admin
      .from("scratch_card_pool")
      .select("id, is_winner, payout_multiplier, symbols")
      .eq("bet_tier", betTier)
      .is("claimed_by", null)
      .limit(1);

    if (claimErr || !cards || cards.length === 0) {
      return new Response(JSON.stringify({ error: "No cards available for this tier. Sold out!" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const card = cards[0];

    // Claim the card
    const { error: updateErr } = await admin
      .from("scratch_card_pool")
      .update({ claimed_by: user.id, claimed_at: new Date().toISOString() })
      .eq("id", card.id)
      .is("claimed_by", null); // Ensure not double-claimed

    if (updateErr) {
      return new Response(JSON.stringify({ error: "Failed to claim card, try again" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Deduct bet from balance
    const newBalance = Number(profile.balance) - betTier;
    await admin.from("profiles").update({ balance: newBalance }).eq("user_id", user.id);

    // Record bet transaction
    await admin.from("transactions").insert({
      user_id: user.id,
      amount: -betTier,
      type: "game_loss",
      description: `scratch_card - bet $${betTier}`,
    });

    // If winner, pay out
    let winAmount = 0;
    if (card.is_winner) {
      winAmount = betTier * Number(card.payout_multiplier);
      const balAfterWin = newBalance + winAmount;
      await admin.from("profiles").update({ balance: balAfterWin }).eq("user_id", user.id);
      await admin.from("transactions").insert({
        user_id: user.id,
        amount: winAmount,
        type: "game_win",
        description: `scratch_card - won $${winAmount}`,
      });
    }

    // Count remaining cards for this tier
    const { count } = await admin
      .from("scratch_card_pool")
      .select("id", { count: "exact", head: true })
      .eq("bet_tier", betTier)
      .is("claimed_by", null);

    return new Response(JSON.stringify({
      success: true,
      card: {
        id: card.id,
        is_winner: card.is_winner,
        symbols: card.symbols,
        payout_multiplier: card.payout_multiplier,
        win_amount: winAmount,
      },
      remaining: count ?? 0,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
