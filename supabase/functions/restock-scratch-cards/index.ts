import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify owner role
    const admin = createClient(supabaseUrl, serviceKey);
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", user.id);
    const isOwner = roles?.some((r: any) => r.role === "owner");
    if (!isOwner) {
      return new Response(JSON.stringify({ error: "Owner access required" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Delete all existing cards (claimed and unclaimed)
    const { error: deleteError } = await admin.from("scratch_card_pool").delete().gte("bet_tier", 0);
    if (deleteError) throw deleteError;

    // Regenerate pool - 2000 cards per tier
    const tiers = [1, 5, 10, 25, 50, 100, 500];
    const CARDS_PER_TIER = 2000;
    const WIN_RATE = 0.25; // 1 in 4

    const symbolSets = [
      "💎", "🍒", "🔔", "⭐", "🍋", "🍊", "🍇", "🍀", "💰", "🎰",
    ];

    let totalInserted = 0;

    for (const tier of tiers) {
      const cards: any[] = [];
      for (let i = 0; i < CARDS_PER_TIER; i++) {
        const isWinner = i < Math.floor(CARDS_PER_TIER * WIN_RATE);
        const multiplier = isWinner
          ? [1.5, 2, 2.5, 3, 5][Math.floor(Math.random() * 5)]
          : 0;

        // Generate 6 random symbols
        const symbols: string[] = [];
        if (isWinner) {
          // Winner: 3 matching symbols + 3 random
          const winSymbol = symbolSets[Math.floor(Math.random() * symbolSets.length)];
          symbols.push(winSymbol, winSymbol, winSymbol);
          for (let s = 0; s < 3; s++) {
            symbols.push(symbolSets[Math.floor(Math.random() * symbolSets.length)]);
          }
        } else {
          // Loser: ensure no 3 matching
          for (let s = 0; s < 6; s++) {
            symbols.push(symbolSets[Math.floor(Math.random() * symbolSets.length)]);
          }
        }
        // Shuffle
        symbols.sort(() => Math.random() - 0.5);

        cards.push({
          bet_tier: tier,
          is_winner: isWinner,
          payout_multiplier: multiplier,
          symbols,
        });
      }
      // Shuffle the cards so winners aren't at the top
      cards.sort(() => Math.random() - 0.5);

      // Insert in batches of 500
      for (let b = 0; b < cards.length; b += 500) {
        const batch = cards.slice(b, b + 500);
        const { error: insertError } = await admin.from("scratch_card_pool").insert(batch);
        if (insertError) throw insertError;
        totalInserted += batch.length;
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      total_cards: totalInserted,
      tiers: tiers.length,
      cards_per_tier: CARDS_PER_TIER,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || "Failed to restock" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
