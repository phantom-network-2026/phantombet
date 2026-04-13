import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Verify caller is owner
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user } } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
    const isOwner = roles?.some(r => r.role === "owner");
    if (!isOwner) return new Response(JSON.stringify({ error: "Owner access required" }), { status: 403, headers: corsHeaders });

    const { type } = await req.json();
    if (type !== "mock" && type !== "real") {
      return new Response(JSON.stringify({ error: "Invalid type" }), { status: 400, headers: corsHeaders });
    }

    const field = type === "mock" ? "balance" : "real_balance";
    
    // Reset all users' balance to 0
    const { error } = await supabase.from("profiles").update({ [field]: 0 }).gte(field, 0);
    // Also reset negatives
    const { error: err2 } = await supabase.from("profiles").update({ [field]: 0 }).lt(field, 0);

    if (error || err2) {
      return new Response(JSON.stringify({ error: "Failed to reset balances" }), { status: 500, headers: corsHeaders });
    }

    return new Response(JSON.stringify({ success: true, type }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
  }
});
