import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2, Save, Play, Users, Trophy, TrendingUp, MessageSquare, Hash } from "lucide-react";
import { toast } from "sonner";
import { FakeWinsControlPanel } from "./FakeWinsControlPanel";
import {
  fetchFakeTradesConfig, saveFakeTradesConfig, DEFAULT_TRADES_CONFIG, type FakeTradesConfig,
} from "./FakeTradesTicker";

interface FakeForumConfig {
  enabled: boolean;
  use_ai: boolean;
  threads_per_run: number;
  replies_per_run: number;
  likes_per_run: number;
  reply_to_real_users: boolean;
  prefixes: string[];
  topics: string[];
  personalities: string[];
}
const DEFAULT_FORUM: FakeForumConfig = {
  enabled: false, use_ai: true,
  threads_per_run: 1, replies_per_run: 3, likes_per_run: 6,
  reply_to_real_users: true,
  prefixes: ["news", "trade", "strategy", "discussion", "guide"],
  topics: [
    "Bitcoin price action today", "Ethereum gas fees", "Solana ecosystem news",
    "Latest DeFi launches", "Memecoin pumps", "Macro & crypto correlation",
    "Layer 2 adoption", "On-chain whale movements", "Trading psychology",
  ],
  personalities: [
    "an aggressive degen trader", "a calm chart reader", "a long-term hodler",
    "a sarcastic skeptic", "an enthusiastic newbie", "a seasoned whale",
    "a meme-loving shitposter", "a macro-focused trader",
  ],
};

interface FakeChatConfig {
  enabled: boolean; use_ai: boolean;
  messages_per_run: number; rooms: string[]; reply_to_real_users: boolean;
}
const DEFAULT_CHAT: FakeChatConfig = {
  enabled: false, use_ai: true, messages_per_run: 4,
  rooms: ["roulette", "blackjack", "scratch-card", "penny-roulette", "general"],
  reply_to_real_users: true,
};

async function loadSetting<T>(key: string, fallback: T): Promise<T> {
  const { data } = await supabase.from("site_settings").select("value").eq("key", key).maybeSingle();
  if (!data) return fallback;
  return { ...fallback, ...(data.value as any) } as T;
}
async function saveSetting(key: string, value: any): Promise<boolean> {
  const { data: existing } = await supabase.from("site_settings").select("id").eq("key", key).maybeSingle();
  if (existing) {
    const { error } = await supabase.from("site_settings").update({ value }).eq("key", key);
    if (error) return false;
  } else {
    const { error } = await supabase.from("site_settings").insert({ key, value });
    if (error) return false;
  }
  return true;
}

