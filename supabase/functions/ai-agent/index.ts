import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are PhantomBet's in-app AI Agent inside the cPanel. You help an authenticated admin/owner manage the live casino platform via tools.

You have these capability areas:

SETTINGS & CONTENT
- update_site_setting: change anything in the site_settings JSON table (wallet_mode, maintenance_mode, welcome_config, fake_wins_config, promotions_config, ghost_users, panel_visibility, announcement, house_edge, game_probability, force_loss_mode, etc.). Always pass the full JSON object the admin wants stored.
- read_site_setting: read a current site_settings value before changing it if uncertain.
- create_broadcast: post a new site-wide broadcast (info | update | warning | promo).
- deactivate_broadcast: turn off an active broadcast by id.

GAMES
- toggle_game: activate/deactivate or feature/unfeature a game by slug or name.

STORAGE
- manage_storage_file: list, delete, or rename files in the public 'game-files' bucket.

USERS (limited)
- find_user: look up a user by username (returns user_id, username, role, balance summary). Read-only.
- grant_role / revoke_role: adjust roles 'staff' or 'moderator' only. NEVER touch admin/owner.

CODE
- suggest_code_change: when the admin asks for an actual source-code edit (.tsx/.ts/.css), return a clear, copy-paste-ready snippet plus the target file path. You CANNOT edit source files at runtime — only suggest. Tell the admin to paste it in the Lovable chat.

