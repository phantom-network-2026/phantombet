import { createClient } from "https://esm.sh/@supabase/supabase-js@2.102.0";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

// Public-safe setting keys that can be read without admin access
const PUBLIC_KEYS = [
  "announcement",
  "maintenance_mode",
  "promotions_config",
  "wallet_mode",
  "fake_wins_config",
  "welcome_config",
  "ghost_users",
  "panel_visibility",
  "home_carousels",
  "bonus_probability",
  "sports_promo_banners",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { keys } = await req.json().catch(() => ({ keys: undefined }));
    const requestedKeys = Array.isArray(keys) ? keys.filter((k: string) => PUBLIC_KEYS.includes(k)) : PUBLIC_KEYS;

    if (requestedKeys.length === 0) {
      return new Response(JSON.stringify({ settings: {} }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data, error } = await adminClient
      .from("site_settings")
      .select("key, value")
      .in("key", requestedKeys);

    if (error) throw error;

    const settings: Record<string, any> = {};
    for (const row of data || []) {
      settings[row.key] = row.value;
    }

    return new Response(JSON.stringify({ settings }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Failed to fetch settings" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
