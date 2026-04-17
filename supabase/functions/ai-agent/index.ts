import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are PhantomBet's in-app AI Agent inside cPanel. The admin gives you a natural-language prompt and you decide which tool to use.

You have THREE capability areas, exposed as tools:

1. update_site_setting — change anything stored in the site_settings JSON table (wallet_mode, maintenance_mode, welcome_config, fake_wins_config, promotions_config, ghost_users, panel_visibility, announcement, house_edge, game_probability, etc.). Always pass the full JSON value the admin wants stored.
2. manage_storage_file — list, delete, or rename files in the public 'game-files' storage bucket. Use this to clean up broken games or reorganize uploads.
3. suggest_code_change — when the admin asks for an actual source-code edit (.tsx/.ts/.css), return a clear, copy-paste-ready code snippet plus the target file path. You CANNOT edit source files at runtime — only suggest. Tell the admin to paste it in the Lovable chat.

Rules:
- Pick exactly ONE tool per response unless the admin clearly chains tasks.
- Be concise. Confirm what you did or explain why you can't.
- Never touch user balances, real_balance, withdrawals, or auth tables. Refuse those requests politely.
- If unsure, ask a clarifying question instead of guessing.`;

const TOOLS = [
  {
    type: "function",
    function: {
      name: "update_site_setting",
      description: "Update or insert a key in the site_settings table. Value must be valid JSON.",
      parameters: {
        type: "object",
        properties: {
          key: { type: "string", description: "The site_settings.key to upsert" },
          value: { description: "The JSON value to store" },
          summary: { type: "string", description: "Short human summary of the change" },
        },
        required: ["key", "value", "summary"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "manage_storage_file",
      description: "List, delete, or rename files in the 'game-files' storage bucket.",
      parameters: {
        type: "object",
        properties: {
          action: { type: "string", enum: ["list", "delete", "rename"] },
          path: { type: "string", description: "Folder path for list, file path for delete/rename" },
          new_path: { type: "string", description: "New path (rename only)" },
        },
        required: ["action"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "suggest_code_change",
      description: "Return a code snippet for the admin to paste into the Lovable editor.",
      parameters: {
        type: "object",
        properties: {
          file_path: { type: "string" },
          explanation: { type: "string" },
          code: { type: "string" },
        },
        required: ["file_path", "explanation", "code"],
      },
    },
  },
];

const FORBIDDEN_KEYS = new Set(["balance", "real_balance", "user_roles"]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Unauthorized" }, 401);
    }

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: userData } = await userClient.auth.getUser();
    const user = userData?.user;
    if (!user) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify admin/owner role
    const { data: roleRows } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);
    const roles = (roleRows || []).map((r) => r.role);
    if (!roles.includes("admin") && !roles.includes("owner")) {
      return json({ error: "Admin access required" }, 403);
    }

    const { prompt, history } = await req.json();
    if (!prompt || typeof prompt !== "string") return json({ error: "prompt required" }, 400);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return json({ error: "AI not configured" }, 500);

    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...(Array.isArray(history) ? history : []),
      { role: "user", content: prompt },
    ];

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
        tools: TOOLS,
        tool_choice: "auto",
      }),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) return json({ error: "Rate limited. Try again shortly." }, 429);
      if (aiResp.status === 402) return json({ error: "AI credits exhausted." }, 402);
      const t = await aiResp.text();
      console.error("AI error", aiResp.status, t);
      return json({ error: "AI gateway error" }, 500);
    }

    const aiJson = await aiResp.json();
    const choice = aiJson.choices?.[0]?.message;
    const toolCalls = choice?.tool_calls || [];

    const results: any[] = [];

    for (const tc of toolCalls) {
      const name = tc.function?.name;
      let args: any = {};
      try { args = JSON.parse(tc.function?.arguments || "{}"); } catch {}

      if (name === "update_site_setting") {
        if (FORBIDDEN_KEYS.has(args.key)) {
          results.push({ tool: name, ok: false, message: `Refused: ${args.key} is protected.` });
          continue;
        }
        const { error } = await admin
          .from("site_settings")
          .upsert({ key: args.key, value: args.value }, { onConflict: "key" });
        if (error) {
          results.push({ tool: name, ok: false, message: error.message });
        } else {
          results.push({ tool: name, ok: true, message: args.summary || `Updated ${args.key}`, key: args.key, value: args.value });
        }
      } else if (name === "manage_storage_file") {
        const bucket = "game-files";
        if (args.action === "list") {
          const { data, error } = await admin.storage.from(bucket).list(args.path || "", { limit: 200 });
          if (error) results.push({ tool: name, ok: false, message: error.message });
          else results.push({ tool: name, ok: true, action: "list", path: args.path || "", files: data });
        } else if (args.action === "delete") {
          if (!args.path) { results.push({ tool: name, ok: false, message: "path required" }); continue; }
          const { error } = await admin.storage.from(bucket).remove([args.path]);
          if (error) results.push({ tool: name, ok: false, message: error.message });
          else results.push({ tool: name, ok: true, action: "delete", path: args.path });
        } else if (args.action === "rename") {
          if (!args.path || !args.new_path) { results.push({ tool: name, ok: false, message: "path & new_path required" }); continue; }
          const { error } = await admin.storage.from(bucket).move(args.path, args.new_path);
          if (error) results.push({ tool: name, ok: false, message: error.message });
          else results.push({ tool: name, ok: true, action: "rename", from: args.path, to: args.new_path });
        }
      } else if (name === "suggest_code_change") {
        results.push({
          tool: name,
          ok: true,
          file_path: args.file_path,
          explanation: args.explanation,
          code: args.code,
        });
      }
    }

    return json({
      reply: choice?.content || (results.length ? "Done." : "No action taken."),
      tool_results: results,
    });
  } catch (e) {
    console.error("ai-agent error", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