Rules:
- You may chain multiple tools in one response when the request clearly requires it (e.g. read setting, then update it).
- Be concise. Confirm what you did or explain why you can't.
- NEVER touch user balances, real_balance, withdrawals, deposits, deposit_addresses, or auth tables. Refuse those requests politely.
- NEVER grant or revoke 'admin' or 'owner' roles. Refuse politely.
- If a request is destructive or ambiguous, ask one clarifying question instead of guessing.`;

const TOOLS = [
  {
    type: "function",
    function: {
      name: "update_site_setting",
      description: "Upsert a site_settings row. value must be valid JSON.",
      parameters: {
        type: "object",
        properties: {
          key: { type: "string" },
          value: {},
          summary: { type: "string" },
        },
        required: ["key", "value", "summary"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "read_site_setting",
      description: "Read the current value of a site_settings key.",
      parameters: {
        type: "object",
        properties: { key: { type: "string" } },
        required: ["key"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_broadcast",
      description: "Post a new site-wide broadcast announcement.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          content: { type: "string" },
          type: { type: "string", enum: ["info", "update", "warning", "promo"] },
        },
        required: ["title", "content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "deactivate_broadcast",
      description: "Set is_active=false on a broadcast by id, or all active if id omitted.",
      parameters: {
        type: "object",
        properties: { id: { type: "string" } },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "toggle_game",
      description: "Activate/deactivate or feature/unfeature a game by slug or name.",
      parameters: {
        type: "object",
        properties: {
          identifier: { type: "string", description: "slug or name" },
          is_active: { type: "boolean" },
          is_featured: { type: "boolean" },
        },
        required: ["identifier"],
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
          path: { type: "string" },
          new_path: { type: "string" },
        },
        required: ["action"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "find_user",
      description: "Look up a user profile by username (case-insensitive).",
      parameters: {
        type: "object",
        properties: { username: { type: "string" } },
        required: ["username"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "grant_role",
      description: "Grant 'staff' or 'moderator' role to a user. Cannot grant admin/owner.",
      parameters: {
        type: "object",
        properties: {
          username: { type: "string" },
          role: { type: "string", enum: ["staff", "moderator"] },
        },
        required: ["username", "role"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "revoke_role",
      description: "Revoke 'staff' or 'moderator' role from a user. Cannot revoke admin/owner.",
      parameters: {
        type: "object",
        properties: {
          username: { type: "string" },
          role: { type: "string", enum: ["staff", "moderator"] },
        },
        required: ["username", "role"],
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

const FORBIDDEN_KEYS = new Set(["balance", "real_balance"]);
const FORBIDDEN_ROLES = new Set(["admin", "owner"]);
const MAX_STEPS = 4;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

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

    const { data: roleRows } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);
    const roles = (roleRows || []).map((r) => r.role);
    if (!roles.includes("admin") && !roles.includes("owner")) {
      return json({ error: "Admin access required" }, 403);
    }

    const { prompt, history, model } = await req.json();
    if (!prompt || typeof prompt !== "string") return json({ error: "prompt required" }, 400);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return json({ error: "AI not configured" }, 500);

    const messages: any[] = [
      { role: "system", content: SYSTEM_PROMPT },
      ...(Array.isArray(history) ? history : []),
      { role: "user", content: prompt },
    ];

    const allResults: any[] = [];
    let finalReply = "";
    const chosenModel = typeof model === "string" && model ? model : "google/gemini-2.5-pro";

    for (let step = 0; step < MAX_STEPS; step++) {
      const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: chosenModel,
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

      if (!toolCalls.length) {
        finalReply = choice?.content || (allResults.length ? "Done." : "No action taken.");
        break;
      }

      // Append assistant message with tool_calls so the model can see context next round
      messages.push({
        role: "assistant",
        content: choice?.content || "",
        tool_calls: toolCalls,
      });

      for (const tc of toolCalls) {
        const name = tc.function?.name;
        let args: any = {};
        try { args = JSON.parse(tc.function?.arguments || "{}"); } catch {}
        const result = await runTool(name, args, admin);
        allResults.push({ tool: name, ...result });
        messages.push({
          role: "tool",
          tool_call_id: tc.id,
          content: JSON.stringify(result).slice(0, 4000),
        });
      }
    }

    if (!finalReply) finalReply = allResults.length ? "Done." : "No action taken.";

    // Audit log (best effort)
    admin.from("ai_agent_log").insert({
      user_id: user.id,
      prompt,
      reply: finalReply,
      tool_results: allResults,
    }).then(() => {}).catch(() => {});

    return json({ reply: finalReply, tool_results: allResults });
  } catch (e) {
    console.error("ai-agent error", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

async function runTool(name: string, args: any, admin: any): Promise<any> {
  try {
    if (name === "update_site_setting") {
      if (!args.key) return { ok: false, message: "key required" };
      if (FORBIDDEN_KEYS.has(args.key)) return { ok: false, message: `Refused: ${args.key} is protected.` };
      const { error } = await admin.from("site_settings").upsert({ key: args.key, value: args.value }, { onConflict: "key" });
      if (error) return { ok: false, message: error.message };
      return { ok: true, message: args.summary || `Updated ${args.key}`, key: args.key, value: args.value };
    }

    if (name === "read_site_setting") {
      const { data, error } = await admin.from("site_settings").select("value").eq("key", args.key).maybeSingle();
      if (error) return { ok: false, message: error.message };
      return { ok: true, key: args.key, value: data?.value ?? null };
    }

    if (name === "create_broadcast") {
      const { data: u } = await admin.auth.getUser();
      const sentBy = u?.user?.id;
      const { data, error } = await admin.from("broadcast_messages").insert({
        title: args.title,
        content: args.content,
        type: args.type || "info",
        is_active: true,
        sent_by: sentBy || "00000000-0000-0000-0000-000000000000",
      }).select("id").maybeSingle();
      if (error) return { ok: false, message: error.message };
      return { ok: true, message: `Broadcast created`, broadcast_id: data?.id, title: args.title };
    }

    if (name === "deactivate_broadcast") {
      const q = admin.from("broadcast_messages").update({ is_active: false });
      const { error } = args.id ? await q.eq("id", args.id) : await q.eq("is_active", true);
      if (error) return { ok: false, message: error.message };
      return { ok: true, message: args.id ? `Deactivated ${args.id}` : "Deactivated all active broadcasts" };
    }

    if (name === "toggle_game") {
      const ident = String(args.identifier || "").trim();
      if (!ident) return { ok: false, message: "identifier required" };
      const { data: game, error: findErr } = await admin
        .from("games")
        .select("id,name,slug,is_active,is_featured")
        .or(`slug.eq.${ident},name.ilike.${ident}`)
        .maybeSingle();
      if (findErr) return { ok: false, message: findErr.message };
      if (!game) return { ok: false, message: `Game not found: ${ident}` };
      const patch: any = {};
      if (typeof args.is_active === "boolean") patch.is_active = args.is_active;
      if (typeof args.is_featured === "boolean") patch.is_featured = args.is_featured;
      if (!Object.keys(patch).length) return { ok: false, message: "Nothing to change" };
      const { error } = await admin.from("games").update(patch).eq("id", game.id);
      if (error) return { ok: false, message: error.message };
      return { ok: true, message: `Updated ${game.name}`, game: { ...game, ...patch } };
    }

    if (name === "manage_storage_file") {
      const bucket = "game-files";
      if (args.action === "list") {
        const { data, error } = await admin.storage.from(bucket).list(args.path || "", { limit: 200 });
        if (error) return { ok: false, message: error.message };
        return { ok: true, action: "list", path: args.path || "", files: data };
      }
      if (args.action === "delete") {
        if (!args.path) return { ok: false, message: "path required" };
        const { error } = await admin.storage.from(bucket).remove([args.path]);
        if (error) return { ok: false, message: error.message };
        return { ok: true, action: "delete", path: args.path };
      }
      if (args.action === "rename") {
        if (!args.path || !args.new_path) return { ok: false, message: "path & new_path required" };
        const { error } = await admin.storage.from(bucket).move(args.path, args.new_path);
        if (error) return { ok: false, message: error.message };
        return { ok: true, action: "rename", from: args.path, to: args.new_path };
      }
      return { ok: false, message: "unknown storage action" };
    }

    if (name === "find_user") {
      const { data, error } = await admin
        .from("profiles")
        .select("user_id,username,balance,real_balance,xp")
        .ilike("username", args.username)
        .maybeSingle();
      if (error) return { ok: false, message: error.message };
      if (!data) return { ok: false, message: "User not found" };
      const { data: r } = await admin.from("user_roles").select("role").eq("user_id", data.user_id);
      return { ok: true, user: { ...data, roles: (r || []).map((x: any) => x.role) } };
    }

    if (name === "grant_role" || name === "revoke_role") {
      if (FORBIDDEN_ROLES.has(args.role)) return { ok: false, message: "Refused: cannot modify admin/owner." };
      if (!["staff", "moderator"].includes(args.role)) return { ok: false, message: "role must be staff or moderator" };
      const { data: prof } = await admin.from("profiles").select("user_id,username").ilike("username", args.username).maybeSingle();
      if (!prof) return { ok: false, message: "User not found" };
      if (name === "grant_role") {
        const { error } = await admin.from("user_roles").insert({ user_id: prof.user_id, role: args.role });
        if (error && !String(error.message).includes("duplicate")) return { ok: false, message: error.message };
        return { ok: true, message: `Granted ${args.role} to ${prof.username}` };
      } else {
        const { error } = await admin.from("user_roles").delete().eq("user_id", prof.user_id).eq("role", args.role);
        if (error) return { ok: false, message: error.message };
        return { ok: true, message: `Revoked ${args.role} from ${prof.username}` };
      }
    }

    if (name === "suggest_code_change") {
      return { ok: true, file_path: args.file_path, explanation: args.explanation, code: args.code };
    }

    return { ok: false, message: `Unknown tool: ${name}` };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Tool error" };
  }
}

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