// ── Ghost Users sub-panel ────────────────────────────────────────
function GhostUsersSection() {
  const [config, setConfig] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [newUsername, setNewUsername] = useState("");
  const [realUsernames, setRealUsernames] = useState<Set<string>>(new Set());

  useEffect(() => {
    (async () => {
      const [s, p] = await Promise.all([
        supabase.from("site_settings").select("value").eq("key", "ghost_users").maybeSingle(),
        supabase.from("profiles").select("username").not("username", "is", null),
      ]);
      if (s.data) setConfig(s.data.value || {});
      if (p.data) setRealUsernames(new Set(p.data.map((x: any) => (x.username as string).toLowerCase())));
      setLoading(false);
    })();
  }, []);

  const save = async (updates: any) => {
    const newCfg = { ...config, ...updates };
    setConfig(newCfg);
    const ok = await saveSetting("ghost_users", newCfg);
    if (ok) toast.success("Saved"); else toast.error("Save failed");
  };

  if (loading) return <div className="flex items-center gap-2 p-4"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>;

  const usernames: string[] = config.usernames || [];
  const enabled = config.enabled === true;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-4 flex items-center justify-between">
        <div>
          <p className="font-bold text-sm">Ghost Users Online</p>
          <p className="text-xs text-muted-foreground">{enabled ? "👻 Active" : "Disabled"}</p>
        </div>
        <Switch checked={enabled} onCheckedChange={(v) => save({ enabled: v })} />
      </div>
      <div className="rounded-xl border border-border bg-card p-4 grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Min Online</Label>
          <Input type="number" min={0} max={500} value={config.min_online ?? 8} onChange={(e) => save({ min_online: Number(e.target.value) })} />
        </div>
        <div>
          <Label className="text-xs">Peak Online</Label>
          <Input type="number" min={0} max={1000} value={config.peak_online ?? 45} onChange={(e) => save({ peak_online: Number(e.target.value) })} />
        </div>
        <div>
          <Label className="text-xs">Ramp Hours (to peak)</Label>
          <Input type="number" min={1} max={24} value={config.ramp_hours ?? 8} onChange={(e) => save({ ramp_hours: Number(e.target.value) })} />
        </div>
        <div>
          <Label className="text-xs">Offline / Hour</Label>
          <Input type="number" min={1} max={100} value={config.offline_per_hour ?? 5} onChange={(e) => save({ offline_per_hour: Number(e.target.value) })} />
        </div>
        <div>
          <Label className="text-xs">New Online / Join (per hr)</Label>
          <Input type="number" min={1} max={200} value={config.join_per_hour ?? 10} onChange={(e) => save({ join_per_hour: Number(e.target.value) })} />
        </div>
        <div>
          <Label className="text-xs">Max Total Ghosts</Label>
          <Input type="number" min={10} max={10000} value={config.max_total ?? 3000} onChange={(e) => save({ max_total: Number(e.target.value) })} />
        </div>
      </div>
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm">Show in social/online list</span>
          <Switch checked={config.show_in_presence !== false} onCheckedChange={(v) => save({ show_in_presence: v })} />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm">Show in game chat</span>
          <Switch checked={config.show_in_chat !== false} onCheckedChange={(v) => save({ show_in_chat: v })} />
        </div>
      </div>
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <p className="font-bold text-sm">Ghost Usernames ({usernames.length})</p>
        <div className="flex gap-2">
          <Input value={newUsername} onChange={(e) => setNewUsername(e.target.value)} placeholder="Add username" onKeyDown={(e) => {
            if (e.key === "Enter" && newUsername.trim()) {
              if (realUsernames.has(newUsername.trim().toLowerCase())) { toast.error("Real user — cannot add"); return; }
              save({ usernames: [...usernames, newUsername.trim()] }); setNewUsername("");
            }
          }} />
          <Button variant="gold" size="sm" onClick={() => {
            if (!newUsername.trim()) return;
            if (realUsernames.has(newUsername.trim().toLowerCase())) { toast.error("Real user — cannot add"); return; }
            save({ usernames: [...usernames, newUsername.trim()] }); setNewUsername("");
          }}>Add</Button>
        </div>
        <Textarea
          rows={6}
          value={usernames.join("\n")}
          onChange={(e) => setConfig({ ...config, usernames: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) })}
          onBlur={() => save({ usernames: config.usernames || [] })}
          className="text-xs font-mono"
          placeholder="One username per line…"
        />
        <p className="text-[10px] text-muted-foreground">Edits save when you click outside the box.</p>
      </div>
    </div>
  );
}

// ── Fake Trades sub-panel ────────────────────────────────────────
function FakeTradesSection() {
  const [cfg, setCfg] = useState<FakeTradesConfig>(DEFAULT_TRADES_CONFIG);
  const [loading, setLoading] = useState(true);
  useEffect(() => { fetchFakeTradesConfig().then((c) => { setCfg(c); setLoading(false); }); }, []);
  const save = async (next: FakeTradesConfig) => {
    setCfg(next);
    const ok = await saveFakeTradesConfig(next);
    if (ok) toast.success("Saved"); else toast.error("Save failed");
  };
  if (loading) return <div className="flex items-center gap-2 p-4"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>;
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-4 flex items-center justify-between">
        <div>
          <p className="font-bold text-sm">Fake Trades Ticker</p>
          <p className="text-xs text-muted-foreground">Shown on the Exchange page.</p>
        </div>
        <Switch checked={cfg.enabled} onCheckedChange={(v) => save({ ...cfg, enabled: v })} />
      </div>
      <div className="rounded-xl border border-border bg-card p-4 grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Min Interval (s)</Label>
          <Input type="number" min={1} max={60} value={cfg.minIntervalSeconds} onChange={(e) => save({ ...cfg, minIntervalSeconds: Number(e.target.value) })} />
        </div>
        <div>
          <Label className="text-xs">Max Interval (s)</Label>
          <Input type="number" min={1} max={120} value={cfg.maxIntervalSeconds} onChange={(e) => save({ ...cfg, maxIntervalSeconds: Number(e.target.value) })} />
        </div>
        <div>
          <Label className="text-xs">Big Trade Chance (0–1)</Label>
          <Input type="number" step="0.01" min={0} max={1} value={cfg.bigTradeChance} onChange={(e) => save({ ...cfg, bigTradeChance: Number(e.target.value) })} />
        </div>
        <div>
          <Label className="text-xs">Profit Chance (0–1)</Label>
          <Input type="number" step="0.01" min={0} max={1} value={cfg.profitChance} onChange={(e) => save({ ...cfg, profitChance: Number(e.target.value) })} />
        </div>
      </div>
      <div className="rounded-xl border border-border bg-card p-4 space-y-2">
        <Label className="text-xs">Trading Pairs (one per line)</Label>
        <Textarea rows={5} value={cfg.pairs.join("\n")}
          onChange={(e) => setCfg({ ...cfg, pairs: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) })}
          onBlur={() => save(cfg)} className="text-xs font-mono" />
        <Label className="text-xs">Trader Usernames (one per line)</Label>
        <Textarea rows={5} value={cfg.usernames.join("\n")}
          onChange={(e) => setCfg({ ...cfg, usernames: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) })}
          onBlur={() => save(cfg)} className="text-xs font-mono" />
      </div>
    </div>
  );
}

