import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Find deals delivered, not disputed, past auto-release time
  const { data: deals, error } = await admin
    .from("escrow_deals")
    .select("id, receiver_id, payout_amount, title, sender_id, sender_username, receiver_username")
    .eq("status", "delivered")
    .lt("auto_release_at", new Date().toISOString())
    .limit(100);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  let processed = 0;
  for (const d of deals || []) {
    // Credit receiver
    const { data: rProf } = await admin.from("profiles").select("real_balance").eq("user_id", d.receiver_id).maybeSingle();
    const newBal = Number(rProf?.real_balance || 0) + Number(d.payout_amount);
    await admin.from("profiles").update({ real_balance: newBal }).eq("user_id", d.receiver_id);
    await admin.from("escrow_deals").update({
      status: "released",
      resolved_at: new Date().toISOString(),
    }).eq("id", d.id);
    await admin.from("escrow_events").insert({
      deal_id: d.id, actor_id: null, event_type: "auto_released",
      detail: `Auto-released ${d.payout_amount} USDT after 7-day window`,
    });
    await admin.from("activity_feed").insert({
      user_id: d.receiver_id, username: "escrow", activity_type: "escrow",
      title: "Escrow auto-released", detail: `Deal "${d.title}" auto-released ${d.payout_amount} USDT to you.`,
    }).then(() => {}, () => {});
    processed += 1;
  }

  return new Response(JSON.stringify({ processed }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});