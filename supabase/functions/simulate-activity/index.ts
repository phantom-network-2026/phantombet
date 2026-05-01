import { createClient } from "https://esm.sh/@supabase/supabase-js@2.102.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

const admin = createClient(SUPABASE_URL, SERVICE_KEY);

// ── Defaults / config ───────────────────────────────────────────
interface FakeForumConfig {
  enabled: boolean;
  use_ai: boolean;
  threads_per_run: number;
  replies_per_run: number;
  likes_per_run: number;
  reply_to_real_users: boolean;
  prefixes: string[]; // forum_prefix values to use
  topics: string[];   // seed topics for prompts
  personalities: string[];
}

interface FakeChatConfig {
  enabled: boolean;
  use_ai: boolean;
  messages_per_run: number;
  rooms: string[];
  reply_to_real_users: boolean;
}

const DEFAULT_FORUM: FakeForumConfig = {
  enabled: false,
  use_ai: true,
  threads_per_run: 1,
  replies_per_run: 3,
  likes_per_run: 6,
  reply_to_real_users: true,
  prefixes: ["news", "trade", "strategy", "discussion", "guide"],
  topics: [
    "Bitcoin price action today",
    "Ethereum upgrades & gas fees",
    "Solana ecosystem news",
    "Latest DeFi protocol launches",
    "Memecoin pumps and rug warnings",
    "Macro & crypto correlation",
    "Layer 2 adoption updates",
    "NFT market sentiment",
    "Trading psychology & risk management",
    "Spot vs futures strategy tips",
    "Stablecoin regulation news",
    "On-chain whale movements",
  ],
  personalities: [
    "an aggressive degen trader who uses lots of slang and emojis",
    "a calm, analytical chart reader who quotes RSI and MACD",
    "a long-term hodler who hates leverage",
    "a sarcastic skeptic suspicious of every coin",
    "an enthusiastic newbie asking lots of questions",
    "a seasoned whale who drops cryptic alpha",
    "a meme-loving shitposter",
    "a macro-focused trader comparing crypto to gold/equities",
  ],
};

const DEFAULT_CHAT: FakeChatConfig = {
  enabled: false,
  use_ai: true,
  messages_per_run: 4,
  rooms: ["roulette", "blackjack", "scratch-card", "penny-roulette", "general"],
  reply_to_real_users: true,
};

// ── Templates (fallback when AI unavailable) ────────────────────
const THREAD_TEMPLATES = [
  { title: "BTC just bounced off ${price} — what now?", body: "Anyone else watching this level? Looks like ${coin} is forming a higher low. Setting alerts." },
  { title: "${coin} pumping again 🚀", body: "Volume is insane on ${coin} right now. Up ${pct}% in the last hour. Be careful chasing." },
  { title: "New ${coin} listing announcement leaked?", body: "Heard whispers about a major exchange adding ${coin}. If true, this could be huge. DYOR." },
  { title: "Risk management 101 for new traders", body: "Stop chasing pumps. 2% risk per trade max. Cut losers fast, let winners run. Took me years to learn this." },
  { title: "${coin} on-chain looks bullish", body: "Whale wallets accumulating ${coin}. Exchange reserves dropping. Classic setup before a move." },
  { title: "Anyone trading the ${coin}/USDT pair?", body: "Range looks tight. Waiting for the breakout. What's your bias?" },
  { title: "Macro update: Fed news incoming", body: "Watch for volatility in crypto if rates surprise. Usually moves with risk-on sentiment." },
  { title: "${coin} TA — falling wedge breakout?", body: "Drew the wedge on the 4H. If it breaks, target is ${target}. Invalidation below recent low." },
];

const REPLY_TEMPLATES = [
  "Great call 👀", "I'm in too. Let's see.", "Ngmi if you fade this.",
  "Disagree — chart says otherwise.", "Lol same setup as last time, didn't work.",
  "What's your stop?", "Patience pays. Hodl.", "TA on this is wild.",
  "Volume confirms it imo.", "I bought a small bag, won't ape.",
  "RSI looks overcooked though.", "Macro says no, but chart says yes.",
  "Whales loading up for sure.", "Could be a trap — be careful.",
  "This aged well 😂", "Classic crypto move.",
];

const CHAT_TEMPLATES = [
  "gl everyone 🍀", "lets gooo", "rip my balance", "back to back wins 🔥",
  "anyone else on a streak?", "this game owes me", "easy money", "donating again ngl",
  "one more spin 😅", "down bad", "house always wins", "lucky day today",
  "scared money don't make money", "withdrawing after this", "let it ride",
  "wtf was that lol", "ggs", "first time on this game", "anyone here from discord?",
];