// ── Fake Forum sub-panel ─────────────────────────────────────────
function FakeForumSection() {
  const [cfg, setCfg] = useState<FakeForumConfig>(DEFAULT_FORUM);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  useEffect(() => { loadSetting("fake_forum_config", DEFAULT_FORUM).then((c) => { setCfg(c); setLoading(false); }); }, []);

  const save = async (next: FakeForumConfig) => {
    setCfg(next);
    const ok = await saveSetting("fake_forum_config", next);
    if (ok) toast.success("Saved"); else toast.error("Save failed");
  };

  const runNow = async () => {
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("simulate-activity", { body: { action: "forum" } });
      if (error) throw error;
      toast.success(`Posted ${data?.counts?.threads || 0} threads, ${data?.counts?.replies || 0} replies, ${data?.counts?.likes || 0} likes`);
    } catch (e: any) { toast.error(e.message || "Run failed"); }
    setRunning(false);
  };

  if (loading) return <div className="flex items-center gap-2 p-4"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-4 flex items-center justify-between">
        <div>
          <p className="font-bold text-sm">Fake Forum Activity</p>
          <p className="text-xs text-muted-foreground">Ghosts post crypto news threads, replies, and likes.</p>
        </div>
        <Switch checked={cfg.enabled} onCheckedChange={(v) => save({ ...cfg, enabled: v })} />
      </div>
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm">Use AI for content (Lovable AI / Gemini)</p>
            <p className="text-[10px] text-muted-foreground">Falls back to templates if AI unavailable.</p>
          </div>
          <Switch checked={cfg.use_ai} onCheckedChange={(v) => save({ ...cfg, use_ai: v })} />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm">Reply to real users' threads</p>
            <p className="text-[10px] text-muted-foreground">Off = ghosts only reply to other ghost threads.</p>
          </div>
          <Switch checked={cfg.reply_to_real_users} onCheckedChange={(v) => save({ ...cfg, reply_to_real_users: v })} />
        </div>
      </div>
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <p className="text-[10px] text-muted-foreground">Auto-runs every 15 min (4 runs/hr). Set values per hour — we divide by 4 per run.</p>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label className="text-xs">Threads / hour</Label>
            <Input type="number" min={0} max={80} value={cfg.threads_per_run * 4}
              onChange={(e) => save({ ...cfg, threads_per_run: Math.max(0, Math.round(Number(e.target.value) / 4)) })} />
          </div>
          <div>
            <Label className="text-xs">Replies / hour</Label>
            <Input type="number" min={0} max={200} value={cfg.replies_per_run * 4}
              onChange={(e) => save({ ...cfg, replies_per_run: Math.max(0, Math.round(Number(e.target.value) / 4)) })} />
          </div>
          <div>
            <Label className="text-xs">Likes / hour</Label>
            <Input type="number" min={0} max={400} value={cfg.likes_per_run * 4}
              onChange={(e) => save({ ...cfg, likes_per_run: Math.max(0, Math.round(Number(e.target.value) / 4)) })} />
          </div>
        </div>
      </div>
      <div className="rounded-xl border border-border bg-card p-4 space-y-2">
        <Label className="text-xs">Allowed Thread Prefixes (comma sep)</Label>
        <Input value={cfg.prefixes.join(", ")} onChange={(e) => setCfg({ ...cfg, prefixes: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} onBlur={() => save(cfg)} />
        <Label className="text-xs mt-2">Topic seeds (one per line)</Label>
        <Textarea rows={5} value={cfg.topics.join("\n")} onChange={(e) => setCfg({ ...cfg, topics: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) })} onBlur={() => save(cfg)} className="text-xs" />
        <Label className="text-xs mt-2">Personalities (one per line — gives ghosts their voice)</Label>
        <Textarea rows={5} value={cfg.personalities.join("\n")} onChange={(e) => setCfg({ ...cfg, personalities: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) })} onBlur={() => save(cfg)} className="text-xs" />
      </div>
      <Button variant="gold" onClick={runNow} disabled={running} className="w-full">
        {running ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
        Run Forum Simulation Now
      </Button>
      <p className="text-[10px] text-muted-foreground text-center">
        Tip: schedule this from the Database tools (cron) to run every 15–30 min.
      </p>
    </div>
  );
}

