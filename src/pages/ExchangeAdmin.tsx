import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Header } from "@/components/casino/Header";
import { BottomNav } from "@/components/casino/BottomNav";
import { toast } from "sonner";
import {
  ArrowLeft, ArrowDown, ArrowUp, Coins, ImagePlus, Plus, Trash2, Search, Star,
  Eye, EyeOff, Shield, Activity, BarChart3, Rocket, Users, Wallet,
  AlertTriangle, FileDown, FileUp, Settings, Power, History, Zap, Lock,
} from "lucide-react";

type Coin = {
  id: string;
  symbol: string;
  name: string;
  coingecko_id: string | null;
  network: string;
  sector: string;
  logo_url: string | null;
  fallback_icon: string | null;
  price_usd: number;
  change_24h: number;
  volume_24h: number;
  market_cap: number;
  circulating_supply: number;
  max_supply: number | null;
  risk_score: number;
  status: string;
  is_featured: boolean;
  is_trading_enabled: boolean;
  is_deposit_enabled: boolean;
  is_withdraw_enabled: boolean;
  withdrawal_min: number;
  withdrawal_fee: number;
  daily_withdraw_limit: number;
  kyc_tier_required: number;
  contract_address: string | null;
  hot_wallet_address: string | null;
  cold_wallet_address: string | null;
  scheduled_listing_at: string | null;
  description: string | null;
  whitepaper_url: string | null;
  website_url: string | null;
  display_order: number;
};

const SECTORS = ["Majors", "Layer 1", "Layer 2", "Stablecoin", "DeFi", "Meme", "Gaming", "AI", "Privacy", "Payments", "Phantom", "Launchpad", "High Risk"];
const STATUSES = ["listed", "watch", "incubating", "scheduled", "maintenance", "delisted"];
const NETWORKS = ["Bitcoin", "Ethereum", "BNB Chain", "Solana", "Polygon", "Arbitrum", "Base", "Tron", "Avalanche", "Multi-chain"];

const COIN_COLUMNS = [
  "id","symbol","name","coingecko_id","network","sector","logo_url","fallback_icon",
  "price_usd","change_24h","volume_24h","market_cap","circulating_supply","max_supply",
  "risk_score","status","is_featured","is_trading_enabled","is_deposit_enabled","is_withdraw_enabled",
  "withdrawal_min","withdrawal_fee","daily_withdraw_limit","kyc_tier_required",
  "contract_address","hot_wallet_address","cold_wallet_address","scheduled_listing_at",
  "description","whitepaper_url","website_url","display_order",
].join(",");

const DEFAULT_SETTINGS = {
  maintenance_mode: false,
  maintenance_message: "",
  trading_paused: false,
  withdrawals_paused: false,
  deposits_paused: false,
  maker_fee_pct: 0.08,
  taker_fee_pct: 0.18,
  withdrawal_fee_pct: 0.35,
  min_trade_usd: 1,
  max_trade_usd: 100000,
  fake_ticker_enabled: true,
  fake_ticker_speed: 30,
  liquidity_seed_eth: 42,
  market_maker_bot: false,
  referral_pct: 20,
  staking_enabled: false,
  p2p_enabled: false,
  launchpad_enabled: true,
  aml_strict: false,
  ip_geo_block: "",
  banner_title: "Welcome to Phantom Exchange",
  banner_subtitle: "Non-KYC crypto trading. Self-custody by default.",
  announcement: "",
};

type Settings = typeof DEFAULT_SETTINGS;