const COINS = ["BTC", "ETH", "SOL", "BNB", "XRP", "DOGE", "AVAX", "ARB", "LINK", "MATIC", "TON", "PEPE", "WIF"];

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function rand(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function fillTemplate(t: string) {
  const coin = pick(COINS);
  return t
    .replaceAll("${coin}", coin)
    .replaceAll("${price}", `$${rand(20, 70) * 1000}`)
    .replaceAll("${target}", `$${rand(10, 100) * 1000}`)
    .replaceAll("${pct}", String(rand(3, 35)));
}

// ── Ghost author ID derivation (deterministic per username) ─────
// Uses uuid v5-like derivation by hashing in JS.
function ghostUserId(username: string): string {
  // Deterministic UUID v4-shape from username via simple FNV hash
  let h1 = 0x811c9dc5, h2 = 0xc9dc5811;
  for (let i = 0; i < username.length; i++) {
    h1 = Math.imul(h1 ^ username.charCodeAt(i), 0x01000193) >>> 0;
    h2 = Math.imul(h2 ^ username.charCodeAt(i) ^ 0x5a, 0x01000193) >>> 0;
  }
  const hex = (h1.toString(16).padStart(8, "0") + h2.toString(16).padStart(8, "0")).repeat(2).slice(0, 32);
  // Force UUID v4 layout
  const u = hex.slice(0, 8) + "-" + hex.slice(8, 12) + "-4" + hex.slice(13, 16) + "-a" + hex.slice(17, 20) + "-" + hex.slice(20, 32);
  return u;
}

// ── Lovable AI helpers ──────────────────────────────────────────
async function aiGen(prompt: string, system: string): Promise<string | null> {
  if (!LOVABLE_API_KEY) return null;
  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: system },
          { role: "user", content: prompt },
        ],
      }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.choices?.[0]?.message?.content ?? null;
  } catch { return null; }
}

async function aiThread(topic: string, personality: string): Promise<{ title: string; body: string } | null> {
  const sys = `You are role-playing as ${personality} on a crypto casino's community forum. Write in a casual, authentic tone. Keep slang/typos natural. Output strict JSON: {"title":"...","body":"..."}. Title under 90 chars. Body 1-3 short paragraphs, under 600 chars. No markdown headers.`;
  const out = await aiGen(`Write a forum post about: ${topic}. Make it feel like a real trader's quick take from today.`, sys);
  if (!out) return null;
  try {
    const m = out.match(/\{[\s\S]*\}/);
    if (!m) return null;
    const j = JSON.parse(m[0]);
    if (typeof j.title === "string" && typeof j.body === "string") return { title: j.title.slice(0, 140), body: j.body.slice(0, 4900) };
  } catch {}
  return null;
}

