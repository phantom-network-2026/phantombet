import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { AccessToken } from "https://esm.sh/livekit-server-sdk@2.7.2?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claimData, error: claimErr } = await supabase.auth.getClaims(token);
    if (claimErr || !claimData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimData.claims.sub;

    const { lobbyId } = await req.json();
    if (!lobbyId || typeof lobbyId !== "string") {
      return new Response(JSON.stringify({ error: "lobbyId required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify membership
    const { data: member } = await supabase
      .from("party_lobby_members")
      .select("is_muted, lobby_id")
      .eq("lobby_id", lobbyId)
      .eq("user_id", userId)
      .maybeSingle();

    if (!member) {
      return new Response(JSON.stringify({ error: "Not a member of this lobby" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("username")
      .eq("user_id", userId)
      .maybeSingle();

    const apiKey = Deno.env.get("LIVEKIT_API_KEY")!;
    const apiSecret = Deno.env.get("LIVEKIT_API_SECRET")!;
    const url = Deno.env.get("LIVEKIT_URL")!;

    const at = new AccessToken(apiKey, apiSecret, {
      identity: userId,
      name: profile?.username || "User",
      ttl: 60 * 60,
    });
    at.addGrant({
      room: `party-${lobbyId}`,
      roomJoin: true,
      canPublish: !member.is_muted,
      canSubscribe: true,
      canPublishData: true,
    });

    const jwt = await at.toJwt();
    return new Response(JSON.stringify({ token: jwt, url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});