// ── Fake Game Chat sub-panel ────────────────────────────────────
function FakeChatSection() {
  const [cfg, setCfg] = useState<FakeChatConfig>(DEFAULT_CHAT);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  useEffect(() => { loadSetting("fake_chat_config", DEFAULT_CHAT).then((c) => { setCfg(c); setLoading(false); }); }, []);

  const save = async (next: FakeChatConfig) => {
    setCfg(next);
    const ok = await saveSetting("fake_chat_config", next);
    if (ok) toast.success("Saved"); else toast.error("Save failed");
  };

  const runNow = async () => {
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("simulate-activity", { body: { action: "chat" } });
      if (error) throw error;
      toast.success(`Posted ${data?.counts?.chat || 0} chat messages`);
    } catch (e: any) { toast.error(e.message || "Run failed"); }
    setRunning(false);
  };

  if (loading) return <div className="flex items-center gap-2 p-4"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-4 flex items-center justify-between">
        <div>
          <p className="font-bold text-sm">Fake Game Chat Activity</p>
          <p className="text-xs text-muted-foreground">Ghosts post messages in game rooms.</p>
        </div>
        <Switch checked={cfg.enabled} onCheckedChange={(v) => save({ ...cfg, enabled: v })} />
      </div>
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm">Use AI</span>
          <Switch checked={cfg.use_ai} onCheckedChange={(v) => save({ ...cfg, use_ai: v })} />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm">Reply contextually to real users</span>
          <Switch checked={cfg.reply_to_real_users} onCheckedChange={(v) => save({ ...cfg, reply_to_real_users: v })} />
        </div>
        <div>
          <Label className="text-xs">Messages per run</Label>
          <Input type="number" min={0} max={50} value={cfg.messages_per_run} onChange={(e) => save({ ...cfg, messages_per_run: Number(e.target.value) })} />
        </div>
        <div>
          <Label className="text-xs">Game rooms (comma sep)</Label>
          <Input value={cfg.rooms.join(", ")} onChange={(e) => setCfg({ ...cfg, rooms: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} onBlur={() => save(cfg)} />
        </div>
      </div>
      <Button variant="gold" onClick={runNow} disabled={running} className="w-full">
        {running ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
        Run Chat Simulation Now
      </Button>
    </div>
  );
}

// ── Main panel ──────────────────────────────────────────────────
export function SimulatedActivityPanel() {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-casino-gold/30 bg-casino-gold/5 p-4">
        <p className="font-display text-sm font-bold mb-1">🎭 Simulated Activity Hub</p>
        <p className="text-xs text-muted-foreground">
          Central control for all platform simulation: ghost users, fake wins/trades tickers, AI-powered fake forum threads, and game chat activity.
        </p>
      </div>
      <Tabs defaultValue="ghost" className="w-full">
        <TabsList className="grid grid-cols-5 w-full h-auto">
          <TabsTrigger value="ghost" className="text-[10px] sm:text-xs"><Users className="h-3 w-3 mr-1" />Ghosts</TabsTrigger>
          <TabsTrigger value="wins" className="text-[10px] sm:text-xs"><Trophy className="h-3 w-3 mr-1" />Wins</TabsTrigger>
          <TabsTrigger value="trades" className="text-[10px] sm:text-xs"><TrendingUp className="h-3 w-3 mr-1" />Trades</TabsTrigger>
          <TabsTrigger value="forum" className="text-[10px] sm:text-xs"><Hash className="h-3 w-3 mr-1" />Forum</TabsTrigger>
          <TabsTrigger value="chat" className="text-[10px] sm:text-xs"><MessageSquare className="h-3 w-3 mr-1" />Chat</TabsTrigger>
        </TabsList>
        <TabsContent value="ghost" className="mt-4"><GhostUsersSection /></TabsContent>
        <TabsContent value="wins" className="mt-4"><FakeWinsControlPanel /></TabsContent>
        <TabsContent value="trades" className="mt-4"><FakeTradesSection /></TabsContent>
        <TabsContent value="forum" className="mt-4"><FakeForumSection /></TabsContent>
        <TabsContent value="chat" className="mt-4"><FakeChatSection /></TabsContent>
      </Tabs>
    </div>
  );
}