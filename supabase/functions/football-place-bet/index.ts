import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Market = "home" | "draw" | "away";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { match_id, selection, stake } = await req.json() as { match_id: string; selection: Market; stake: number };

    if (!match_id || !["home", "draw", "away"].includes(selection) || !stake) {
      return new Response(JSON.stringify({ error: "Missing or invalid fields" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (stake < 0.1 || stake > 5) {
      return new Response(JSON.stringify({ error: "Stake must be between £0.10 and £5.00" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: match } = await admin.from("football_matches").select("*").eq("id", match_id).maybeSingle();
    if (!match) return new Response(JSON.stringify({ error: "Match not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (match.status !== "upcoming") {
      return new Response(JSON.stringify({ error: "Betting closed for this match" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const oddsTaken = selection === "home" ? Number(match.home_odds) : selection === "draw" ? Number(match.draw_odds) : Number(match.away_odds);
    const potential = +(stake * oddsTaken).toFixed(2);

    const { data: profile } = await admin.from("profiles").select("balance").eq("user_id", user.id).single();
    if (!profile || Number(profile.balance) < stake) {
      return new Response(JSON.stringify({ error: "Insufficient balance" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    await admin.from("profiles").update({ balance: Number(profile.balance) - stake }).eq("user_id", user.id);
    await admin.from("transactions").insert({
      user_id: user.id, type: "sportsbook_bet", amount: -stake,
      description: `Football ${selection.toUpperCase()} bet placed`,
    });

    const { data: bet, error: betErr } = await admin.from("football_bets").insert({
      user_id: user.id, match_id, selection, stake, odds_taken: oddsTaken, potential_payout: potential,
    }).select().single();
    if (betErr) {
      await admin.from("profiles").update({ balance: Number(profile.balance) }).eq("user_id", user.id);
      return new Response(JSON.stringify({ error: betErr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Free bet welcome promo progress (best-effort)
    try {
      await admin.rpc("bump_free_bet_progress", { p_user_id: user.id, p_deposit_amount: 0, p_wager_amount: stake });
    } catch (_) { /* non-fatal */ }

    return new Response(JSON.stringify({ ok: true, bet }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});