async function aiReply(threadTitle: string, threadBody: string, personality: string): Promise<string | null> {
  const sys = `You are ${personality} replying to a crypto forum thread on a casino site. 1-2 sentences, casual, may include 1 emoji, no quotes around your reply. Stay on topic.`;
  const out = await aiGen(`Thread title: ${threadTitle}\nThread body: ${threadBody}\n\nWrite a short reply.`, sys);
  return out?.trim().replace(/^["']|["']$/g, "").slice(0, 800) || null;
}

async function aiChat(room: string, personality: string): Promise<string | null> {
  const sys = `You are ${personality} in a casino game chat for "${room}". Write 1 short casual chat message (max 80 chars). No hashtags, no quotes. May include 1 emoji.`;
  const out = await aiGen(`Write one quick chat message.`, sys);
  return out?.trim().replace(/^["']|["']$/g, "").slice(0, 200) || null;
}

// ── Config loaders ──────────────────────────────────────────────
async function loadJson<T>(key: string, fallback: T): Promise<T> {
  const { data } = await admin.from("site_settings").select("value").eq("key", key).maybeSingle();
  if (!data) return fallback;
  return { ...fallback, ...(data.value as any) } as T;
}

async function getGhostUsernames(): Promise<string[]> {
  const { data } = await admin.from("site_settings").select("value").eq("key", "ghost_users").maybeSingle();
  const cfg: any = data?.value || {};
  return Array.isArray(cfg.usernames) ? cfg.usernames : [];
}

// ── Run actions ─────────────────────────────────────────────────
async function runForum(cfg: FakeForumConfig, ghostNames: string[], counts: Record<string, number>) {
  console.log("runForum cfg:", { enabled: cfg.enabled, threads: cfg.threads_per_run, replies: cfg.replies_per_run, ghosts: ghostNames.length, use_ai: cfg.use_ai });
  if (!cfg.enabled || ghostNames.length === 0) return;

  // Threads
  for (let i = 0; i < cfg.threads_per_run; i++) {
    const username = pick(ghostNames);
    const personality = pick(cfg.personalities);
    const topic = pick(cfg.topics);
    let title: string, body: string;
    const ai = cfg.use_ai ? await aiThread(topic, personality) : null;
    if (ai) { title = ai.title; body = ai.body; }
    else {
      const tpl = pick(THREAD_TEMPLATES);
      title = fillTemplate(tpl.title);
      body = fillTemplate(tpl.body);
    }
    const prefix = pick(cfg.prefixes);
    const { error } = await admin.rpc("sim_post_forum_thread", {
      p_author_id: ghostUserId(username),
      p_title: title, p_body: body, p_prefix: prefix,
    });
    if (error) {
      console.error("sim_post_forum_thread failed:", error.message, { prefix, title: title.slice(0, 60) });
    } else {
      counts.threads++;
    }
  }

  // Replies — pick recent threads (real or ghost) and reply
  let recent: any[] = [];
  {
    const q = admin
      .from("forum_threads")
      .select("id,title,body,author_id")
      .order("last_activity_at", { ascending: false })
      .limit(40);
    const { data } = await q;
    recent = data || [];
  }
  if (!cfg.reply_to_real_users) {
    const ghostIds = new Set(ghostNames.map(ghostUserId));
    recent = recent.filter((t) => ghostIds.has(t.author_id));
  }

  for (let i = 0; i < cfg.replies_per_run && recent.length > 0; i++) {
    const t = pick(recent);
    const username = pick(ghostNames);
    const personality = pick(cfg.personalities);
    let body: string | null = cfg.use_ai ? await aiReply(t.title, t.body, personality) : null;
    if (!body) body = pick(REPLY_TEMPLATES);
    const { error } = await admin.rpc("sim_post_forum_reply", {
      p_author_id: ghostUserId(username),
      p_thread_id: t.id, p_body: body,
    });
    if (error) {
      console.error("sim_post_forum_reply failed:", error.message);
    } else {
      counts.replies++;
    }
  }

  // Likes
  for (let i = 0; i < cfg.likes_per_run && recent.length > 0; i++) {
    const t = pick(recent);
    const username = pick(ghostNames);
    const { error } = await admin.rpc("sim_like", { p_user_id: ghostUserId(username), p_thread_id: t.id, p_reply_id: null });
    if (error) {
      console.error("sim_like failed:", error.message);
    } else {
      counts.likes++;
    }
  }
}

async function runChat(cfg: FakeChatConfig, ghostNames: string[], counts: Record<string, number>) {
  if (!cfg.enabled || ghostNames.length === 0 || cfg.rooms.length === 0) return;
  for (let i = 0; i < cfg.messages_per_run; i++) {
    const username = pick(ghostNames);
    const room = pick(cfg.rooms);
    const personality = pick(["a hyped slots player", "a calm strategist", "a sarcastic loser", "a lucky streak winner"]);
    let content: string | null = cfg.use_ai ? await aiChat(room, personality) : null;
    if (!content) content = pick(CHAT_TEMPLATES);
    const { error } = await admin.rpc("sim_post_game_chat", {
      p_user_id: ghostUserId(username),
      p_username: username, p_game_room: room, p_content: content,
    });
    if (!error) counts.chat++;
  }
}

// ── HTTP handler ────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => ({}));
    const action: string = body.action || "tick";

    const forum = await loadJson("fake_forum_config", DEFAULT_FORUM);
    const chat = await loadJson("fake_chat_config", DEFAULT_CHAT);
    const ghostNames = await getGhostUsernames();

    const counts = { threads: 0, replies: 0, likes: 0, chat: 0 };
    const debug: any = {
      forum_enabled: forum.enabled,
      forum_threads_per_run: forum.threads_per_run,
      forum_use_ai: forum.use_ai,
      chat_enabled: chat.enabled,
      ghost_count: ghostNames.length,
    };

    if (action === "tick" || action === "forum") await runForum(forum, ghostNames, counts);
    if (action === "tick" || action === "chat") await runChat(chat, ghostNames, counts);

    return new Response(JSON.stringify({ ok: true, counts, debug }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});