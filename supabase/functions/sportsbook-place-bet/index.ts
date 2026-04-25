import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type BetType = "win" | "place" | "each_way" | "forecast" | "tricast";

function selectionsRequiredFor(t: BetType): number {
  return t === "forecast" ? 2 : t === "tricast" ? 3 : 1;
}

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
    const body = await req.json();
    const { race_id, bet_type, selections, stake } = body as { race_id: string; bet_type: BetType; selections: number[]; stake: number };

    if (!race_id || !bet_type || !Array.isArray(selections) || !stake) {
      return new Response(JSON.stringify({ error: "Missing fields" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (stake < 0.1 || stake > 5) {
      return new Response(JSON.stringify({ error: "Stake must be between £0.10 and £5.00" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (selections.length !== selectionsRequiredFor(bet_type)) {
      return new Response(JSON.stringify({ error: "Wrong number of selections" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (new Set(selections).size !== selections.length) {
      return new Response(JSON.stringify({ error: "Duplicate selections" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: race } = await admin.from("races").select("id, status, off_time").eq("id", race_id).maybeSingle();
    if (!race) return new Response(JSON.stringify({ error: "Race not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (race.status !== "upcoming") {
      return new Response(JSON.stringify({ error: "Betting closed for this race" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: runners } = await admin.from("race_runners").select("number, win_odds, place_odds").eq("race_id", race_id);
    if (!runners?.length) return new Response(JSON.stringify({ error: "No runners" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const byNum = new Map(runners.map((r: any) => [r.number, r]));
    for (const s of selections) {
      if (!byNum.has(s)) return new Response(JSON.stringify({ error: `Invalid runner #${s}` }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let oddsTaken = 1;
    if (bet_type === "win" || bet_type === "each_way") oddsTaken = (byNum.get(selections[0]) as any).win_odds;
    else if (bet_type === "place") oddsTaken = (byNum.get(selections[0]) as any).place_odds;
    else if (bet_type === "forecast") oddsTaken = +((byNum.get(selections[0]) as any).win_odds * (byNum.get(selections[1]) as any).win_odds * 0.4).toFixed(2);
    else if (bet_type === "tricast") oddsTaken = +((byNum.get(selections[0]) as any).win_odds * (byNum.get(selections[1]) as any).win_odds * (byNum.get(selections[2]) as any).win_odds * 0.15).toFixed(2);
    const potential = +(stake * oddsTaken).toFixed(2);

    // Debit balance
    const { data: profile } = await admin.from("profiles").select("balance").eq("user_id", user.id).single();
    if (!profile || Number(profile.balance) < stake) {
      return new Response(JSON.stringify({ error: "Insufficient balance" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    await admin.from("profiles").update({ balance: Number(profile.balance) - stake }).eq("user_id", user.id);
    await admin.from("transactions").insert({
      user_id: user.id, type: "sportsbook_bet", amount: -stake,
      description: `${bet_type.toUpperCase()} bet placed`,
    });

    const { data: bet, error: betErr } = await admin.from("sports_bets").insert({
      user_id: user.id, race_id, bet_type, selections, stake, odds_taken: oddsTaken, potential_payout: potential,
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