export default function ExchangeAdmin() {
  const navigate = useNavigate();
  const { isAdmin, isOwner, loading: authLoading } = useAuth();
  const [coins, setCoins] = useState<Coin[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<Coin> | null>(null);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [savingSettings, setSavingSettings] = useState(false);
  const [auditLog, setAuditLog] = useState<Array<{ id: string; action: string; target_type: string; target_id: string | null; created_at: string; metadata: any }>>([]);
  const [importingFile, setImportingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!isAdmin && !isOwner) {
      toast.error("Admin access required");
      navigate("/");
      return;
    }
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, isAdmin, isOwner]);

  const loadAll = async () => {
    setLoading(true);
    const [coinsRes, settingsRes, auditRes] = await Promise.all([
      supabase.from("exchange_coins").select(COIN_COLUMNS).order("display_order", { ascending: true }),
      supabase.from("site_settings").select("value").eq("key", "exchange_settings").maybeSingle(),
      supabase.from("exchange_audit_log").select("id,action,target_type,target_id,created_at,metadata").order("created_at", { ascending: false }).limit(50),
    ]);
    if (coinsRes.error) toast.error(coinsRes.error.message);
    setCoins(((coinsRes.data ?? []) as unknown) as Coin[]);
    if (settingsRes.data?.value) setSettings({ ...DEFAULT_SETTINGS, ...(settingsRes.data.value as Settings) });
    setAuditLog((auditRes.data as any) ?? []);
    setLoading(false);
  };

  const logAction = async (action: string, target_type: string, target_id?: string | null, metadata: any = {}) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("exchange_audit_log").insert({ actor_id: user.id, action, target_type, target_id: target_id ?? null, metadata });
  };

  const persistSettings = async (next: Settings) => {
    setSavingSettings(true);
    const { data: existing } = await supabase.from("site_settings").select("id").eq("key", "exchange_settings").maybeSingle();
    const op = existing
      ? supabase.from("site_settings").update({ value: next as any }).eq("key", "exchange_settings")
      : supabase.from("site_settings").insert({ key: "exchange_settings", value: next as any });
    const { error } = await op;
    setSavingSettings(false);
    if (error) { toast.error(error.message); return; }
    setSettings(next);
    await logAction("settings_update", "exchange_settings", null, { keys: Object.keys(next) });
    toast.success("Exchange settings saved");
  };

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return coins.filter((c) => {
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (!needle) return true;
      return c.symbol.toLowerCase().includes(needle) || c.name.toLowerCase().includes(needle) || (c.network ?? "").toLowerCase().includes(needle);
    });
  }, [coins, search, statusFilter]);

  // ── Coin CRUD ───────────────────────────────────────────
  const startNew = () => {
    const nextOrder = coins.length ? Math.max(...coins.map((c) => c.display_order)) + 1 : 0;
    setDraft({
      symbol: "", name: "", coingecko_id: "", network: "Ethereum", sector: "Majors",
      price_usd: 0, change_24h: 0, volume_24h: 0, market_cap: 0, circulating_supply: 0,
      risk_score: 30, status: "listed", is_featured: false,
      is_trading_enabled: true, is_deposit_enabled: true, is_withdraw_enabled: true,
      withdrawal_min: 0, withdrawal_fee: 0, daily_withdraw_limit: 0, kyc_tier_required: 0,
      display_order: nextOrder, fallback_icon: "",
    });
    setEditingId("__new__");
  };

  const startEdit = (coin: Coin) => {
    setDraft({ ...coin });
    setEditingId(coin.id);
  };

  const cancelEdit = () => { setDraft(null); setEditingId(null); };

  const saveDraft = async () => {
    if (!draft) return;
    if (!draft.symbol?.trim() || !draft.name?.trim()) { toast.error("Symbol and Name are required"); return; }
    const payload = {
      ...draft,
      symbol: draft.symbol!.trim().toUpperCase(),
      name: draft.name!.trim(),
    };
    if (editingId === "__new__") {
      const { data, error } = await supabase.from("exchange_coins").insert(payload as any).select(COIN_COLUMNS).single();
      if (error) { toast.error(error.message); return; }
      const coin = (data as unknown) as Coin;
      setCoins((prev) => [...prev, coin]);
      await logAction("coin_create", "exchange_coin", coin.id, { symbol: coin.symbol });
      toast.success(`${coin.symbol} listed`);
    } else {
      const { data, error } = await supabase.from("exchange_coins").update(payload as any).eq("id", editingId!).select(COIN_COLUMNS).single();
      if (error) { toast.error(error.message); return; }
      const coin = (data as unknown) as Coin;
      setCoins((prev) => prev.map((c) => c.id === editingId ? coin : c));
      await logAction("coin_update", "exchange_coin", coin.id, { symbol: coin.symbol });
      toast.success(`${coin.symbol} updated`);
    }
    cancelEdit();
  };

  const deleteCoin = async (coin: Coin) => {
    if (!confirm(`Permanently delete ${coin.symbol}? Use Delist instead to soft-hide.`)) return;
    const { error } = await supabase.from("exchange_coins").delete().eq("id", coin.id);
    if (error) { toast.error(error.message); return; }
    setCoins((prev) => prev.filter((c) => c.id !== coin.id));
    await logAction("coin_delete", "exchange_coin", coin.id, { symbol: coin.symbol });
    toast.success(`${coin.symbol} deleted`);
  };

  const updateCoinField = async (coin: Coin, patch: Partial<Coin>) => {
    const { data, error } = await supabase.from("exchange_coins").update(patch as any).eq("id", coin.id).select(COIN_COLUMNS).single();
    if (error) { toast.error(error.message); return; }
    const updated = (data as unknown) as Coin;
    setCoins((prev) => prev.map((c) => c.id === coin.id ? updated : c));
    await logAction("coin_update", "exchange_coin", coin.id, { symbol: coin.symbol, patch });
  };

  const moveCoin = async (coin: Coin, dir: -1 | 1) => {
    const sorted = [...coins].sort((a, b) => a.display_order - b.display_order);
    const idx = sorted.findIndex((c) => c.id === coin.id);
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    const a = sorted[idx], b = sorted[swapIdx];
    const aOrder = a.display_order, bOrder = b.display_order;
    // Swap orders
    const [r1, r2] = await Promise.all([
      supabase.from("exchange_coins").update({ display_order: bOrder }).eq("id", a.id),
      supabase.from("exchange_coins").update({ display_order: aOrder }).eq("id", b.id),
    ]);
    if (r1.error || r2.error) { toast.error("Reorder failed"); return; }
    setCoins((prev) => prev.map((c) => c.id === a.id ? { ...c, display_order: bOrder } : c.id === b.id ? { ...c, display_order: aOrder } : c));
    await logAction("coin_reorder", "exchange_coin", a.id, { from: aOrder, to: bOrder });
  };

  // ── Logo upload ─────────────────────────────────────────
  const uploadLogo = async (coin: Coin | "__draft__", file: File) => {
    if (!file.type.startsWith("image/")) { toast.error("Image required"); return; }
    if (file.size > 4 * 1024 * 1024) { toast.error("Max 4MB"); return; }
    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    const path = `coins/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from("exchange-assets").upload(path, file, {
      cacheControl: "3600", upsert: true, contentType: file.type,
    });
    if (error) { toast.error(error.message); return; }
    const { data: pub } = supabase.storage.from("exchange-assets").getPublicUrl(path);
    if (coin === "__draft__") {
      setDraft((d) => d ? { ...d, logo_url: pub.publicUrl } : d);
    } else {
      await updateCoinField(coin, { logo_url: pub.publicUrl });
    }
    toast.success("Logo uploaded");
  };

  // ── CSV import / export ─────────────────────────────────
  const exportCsv = () => {
    const cols = ["symbol","name","network","sector","price_usd","change_24h","volume_24h","market_cap","status","is_featured","display_order"];
    const rows = [cols.join(",")];
    for (const c of coins) {
      rows.push(cols.map((k) => {
        const v = (c as any)[k];
        if (v === null || v === undefined) return "";
        const s = String(v).split('"').join('""');
        return /[",\n]/.test(s) ? `"${s}"` : s;
      }).join(","));
    }
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `exchange-coins-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported");
  };

  const importCsv = async (file: File) => {
    setImportingFile(true);
    try {
      const text = await file.text();
      const lines = text.trim().split(/\r?\n/);
      const headers = lines[0].split(",").map((s) => s.trim());
      let added = 0, updated = 0;
      for (const line of lines.slice(1)) {
        if (!line.trim()) continue;
        const values: string[] = [];
        let cur = "", inQ = false;
        for (let i = 0; i < line.length; i++) {
          const ch = line[i];
          if (ch === '"') { if (inQ && line[i + 1] === '"') { cur += '"'; i++; } else inQ = !inQ; }
          else if (ch === "," && !inQ) { values.push(cur); cur = ""; }
          else cur += ch;
        }
        values.push(cur);
        const row: any = {};
        headers.forEach((h, i) => { row[h] = values[i] ?? ""; });
        if (!row.symbol) continue;
        const numericKeys = ["price_usd","change_24h","volume_24h","market_cap","display_order","circulating_supply","risk_score"];
        numericKeys.forEach((k) => { if (row[k] !== undefined && row[k] !== "") row[k] = Number(row[k]); else delete row[k]; });
        if (row.is_featured !== undefined) row.is_featured = String(row.is_featured).toLowerCase() === "true";
        const sym = String(row.symbol).toUpperCase();
        const existing = coins.find((c) => c.symbol === sym);
        if (existing) {
          const { error } = await supabase.from("exchange_coins").update(row).eq("id", existing.id);
          if (!error) updated++;
        } else {
          row.symbol = sym;
          if (!row.name) row.name = sym;
          const { error } = await supabase.from("exchange_coins").insert(row);
          if (!error) added++;
        }
      }
      await logAction("csv_import", "exchange_coin", null, { added, updated });
      toast.success(`Imported: ${added} added, ${updated} updated`);
      await loadAll();
    } catch (e: any) {
      toast.error(e?.message || "Import failed");
    } finally {
      setImportingFile(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container px-4 py-8 text-sm text-muted-foreground">Loading exchange admin…</div>
      </div>
    );
  }

  const stats = {
    listed: coins.filter((c) => c.status === "listed").length,
    watch: coins.filter((c) => c.status === "watch").length,
    incubating: coins.filter((c) => c.status === "incubating").length,
    delisted: coins.filter((c) => c.status === "delisted").length,
    featured: coins.filter((c) => c.is_featured).length,
    paused: coins.filter((c) => !c.is_trading_enabled).length,
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header />
      <div className="container px-3 py-4 md:py-6 space-y-4">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate("/cpanel")}><ArrowLeft className="h-4 w-4 mr-1" /> cPanel</Button>
            <h1 className="font-display text-xl md:text-2xl font-black">Exchange cPanel</h1>
          </div>
          {(settings.maintenance_mode || settings.trading_paused) && (
            <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" /> {settings.maintenance_mode ? "Maintenance" : "Trading paused"}</Badge>
          )}
        </div>

        {/* Stat row */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          {[
            ["Listed", stats.listed, "text-profit"],
            ["Watch", stats.watch, "text-primary"],
            ["Incubating", stats.incubating, "text-cyan"],
            ["Featured", stats.featured, "text-casino-gold"],
            ["Paused", stats.paused, "text-muted-foreground"],
            ["Delisted", stats.delisted, "text-loss"],
          ].map(([label, value, color]) => (
            <div key={String(label)} className="rounded-xl border border-border bg-card p-3">
              <p className="text-[10px] uppercase text-muted-foreground">{String(label)}</p>
              <p className={`text-xl font-black ${color}`}>{value as number}</p>
            </div>
          ))}
        </div>

        <Tabs defaultValue="coins" className="space-y-4">
          <TabsList className="flex flex-wrap h-auto gap-1">
            <TabsTrigger value="coins"><Coins className="h-4 w-4 mr-1" /> Coins</TabsTrigger>
            <TabsTrigger value="ops"><Settings className="h-4 w-4 mr-1" /> Operations</TabsTrigger>
            <TabsTrigger value="trading"><BarChart3 className="h-4 w-4 mr-1" /> Trading</TabsTrigger>
            <TabsTrigger value="wallets"><Wallet className="h-4 w-4 mr-1" /> Wallets</TabsTrigger>
            <TabsTrigger value="launchpad"><Rocket className="h-4 w-4 mr-1" /> Launchpad</TabsTrigger>
            <TabsTrigger value="compliance"><Shield className="h-4 w-4 mr-1" /> Compliance</TabsTrigger>
            <TabsTrigger value="audit"><History className="h-4 w-4 mr-1" /> Audit</TabsTrigger>
          </TabsList>

          {/* ─────────────── COINS ─────────────── */}
          <TabsContent value="coins" className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search symbol, name, network" className="pl-9" />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button variant="gold" onClick={startNew}><Plus className="h-4 w-4 mr-1" /> List coin</Button>
              <Button variant="outline" onClick={exportCsv}><FileDown className="h-4 w-4 mr-1" /> Export CSV</Button>
              <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={importingFile}>
                <FileUp className="h-4 w-4 mr-1" /> {importingFile ? "Importing…" : "Import CSV"}
              </Button>
              <input ref={fileInputRef} type="file" accept=".csv,text/csv" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) importCsv(f); e.target.value = ""; }} />
            </div>

            {/* Coin editor (inline) */}
            {draft && (
              <CoinEditor
                draft={draft}
                isNew={editingId === "__new__"}
                onChange={(patch) => setDraft((d) => d ? { ...d, ...patch } : d)}
                onUpload={(f) => uploadLogo("__draft__", f)}
                onSave={saveDraft}
                onCancel={cancelEdit}
              />
            )}

            {/* Coin list */}
            <div className="rounded-xl border border-border bg-card divide-y divide-border">
              {filtered.length === 0 && (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  No coins match. Click "List coin" to add the first one.
                </div>
              )}
              {[...filtered].sort((a, b) => a.display_order - b.display_order).map((coin, idx, arr) => (
                <div key={coin.id} className="p-3 flex flex-wrap items-center gap-3">
                  <div className="flex flex-col gap-1">
                    <Button variant="outline" size="icon" className="h-6 w-6" disabled={idx === 0} onClick={() => moveCoin(coin, -1)}><ArrowUp className="h-3 w-3" /></Button>
                    <Button variant="outline" size="icon" className="h-6 w-6" disabled={idx === arr.length - 1} onClick={() => moveCoin(coin, 1)}><ArrowDown className="h-3 w-3" /></Button>
                  </div>
                  <div className="h-10 w-10 rounded-full bg-secondary border border-border overflow-hidden grid place-items-center font-display font-black text-primary shrink-0">
                    {coin.logo_url ? <img src={coin.logo_url} alt={coin.symbol} className="h-full w-full object-cover" /> : <span>{coin.fallback_icon || coin.symbol.slice(0, 2)}</span>}
                  </div>
                  <div className="flex-1 min-w-[160px]">
                    <p className="font-bold flex items-center gap-2">
                      {coin.symbol} <span className="text-xs text-muted-foreground font-normal">{coin.name}</span>
                      {coin.is_featured && <Star className="h-3 w-3 text-casino-gold fill-casino-gold" />}
                    </p>
                    <p className="text-[11px] text-muted-foreground">{coin.network} · {coin.sector} · ${Number(coin.price_usd).toLocaleString()} · {Number(coin.change_24h) >= 0 ? "+" : ""}{Number(coin.change_24h).toFixed(2)}%</p>
                  </div>
                  <Badge variant={coin.status === "listed" ? "default" : coin.status === "delisted" ? "destructive" : "secondary"}>{coin.status}</Badge>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" title={coin.is_trading_enabled ? "Pause trading" : "Enable trading"}
                      onClick={() => updateCoinField(coin, { is_trading_enabled: !coin.is_trading_enabled })}>
                      {coin.is_trading_enabled ? <Power className="h-4 w-4 text-profit" /> : <Power className="h-4 w-4 text-loss" />}
                    </Button>
                    <Button variant="ghost" size="icon" title="Toggle featured"
                      onClick={() => updateCoinField(coin, { is_featured: !coin.is_featured })}>
                      <Star className={`h-4 w-4 ${coin.is_featured ? "text-casino-gold fill-casino-gold" : "text-muted-foreground"}`} />
                    </Button>
                    <Button variant="ghost" size="icon" title={coin.status === "delisted" ? "Re-list" : "Delist (soft hide)"}
                      onClick={() => updateCoinField(coin, { status: coin.status === "delisted" ? "listed" : "delisted" })}>
                      {coin.status === "delisted" ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </Button>
                    <label className="cursor-pointer">
                      <Button variant="ghost" size="icon" asChild><span><ImagePlus className="h-4 w-4" /></span></Button>
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadLogo(coin, f); e.target.value = ""; }} />
                    </label>
                    <Button variant="outline" size="sm" onClick={() => startEdit(coin)}>Edit</Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteCoin(coin)} title="Delete permanently"><Trash2 className="h-4 w-4 text-loss" /></Button>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* ─────────────── OPERATIONS ─────────────── */}
          <TabsContent value="ops" className="space-y-3">
            <SettingsCard title="Site Status" icon={<Power className="h-4 w-4" />}>
              <ToggleRow label="Maintenance mode" desc="Hides exchange from non-admins" checked={settings.maintenance_mode}
                onChange={(v) => persistSettings({ ...settings, maintenance_mode: v })} />
              <Field label="Maintenance message" value={settings.maintenance_message}
                onChange={(v) => setSettings({ ...settings, maintenance_message: v })} onBlur={() => persistSettings(settings)} />
              <ToggleRow label="Pause all trading" checked={settings.trading_paused} onChange={(v) => persistSettings({ ...settings, trading_paused: v })} />
              <ToggleRow label="Pause deposits" checked={settings.deposits_paused} onChange={(v) => persistSettings({ ...settings, deposits_paused: v })} />
              <ToggleRow label="Pause withdrawals" checked={settings.withdrawals_paused} onChange={(v) => persistSettings({ ...settings, withdrawals_paused: v })} />
            </SettingsCard>
            <SettingsCard title="Banner & Announcements" icon={<Activity className="h-4 w-4" />}>
              <Field label="Banner title" value={settings.banner_title} onChange={(v) => setSettings({ ...settings, banner_title: v })} onBlur={() => persistSettings(settings)} />
              <Field label="Banner subtitle" value={settings.banner_subtitle} onChange={(v) => setSettings({ ...settings, banner_subtitle: v })} onBlur={() => persistSettings(settings)} />
              <div className="space-y-1">
                <Label className="text-xs">Site-wide announcement</Label>
                <Textarea rows={3} value={settings.announcement} onChange={(e) => setSettings({ ...settings, announcement: e.target.value })}
                  onBlur={() => persistSettings(settings)} placeholder="e.g. New listing: GHOST/USDT live now" />
              </div>
            </SettingsCard>
          </TabsContent>

          {/* ─────────────── TRADING ─────────────── */}
          <TabsContent value="trading" className="space-y-3">
            <SettingsCard title="Fee Schedule" icon={<BarChart3 className="h-4 w-4" />}>
              <NumberField label="Maker fee %" value={settings.maker_fee_pct} step={0.01} onChange={(v) => setSettings({ ...settings, maker_fee_pct: v })} onBlur={() => persistSettings(settings)} />
              <NumberField label="Taker fee %" value={settings.taker_fee_pct} step={0.01} onChange={(v) => setSettings({ ...settings, taker_fee_pct: v })} onBlur={() => persistSettings(settings)} />
              <NumberField label="Withdrawal fee %" value={settings.withdrawal_fee_pct} step={0.01} onChange={(v) => setSettings({ ...settings, withdrawal_fee_pct: v })} onBlur={() => persistSettings(settings)} />
              <NumberField label="Min trade (USD)" value={settings.min_trade_usd} onChange={(v) => setSettings({ ...settings, min_trade_usd: v })} onBlur={() => persistSettings(settings)} />
              <NumberField label="Max trade (USD)" value={settings.max_trade_usd} onChange={(v) => setSettings({ ...settings, max_trade_usd: v })} onBlur={() => persistSettings(settings)} />
            </SettingsCard>
            <SettingsCard title="Order Book & Liquidity" icon={<Zap className="h-4 w-4" />}>
              <NumberField label="Liquidity seed (ETH)" value={settings.liquidity_seed_eth} onChange={(v) => setSettings({ ...settings, liquidity_seed_eth: v })} onBlur={() => persistSettings(settings)} />
              <ToggleRow label="Market maker bot" desc="Simulated order book activity" checked={settings.market_maker_bot} onChange={(v) => persistSettings({ ...settings, market_maker_bot: v })} />
              <ToggleRow label="Fake trades ticker" checked={settings.fake_ticker_enabled} onChange={(v) => persistSettings({ ...settings, fake_ticker_enabled: v })} />
              <NumberField label="Ticker speed (s)" value={settings.fake_ticker_speed} onChange={(v) => setSettings({ ...settings, fake_ticker_speed: v })} onBlur={() => persistSettings(settings)} />
            </SettingsCard>
          </TabsContent>

          {/* ─────────────── WALLETS ─────────────── */}
          <TabsContent value="wallets" className="space-y-3">
            <div className="rounded-xl border border-border bg-card p-3">
              <p className="text-sm text-muted-foreground mb-3">Hot/cold wallet display addresses per coin. Edit a coin to change these — shown to users on deposit/withdraw screens.</p>
              <div className="space-y-2">
                {coins.filter((c) => c.hot_wallet_address || c.cold_wallet_address).slice(0, 20).map((c) => (
                  <div key={c.id} className="rounded-lg border border-border bg-secondary/40 p-2 text-xs">
                    <p className="font-bold">{c.symbol}</p>
                    {c.hot_wallet_address && <p className="text-muted-foreground truncate">Hot: {c.hot_wallet_address}</p>}
                    {c.cold_wallet_address && <p className="text-muted-foreground truncate">Cold: {c.cold_wallet_address}</p>}
                  </div>
                ))}
                {coins.every((c) => !c.hot_wallet_address && !c.cold_wallet_address) && (
                  <p className="text-xs text-muted-foreground text-center py-4">No wallet addresses configured. Edit a coin to add them.</p>
                )}
              </div>
            </div>
          </TabsContent>

          {/* ─────────────── LAUNCHPAD ─────────────── */}
          <TabsContent value="launchpad" className="space-y-3">
            <SettingsCard title="Launchpad / IEO" icon={<Rocket className="h-4 w-4" />}>
              <ToggleRow label="Launchpad enabled" checked={settings.launchpad_enabled} onChange={(v) => persistSettings({ ...settings, launchpad_enabled: v })} />
              <ToggleRow label="Staking pools" checked={settings.staking_enabled} onChange={(v) => persistSettings({ ...settings, staking_enabled: v })} />
              <ToggleRow label="P2P desk" checked={settings.p2p_enabled} onChange={(v) => persistSettings({ ...settings, p2p_enabled: v })} />
            </SettingsCard>
            <div className="rounded-xl border border-border bg-card p-3">
              <p className="text-sm font-bold mb-2">Scheduled listings</p>
              {coins.filter((c) => c.status === "scheduled" && c.scheduled_listing_at).length === 0 && (
                <p className="text-xs text-muted-foreground">No scheduled listings. Edit a coin and set status = scheduled with a go-live time.</p>
              )}
              {coins.filter((c) => c.status === "scheduled" && c.scheduled_listing_at).map((c) => (
                <div key={c.id} className="flex items-center justify-between rounded-lg bg-secondary/40 p-2 text-sm">
                  <span><b>{c.symbol}</b> · {c.name}</span>
                  <span className="text-xs text-muted-foreground">{new Date(c.scheduled_listing_at!).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* ─────────────── COMPLIANCE ─────────────── */}
          <TabsContent value="compliance" className="space-y-3">
            <SettingsCard title="Compliance & AML" icon={<Lock className="h-4 w-4" />}>
              <ToggleRow label="Strict AML mode" desc="Adds extra checks (placeholder)" checked={settings.aml_strict} onChange={(v) => persistSettings({ ...settings, aml_strict: v })} />
              <Field label="IP geo-block list (comma-sep ISO codes)" value={settings.ip_geo_block} onChange={(v) => setSettings({ ...settings, ip_geo_block: v })} onBlur={() => persistSettings(settings)} placeholder="US, CN, KP" />
              <NumberField label="Referral payout %" value={settings.referral_pct} onChange={(v) => setSettings({ ...settings, referral_pct: v })} onBlur={() => persistSettings(settings)} />
            </SettingsCard>
          </TabsContent>

          {/* ─────────────── AUDIT ─────────────── */}
          <TabsContent value="audit" className="space-y-3">
            <div className="rounded-xl border border-border bg-card divide-y divide-border max-h-[500px] overflow-auto">
              {auditLog.length === 0 && <p className="p-4 text-sm text-muted-foreground text-center">No audit entries yet.</p>}
              {auditLog.map((e) => (
                <div key={e.id} className="p-3 text-xs">
                  <p className="font-bold">{e.action} <span className="text-muted-foreground font-normal">on {e.target_type}{e.target_id ? ` #${e.target_id.slice(0, 8)}` : ""}</span></p>
                  <p className="text-muted-foreground">{new Date(e.created_at).toLocaleString()}</p>
                  {Object.keys(e.metadata || {}).length > 0 && (
                    <pre className="mt-1 text-[10px] bg-secondary/40 rounded p-1 overflow-x-auto">{JSON.stringify(e.metadata, null, 2)}</pre>
                  )}
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
      <BottomNav />
    </div>
  );
}

/* ──────────────── helpers ──────────────── */

function SettingsCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3 space-y-3">
      <div className="flex items-center gap-2 font-display font-bold text-sm">{icon} {title}</div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function ToggleRow({ label, desc, checked, onChange }: { label: string; desc?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-secondary/40 p-2">
      <div>
        <p className="text-sm font-semibold">{label}</p>
        {desc && <p className="text-[10px] text-muted-foreground">{desc}</p>}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function Field({ label, value, onChange, onBlur, placeholder }: { label: string; value: string; onChange: (v: string) => void; onBlur?: () => void; placeholder?: string }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input value={value ?? ""} onChange={(e) => onChange(e.target.value)} onBlur={onBlur} placeholder={placeholder} />
    </div>
  );
}

function NumberField({ label, value, onChange, onBlur, step }: { label: string; value: number; onChange: (v: number) => void; onBlur?: () => void; step?: number }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input type="number" step={step ?? 1} value={value ?? 0} onChange={(e) => onChange(Number(e.target.value))} onBlur={onBlur} />
    </div>
  );
}

function CoinEditor({ draft, isNew, onChange, onUpload, onSave, onCancel }: {
  draft: Partial<Coin>; isNew: boolean;
  onChange: (patch: Partial<Coin>) => void;
  onUpload: (file: File) => void;
  onSave: () => void; onCancel: () => void;
}) {
  return (
    <div className="rounded-xl border-2 border-primary/40 bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-black">{isNew ? "List new coin" : `Edit ${draft.symbol}`}</h3>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
          <Button variant="gold" size="sm" onClick={onSave}>{isNew ? "List coin" : "Save"}</Button>
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="flex items-center gap-3">
          <div className="h-16 w-16 rounded-full bg-secondary border border-border overflow-hidden grid place-items-center font-display font-black text-primary shrink-0">
            {draft.logo_url ? <img src={draft.logo_url} alt="logo" className="h-full w-full object-cover" /> : <span>{draft.fallback_icon || draft.symbol?.slice(0, 2) || "?"}</span>}
          </div>
          <label className="cursor-pointer">
            <Button variant="outline" size="sm" asChild><span><ImagePlus className="h-4 w-4 mr-1" /> Upload logo</span></Button>
            <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); e.target.value = ""; }} />
          </label>
        </div>
        <Field label="Fallback icon (emoji or letters)" value={draft.fallback_icon ?? ""} onChange={(v) => onChange({ fallback_icon: v })} />
        <Field label="Symbol *" value={draft.symbol ?? ""} onChange={(v) => onChange({ symbol: v.toUpperCase() })} placeholder="BTC" />
        <Field label="Name *" value={draft.name ?? ""} onChange={(v) => onChange({ name: v })} placeholder="Bitcoin" />
        <Field label="CoinGecko ID" value={draft.coingecko_id ?? ""} onChange={(v) => onChange({ coingecko_id: v })} placeholder="bitcoin" />
        <div className="space-y-1">
          <Label className="text-xs">Network</Label>
          <Select value={draft.network ?? "Ethereum"} onValueChange={(v) => onChange({ network: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{NETWORKS.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Sector</Label>
          <Select value={draft.sector ?? "Majors"} onValueChange={(v) => onChange({ sector: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{SECTORS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Status</Label>
          <Select value={draft.status ?? "listed"} onValueChange={(v) => onChange({ status: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <NumberField label="Price (USD)" step={0.0001} value={draft.price_usd ?? 0} onChange={(v) => onChange({ price_usd: v })} />
        <NumberField label="24h change %" step={0.01} value={draft.change_24h ?? 0} onChange={(v) => onChange({ change_24h: v })} />
        <NumberField label="24h volume" value={draft.volume_24h ?? 0} onChange={(v) => onChange({ volume_24h: v })} />
        <NumberField label="Market cap" value={draft.market_cap ?? 0} onChange={(v) => onChange({ market_cap: v })} />
        <NumberField label="Circulating supply" value={draft.circulating_supply ?? 0} onChange={(v) => onChange({ circulating_supply: v })} />
        <NumberField label="Risk score (0-100)" value={draft.risk_score ?? 30} onChange={(v) => onChange({ risk_score: v })} />
        <NumberField label="Withdrawal min" step={0.0001} value={draft.withdrawal_min ?? 0} onChange={(v) => onChange({ withdrawal_min: v })} />
        <NumberField label="Withdrawal fee" step={0.0001} value={draft.withdrawal_fee ?? 0} onChange={(v) => onChange({ withdrawal_fee: v })} />
        <NumberField label="Daily withdraw limit" value={draft.daily_withdraw_limit ?? 0} onChange={(v) => onChange({ daily_withdraw_limit: v })} />
        <NumberField label="KYC tier required" value={draft.kyc_tier_required ?? 0} onChange={(v) => onChange({ kyc_tier_required: v })} />
        <NumberField label="Display order" value={draft.display_order ?? 0} onChange={(v) => onChange({ display_order: v })} />
        <Field label="Contract address" value={draft.contract_address ?? ""} onChange={(v) => onChange({ contract_address: v })} />
        <Field label="Hot wallet address" value={draft.hot_wallet_address ?? ""} onChange={(v) => onChange({ hot_wallet_address: v })} />
        <Field label="Cold wallet address" value={draft.cold_wallet_address ?? ""} onChange={(v) => onChange({ cold_wallet_address: v })} />
        <Field label="Website URL" value={draft.website_url ?? ""} onChange={(v) => onChange({ website_url: v })} />
        <Field label="Whitepaper URL" value={draft.whitepaper_url ?? ""} onChange={(v) => onChange({ whitepaper_url: v })} />
        <div className="md:col-span-2 space-y-1">
          <Label className="text-xs">Scheduled listing (ISO datetime, optional)</Label>
          <Input type="datetime-local" value={draft.scheduled_listing_at ? new Date(draft.scheduled_listing_at).toISOString().slice(0, 16) : ""}
            onChange={(e) => onChange({ scheduled_listing_at: e.target.value ? new Date(e.target.value).toISOString() : null })} />
        </div>
        <div className="md:col-span-2 space-y-1">
          <Label className="text-xs">Description</Label>
          <Textarea rows={2} value={draft.description ?? ""} onChange={(e) => onChange({ description: e.target.value })} />
        </div>
      </div>
      <div className="grid gap-2 md:grid-cols-4">
        <ToggleRow label="Featured" checked={!!draft.is_featured} onChange={(v) => onChange({ is_featured: v })} />
        <ToggleRow label="Trading enabled" checked={draft.is_trading_enabled !== false} onChange={(v) => onChange({ is_trading_enabled: v })} />
        <ToggleRow label="Deposits enabled" checked={draft.is_deposit_enabled !== false} onChange={(v) => onChange({ is_deposit_enabled: v })} />
        <ToggleRow label="Withdrawals enabled" checked={draft.is_withdraw_enabled !== false} onChange={(v) => onChange({ is_withdraw_enabled: v })} />
      </div>
    </div>
  );
}