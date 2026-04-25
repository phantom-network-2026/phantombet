import { useState, useEffect, useRef, ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Header } from "@/components/casino/Header";
import { toast } from "sonner";
import { HouseEdgePanel } from "@/components/casino/HouseEdgePanel";
import { GameProbabilityPanel } from "@/components/casino/GameProbabilityPanel";
import { BonusProbabilityPanel } from "@/components/casino/BonusProbabilityPanel";
import { SlotsConfigPanel } from "@/components/casino/SlotsConfigPanel";
import { PromotionsManager } from "@/components/casino/PromotionsManager";
import DevConsole from "@/components/casino/DevConsole";
import AiAgentPanel from "@/components/casino/AiAgentPanel";
import { AdminInner } from "./Admin";
import {
  ArrowLeft, FolderOpen, Database, Settings, Upload, Trash2, Download,
  RefreshCw, Search, Table, FileText, Eye, EyeOff, ChevronRight, ChevronDown, ChevronUp,
  File, Image, Music, Video, Archive, Code, Globe, Shield,
  AlertTriangle, Activity, Lock, Megaphone, HardDrive, Clock,
  Ban, Users, BarChart3, Wrench, Power, Bell, Percent, Trophy,
  Gamepad2, CreditCard, MessageSquare, UserCheck, Zap, LayoutGrid,
  Info, Server, Hash, Gift, Wallet, Terminal, Sparkles, ImagePlus
} from "lucide-react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

// ── Collapsible Section (like cPanel categories) ────────────────
function CpanelSection({ title, icon, children, defaultOpen = true }: {
  title: string; icon: ReactNode; children: ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-3.5 bg-secondary/60 hover:bg-secondary/80 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="text-casino-gold">{icon}</div>
          <h2 className="font-display text-base font-bold tracking-wide">{title}</h2>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>
      {open && <div className="p-5">{children}</div>}
    </div>
  );
}

// ── Tool Card (icon grid item) ──────────────────────────────────
function ToolCard({ icon, label, onClick, active }: {
  icon: ReactNode; label: string; onClick: () => void; active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all text-center hover:bg-secondary/50 hover:border-casino-gold/40 ${
        active ? "bg-casino-gold/10 border-casino-gold/50 shadow-sm" : "border-transparent"
      }`}
    >
      <div className={`${active ? "text-casino-gold" : "text-muted-foreground"}`}>{icon}</div>
      <span className={`text-xs font-medium leading-tight ${active ? "text-casino-gold" : "text-foreground"}`}>{label}</span>
    </button>
  );
}

// ── Stat Card ───────────────────────────────────────────────────
function StatCard({ icon, label, value, color }: {
  icon: ReactNode; label: string; value: string | number; color: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg bg-secondary/40 border border-border p-3">
      <div className={color}>{icon}</div>
      <div>
        <p className="font-display text-sm font-bold">{value}</p>
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
      </div>
    </div>
  );
}

// ── Panel Wrapper (for drill-down views) ────────────────────────
function PanelView({ title, onBack, children }: {
  title: string; onBack: () => void; children: ReactNode;
}) {
  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-casino-gold hover:underline">
        <ArrowLeft className="h-4 w-4" /> Back to Tools
      </button>
      <h3 className="font-display text-lg font-bold">{title}</h3>
      {children}
    </div>
  );
}

// ── Helpers ─────────────────────────────────────────────────────
interface StorageFile {
  name: string; id: string; created_at: string; updated_at: string;
  metadata: { size?: number; mimetype?: string } | null;
}

function getFileIcon(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  if (["jpg","jpeg","png","gif","svg","webp","ico"].includes(ext)) return <Image className="h-4 w-4 text-purple-400" />;
  if (["mp3","wav","ogg","m4a"].includes(ext)) return <Music className="h-4 w-4 text-pink-400" />;
  if (["mp4","webm","mov","avi"].includes(ext)) return <Video className="h-4 w-4 text-blue-400" />;
  if (["zip","tar","gz","rar","7z"].includes(ext)) return <Archive className="h-4 w-4 text-yellow-400" />;
  if (["js","ts","tsx","jsx","html","css","json","xml","sql"].includes(ext)) return <Code className="h-4 w-4 text-green-400" />;
  return <File className="h-4 w-4 text-muted-foreground" />;
}

function formatFileSize(bytes?: number) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

// ── File Manager ────────────────────────────────────────────────
function FileManager({ onBack }: { onBack: () => void }) {
  const [files, setFiles] = useState<StorageFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPath, setCurrentPath] = useState("");
  const [selectedBucket, setSelectedBucket] = useState("admin-files");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const buckets = ["admin-files", "avatars"];

  const fetchFiles = async () => {
    setLoading(true);
    const { data, error } = await supabase.storage.from(selectedBucket).list(currentPath || "", { limit: 200, sortBy: { column: "name", order: "asc" } });
    if (error) { toast.error("Failed to load files"); setLoading(false); return; }
    setFiles((data || []) as StorageFile[]);
    setLoading(false);
  };

  useEffect(() => { fetchFiles(); }, [currentPath, selectedBucket]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadFiles = e.target.files;
    if (!uploadFiles?.length) return;
    setUploading(true);
    let success = 0;
    for (const file of Array.from(uploadFiles)) {
      const path = currentPath ? `${currentPath}/${file.name}` : file.name;
      const { error } = await supabase.storage.from(selectedBucket).upload(path, file, { upsert: true });
      if (error) { toast.error(`Failed: ${file.name}`); } else { success++; }
    }
    if (success) toast.success(`${success} file(s) uploaded`);
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    fetchFiles();
  };

  const handleDelete = async (name: string) => {
    const path = currentPath ? `${currentPath}/${name}` : name;
    const { error } = await supabase.storage.from(selectedBucket).remove([path]);
    if (error) { toast.error("Failed to delete"); return; }
    toast.success(`Deleted ${name}`); fetchFiles();
  };

  const getPublicUrl = (name: string) => {
    const path = currentPath ? `${currentPath}/${name}` : name;
    return `${SUPABASE_URL}/storage/v1/object/public/${selectedBucket}/${path}`;
  };

  const handleCopyUrl = (name: string) => {
    navigator.clipboard.writeText(getPublicUrl(name));
    toast.success("URL copied");
  };

  const filtered = files.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const isImage = (name: string) => /\.(jpg|jpeg|png|gif|svg|webp|ico)$/i.test(name);

  return (
    <PanelView title="File Manager" onBack={onBack}>
      <div className="flex items-center gap-2 flex-wrap">
        {buckets.map(b => (
          <Button key={b} variant={selectedBucket === b ? "gold" : "outline"} size="sm" onClick={() => { setSelectedBucket(b); setCurrentPath(""); }}>
            <HardDrive className="h-3 w-3 mr-1" /> {b}
          </Button>
        ))}
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <Button variant="outline" size="sm" onClick={fetchFiles} disabled={loading}>
          <RefreshCw className={`h-3 w-3 mr-1 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
        <Button variant="gold" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
          <Upload className="h-3 w-3 mr-1" /> {uploading ? "Uploading..." : "Upload Files"}
        </Button>
        <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleUpload} />
      </div>
      <div className="flex items-center gap-1 text-sm">
        <button onClick={() => setCurrentPath("")} className="text-casino-gold hover:underline font-medium">Root</button>
        {currentPath.split("/").filter(Boolean).map((part, i, arr) => (
          <span key={i} className="flex items-center gap-1">
            <ChevronRight className="h-3 w-3 text-muted-foreground" />
            <button onClick={() => setCurrentPath(arr.slice(0, i + 1).join("/"))} className="text-casino-gold hover:underline font-medium">{part}</button>
          </span>
        ))}
      </div>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search files..." className="pl-9 bg-background border-border" />
      </div>
      {currentPath && (
        <button onClick={() => setCurrentPath(prev => { const p = prev.split("/"); p.pop(); return p.join("/"); })} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3 w-3" /> Back
        </button>
      )}
      {loading ? <p className="text-muted-foreground text-sm">Loading files...</p> : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <FolderOpen className="h-12 w-12 mx-auto mb-3 opacity-30" /><p className="text-sm">No files found</p>
        </div>
      ) : (
        <div className="space-y-1">
          {filtered.map(file => {
            const isFolder = !file.metadata?.mimetype && !file.id;
            return (
              <div key={file.name} className="flex items-center gap-3 rounded-lg bg-card border border-border p-3 hover:bg-secondary/50 transition-colors">
                {isFolder ? (
                  <button onClick={() => setCurrentPath(prev => prev ? `${prev}/${file.name}` : file.name)} className="flex items-center gap-2 flex-1 min-w-0">
                    <FolderOpen className="h-4 w-4 text-casino-gold shrink-0" />
                    <span className="text-sm font-medium truncate">{file.name}</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {getFileIcon(file.name)}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{file.name}</p>
                      <p className="text-xs text-muted-foreground">{formatFileSize(file.metadata?.size)} · {new Date(file.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                )}
                {!isFolder && (
                  <div className="flex items-center gap-1 shrink-0">
                    {isImage(file.name) && (
                      <a href={getPublicUrl(file.name)} target="_blank" rel="noopener noreferrer">
                        <Button variant="ghost" size="icon" className="h-7 w-7"><Eye className="h-3 w-3" /></Button>
                      </a>
                    )}
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleCopyUrl(file.name)}><Globe className="h-3 w-3" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(file.name)}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </PanelView>
  );
}

// ── Database Manager ────────────────────────────────────────────
const DB_TABLES = [
  "profiles","games","transactions","site_settings","user_roles",
  "user_presence","friendships","messages","game_chat","chat_bans",
  "moderation_log","scratch_card_pool","daily_spins"
];

function DatabaseManager({ onBack }: { onBack: () => void }) {
  const [selectedTable, setSelectedTable] = useState("profiles");
  const [rows, setRows] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [rowCount, setRowCount] = useState(0);
  const [page, setPage] = useState(0);
  const pageSize = 25;

  const fetchTable = async (table: string, pageNum = 0) => {
    setLoading(true); setSelectedTable(table); setPage(pageNum);
    const from = pageNum * pageSize;
    const { data, error, count } = await supabase.from(table as any).select("*", { count: "exact" }).range(from, from + pageSize - 1).order("created_at", { ascending: false });
    if (error) { toast.error(`Failed to load ${table}`); setLoading(false); return; }
    const d = (data || []) as any[];
    setRows(d); setRowCount(count || 0);
    if (d.length > 0) setColumns(Object.keys(d[0]));
    setLoading(false);
  };

  useEffect(() => { fetchTable("profiles"); }, []);

  const exportCSV = () => {
    if (!rows.length) return;
    const csv = [columns.join(","), ...rows.map(r => columns.map(c => {
      const v = r[c]; if (v == null) return "";
      const s = typeof v === "object" ? JSON.stringify(v) : String(v);
      return `"${s.replace(/"/g, '""')}"`;
    }).join(","))].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `${selectedTable}_export.csv`; a.click();
    toast.success("CSV exported");
  };

  const exportAllTables = async () => {
    toast.info("Exporting all tables...");
    for (const table of DB_TABLES) {
      const { data } = await supabase.from(table as any).select("*");
      if (!data?.length) continue;
      const cols = Object.keys(data[0]);
      const csv = [cols.join(","), ...data.map((r: any) => cols.map(c => {
        const v = r[c]; if (v == null) return "";
        const s = typeof v === "object" ? JSON.stringify(v) : String(v);
        return `"${s.replace(/"/g, '""')}"`;
      }).join(","))].join("\n");
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
      a.download = `${table}_backup_${new Date().toISOString().split("T")[0]}.csv`; a.click();
    }
    toast.success("All tables exported");
  };

  const totalPages = Math.ceil(rowCount / pageSize);
  const truncate = (val: any) => {
    if (val == null) return "—";
    const s = typeof val === "object" ? JSON.stringify(val) : String(val);
    return s.length > 50 ? s.slice(0, 47) + "..." : s;
  };

  return (
    <PanelView title="Database Manager" onBack={onBack}>
      <div className="flex flex-wrap gap-2">
        {DB_TABLES.map(t => (
          <Button key={t} variant={selectedTable === t ? "gold" : "outline"} size="sm" onClick={() => fetchTable(t, 0)} className="text-xs">
            <Table className="h-3 w-3 mr-1" /> {t}
          </Button>
        ))}
      </div>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <p className="text-sm text-muted-foreground"><span className="font-medium text-foreground">{selectedTable}</span> · {rowCount} rows</p>
          <Button variant="outline" size="sm" onClick={() => fetchTable(selectedTable, page)}>
            <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV} disabled={!rows.length}>
            <Download className="h-3 w-3 mr-1" /> Export Table
          </Button>
          <Button variant="outline" size="sm" onClick={exportAllTables}>
            <Download className="h-3 w-3 mr-1" /> Full Backup
          </Button>
        </div>
      </div>
      {loading ? <p className="text-muted-foreground text-sm">Loading...</p> : rows.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground"><Database className="h-12 w-12 mx-auto mb-3 opacity-30" /><p className="text-sm">No data</p></div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-xs">
            <thead><tr className="bg-secondary">
              {columns.map(c => <th key={c} className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap border-b border-border">{c}</th>)}
            </tr></thead>
            <tbody>
              {rows.map((r, i) => <tr key={i} className="border-b border-border/50 hover:bg-secondary/30">
                {columns.map(c => <td key={c} className="px-3 py-2 whitespace-nowrap max-w-[200px] truncate" title={String(r[c] ?? "")}>{truncate(r[c])}</td>)}
              </tr>)}
            </tbody>
          </table>
        </div>
      )}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => fetchTable(selectedTable, page - 1)}>Prev</Button>
          <span className="text-sm text-muted-foreground">Page {page + 1} / {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => fetchTable(selectedTable, page + 1)}>Next</Button>
        </div>
      )}
    </PanelView>
  );
}

// ── Site Configuration ──────────────────────────────────────────
function SiteConfiguration({ onBack }: { onBack: () => void }) {
  const [settings, setSettings] = useState<{ key: string; value: any; id: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const fetchSettings = async () => {
    setLoading(true);
    const { data } = await supabase.from("site_settings").select("*").order("key");
    setSettings((data || []) as any[]);
    setLoading(false);
  };
  useEffect(() => { fetchSettings(); }, []);

  const handleAdd = async () => {
    if (!newKey.trim()) { toast.error("Key is required"); return; }
    let parsed: any;
    try { parsed = JSON.parse(newValue); } catch { parsed = newValue; }
    const { error } = await supabase.from("site_settings").insert({ key: newKey.trim(), value: parsed });
    if (error) { toast.error("Failed to add"); return; }
    toast.success("Setting added"); setNewKey(""); setNewValue(""); fetchSettings();
  };

  const handleUpdate = async (id: string) => {
    let parsed: any;
    try { parsed = JSON.parse(editValue); } catch { parsed = editValue; }
    const { error } = await supabase.from("site_settings").update({ value: parsed }).eq("id", id);
    if (error) { toast.error("Failed to update"); return; }
    toast.success("Updated"); setEditingId(null); setEditValue(""); fetchSettings();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("site_settings").delete().eq("id", id);
    toast.success("Deleted"); fetchSettings();
  };

  return (
    <PanelView title="Site Configuration" onBack={onBack}>
      <div className="rounded-lg bg-card border border-border p-4 space-y-3">
        <p className="text-sm font-bold flex items-center gap-2"><Settings className="h-4 w-4 text-casino-gold" /> Add New Setting</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div><Label className="text-xs">Key</Label><Input value={newKey} onChange={e => setNewKey(e.target.value)} placeholder="setting_name" className="bg-background border-border" /></div>
          <div><Label className="text-xs">Value (JSON or text)</Label><Input value={newValue} onChange={e => setNewValue(e.target.value)} placeholder='{"enabled": true}' className="bg-background border-border" /></div>
        </div>
        <Button variant="gold" size="sm" onClick={handleAdd}>Add Setting</Button>
      </div>
      {loading ? <p className="text-muted-foreground text-sm">Loading...</p> : settings.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground"><Settings className="h-12 w-12 mx-auto mb-3 opacity-30" /><p className="text-sm">No settings</p></div>
      ) : (
        <div className="space-y-2">
          {settings.map(s => (
            <div key={s.id} className="rounded-lg bg-card border border-border p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-casino-gold">{s.key}</p>
                  {editingId === s.id ? (
                    <div className="mt-2 space-y-2">
                      <Input value={editValue} onChange={e => setEditValue(e.target.value)} className="bg-background border-border text-xs" />
                      <div className="flex gap-2">
                        <Button variant="gold" size="sm" onClick={() => handleUpdate(s.id)}>Save</Button>
                        <Button variant="outline" size="sm" onClick={() => setEditingId(null)}>Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <pre className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap break-all max-h-24 overflow-y-auto">{JSON.stringify(s.value, null, 2)}</pre>
                  )}
                </div>
                {editingId !== s.id && (
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingId(s.id); setEditValue(JSON.stringify(s.value)); }}><FileText className="h-3 w-3" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(s.id)}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </PanelView>
  );
}

// ── Security Center ─────────────────────────────────────────────
function SecurityCenter({ onBack }: { onBack: () => void }) {
  const [bans, setBans] = useState<any[]>([]);
  const [modLog, setModLog] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    const [bansRes, logRes] = await Promise.all([
      supabase.from("chat_bans").select("*").order("created_at", { ascending: false }).limit(50),
      supabase.from("moderation_log").select("*").order("created_at", { ascending: false }).limit(100),
    ]);
    setBans((bansRes.data || []) as any[]);
    setModLog((logRes.data || []) as any[]);
    setLoading(false);
  };
  useEffect(() => { fetchData(); }, []);

  const handleUnban = async (id: string) => {
    await supabase.from("chat_bans").update({ is_active: false }).eq("id", id);
    toast.success("User unbanned"); fetchData();
  };

  return (
    <PanelView title="Security Center" onBack={onBack}>
      <div>
        <h3 className="text-sm font-bold flex items-center gap-2 mb-3"><Ban className="h-4 w-4 text-destructive" /> Active Bans ({bans.filter(b => b.is_active).length})</h3>
        {loading ? <p className="text-muted-foreground text-sm">Loading...</p> : bans.filter(b => b.is_active).length === 0 ? (
          <p className="text-sm text-muted-foreground">No active bans</p>
        ) : (
          <div className="space-y-2">
            {bans.filter(b => b.is_active).map(b => (
              <div key={b.id} className="rounded-lg bg-card border border-border p-3 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-mono truncate">User: {b.user_id.slice(0, 8)}...</p>
                  <p className="text-xs text-muted-foreground">Room: {b.game_room || "Global"} · {b.reason || "No reason"}</p>
                  <p className="text-xs text-muted-foreground">{new Date(b.created_at).toLocaleString()}{b.expires_at && ` · Expires: ${new Date(b.expires_at).toLocaleString()}`}</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => handleUnban(b.id)}>Unban</Button>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="mt-6">
        <h3 className="text-sm font-bold flex items-center gap-2 mb-3"><Activity className="h-4 w-4 text-casino-gold" /> Moderation Log (Last 100)</h3>
        {modLog.length === 0 ? <p className="text-sm text-muted-foreground">No moderation actions</p> : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-xs">
              <thead><tr className="bg-secondary">
                <th className="px-3 py-2 text-left border-b border-border">Action</th>
                <th className="px-3 py-2 text-left border-b border-border">Target</th>
                <th className="px-3 py-2 text-left border-b border-border">Moderator</th>
                <th className="px-3 py-2 text-left border-b border-border">Room</th>
                <th className="px-3 py-2 text-left border-b border-border">Reason</th>
                <th className="px-3 py-2 text-left border-b border-border">Date</th>
              </tr></thead>
              <tbody>
                {modLog.map(l => (
                  <tr key={l.id} className="border-b border-border/50 hover:bg-secondary/30">
                    <td className="px-3 py-2 font-medium">{l.action_type}</td>
                    <td className="px-3 py-2 font-mono">{l.target_user_id?.slice(0, 8)}...</td>
                    <td className="px-3 py-2 font-mono">{l.moderator_id?.slice(0, 8)}...</td>
                    <td className="px-3 py-2">{l.game_room || "—"}</td>
                    <td className="px-3 py-2 max-w-[150px] truncate">{l.reason || "—"}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{new Date(l.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PanelView>
  );
}

// ── Maintenance & Announcements ─────────────────────────────────
function MaintenancePanel({ onBack }: { onBack: () => void }) {
  const [maintenance, setMaintenance] = useState(false);
  const [maintenanceMsg, setMaintenanceMsg] = useState("We're performing scheduled maintenance. Please check back soon.");
  const [announcement, setAnnouncement] = useState("");
  const [announcementActive, setAnnouncementActive] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    const [maint, ann] = await Promise.all([
      supabase.from("site_settings").select("value").eq("key", "maintenance_mode").maybeSingle(),
      supabase.from("site_settings").select("value").eq("key", "announcement").maybeSingle(),
    ]);
    if (maint.data?.value) { const v = maint.data.value as any; setMaintenance(v.enabled || false); setMaintenanceMsg(v.message || ""); }
    if (ann.data?.value) { const v = ann.data.value as any; setAnnouncementActive(v.active || false); setAnnouncement(v.text || ""); }
    setLoading(false);
  };
  useEffect(() => { fetchData(); }, []);

  const saveSetting = async (key: string, value: any) => {
    const { data: existing } = await supabase.from("site_settings").select("id").eq("key", key).maybeSingle();
    if (existing) { await supabase.from("site_settings").update({ value }).eq("key", key); }
    else { await supabase.from("site_settings").insert({ key, value }); }
  };

  const handleToggleMaintenance = async (checked: boolean) => {
    setMaintenance(checked);
    await saveSetting("maintenance_mode", { enabled: checked, message: maintenanceMsg });
    toast.success(checked ? "Maintenance mode ON" : "Maintenance mode OFF");
  };

  const handleSaveMaintenanceMsg = async () => {
    await saveSetting("maintenance_mode", { enabled: maintenance, message: maintenanceMsg });
    toast.success("Maintenance message saved");
  };

  const handleToggleAnnouncement = async (checked: boolean) => {
    setAnnouncementActive(checked);
    await saveSetting("announcement", { active: checked, text: announcement });
    toast.success(checked ? "Announcement live" : "Announcement hidden");
  };

  const handleSaveAnnouncement = async () => {
    await saveSetting("announcement", { active: announcementActive, text: announcement });
    toast.success("Announcement saved");
  };

  if (loading) return <PanelView title="Maintenance & Announcements" onBack={onBack}><p className="text-muted-foreground text-sm">Loading...</p></PanelView>;

  return (
    <PanelView title="Maintenance & Announcements" onBack={onBack}>
      <div className="rounded-lg bg-card border border-border p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-destructive" />
            <div><p className="font-bold text-sm">Maintenance Mode</p><p className="text-xs text-muted-foreground">When ON, non-admin users see a maintenance page</p></div>
          </div>
          <Switch checked={maintenance} onCheckedChange={handleToggleMaintenance} />
        </div>
        {maintenance && <p className="text-xs text-destructive font-medium">⚠️ ACTIVE — Site is in maintenance mode</p>}
        <div>
          <Label className="text-xs">Maintenance Message</Label>
          <Textarea value={maintenanceMsg} onChange={e => setMaintenanceMsg(e.target.value)} className="bg-background border-border text-xs mt-1" rows={3} />
          <Button variant="outline" size="sm" className="mt-2" onClick={handleSaveMaintenanceMsg}>Save Message</Button>
        </div>
      </div>
      <div className="rounded-lg bg-card border border-border p-4 space-y-3 mt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-casino-gold" />
            <div><p className="font-bold text-sm">Site Announcement</p><p className="text-xs text-muted-foreground">Show a banner across the site</p></div>
          </div>
          <Switch checked={announcementActive} onCheckedChange={handleToggleAnnouncement} />
        </div>
        <div>
          <Label className="text-xs">Announcement Text</Label>
          <Textarea value={announcement} onChange={e => setAnnouncement(e.target.value)} className="bg-background border-border text-xs mt-1" rows={2} placeholder="🎉 Welcome bonus!" />
          <Button variant="outline" size="sm" className="mt-2" onClick={handleSaveAnnouncement}>Save Announcement</Button>
        </div>
        {announcementActive && announcement && (
          <div className="rounded-lg bg-casino-gold/10 border border-casino-gold/30 p-3">
            <p className="text-xs font-medium text-casino-gold">Preview:</p>
            <p className="text-sm mt-1">{announcement}</p>
          </div>
        )}
      </div>
    </PanelView>
  );
}

// ── Error / Activity Logs ───────────────────────────────────────
function ErrorLogs({ onBack }: { onBack: () => void }) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [logType, setLogType] = useState<"moderation" | "transactions" | "chat">("moderation");

  const fetchLogs = async (type: string) => {
    setLoading(true); setLogType(type as any);
    let data: any[] = [];
    if (type === "moderation") {
      const res = await supabase.from("moderation_log").select("*").order("created_at", { ascending: false }).limit(100);
      data = (res.data || []).map((l: any) => ({ timestamp: l.created_at, level: "INFO", message: `${l.action_type} on ${l.target_user_id?.slice(0, 8)}...`, detail: l.reason || "No reason", source: l.game_room || "Global" }));
    } else if (type === "transactions") {
      const res = await supabase.from("transactions").select("*").order("created_at", { ascending: false }).limit(100);
      data = (res.data || []).map((t: any) => ({ timestamp: t.created_at, level: t.amount < 0 ? "WARN" : "INFO", message: `${t.type}: $${Math.abs(t.amount).toFixed(2)}`, detail: t.description || "—", source: t.user_id?.slice(0, 8) + "..." }));
    } else if (type === "chat") {
      const res = await supabase.from("game_chat").select("*").order("created_at", { ascending: false }).limit(100);
      data = (res.data || []).map((c: any) => ({ timestamp: c.created_at, level: "INFO", message: `${c.username || "Unknown"}: ${c.content?.slice(0, 80)}`, detail: c.game_room, source: c.user_id?.slice(0, 8) + "..." }));
    }
    setLogs(data); setLoading(false);
  };

  useEffect(() => { fetchLogs("moderation"); }, []);

  const levelColor = (l: string) => l === "ERROR" ? "text-destructive" : l === "WARN" ? "text-yellow-400" : "text-green-400";

  return (
    <PanelView title="Activity Logs" onBack={onBack}>
      <div className="flex gap-2">
        {[
          { key: "moderation", label: "Moderation", icon: Shield },
          { key: "transactions", label: "Transactions", icon: BarChart3 },
          { key: "chat", label: "Chat Logs", icon: Megaphone },
        ].map(t => (
          <Button key={t.key} variant={logType === t.key ? "gold" : "outline"} size="sm" onClick={() => fetchLogs(t.key)}>
            <t.icon className="h-3 w-3 mr-1" /> {t.label}
          </Button>
        ))}
      </div>
      {loading ? <p className="text-muted-foreground text-sm">Loading logs...</p> : logs.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground"><AlertTriangle className="h-12 w-12 mx-auto mb-3 opacity-30" /><p className="text-sm">No logs found</p></div>
      ) : (
        <div className="space-y-1 max-h-[500px] overflow-y-auto">
          {logs.map((l, i) => (
            <div key={i} className="rounded bg-card border border-border p-2 text-xs flex items-start gap-2">
              <span className={`font-mono font-bold ${levelColor(l.level)} shrink-0`}>{l.level}</span>
              <span className="text-muted-foreground shrink-0 whitespace-nowrap">{new Date(l.timestamp).toLocaleString()}</span>
              <span className="flex-1 min-w-0 truncate">{l.message}</span>
              <span className="text-muted-foreground shrink-0">{l.source}</span>
            </div>
          ))}
        </div>
      )}
    </PanelView>
  );
}

// ── House Edge Wrapper ──────────────────────────────────────────
function HouseEdgeWrapper({ onBack }: { onBack: () => void }) {
  return (
    <PanelView title="House Edge Control" onBack={onBack}>
      <HouseEdgePanel />
    </PanelView>
  );
}

// ── Game Probability Wrapper ────────────────────────────────────
function GameProbabilityWrapper({ onBack }: { onBack: () => void }) {
  return (
    <PanelView title="Game Win Probability" onBack={onBack}>
      <GameProbabilityPanel />
    </PanelView>
  );
}

// ── Bonus Probability Wrapper ───────────────────────────────────
function BonusProbabilityWrapper({ onBack }: { onBack: () => void }) {
  return (
    <PanelView title="Slot Bonus Probability" onBack={onBack}>
      <BonusProbabilityPanel />
    </PanelView>
  );
}

// ── Slots Configuration Wrapper ─────────────────────────────────
function SlotsConfigWrapper({ onBack }: { onBack: () => void }) {
  return (
    <PanelView title="Slots Configuration" onBack={onBack}>
      <SlotsConfigPanel />
    </PanelView>
  );
}

// ── Promotions Wrapper ──────────────────────────────────────────
function PromotionsWrapper({ onBack }: { onBack: () => void }) {
  return (
    <PanelView title="Promotions Manager" onBack={onBack}>
      <PromotionsManager />
    </PanelView>
  );
}

// ── Users Wrapper (embeds the former Admin Panel UI) ────────────
function UsersWrapper({ onBack }: { onBack: () => void }) {
  return (
    <PanelView title="User Management" onBack={onBack}>
      <AdminInner embedded />
    </PanelView>
  );
}


function useAnalytics() {
  const [stats, setStats] = useState({
    totalUsers: 0, onlineUsers: 0, totalBalance: 0, totalTransactions: 0,
    totalGames: 0, totalMessages: 0, totalBans: 0, totalSpins: 0,
    recentSignups: 0, activeFriendships: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const [profiles, presence, transactions, games, messages, bans, spins, friendships, recentProfiles] = await Promise.all([
        supabase.from("profiles").select("balance", { count: "exact" }),
        supabase.from("user_presence" as any).select("*", { count: "exact" }).eq("is_online", true),
        supabase.from("transactions").select("*", { count: "exact" }),
        supabase.from("games").select("*", { count: "exact" }),
        supabase.from("messages").select("*", { count: "exact" }),
        supabase.from("chat_bans").select("*", { count: "exact" }).eq("is_active", true),
        supabase.from("daily_spins").select("*", { count: "exact" }),
        supabase.from("friendships").select("*", { count: "exact" }).eq("status", "accepted"),
        supabase.from("profiles").select("*", { count: "exact" }).gte("created_at", weekAgo),
      ]);
      const totalBal = (profiles.data || []).reduce((sum, p: any) => sum + Number(p.balance || 0), 0);
      setStats({
        totalUsers: profiles.count || 0, onlineUsers: presence.count || 0,
        totalBalance: totalBal, totalTransactions: transactions.count || 0,
        totalGames: games.count || 0, totalMessages: messages.count || 0,
        totalBans: bans.count || 0, totalSpins: spins.count || 0,
        recentSignups: recentProfiles.count || 0, activeFriendships: friendships.count || 0,
      });
      setLoading(false);
    };
    fetch();
  }, []);

  return { stats, loading };
}

// ── Wallet Mode Panel ───────────────────────────────────────────
function WalletModePanel({ onBack }: { onBack: () => void }) {
  const [mockMode, setMockMode] = useState(true);
  const [requireApproval, setRequireApproval] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pendingWithdrawals, setPendingWithdrawals] = useState<any[]>([]);
  const [loadingWds, setLoadingWds] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "wallet_mode")
        .single();
      if (data) {
        const v = data.value as any;
        setMockMode(v?.mock === true);
        setRequireApproval(v?.require_withdrawal_approval === true);
      }
      setLoading(false);
    })();
    fetchPendingWithdrawals();
  }, []);

  const fetchPendingWithdrawals = async () => {
    setLoadingWds(true);
    const { data } = await supabase
      .from("withdrawals")
      .select("*")
      .eq("status", "pending_approval")
      .order("created_at", { ascending: false });
    setPendingWithdrawals(data || []);
    setLoadingWds(false);
  };

  const saveSetting = async (key: string, value: any) => {
    setSaving(true);
    const { data: existing } = await supabase
      .from("site_settings")
      .select("id, value")
      .eq("key", "wallet_mode")
      .single();

    const currentValue = (existing?.value as any) || {};
    const newValue = { ...currentValue, [key]: value };

    if (existing) {
      await supabase.from("site_settings").update({ value: newValue }).eq("key", "wallet_mode");
    } else {
      await supabase.from("site_settings").insert({ key: "wallet_mode", value: newValue });
    }
    setSaving(false);
  };

  const toggleMode = async (isMock: boolean) => {
    await saveSetting("mock", isMock);
    setMockMode(isMock);
    toast.success(isMock ? "Switched to Mock Funds mode" : "Switched to Real Crypto mode");
  };

  const toggleApproval = async (needsApproval: boolean) => {
    await saveSetting("require_withdrawal_approval", needsApproval);
    setRequireApproval(needsApproval);
    toast.success(needsApproval ? "Withdrawal approval required" : "Withdrawals will auto-process");
  };

  const handleApproveWithdrawal = async (id: string) => {
    setProcessingId(id);
    try {
      const { data, error } = await supabase.functions.invoke("process-withdrawal", {
        body: { withdrawalId: id, adminAction: "approve" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Withdrawal approved and processing");
      fetchPendingWithdrawals();
    } catch (err: any) {
      toast.error(err.message || "Failed to approve");
    }
    setProcessingId(null);
  };

  const handleDenyWithdrawal = async (id: string) => {
    setProcessingId(id);
    try {
      const { data, error } = await supabase.functions.invoke("process-withdrawal", {
        body: { withdrawalId: id, adminAction: "deny" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Withdrawal denied — funds refunded");
      fetchPendingWithdrawals();
    } catch (err: any) {
      toast.error(err.message || "Failed to deny");
    }
    setProcessingId(null);
  };

  return (
    <div>
      <Button variant="ghost" size="sm" onClick={onBack} className="mb-4">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to cPanel
      </Button>
      <h2 className="font-display text-xl font-bold mb-4 flex items-center gap-2">
        <Wallet className="h-5 w-5 text-casino-gold" /> Wallet Mode
      </h2>

      {loading ? (
        <p className="text-muted-foreground text-sm">Loading...</p>
      ) : (
        <div className="space-y-4 max-w-lg">
          {/* Mode Toggle */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-display font-bold text-sm">Current Mode</p>
                <p className={`text-xs font-semibold mt-0.5 ${mockMode ? "text-casino-gold" : "text-casino-green"}`}>
                  {mockMode ? "🎮 Mock Funds (Demo)" : "💰 Real Crypto (USDT)"}
                </p>
              </div>
              <Switch
                checked={!mockMode}
                onCheckedChange={(checked) => toggleMode(!checked)}
                disabled={saving}
              />
            </div>

            <div className="border-t border-border pt-3 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Mode Details</p>
              {mockMode ? (
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• New users receive <span className="text-casino-gold font-semibold">$100 mock funds</span></li>
                  <li>• Deposits & withdrawals are <span className="font-semibold">disabled</span></li>
                  <li>• Balances are simulated — no real money moves</li>
                  <li>• Perfect for testing & development</li>
                </ul>
              ) : (
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Deposits via <span className="text-casino-green font-semibold">USDT (TRC-20)</span> auto-credited</li>
                  <li>• Withdrawals {requireApproval ? <span className="text-casino-gold font-semibold">require admin approval</span> : <span className="font-semibold">processed automatically</span>}</li>
                  <li>• Minimum deposit: $5 · Minimum withdrawal: $10</li>
                  <li>• <span className="text-destructive font-semibold">Real money is at stake!</span></li>
                </ul>
              )}
            </div>
          </div>

          {/* Withdrawal Approval Toggle */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-display font-bold text-sm">Withdrawal Approval</p>
                <p className={`text-xs font-semibold mt-0.5 ${requireApproval ? "text-casino-gold" : "text-casino-green"}`}>
                  {requireApproval ? "🔒 Admin Approval Required" : "⚡ Auto-Process (No Approval)"}
                </p>
              </div>
              <Switch
                checked={requireApproval}
                onCheckedChange={toggleApproval}
                disabled={saving}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {requireApproval
                ? "All withdrawal requests will be held for admin review. You must manually approve or deny each request below."
                : "Withdrawals are processed automatically from the master wallet — no admin intervention needed."}
            </p>
          </div>

          <div className={`rounded-xl border p-4 ${mockMode ? "border-casino-gold/30 bg-casino-gold/5" : "border-destructive/30 bg-destructive/5"}`}>
            <p className="text-xs font-bold mb-1">{mockMode ? "⚠️ Demo Mode Active" : "🔴 Live Mode Active"}</p>
            <p className="text-xs text-muted-foreground">
              {mockMode
                ? "Switch to Real Crypto when you're ready to accept real USDT deposits and process automated withdrawals."
                : "The platform is processing real cryptocurrency. Ensure your master wallet has sufficient USDT and TRX for gas fees."}
            </p>
          </div>

          {/* Pending Withdrawals */}
          {requireApproval && (
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="px-5 py-3 bg-secondary/60 flex items-center justify-between">
                <h3 className="font-display text-sm font-bold">Pending Withdrawals</h3>
                <Button variant="ghost" size="sm" onClick={fetchPendingWithdrawals} className="h-7 px-2">
                  <RefreshCw className="h-3 w-3" />
                </Button>
              </div>
              <div className="p-4">
                {loadingWds ? (
                  <p className="text-xs text-muted-foreground">Loading...</p>
                ) : pendingWithdrawals.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">No pending withdrawal requests</p>
                ) : (
                  <div className="space-y-3">
                    {pendingWithdrawals.map((wd) => (
                      <div key={wd.id} className="rounded-lg border border-border bg-secondary/30 p-3 space-y-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-display text-sm font-bold text-casino-gold">${wd.amount.toFixed(2)}</p>
                            <p className="text-[10px] text-muted-foreground font-mono truncate max-w-[200px]">{wd.destination_address}</p>
                          </div>
                          <p className="text-[10px] text-muted-foreground">{new Date(wd.created_at).toLocaleDateString()}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 text-xs border-casino-green/50 text-casino-green hover:bg-casino-green/10"
                            onClick={() => handleApproveWithdrawal(wd.id)}
                            disabled={processingId === wd.id}
                          >
                            {processingId === wd.id ? "..." : "✓ Approve"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 text-xs border-destructive/50 text-destructive hover:bg-destructive/10"
                            onClick={() => handleDenyWithdrawal(wd.id)}
                            disabled={processingId === wd.id}
                          >
                            {processingId === wd.id ? "..." : "✗ Deny"}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Welcome Config Panel ────────────────────────────────────────
function WelcomeConfigPanel({ onBack }: { onBack: () => void }) {
  const [config, setConfig] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("site_settings").select("value").eq("key", "welcome_config").single();
      if (data) setConfig(data.value as any || {});
      setLoading(false);
    })();
  }, []);

  const save = async (updates: any) => {
    setSaving(true);
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    const { data: existing } = await supabase.from("site_settings").select("id").eq("key", "welcome_config").single();
    if (existing) {
      await supabase.from("site_settings").update({ value: newConfig }).eq("key", "welcome_config");
    } else {
      await supabase.from("site_settings").insert({ key: "welcome_config", value: newConfig });
    }
    setSaving(false);
    toast.success("Welcome config saved");
  };

  const updateBonus = (index: number, field: string, value: any) => {
    const bonuses = [...(config.welcome_bonuses || defaultBonuses)];
    bonuses[index] = { ...bonuses[index], [field]: value };
    save({ welcome_bonuses: bonuses });
  };

  const addBonus = () => {
    const bonuses = [...(config.welcome_bonuses || defaultBonuses)];
    bonuses.push({ id: `bonus_${Date.now()}`, label: "New Bonus", description: "Describe the bonus", icon: "gift", amount: 0, enabled: true });
    save({ welcome_bonuses: bonuses });
  };

  const removeBonus = (index: number) => {
    const bonuses = [...(config.welcome_bonuses || defaultBonuses)];
    bonuses.splice(index, 1);
    save({ welcome_bonuses: bonuses });
  };

  const defaultBonuses = [
    { id: "deposit_match", label: "100% Deposit Match", description: "Double your first deposit up to $500", icon: "rocket", amount: 500, enabled: true },
    { id: "free_spins", label: "50 Free Spins", description: "Get 50 free spins on our top slot games", icon: "sparkles", amount: 0, enabled: true },
    { id: "vip_trial", label: "7-Day VIP Trial", description: "Experience VIP perks free for your first week", icon: "crown", amount: 0, enabled: true },
  ];

  const iconOptions = ["rocket", "sparkles", "crown", "gift", "zap"];
  const bonuses = config.welcome_bonuses || defaultBonuses;

  return (
    <div>
      <Button variant="ghost" size="sm" onClick={onBack} className="mb-4">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to cPanel
      </Button>
      <h2 className="font-display text-xl font-bold mb-4 flex items-center gap-2">
        <Megaphone className="h-5 w-5 text-casino-gold" /> Welcome Messages
      </h2>

      {loading ? (
        <p className="text-muted-foreground text-sm">Loading...</p>
      ) : (
        <div className="space-y-6 max-w-lg">
          {/* Mock Mode Messages */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-casino-gold text-lg">🎮</span>
              <p className="font-display font-bold text-sm">Mock / Demo Mode Message</p>
            </div>
            <p className="text-xs text-muted-foreground">Shown on login & signup when in demo mode.</p>

            <div className="space-y-3">
              <div>
                <Label className="text-xs">Title</Label>
                <Input
                  value={config.mock_title || "🚧 Early Access — Development Mode"}
                  onChange={(e) => setConfig({ ...config, mock_title: e.target.value })}
                  onBlur={() => save({ mock_title: config.mock_title })}
                  className="bg-secondary border-border text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Body Text</Label>
                <Textarea
                  value={config.mock_body || "PhantomBet is still in development. Real deposits are not available yet. Every new account receives $100 in mock funds to explore our games!"}
                  onChange={(e) => setConfig({ ...config, mock_body: e.target.value })}
                  onBlur={() => save({ mock_body: config.mock_body })}
                  className="bg-secondary border-border text-sm min-h-[80px]"
                />
              </div>
              <div>
                <Label className="text-xs">Perk / Incentive Line</Label>
                <Input
                  value={config.mock_perk || "🎁 Loyal members who register now will receive a free 3-month VIP subscription on launch day!"}
                  onChange={(e) => setConfig({ ...config, mock_perk: e.target.value })}
                  onBlur={() => save({ mock_perk: config.mock_perk })}
                  className="bg-secondary border-border text-sm"
                />
              </div>
            </div>
          </div>

          {/* Real Mode Messages */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-casino-green text-lg">💰</span>
              <p className="font-display font-bold text-sm">Real Funds Mode Message</p>
            </div>
            <p className="text-xs text-muted-foreground">Shown on login & signup when in real crypto mode.</p>

            <div className="space-y-3">
              <div>
                <Label className="text-xs">Title</Label>
                <Input
                  value={config.real_title || "🎰 Welcome to PhantomBet"}
                  onChange={(e) => setConfig({ ...config, real_title: e.target.value })}
                  onBlur={() => save({ real_title: config.real_title })}
                  className="bg-secondary border-border text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Body Text</Label>
                <Textarea
                  value={config.real_body || "Join the ultimate crypto casino experience. Deposit USDT and start playing instantly with provably fair games!"}
                  onChange={(e) => setConfig({ ...config, real_body: e.target.value })}
                  onBlur={() => save({ real_body: config.real_body })}
                  className="bg-secondary border-border text-sm min-h-[80px]"
                />
              </div>
            </div>
          </div>

          {/* Welcome Bonuses (Real Mode) */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Gift className="h-5 w-5 text-casino-gold" />
                <p className="font-display font-bold text-sm">Welcome Bonuses (Real Mode)</p>
              </div>
              <Button variant="outline" size="sm" onClick={addBonus} className="h-7 text-xs">
                + Add Bonus
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Users can pick one bonus when signing up in real mode.</p>

            <div className="space-y-3">
              {bonuses.map((bonus: any, i: number) => (
                <div key={bonus.id} className="rounded-lg border border-border bg-secondary/30 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <select
                        value={bonus.icon}
                        onChange={(e) => updateBonus(i, "icon", e.target.value)}
                        className="bg-secondary border border-border rounded px-2 py-1 text-xs"
                      >
                        {iconOptions.map(ic => <option key={ic} value={ic}>{ic}</option>)}
                      </select>
                      <Switch
                        checked={bonus.enabled}
                        onCheckedChange={(v) => updateBonus(i, "enabled", v)}
                      />
                      <span className="text-[10px] text-muted-foreground">{bonus.enabled ? "Active" : "Disabled"}</span>
                    </div>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive" onClick={() => removeBonus(i)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                  <Input
                    value={bonus.label}
                    onChange={(e) => updateBonus(i, "label", e.target.value)}
                    className="bg-secondary border-border text-sm h-8"
                    placeholder="Bonus name"
                  />
                  <Input
                    value={bonus.description}
                    onChange={(e) => updateBonus(i, "description", e.target.value)}
                    className="bg-secondary border-border text-xs h-8"
                    placeholder="Description"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-casino-gold/30 bg-casino-gold/5 p-4">
            <p className="text-xs font-bold mb-1">💡 How It Works</p>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• The banner adapts automatically based on your <span className="text-casino-gold font-semibold">Wallet Mode</span> setting</li>
              <li>• Mock mode shows the development/early access message</li>
              <li>• Real mode shows the welcome message + bonus picker on signup</li>
              <li>• Changes are reflected immediately on login & signup screens</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}


function DepositsWithdrawalsPanel({ onBack }: { onBack: () => void }) {
  const [settings, setSettings] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pendingWithdrawals, setPendingWithdrawals] = useState<any[]>([]);
  const [loadingWds, setLoadingWds] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [recentDeposits, setRecentDeposits] = useState<any[]>([]);
  const [recentWithdrawals, setRecentWithdrawals] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "payments_config")
        .single();
      if (data) setSettings(data.value as any);
      setLoading(false);
    })();
    fetchPendingWithdrawals();
    fetchRecentActivity();
  }, []);

  const fetchPendingWithdrawals = async () => {
    setLoadingWds(true);
    const { data } = await supabase
      .from("withdrawals")
      .select("*")
      .eq("status", "pending_approval")
      .order("created_at", { ascending: false });
    setPendingWithdrawals(data || []);
    setLoadingWds(false);
  };

  const fetchRecentActivity = async () => {
    const [deps, wds] = await Promise.all([
      supabase.from("deposits").select("*").order("created_at", { ascending: false }).limit(10),
      supabase.from("withdrawals").select("*").order("created_at", { ascending: false }).limit(10),
    ]);
    setRecentDeposits(deps.data || []);
    setRecentWithdrawals(wds.data || []);
  };

  const updateSetting = async (key: string, value: any) => {
    setSaving(true);
    const newSettings = { ...settings, [key]: value };
    const { data: existing } = await supabase
      .from("site_settings")
      .select("id")
      .eq("key", "payments_config")
      .single();

    if (existing) {
      await supabase.from("site_settings").update({ value: newSettings }).eq("key", "payments_config");
    } else {
      await supabase.from("site_settings").insert({ key: "payments_config", value: newSettings });
    }
    setSettings(newSettings);
    setSaving(false);
    toast.success("Setting updated");
  };

  // Also sync the withdrawal approval to wallet_mode setting for backward compat
  const toggleWithdrawalApproval = async (val: boolean) => {
    await updateSetting("require_withdrawal_approval", val);
    // Sync to wallet_mode setting too
    const { data: wmRow } = await supabase.from("site_settings").select("value").eq("key", "wallet_mode").single();
    const wmVal = (wmRow?.value as any) || {};
    if (wmRow) {
      await supabase.from("site_settings").update({ value: { ...wmVal, require_withdrawal_approval: val } }).eq("key", "wallet_mode");
    }
  };

  const handleApproveWithdrawal = async (id: string) => {
    setProcessingId(id);
    try {
      const { data, error } = await supabase.functions.invoke("process-withdrawal", {
        body: { withdrawalId: id, adminAction: "approve" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Withdrawal approved and processing");
      fetchPendingWithdrawals();
      fetchRecentActivity();
    } catch (err: any) {
      toast.error(err.message || "Failed to approve");
    }
    setProcessingId(null);
  };

  const handleDenyWithdrawal = async (id: string) => {
    setProcessingId(id);
    try {
      const { data, error } = await supabase.functions.invoke("process-withdrawal", {
        body: { withdrawalId: id, adminAction: "deny" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Withdrawal denied — funds refunded");
      fetchPendingWithdrawals();
      fetchRecentActivity();
    } catch (err: any) {
      toast.error(err.message || "Failed to deny");
    }
    setProcessingId(null);
  };

  const requireApproval = settings.require_withdrawal_approval === true;
  const minDeposit = settings.min_deposit ?? 5;
  const minWithdrawal = settings.min_withdrawal ?? 10;
  const maxWithdrawal = settings.max_withdrawal ?? 10000;
  const dailyWithdrawalLimit = settings.daily_withdrawal_limit ?? 50000;
  const depositEnabled = settings.deposits_enabled !== false;
  const withdrawalEnabled = settings.withdrawals_enabled !== false;

  return (
    <div>
      <Button variant="ghost" size="sm" onClick={onBack} className="mb-4">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to cPanel
      </Button>
      <h2 className="font-display text-xl font-bold mb-4 flex items-center gap-2">
        <CreditCard className="h-5 w-5 text-casino-gold" /> Deposits & Withdrawals
      </h2>

      {loading ? (
        <p className="text-muted-foreground text-sm">Loading...</p>
      ) : (
        <div className="space-y-4 max-w-2xl">
          {/* Toggle Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Deposits Enabled */}
            <div className="rounded-xl border border-border bg-card p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-display font-bold text-sm">Deposits</p>
                  <p className={`text-xs font-semibold ${depositEnabled ? "text-casino-green" : "text-destructive"}`}>
                    {depositEnabled ? "✓ Enabled" : "✗ Disabled"}
                  </p>
                </div>
                <Switch checked={depositEnabled} onCheckedChange={(v) => updateSetting("deposits_enabled", v)} disabled={saving} />
              </div>
              <p className="text-[11px] text-muted-foreground">Allow users to deposit USDT (TRC-20) to their account.</p>
            </div>

            {/* Withdrawals Enabled */}
            <div className="rounded-xl border border-border bg-card p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-display font-bold text-sm">Withdrawals</p>
                  <p className={`text-xs font-semibold ${withdrawalEnabled ? "text-casino-green" : "text-destructive"}`}>
                    {withdrawalEnabled ? "✓ Enabled" : "✗ Disabled"}
                  </p>
                </div>
                <Switch checked={withdrawalEnabled} onCheckedChange={(v) => updateSetting("withdrawals_enabled", v)} disabled={saving} />
              </div>
              <p className="text-[11px] text-muted-foreground">Allow users to withdraw USDT from their balance.</p>
            </div>
          </div>

          {/* Withdrawal Approval */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-display font-bold text-sm">Withdrawal Approval</p>
                <p className={`text-xs font-semibold ${requireApproval ? "text-casino-gold" : "text-casino-green"}`}>
                  {requireApproval ? "🔒 Admin Approval Required" : "⚡ Auto-Process"}
                </p>
              </div>
              <Switch checked={requireApproval} onCheckedChange={toggleWithdrawalApproval} disabled={saving} />
            </div>
            <p className="text-[11px] text-muted-foreground">
              {requireApproval
                ? "All withdrawal requests are held for admin review before processing."
                : "Withdrawals are processed automatically — no admin intervention needed."}
            </p>
          </div>

          {/* Limits */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <p className="font-display font-bold text-sm">Limits & Thresholds</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Min Deposit ($)</Label>
                <Input
                  type="number" min="1" value={minDeposit}
                  onChange={(e) => updateSetting("min_deposit", Number(e.target.value))}
                  className="bg-secondary border-border mt-1 h-9 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Min Withdrawal ($)</Label>
                <Input
                  type="number" min="1" value={minWithdrawal}
                  onChange={(e) => updateSetting("min_withdrawal", Number(e.target.value))}
                  className="bg-secondary border-border mt-1 h-9 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Max Withdrawal ($)</Label>
                <Input
                  type="number" min="10" value={maxWithdrawal}
                  onChange={(e) => updateSetting("max_withdrawal", Number(e.target.value))}
                  className="bg-secondary border-border mt-1 h-9 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Daily Limit ($)</Label>
                <Input
                  type="number" min="100" value={dailyWithdrawalLimit}
                  onChange={(e) => updateSetting("daily_withdrawal_limit", Number(e.target.value))}
                  className="bg-secondary border-border mt-1 h-9 text-sm"
                />
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground">These limits apply to all users. Admins are exempt.</p>
          </div>

          {/* Pending Withdrawals */}
          {requireApproval && (
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="px-5 py-3 bg-secondary/60 flex items-center justify-between">
                <h3 className="font-display text-sm font-bold">
                  Pending Withdrawals {pendingWithdrawals.length > 0 && <span className="text-casino-gold">({pendingWithdrawals.length})</span>}
                </h3>
                <Button variant="ghost" size="sm" onClick={fetchPendingWithdrawals} className="h-7 px-2">
                  <RefreshCw className="h-3 w-3" />
                </Button>
              </div>
              <div className="p-4">
                {loadingWds ? (
                  <p className="text-xs text-muted-foreground">Loading...</p>
                ) : pendingWithdrawals.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">No pending withdrawal requests</p>
                ) : (
                  <div className="space-y-3">
                    {pendingWithdrawals.map((wd) => (
                      <div key={wd.id} className="rounded-lg border border-border bg-secondary/30 p-3 space-y-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-display text-sm font-bold text-casino-gold">${wd.amount.toFixed(2)}</p>
                            <p className="text-[10px] text-muted-foreground font-mono truncate max-w-[200px]">{wd.destination_address}</p>
                          </div>
                          <p className="text-[10px] text-muted-foreground">{new Date(wd.created_at).toLocaleDateString()}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm" variant="outline"
                            className="flex-1 text-xs border-casino-green/50 text-casino-green hover:bg-casino-green/10"
                            onClick={() => handleApproveWithdrawal(wd.id)}
                            disabled={processingId === wd.id}
                          >
                            {processingId === wd.id ? "..." : "✓ Approve"}
                          </Button>
                          <Button
                            size="sm" variant="outline"
                            className="flex-1 text-xs border-destructive/50 text-destructive hover:bg-destructive/10"
                            onClick={() => handleDenyWithdrawal(wd.id)}
                            disabled={processingId === wd.id}
                          >
                            {processingId === wd.id ? "..." : "✗ Deny"}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Recent Activity */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-5 py-3 bg-secondary/60 flex items-center justify-between">
              <h3 className="font-display text-sm font-bold">Recent Activity</h3>
              <Button variant="ghost" size="sm" onClick={fetchRecentActivity} className="h-7 px-2">
                <RefreshCw className="h-3 w-3" />
              </Button>
            </div>
            <div className="p-4 space-y-2 max-h-64 overflow-y-auto">
              {[...recentDeposits.map(d => ({ ...d, _type: "deposit" })), ...recentWithdrawals.map(w => ({ ...w, _type: "withdrawal" }))]
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                .slice(0, 15)
                .map((item) => (
                  <div key={item.id} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold ${item._type === "deposit" ? "text-casino-green" : "text-casino-gold"}`}>
                        {item._type === "deposit" ? "↓ DEP" : "↑ WD"}
                      </span>
                      <span className="text-xs font-display font-bold">
                        ${(item.amount_usd || item.amount || 0).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                        item.status === "completed" ? "bg-casino-green/20 text-casino-green" :
                        item.status === "pending_approval" ? "bg-casino-gold/20 text-casino-gold" :
                        item.status === "failed" || item.status === "denied" ? "bg-destructive/20 text-destructive" :
                        "bg-secondary text-muted-foreground"
                      }`}>
                        {item.status}
                      </span>
                      <span className="text-[10px] text-muted-foreground">{new Date(item.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              {recentDeposits.length === 0 && recentWithdrawals.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">No recent activity</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Ghost Users Panel ────────────────────────────────────────────
function GhostUsersPanel({ onBack }: { onBack: () => void }) {
  const [config, setConfig] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [realUsernames, setRealUsernames] = useState<Set<string>>(new Set());

  useEffect(() => {
    (async () => {
      const [settingsRes, profilesRes] = await Promise.all([
        supabase.from("site_settings").select("value").eq("key", "ghost_users").single(),
        supabase.from("profiles").select("username").not("username", "is", null),
      ]);
      if (settingsRes.data) setConfig(settingsRes.data.value as any || {});
      if (profilesRes.data) {
        const names = new Set(profilesRes.data.map((p: any) => (p.username as string).toLowerCase()));
        setRealUsernames(names);
      }
      setLoading(false);
    })();
  }, []);

  const save = async (updates: any) => {
    setSaving(true);
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    const { data: existing } = await supabase.from("site_settings").select("id").eq("key", "ghost_users").single();
    if (existing) {
      await supabase.from("site_settings").update({ value: newConfig }).eq("key", "ghost_users");
    } else {
      await supabase.from("site_settings").insert({ key: "ghost_users", value: newConfig });
    }
    setSaving(false);
    toast.success("Ghost users config saved");
  };

  const enabled = config.enabled === true;
  const usernames: string[] = config.usernames || [];
  const peakOnline = config.peak_online ?? 45;
  const minOnline = config.min_online ?? 8;
  const rampHours = config.ramp_hours ?? 8;
  const offlinePerHour = config.offline_per_hour ?? 5;
  const showInChat = config.show_in_chat !== false;
  const showInPresence = config.show_in_presence !== false;

  const addUsername = () => {
    if (!newUsername.trim()) return;
    if (realUsernames.has(newUsername.trim().toLowerCase())) {
      toast.error(`"${newUsername.trim()}" is a real user — cannot add as ghost`);
      return;
    }
    const updated = [...usernames, newUsername.trim()];
    save({ usernames: updated });
    setNewUsername("");
  };

  const removeUsername = (index: number) => {
    const updated = usernames.filter((_, i) => i !== index);
    save({ usernames: updated });
  };

  const defaultNames = [
    "AceBang520", "AceBoom75", "AceChief604", "AceCrown52", "AceDriver41", "AceFlare408", "AceHeist450", "AceLegend57", "AceNova56", "AceNova667",
    "AcePot23", "AceRebel646", "AceStorm24", "AceTitan856", "AceTrick744", "AceZen534", "Ace_Bandit56", "Ace_Bull457", "Ace_Flare65", "Ace_Flash807",
    "Ace_Luck90", "Ace_Odds429", "Ace_Pool534", "Ace_Roll212", "Ace_Samurai450", "Ace_Shark989", "Ace_Vault478", "Ace_Vault597", "Ace_Whale408", "AlphaAce72",
    "AlphaChief81", "AlphaEdge387", "AlphaFrost28", "AlphaHand324", "AlphaIce555", "AlphaMoon891", "AlphaOrbit205", "AlphaPro57", "AlphaPulse46", "AlphaRich212",
    "AlphaRocket359", "AlphaRoll87", "AlphaRoller737", "AlphaSpin135", "AlphaWin947", "AlphaYield912", "Alpha_Bolt19", "Alpha_Bounty70", "Alpha_Driver18", "Alpha_Edge247",
    "Alpha_Knight779", "Alpha_Max16", "Alpha_Racer415", "Alpha_Rebel74", "Alpha_Whale", "Alpha_Win26", "Alpha_Zen961", "AmberBlaze625", "AmberCap55", "AmberCard53",
    "AmberChad41", "AmberChad877", "AmberDraw78", "AmberEagle233", "AmberGuru793", "AmberIce681", "AmberKing436", "AmberMax667", "AmberNova22", "AmberOdds485",
    "AmberOutlaw", "AmberOwl625", "AmberPool954", "AmberSamurai723", "AmberSpin478", "AmberStash91", "AmberStorm63", "AmberThrone21", "Amber_Crown296", "Amber_Fire443",
    "Amber_Gains709", "Amber_Moon541", "Amber_Owl835", "Amber_Pool443", "Amber_Rebel590", "ApexBoom947", "ApexBull84", "ApexCash42", "ApexClick83", "ApexDice121",
    "ApexFlip415", "ApexHit352", "ApexIce933", "ApexPool191", "ApexPop67", "ApexSamurai695", "ApexScore597", "ApexShot604", "ApexSlots345", "ApexSpark26",
    "ApexSpin163", "ApexStorm44", "ApexWin779", "ApexWin80", "ApexWizard12", "Apex_Cash828", "Apex_Chad170", "Apex_Deal54", "Apex_Dice345", "Apex_Flip709",
    "Apex_Glow57", "Apex_Max184", "Apex_Ray87", "Apex_Run8", "Apex_Shark597", "Apex_Snap310", "Apex_Token", "Apex_Wizard77", "AshAce926", "AshCash10",
    "AshCrown44", "AshDraw359", "AshFire513", "AshFire660", "AshFlash401", "AshGamer261", "AshGamer7", "AshGuru45", "AshHeist40", "AshLine667",
    "AshPilot18", "AshPlay100", "AshPot919", "AshRider184", "AshShot66", "AshSpark296", "AshSpin639", "AshStash156", "Ash_Cap506", "Ash_Dice11",
    "Ash_Hawk639", "Ash_Max940", "Ash_Snap793", "Ash_Spin56", "Ash_Viper42", "Ash_Win34", "Ash_Wizard88", "AtomicBolt66", "AtomicCash828", "AtomicChad24",
    "AtomicCoin", "AtomicDeal14", "AtomicOrbit870", "AtomicRider7", "AtomicSage28", "AtomicSpin534", "AtomicStack359", "AtomicStreak177", "AtomicYield36", "Atomic_Bandit64",
    "Atomic_Bolt793", "Atomic_Cash625", "Atomic_Chip324", "Atomic_Guru975", "Atomic_Hawk23", "Atomic_Master919", "Atomic_Rebel48", "Atomic_Spark41", "Atomic_Stash76", "Atomic_Streak68",
    "Atomic_Wolf43", "BankCard380", "BankDash37", "BankFlush76", "BankFox688", "BankJoe618", "BankLine170", "BankMoon142", "BankOwl9", "BankRoller191",
    "BankSamurai289", "BankStreak77", "BankWhale79", "BankZen282", "Bank_Crown6", "Bank_Gains380", "Bank_Nova289", "Bank_Orbit35", "Bank_Pot98", "BearBear81",
    "BearBolt429", "BearCard91", "BearChief303", "BearDice485", "BearEdge261", "BearFlash91", "BearGains79", "BearIce45", "BearLegend", "BearMaster485",
    "BearNova64", "BearPot37", "BearPot835", "BearRacer51", "BearRider32", "BearRush611", "BearStack240", "BearWin80", "BearWizard380", "Bear_Bet163",
    "Bear_Boss898", "Bear_Chad744", "Bear_Chip464", "Bear_Chip7", "Bear_Click814", "Bear_Crown82", "Bear_Dash289", "Bear_Deal247", "Bear_Draw12", "Bear_Heist982",
    "Bear_Owl51", "Bear_Roller828", "BetBlade93", "BetBlaze36", "BetBull30", "BetClick42", "BetCoin42", "BetDegen28", "BetGamer506", "BetKing71",
    "BetLoot674", "BetMaster569", "BetNinja996", "BetOrbit450", "BetOutlaw520", "BetPool842", "BetPop59", "BetPot", "BetViper65", "BetWave261",
    "Bet_Fire688", "Bet_Gains954", "Bet_Hero33", "Bet_Knight37", "Bet_Pilot32", "Bet_Pop576", "Bet_Prize4", "Bet_Pro26", "Bet_Samurai79", "Bet_Shark85",
    "BlazeBang331", "BlazeBear48", "BlazeChad7", "BlazeChamp345", "BlazeClick5", "BlazeDice6", "BlazeFlare898", "BlazeFlash660", "BlazeFox415", "BlazeGains555",
    "BlazeGuru142", "BlazeGuru933", "BlazeIce807", "BlazeNinja583", "BlazeNinja71", "BlazePool41", "BlazeRich71", "BlazeRocket569", "BlazeSamurai97", "BlazeSpark527",
    "BlazeSpin261", "BlazeStorm275", "BlazeVault88", "BlazeWave597", "BlazeWolf352", "Blaze_Boss92", "Blaze_Cap91", "Blaze_Chad702", "Blaze_Crown282", "Blaze_Gamer90",
    "Blaze_Knight408", "Blaze_Rider84", "Blaze_Spark261", "Blaze_Spark975", "Blaze_Titan968", "BlipBear50", "BlipBet436", "BlipChief702", "BlipDeal674", "BlipDriver436",
    "BlipFlush464", "BlipKing49", "BlipOwl786", "BlipRider275", "BlipRoller233", "BlipSlots18", "BlipSnap975", "BlipWhale569", "BlipWolf89", "BlipZen19",
    "Blip_Coin91", "Blip_Glow338", "Blip_Joe46", "Blip_Max33", "Blip_Pro674", "Blip_Profit96", "Blip_Sage338", "Blip_Titan70", "Blip_Wizard520", "BlitzChief401",
    "BlitzDrift43", "BlitzDriver422", "BlitzFire78", "BlitzGuru226", "BlitzLuck576", "BlitzOdds49", "BlitzOutlaw68", "BlitzRider121", "BlitzRush", "BlitzShot968",
    "BlitzStash660", "BlitzStreak520", "BlitzToken56", "BlitzTrick30", "Blitz_Champ989", "Blitz_Dash751", "Blitz_Degen62", "Blitz_Draw72", "Blitz_Flush527", "Blitz_Flush583",
    "Blitz_Odds359", "Blitz_Rogue184", "BoltAce31", "BoltDraw56", "BoltDrift87", "BoltFlip13", "BoltOrbit68", "BoltPrize22", "BoltPrize85", "BoltRush88",
    "BoltSage60", "BoltTrick59", "BoltVault44", "BoltVault77", "Bolt_Card10", "Bolt_Pro982", "Bolt_Rich618", "BronzeBear84", "BronzeCard408", "BronzeChamp975",
    "BronzeCoin814", "BronzeCrown506", "BronzeDash31", "BronzeEagle58", "BronzeFlash506", "BronzeHero14", "BronzeHit541", "BronzeLoot", "BronzeMoon73", "BronzeOdds695",
    "BronzePilot83", "BronzeProfit128", "BronzeProfit49", "BronzeSamurai81", "BronzeScore54", "BronzeShot261", "BronzeThrone226", "BronzeYield919", "Bronze_Deal184", "Bronze_Flash26",
    "Bronze_Owl43", "Bronze_Roller142", "Bronze_Vault842", "BuckBandit478", "BuckBear723", "BuckBet877", "BuckBlaze47", "BuckBlaze98", "BuckBoss80", "BuckDraw268",
    "BuckGamer758", "BuckGamer807", "BuckGuru25", "BuckMoon485", "BuckOwl828", "BuckRoller709", "BuckStack849", "BuckStash", "BuckTrick96", "BuckYield100",
    "Buck_Eagle170", "Buck_Hand79", "Buck_Ice898", "Buck_Master70", "Buck_Prize", "CashDraw884", "CashDrift464", "CashDrift954", "CashEagle25", "CashEdge14",
    "CashGuru59", "CashLuck76", "CashLuck793", "CashPot3", "CashPro492", "CashSnap35", "CashSnap891", "CashStash702", "CashTitan", "CashWave65",
    "CashWhale184", "CashWin415", "Cash_Deal50", "Cash_Fox21", "Cash_Hit464", "Cash_Knight499", "Cash_Star69", "Cash_Token450", "ChipBet814", "ChipBounty198",
    "ChipDraw13", "ChipDraw5", "ChipEagle289", "ChipFox49", "ChipHawk62", "ChipOdds660", "ChipPlay912", "ChipPulse71", "ChipRider212", "ChipSage415",
    "ChipSnap2", "ChipStack39", "ChipThrone92", "ChipToken394", "ChipYield863", "Chip_Bolt95", "Chip_Sage247", "Chip_Snap485", "Chip_Spark91", "Chip_Star632",
    "Chip_Yield597", "ChromeBear604", "ChromeClick62", "ChromeClick835", "ChromeDash74", "ChromeDraw93", "ChromeEagle716", "ChromeGamer22", "ChromeIce2", "ChromeMoon17",
    "ChromeOutlaw61", "ChromeStack5", "ChromeTitan19", "ChromeTrick149", "ChromeX31", "Chrome_Dash63", "Chrome_Eagle", "Chrome_Fire66", "Chrome_Fire95", "Chrome_Gains47",
    "Chrome_Outlaw492", "Chrome_Spark667", "Chrome_Trick443", "Chrome_Viper324", "CobaltBandit23", "CobaltBet401", "CobaltBounty338", "CobaltBull68", "CobaltCard415", "CobaltDash240",
    "CobaltDice933", "CobaltHero520", "CobaltIce478", "CobaltKnight7", "CobaltLine723", "CobaltNinja576", "CobaltPool", "CobaltRebel12", "CobaltRider92", "CobaltRun10",
    "CobaltSpark247", "CobaltViper541", "Cobalt_Orbit92", "Cobalt_Run996", "Cobalt_Wolf534", "CobraBoss33", "CobraChamp142", "CobraEdge47", "CobraHand275", "CobraHand331",
    "CobraHero401", "CobraJoe17", "CobraMoon513", "CobraOrbit91", "CobraPrize947", "CobraRich15", "CobraRich177", "CobraWin450", "CobraWolf3", "Cobra_Bear443",
    "Cobra_Draw61", "Cobra_Hit68", "Cobra_Hit82", "Cobra_Moon5", "Cobra_Prize38", "Cobra_Profit89", "Cobra_Rider849", "Cobra_Rogue905", "Cobra_Slots989", "Cobra_Wave891",
    "CoinChief47", "CoinCoin261", "CoinDeal98", "CoinDriver12", "CoinHit73", "CoinHit814", "CoinKing121", "CoinKing884", "CoinLuck954", "CoinRacer254",
    "CoinRoller345", "CoinSage79", "CoinShark54", "CoinStash240", "CoinToken639", "CoinToken849", "CoinWizard247", "CoinWolf", "CoinX60", "Coin_Bang863",
    "Coin_Boom450", "Coin_Bull233", "Coin_Click961", "Coin_Flash975", "Coin_Nova457", "Coin_Pulse919", "Coin_Rich513", "CosmicBandit8", "CosmicBolt58", "CosmicFrost212",
    "CosmicLine29", "CosmicMoon793", "CosmicNova660", "CosmicOutlaw156", "CosmicRich975", "CosmicRoller61", "CosmicSlots387", "CosmicSlots520", "CosmicSnap310", "CosmicSpin667",
    "CosmicWolf268", "Cosmic_Bear352", "Cosmic_Chip520", "Cosmic_Chip807", "Cosmic_Luck35", "Cosmic_Play814", "Cosmic_Rider156", "Cosmic_Rider37", "Cosmic_Score639", "Cosmic_Stack905",
    "Cosmic_Throne618", "CrestAce849", "CrestClick1", "CrestCoin394", "CrestGamer66", "CrestPool205", "CrestPop478", "CrestRich85", "CrestRoller401", "CrestRoller716",
    "CrestShark170", "CrestShot352", "CrestSlots46", "CrestSpin730", "CrestStorm21", "CrestTrick632", "Crest_Boss66", "Crest_Boss716", "Crest_Chad66", "Crest_Flare926",
    "Crest_Guru275", "Crest_Legend982", "Crest_Sage31", "Crest_Spark9", "Crest_Stack107", "Crest_Star93", "Crest_Wolf646", "Crest_Wolf82", "CrimsonBet3", "CrimsonBull912",
    "CrimsonClick50", "CrimsonDraw27", "CrimsonFlare13", "CrimsonFox170", "CrimsonOrbit", "CrimsonRebel52", "CrimsonStack625", "CrimsonStorm59", "CrimsonX6", "Crimson_Bandit520",
    "Crimson_Bear275", "Crimson_Blaze6", "Crimson_Bull156", "Crimson_Card79", "Crimson_Driver34", "Crimson_Fox758", "Crimson_Joe296", "Crimson_Loot57", "Crimson_Roller59", "Crimson_Spark84",
    "CryptoBull863", "CryptoBull91", "CryptoChip261", "CryptoCoin982", "CryptoDeal219", "CryptoDegen54", "CryptoDegen66", "CryptoFire317", "CryptoFlare632", "CryptoLuck6",
    "CryptoMax48", "CryptoMoon78", "CryptoRich268", "CryptoSage436", "Crypto_Card53", "Crypto_Drift835", "Crypto_Drift91", "Crypto_Nova27", "Crypto_Owl303", "Crypto_Roll898",
    "Crypto_Run35", "DarkChad968", "DarkChamp499", "DarkCoin590", "DarkEagle800", "DarkFire919", "DarkFlare625", "DarkFox57", "DarkGlow856", "DarkLegend807",
    "DarkOrbit464", "DarkPrize", "DarkPrize261", "DarkPro34", "DarkRay", "DarkRider41", "DarkRocket492", "DarkStar25", "DarkVault772", "DarkX863",
    "DarkZen", "DarkZen387", "Dark_Bang59", "Dark_Bolt338", "Dark_Boom856", "Dark_Champ60", "Dark_Draw576", "Dark_Fire79", "Dark_Odds401", "Dark_Pot632",
    "Dark_Punk91", "Dark_Rich25", "Dark_Rich42", "Dark_Shot884", "Dark_Titan59", "DashCrown975", "DashDash905", "DashEagle436", "DashFlare142", "DashFlush46",
    "DashFox78", "DashFox954", "DashFrost660", "DashHero205", "DashHero76", "DashLine18", "DashLoot562", "DashPro989", "DashRebel905", "DashRocket68",
    "DashSpark91", "DashTitan67", "DashTitan807", "DashWolf870", "DashZen870", "Dash_Flash184", "Dash_Hawk219", "Dash_Pop61", "Dash_Rider618", "Dash_X84",
    "DawnBet254", "DawnBoom996", "DawnBoss667", "DawnChief191", "DawnCrown737", "DawnEagle765", "DawnEdge75", "DawnFlare989", "DawnLoot219", "DawnMax422",
    "DawnPop", "DawnRay842", "DawnRich16", "DawnRich548", "DawnRogue660", "DawnSlots9", "DawnSnap24", "DawnStorm20", "DawnToken121", "DawnTrick24",
    "Dawn_Chip", "Dawn_Nova74", "Dawn_Pilot85", "Dawn_Wizard653", "DiamondBandit884", "DiamondCap142", "DiamondChad814", "DiamondChamp163", "DiamondDrift387", "DiamondDrift912",
    "DiamondEdge471", "DiamondHand590", "DiamondHeist82", "DiamondJoe35", "DiamondLegend618", "DiamondPunk793", "DiamondRocket41", "DiamondThrone513", "DiamondWave", "DiamondWin464",
    "Diamond_Driver9", "Diamond_Legend247", "Diamond_Pool93", "Diamond_Pro352", "Diamond_Titan268", "Diamond_Vault6", "DimeBlade359", "DimeBolt19", "DimeGamer555", "DimeLegend",
    "DimeMoon33", "DimeOdds996", "DimeOrbit261", "DimeRebel", "DimeRider86", "DimeRoll41", "DimeScore96", "DimeShot639", "DimeStash968", "DimeStreak786",
    "DimeTrick20", "DimeViper94", "DimeWolf95", "Dime_Blade618", "Dime_Frost478", "Dime_Heist11", "Dime_Moon31", "Dime_Racer92", "Dime_Shark142", "DrakeChamp569",
    "DrakeDriver76", "DrakeEagle541", "DrakeIce41", "DrakeLoot751", "DrakePlay954", "DrakePrize34", "DrakeRacer681", "DrakeRay74", "DrakeRebel5", "DrakeSlots73",
    "DrakeSpark61", "DrakeStack289", "DrakeStar22", "DrakeToken84", "DrakeWave170", "DrakeYield961", "Drake_Blaze345", "Drake_Deal968", "Drake_Glow62", "Drake_Luck639",
    "Drake_Prize373", "Drake_Stash527", "DriftAce33", "DriftBull247", "DriftDice814", "DriftDraw723", "DriftGains457", "DriftLegend478", "DriftPilot555", "DriftRich457",
    "DriftRogue149", "DriftSlots422", "DriftStreak56", "DriftStreak730", "DriftStreak863", "DriftStreak92", "DriftWin149", "DriftWolf744", "Drift_Champ898", "Drift_Dash891",
    "Drift_Legend89", "Drift_Racer471", "Drift_Rider569", "Drift_Spin436", "Drift_Spin52", "DuskChip653", "DuskClick97", "DuskDeal68", "DuskFrost96", "DuskHit912",
    "DuskMaster891", "DuskMoon35", "DuskPlay338", "DuskRun51", "DuskStash56", "DuskStorm29", "DuskStreak26", "DuskWolf", "Dusk_Hero366", "EagleBolt597",
    "EagleBounty387", "EagleFlip75", "EagleGamer471", "EagleOwl53", "EagleOwl67", "EaglePulse219", "EagleRebel25", "EagleRocket67", "EagleRoll14", "EagleShark163",
    "EagleVault506", "EagleYield625", "Eagle_Bang261", "Eagle_Cash82", "Eagle_Draw64", "Eagle_Gains842", "Eagle_Hit90", "Eagle_Knight42", "Eagle_Viper814", "EliteBoss541",
    "EliteEagle898", "EliteFire83", "EliteFlare835", "EliteGains91", "EliteLuck933", "EliteNova954", "EliteRay639", "EliteRider534", "EliteScore24", "EliteScore59",
    "EliteSlots618", "EliteWin359", "Elite_Boom36", "Elite_Draw84", "Elite_Drift219", "Elite_Drift310", "Elite_Hit36", "Elite_Loot422", "Elite_Sage95", "Elite_X5",
    "EmberBolt92", "EmberBoom37", "EmberDash31", "EmberDegen961", "EmberFlash", "EmberFox268", "EmberHeist499", "EmberHeist82", "EmberOdds55", "EmberOrbit429",
    "EmberPot751", "EmberRebel933", "EmberVault36", "EmberVault786", "EmberViper6", "Ember_Click34", "Ember_Click450", "Ember_Guru555", "Ember_Master506", "Ember_Play90",
    "Ember_Roll233", "Ember_Spark177", "EmeraldBear51", "EmeraldBear646", "EmeraldDeal716", "EmeraldEagle709", "EmeraldGains226", "EmeraldMax226", "EmeraldMoon77", "EmeraldOrbit261",
    "EmeraldOutlaw800", "EmeraldPrize366", "EmeraldRebel79", "EmeraldSlots", "EmeraldX9", "Emerald_Bounty534", "Emerald_Master156", "Emerald_Ninja408", "Emerald_Ninja877", "Emerald_Pilot268",
    "Emerald_Play975", "Emerald_Rogue177", "Emerald_Run849", "Emerald_Rush443", "Emerald_Token19", "Emerald_Wolf73", "FalconBear303", "FalconCash506", "FalconChamp653", "FalconCoin240",
    "FalconFlip954", "FalconFrost163", "FalconHand870", "FalconKing541", "FalconLine54", "FalconPunk78", "FalconRider576", "FalconRider758", "FalconRush78", "FalconSpark",
    "FalconVault730", "Falcon_Champ39", "Falcon_Chief53", "Falcon_Click94", "Falcon_Flash744", "Falcon_Pop492", "Falcon_Pro786", "Falcon_Ray198", "Falcon_Shark49", "FlameBandit22",
    "FlameCoin499", "FlameFlush534", "FlameFox660", "FlameFox744", "FlameGains46", "FlameGuru702", "FlameKnight62", "FlameRoller219", "FlameSage35", "FlameStorm83",
    "Flame_Chad961", "Flame_Driver786", "Flame_Fire604", "Flame_Flash191", "Flame_Flash55", "Flame_Hero723", "Flame_Master52", "Flame_Pilot4", "Flame_Play331", "Flame_Pot184",
    "Flame_Punk107", "Flame_Rebel863", "Flame_Yield9", "FlashBolt373", "FlashBoss43", "FlashCrown163", "FlashDeal338", "FlashDrift49", "FlashKnight982", "FlashLuck46",
    "FlashOdds37", "FlashPrize52", "FlashRider226", "FlashStash45", "FlashStash772", "FlashWolf75", "Flash_Blaze464", "Flash_Bounty156", "Flash_Deal71", "Flash_Hawk800",
    "Flash_Master121", "Flash_Nova93", "Flash_Pilot366", "Flash_Rich947", "Flash_Rocket828", "FoxBear59", "FoxDash2", "FoxDeal184", "FoxDegen42", "FoxPilot9",
    "FoxRacer99", "FoxRider842", "FoxStreak78", "FoxToken27", "FoxToken877", "FoxZen674", "Fox_Hawk317", "Fox_Ice590", "Fox_Pot3", "Fox_Ray191",
    "Fox_Shot47", "Fox_Spark289", "Fox_Vault534", "Fox_Viper23", "FrostBandit345", "FrostBang38", "FrostBounty562", "FrostCap492", "FrostDeal471", "FrostHit968",
    "FrostMaster744", "FrostMoon814", "FrostNova80", "FrostOrbit77", "FrostOwl632", "FrostPilot331", "FrostPro52", "FrostProfit", "FrostRocket24", "FrostShot12",
    "FrostSlots77", "FrostZen48", "Frost_Boss52", "Frost_Racer520", "Frost_Rocket562", "Frost_Samurai28", "Frost_Throne744", "FuryBet968", "FuryBlade1", "FuryCrown156",
    "FuryDriver170", "FuryDriver366", "FuryFlare163", "FuryFlare471", "FuryFlip989", "FuryFox821", "FuryFrost765", "FuryGains261", "FuryHeist471", "FuryOrbit758",
    "FuryPrize205", "FuryShark114", "FuryShot492", "FurySlots6", "FuryStorm80", "FuryThrone95", "FuryViper149", "FuryViper401", "FuryWolf632", "FuryX485",
    "Fury_Bang625", "Fury_Chief338", "Fury_Flare163", "Fury_Gamer52", "Fury_Line359", "Fury_Wizard492", "GhostBandit80", "GhostBoss366", "GhostChip4", "GhostDeal723",
    "GhostGamer681", "GhostGuru51", "GhostHit81", "GhostMoon135", "GhostOdds296", "GhostPlay92", "GhostRoll1", "GhostRun17", "GhostRun99", "GhostStack492",
    "GhostThrone303", "Ghost_Max261", "Ghost_Ray28", "Ghost_Wave74", "Ghost_Zen982", "GlowBandit90", "GlowCash443", "GlowDeal142", "GlowDegen877", "GlowDriver",
    "GlowFox89", "GlowNinja583", "GlowNinja90", "GlowNova380", "GlowRider919", "GlowRogue35", "GlowRun163", "GlowStar99", "Glow_Bolt898", "Glow_Boom91",
    "Glow_Chief", "Glow_Edge3", "Glow_Edge702", "Glow_Punk520", "Glow_Ray88", "Glow_Rider611", "Glow_Shark78", "Glow_Strike786", "Glow_Trick611", "GoldAce41",
    "GoldBlaze135", "GoldBull870", "GoldEdge84", "GoldFire982", "GoldFlush520", "GoldHit394", "GoldMax520", "GoldNova415", "GoldOwl968", "GoldPool471",
    "GoldPop17", "GoldPop275", "GoldProfit464", "GoldStack870", "GoldStar39", "GoldToken919", "GoldTrick69", "Gold_Bang53", "Gold_Bolt233", "Gold_Bull520",
    "Gold_Hawk97", "Gold_Hit63", "Gold_Moon31", "Gold_Prize25", "Gold_Run359", "Gold_Score81", "GoldenBang758", "GoldenBounty37", "GoldenClick695", "GoldenDash800",
    "GoldenDeal380", "GoldenDice975", "GoldenDrift163", "GoldenDriver149", "GoldenGuru359", "GoldenJoe20", "GoldenMaster", "GoldenPool758", "GoldenPop534", "GoldenPunk11",
    "GoldenShark303", "GoldenShark646", "GoldenSnap702", "GoldenWizard8", "Golden_Eagle681", "Golden_Ice373", "Golden_Line39", "Golden_Pilot", "Golden_Pop", "Golden_Spark401",
    "Golden_Spin310", "Golden_Throne975", "HawkBandit807", "HawkBounty366", "HawkDice975", "HawkFox128", "HawkFox534", "HawkHeist", "HawkHeist184", "HawkPro72",
    "HawkProfit457", "HawkProfit66", "HawkStar40", "HawkStrike8", "HawkWin506", "HawkWizard128", "Hawk_Degen352", "Hawk_Fox62", "Hawk_Pulse835", "Hawk_Score76",
    "Hawk_Titan90", "HazeBoss744", "HazeCard68", "HazeCoin36", "HazeCoin394", "HazeCrown54", "HazeDeal99", "HazeDegen142", "HazeDraw46", "HazeEagle191",
    "HazeHeist408", "HazeHero247", "HazeIce492", "HazePro46", "HazePulse611", "HazeRebel394", "HazeRoll15", "HazeSamurai100", "HazeTitan", "HazeTitan499",
    "Haze_Boom95", "Haze_Cash478", "Haze_Chip65", "Haze_Crown56", "Haze_Deal681", "Haze_Fire191", "Haze_Samurai604", "HighAce492", "HighBolt240", "HighClick198",
    "HighDegen128", "HighLuck170", "HighMaster67", "HighMax142", "HighMoon48", "HighPilot34", "HighRoll219", "HighSpark261", "HighWhale555", "High_Blaze737",
    "High_Bull26", "High_Champ415", "High_Flare45", "High_King464", "High_Loot", "High_Pot163", "High_Rebel50", "High_Star135", "High_Wolf170", "HyperBandit89",
    "HyperHeist73", "HyperLegend6", "HyperLuck737", "HyperNinja33", "HyperPrize604", "HyperRich898", "HyperStash793", "HyperWizard64", "HyperYield485", "HyperYield765",
    "Hyper_Cash926", "Hyper_Eagle30", "Hyper_Glow268", "Hyper_Pop163", "Hyper_Prize310", "Hyper_Prize87", "Hyper_Rich98", "Hyper_Token590", "Hyper_Zen", "IceBlade205",
    "IceBlade884", "IceCard814", "IceChief541", "IceKnight709", "IceLoot443", "IceMaster772", "IcePlay898", "IcePrize36", "IcePrize919", "IceRacer93",
    "IceSpark89", "IceStack41", "IceStack57", "IceStash54", "IceVault67", "IceWizard76", "Ice_Bang38", "Ice_Boom695", "Ice_Card912", "Ice_Click744",
    "Ice_Punk51", "Ice_Snap387", "Ice_Wizard86", "IronBang32", "IronBet569", "IronCash842", "IronChad786", "IronDice772", "IronFlip22", "IronFox13",
    "IronGains555", "IronHand737", "IronIce709", "IronKnight", "IronLegend212", "IronLoot688", "IronPro226", "IronStack56", "IronStar954", "IronWolf401",
    "IronWolf74", "IronYield765", "Iron_Bounty681", "Iron_Coin43", "Iron_Edge583", "Iron_Flash107", "Iron_King387", "Iron_Luck135", "Iron_Nova583", "Iron_Pro597",
    "Iron_Shark128", "Iron_Viper64", "IvoryBang170", "IvoryBlaze310", "IvoryDrift58", "IvoryFire779", "IvoryHawk226", "IvoryMaster28", "IvoryPool25", "IvoryRacer39",
    "IvoryRun18", "IvorySnap29", "IvoryStrike695", "IvoryVault84", "IvoryWhale29", "IvoryWhale688", "IvoryWhale96", "IvoryWin989", "Ivory_Flare835", "Ivory_Loot226",
    "Ivory_Master604", "Ivory_Orbit20", "Ivory_Orbit93", "Ivory_Pulse98", "Ivory_Rocket982", "Ivory_Spark92", "Ivory_Titan28", "Ivory_X95", "JackpotBoom83", "JackpotCard282",
    "JackpotDegen870", "JackpotEagle996", "JackpotFire56", "JackpotFlare94", "JackpotFlip44", "JackpotFlip954", "JackpotPilot324", "JackpotPilot499", "JackpotRoller", "JackpotRun52",
    "JackpotStorm177", "JackpotTitan324", "JackpotViper62", "JackpotViper842", "JackpotWave5", "Jackpot_Bandit6", "Jackpot_Coin34", "Jackpot_Dash632", "Jackpot_Flare48", "Jackpot_Joe163",
    "Jackpot_Loot94", "Jackpot_Play772", "Jackpot_Score17", "JadeBet46", "JadeBlade22", "JadeCrown982", "JadeProfit359", "JadeRebel52", "JadeRider81", "JadeRun5",
    "JadeRush3", "JadeSage61", "JadeScore303", "JadeStack975", "JadeStrike99", "Jade_Blade184", "Jade_Draw478", "Jade_Flare73", "Jade_Joe618", "Jade_Rogue20",
    "Jade_Run79", "Jade_Stack793", "Jade_Vault359", "Jade_Win52", "LionBear632", "LionChip19", "LionDraw75", "LionFire85", "LionFlash765", "LionFlush42",
    "LionGains76", "LionHeist33", "LionKnight198", "LionLine520", "LionLuck16", "LionMoon681", "LionNinja1", "LionPilot765", "LionPop527", "LionPot88",
    "LionRun555", "LionShark933", "LionSnap891", "LionStrike870", "LionWhale254", "Lion_Bet53", "Lion_Boom793", "Lion_Click53", "Lion_Click548", "Lion_Driver534",
    "Lion_Flare289", "Lion_Joe96", "Lion_Profit366", "Lion_Roller485", "Lion_Throne345", "LuckyBandit205", "LuckyDrift58", "LuckyDriver50", "LuckyEagle877", "LuckyEdge534",
    "LuckyEdge639", "LuckyFlash674", "LuckyHeist954", "LuckyKing184", "LuckyOdds800", "LuckyRacer49", "LuckyRider247", "LuckyRun219", "LuckyShot93", "LuckySpark72",
    "LuckyWin282", "Lucky_Deal95", "Lucky_Draw72", "Lucky_Hand5", "Lucky_King646", "Lucky_Odds149", "Lucky_Play42", "Lucky_Snap639", "Lucky_Spin646", "Lucky_Star716",
    "Lucky_Strike99", "LynxChip772", "LynxDegen91", "LynxDriver226", "LynxFrost48", "LynxHit95", "LynxMoon464", "LynxMoon604", "LynxProfit", "LynxSpin737",
    "LynxWin380", "LynxYield1", "Lynx_Edge408", "Lynx_Flush926", "Lynx_Ice821", "Lynx_Ninja18", "Lynx_Rider44", "Lynx_Rocket42", "MaxAce40", "MaxAce667",
    "MaxBlade772", "MaxCard18", "MaxChad331", "MaxCrown814", "MaxDeal4", "MaxDeal632", "MaxFlush436", "MaxFox541", "MaxFrost28", "MaxOwl443",
    "MaxPulse478", "MaxRacer723", "MaxRebel352", "MaxRider835", "MaxRush82", "MaxSnap576", "MaxStar632", "MaxThrone19", "MaxVault464", "MaxWizard61",
    "Max_Cap21", "Max_Cap429", "Max_Cash30", "Max_Guru940", "Max_Outlaw8", "Max_Rider954", "Max_Stack191", "Max_Stack730", "MegaChad40", "MegaFlush3",
    "MegaOrbit331", "MegaPlay30", "MegaPot793", "MegaPro3", "MegaPulse534", "MegaRacer205", "MegaRun20", "MegaScore702", "MegaStorm65", "MegaWin60",
    "MegaWolf40", "MegaYield92", "Mega_Cash121", "Mega_Cash69", "Mega_Crown394", "Mega_Drift863", "Mega_Outlaw520", "Mega_Pilot534", "Mega_Pool366", "Mega_Stack60",
    "Mega_Vault625", "MintCap450", "MintDice", "MintEagle779", "MintGuru135", "MintGuru709", "MintHawk233", "MintHit93", "MintIce219", "MintLoot42",
    "MintMoon47", "MintPlay891", "MintPrize380", "MintSamurai96", "MintShark331", "MintStrike751", "MintX835", "Mint_Chief33", "Mint_Dice639", "Mint_Draw471",
    "Mint_Ice83", "Mint_Master31", "Mint_Rich205", "Mint_Rocket57", "Mint_Shark73", "Mint_Streak69", "Mint_Whale43", "Mint_Wizard303", "Mint_Yield", "MistDash877",
    "MistDraw289", "MistFrost", "MistHeist30", "MistHit506", "MistHit68", "MistHit69", "MistPro590", "MistRoll618", "MistRoll912", "MistRun18",
    "MistSamurai219", "MistSamurai240", "MistSpark", "MistSpin41", "MistVault198", "MistViper60", "Mist_Nova69", "Mist_Odds681", "Mist_Pro492", "Mist_Profit35",
    "Mist_Pulse534", "Mist_Rider450", "Mist_Sage2", "MoonBear366", "MoonBlaze359", "MoonChief247", "MoonCoin33", "MoonDrift87", "MoonKing387", "MoonNinja107",
    "MoonPilot317", "MoonPulse24", "MoonPulse373", "MoonRich75", "MoonRider821", "MoonStack744", "MoonStack912", "MoonStash786", "MoonStrike35", "Moon_Blade36",
    "Moon_Bull", "Moon_Bull9", "Moon_Chip78", "Moon_Gains422", "Moon_Ice", "Moon_Rich31", "Moon_Sage5", "Moon_Shark996", "Moon_Stack814", "Moon_Zen856",
    "MysticCap604", "MysticChief", "MysticDegen226", "MysticEdge695", "MysticGlow324", "MysticGuru254", "MysticKing870", "MysticOdds604", "MysticOdds905", "MysticOutlaw716",
    "MysticOwl877", "MysticOwl912", "MysticPilot31", "MysticPlay1", "MysticPunk14", "MysticRebel71", "MysticRocket16", "Mystic_Bet45", "Mystic_Boss681", "Mystic_Champ387",
    "Mystic_Dice4", "Mystic_Gains184", "Mystic_Pulse681", "Mystic_Throne842", "Mystic_X63", "NeoBear21", "NeoFire60", "NeoHand548", "NeoHeist352", "NeoMaster91",
    "NeoMax555", "NeoPilot33", "NeoPool611", "NeoPot82", "NeoRoll282", "NeoTitan191", "NeoToken3", "NeoWave42", "NeoWizard632", "NeoWizard877",
    "Neo_Dice709", "Neo_Knight415", "Neo_Owl62", "Neo_Spark898", "Neo_Zen779", "NeonDice26", "NeonDriver83", "NeonFlash947", "NeonFrost695", "NeonGains345",
    "NeonHeist940", "NeonLuck394", "NeonMaster43", "NeonPop394", "NeonRay47", "NeonRocket2", "NeonShot926", "NeonStorm268", "NeonToken51", "NeonWhale191",
    "NeonZen856", "NeonZen947", "Neon_Chief31", "Neon_Dice849", "Neon_Gains184", "Neon_Glow51", "Neon_King464", "Neon_Ninja436", "Neon_Owl21", "Neon_Prize35",
    "Neon_Rush35", "Neon_Stack142", "Neon_Streak800", "Neon_Vault380", "Neon_Win59", "Neon_Wizard32", "Neon_X65", "NightBet233", "NightChief198", "NightDash33",
    "NightHawk95", "NightHeist618", "NightMax61", "NightPool78", "NightPot45", "NightProfit41", "NightPulse520", "NightRacer149", "NightRider8", "NightRider954",
    "NightSnap387", "NightStar562", "NightStash163", "NightThrone64", "NightVault373", "Night_Champ30", "Night_Edge366", "Night_Gamer53", "Night_Glow856", "Night_Pop27",
    "Night_Rocket296", "Night_Roller170", "Night_Rush38", "Night_Score443", "Night_Token4", "Night_Vault310", "Night_Wizard849", "Night_Zen40", "NitroDraw4", "NitroEagle56",
    "NitroFire261", "NitroGamer870", "NitroHand89", "NitroPilot478", "NitroPlay11", "NitroPot34", "NitroPrize67", "NitroRush926", "NitroToken443", "NitroZen4",
    "NitroZen709", "Nitro_Deal121", "Nitro_Edge912", "Nitro_Gains975", "Nitro_Heist53", "Nitro_Play996", "ObsidianAce25", "ObsidianCap3", "ObsidianChad520", "ObsidianDegen58",
    "ObsidianHawk212", "ObsidianHawk709", "ObsidianKing96", "ObsidianLine170", "ObsidianLuck1", "ObsidianOwl163", "ObsidianRider56", "ObsidianRider779", "ObsidianSpark919", "ObsidianThrone457",
    "Obsidian_Boss20", "Obsidian_Boss68", "Obsidian_Cap114", "Obsidian_Card114", "Obsidian_Edge744", "Obsidian_Line93", "Obsidian_Moon44", "Obsidian_Moon541", "Obsidian_Pro65", "Obsidian_Whale93",
    "OnyxBang499", "OnyxBear534", "OnyxBoom22", "OnyxChamp38", "OnyxPro49", "OnyxRoller898", "OnyxSamurai15", "OnyxSnap50", "OnyxStorm81", "Onyx_Bolt68",
    "Onyx_Flush387", "Onyx_Flush44", "Onyx_Hero30", "Onyx_Score69", "Onyx_Snap86", "Onyx_Zen268", "OrcaAce85", "OrcaBandit891", "OrcaBandit92", "OrcaCash296",
    "OrcaCoin331", "OrcaDeal47", "OrcaDegen429", "OrcaDraw36", "OrcaDrift28", "OrcaFire751", "OrcaGlow25", "OrcaHawk21", "OrcaHero184", "OrcaIce90",
    "OrcaLuck19", "OrcaNova52", "OrcaPlay21", "OrcaPrize912", "OrcaPro56", "OrcaProfit12", "OrcaRebel72", "OrcaRich77", "OrcaRider548", "OrcaRush877",
    "OrcaShark23", "OrcaShot10", "OrcaShot646", "OrcaStash856", "Orca_Blade716", "Orca_Boom98", "Orca_Chief40", "Orca_Click982", "Orca_Orbit62", "Orca_Storm779",
    "PantherChad478", "PantherDraw436", "PantherDriver24", "PantherGains13", "PantherLegend80", "PantherNova52", "PantherOwl541", "PantherPlay779", "PantherPrize60", "PantherPunk45",
    "PantherPunk93", "PantherRacer49", "PantherRay128", "PantherRoll520", "PantherSnap954", "PantherStash268", "PantherVault996", "PantherWhale954", "Panther_Champ33", "Panther_Draw590",
    "Panther_Luck39", "Panther_Rocket457", "Panther_Sage576", "Panther_Wolf57", "Panther_Yield674", "PeakBear56", "PeakBlaze29", "PeakCap387", "PeakDice16", "PeakFire95",
    "PeakHand66", "PeakHeist42", "PeakLuck548", "PeakMoon296", "PeakOutlaw84", "PeakPlay303", "PeakPro548", "PeakRocket142", "PeakSnap81", "PeakToken35",
    "PeakTrick74", "PeakWhale674", "PeakWizard29", "PeakZen46", "Peak_Blaze5", "Peak_Boom49", "Peak_Drift", "Peak_Flip", "Peak_Knight198", "Peak_Nova366",
    "Peak_Rider21", "Peak_Run63", "Peak_Samurai933", "Peak_Score198", "Peak_Stash380", "Peak_Streak464", "Peak_Throne60", "Peak_Whale", "Peak_Wizard73", "PhantomBlaze947",
    "PhantomChamp83", "PhantomChief71", "PhantomDraw548", "PhantomGlow84", "PhantomKing90", "PhantomLegend79", "PhantomOrbit34", "PhantomPilot37", "PhantomPot919", "PhantomRun39",
    "PhantomSage639", "PhantomTitan471", "PhantomToken38", "Phantom_Flip", "Phantom_Pop765", "Phantom_Spark128", "Phantom_Wizard541", "PixelAce23", "PixelBear100", "PixelBoss85",
    "PixelChief16", "PixelChief47", "PixelChip46", "PixelEagle15", "PixelFrost50", "PixelGamer877", "PixelHeist821", "PixelOutlaw32", "PixelPot429", "PixelPro39",
    "PixelProfit170", "PixelRun499", "PixelViper184", "PixelX37", "PixelX94", "Pixel_Blade11", "Pixel_Blaze121", "Pixel_Crown702", "Pixel_Frost926", "Pixel_Prize184",
    "Pixel_Prize317", "Pixel_Rider14", "Pixel_Spin1", "Pixel_Token800", "PrimeAce18", "PrimeAce982", "PrimeCash107", "PrimeChip6", "PrimeCrown13", "PrimeFrost1",
    "PrimeFrost11", "PrimeHawk275", "PrimeIce17", "PrimeIce730", "PrimePool19", "PrimeProfit765", "Prime_Bull632", "Prime_Hero12", "Prime_Max933", "Prime_Orbit380",
    "Prime_Pop65", "Prime_Rich639", "Prime_Rush765", "Prime_Strike35", "Prime_Wave240", "ProBandit42", "ProBoss", "ProDriver716", "ProEagle44", "ProFire72",
    "ProFlare625", "ProGuru128", "ProIce19", "ProMoon56", "ProNinja61", "ProNinja93", "ProPool52", "ProPrize457", "ProRoller912", "ProRun604",
    "ProScore863", "ProYield891", "Pro_Flare793", "Pro_Flush100", "Pro_Hero82", "Pro_Wizard954", "PulseBandit18", "PulseBounty97", "PulseCoin67", "PulseFlip807",
    "PulseFox46", "PulseGlow450", "PulsePop163", "PulsePot247", "PulseProfit25", "PulseRoll702", "PulseStreak88", "PulseStrike471", "PulseToken954", "PulseWhale45",
    "PulseWolf835", "PulseWolf86", "PulseX499", "PulseX653", "Pulse_Bang527", "Pulse_Driver114", "Pulse_Gains61", "Pulse_Rider317", "Pulse_Roller6", "QuantumBet95",
    "QuantumBoss548", "QuantumDraw933", "QuantumDrift667", "QuantumFox282", "QuantumNova296", "QuantumOdds674", "QuantumRider653", "QuantumThrone660", "QuantumWolf76", "Quantum_Bet67",
    "Quantum_Boss282", "Quantum_Cap373", "Quantum_Cap919", "Quantum_Flash233", "Quantum_Shot114", "Quantum_Wave83", "Quantum_Whale842", "RageBolt303", "RageBoom44", "RageCard940",
    "RageClick233", "RageClick821", "RageEagle695", "RageFrost737", "RageHand863", "RagePro2", "RageShark64", "RageShot891", "RageSlots191", "RageSnap32",
    "RageStack58", "RageVault32", "Rage_Bolt149", "Rage_Champ898", "Rage_Click821", "Rage_Hand78", "Rage_Master219", "Rage_Odds520", "Rage_Pot912", "Rage_Racer121",
    "Rage_Rocket268", "Rage_Wave19", "RapidFire891", "RapidFox73", "RapidHeist835", "RapidMoon177", "RapidMoon842", "RapidPool520", "RapidRoll71", "RapidShot331",
    "RapidZen27", "RapidZen401", "Rapid_Bet51", "Rapid_Click996", "Rapid_Flush408", "Rapid_Hand912", "Rapid_Nova39", "Rapid_Odds5", "Rapid_Rogue9", "Rapid_Snap61",
    "Rapid_Stash345", "Rapid_Whale247", "Rapid_X97", "RavenBandit25", "RavenBandit716", "RavenCash59", "RavenChip877", "RavenDeal401", "RavenFlare", "RavenFlush870",
    "RavenLoot84", "RavenMoon24", "RavenNinja394", "RavenNova29", "RavenPilot667", "RavenPool380", "RavenRay6", "RavenRun310", "RavenShark611", "RavenShark660",
    "RavenSpark422", "Raven_Blade74", "Raven_Chief898", "Raven_Draw25", "Raven_Gains359", "Raven_Legend191", "Raven_Pool5", "Raven_Score86", "Raven_Viper569", "RedBoss632",
    "RedChief60", "RedClick14", "RedCoin", "RedDegen10", "RedFire72", "RedHawk48", "RedHeist49", "RedHit366", "RedKing527", "RedPilot6",
    "RedPrize485", "RedPulse555", "RedRacer765", "RedRider38", "RedRider84", "RedRider9", "RedRun310", "RedShot3", "RedTitan856", "RedTrick905",
    "RedVault83", "Red_Bounty310", "Red_Drift65", "Red_Flash54", "Red_Guru310", "Red_Joe10", "Red_Joe408", "Red_Loot793", "Red_Master81", "Red_Rich5",
    "Red_Strike107", "RidgeAce961", "RidgeBounty43", "RidgeBounty940", "RidgeFlush926", "RidgeHit48", "RidgeHit940", "RidgeIce569", "RidgeJoe310", "RidgeJoe723",
    "RidgeLuck450", "RidgeOwl569", "RidgePop77", "RidgePulse142", "RidgeRebel78", "RidgeRich842", "RidgeRoll7", "RidgeSage42", "RidgeScore457", "RidgeSnap870",
    "RidgeStash632", "RidgeStorm11", "RidgeTitan31", "RidgeWhale905", "RidgeWizard170", "RidgeWizard919", "Ridge_Bounty184", "Ridge_Chad", "Ridge_Degen85", "Ridge_Draw541",
    "Ridge_Drift35", "Ridge_Legend54", "Ridge_Line17", "Ridge_Max135", "Ridge_Pop13", "Ridge_Prize22", "Ridge_Rebel576", "Ridge_Score92", "Ridge_Shark499", "Ridge_Shark996",
    "Ridge_Spin919", "Ridge_Wolf359", "Ridge_X744", "Ridge_Yield751", "RogueBang68", "RogueBlade32", "RogueBolt", "RogueBolt69", "RogueCard751", "RogueCard877",
    "RogueChief16", "RogueChief541", "RogueCoin86", "RogueDegen695", "RogueDice275", "RogueDice548", "RogueFire478", "RogueHero31", "RogueJoe", "RogueJoe800",
    "RogueKing471", "RogueKnight751", "RogueNova681", "RogueRoller36", "RogueSage149", "RogueSamurai464", "RogueStack100", "RogueWizard24", "RogueZen97", "Rogue_Hand233",
    "Rogue_Hit317", "Rogue_King83", "Rogue_Rogue89", "Rogue_Roll54", "Rogue_Stack29", "Rogue_Win13", "Rogue_X94", "RoyalBounty65", "RoyalBounty92", "RoyalCap2",
    "RoyalFire43", "RoyalFlare569", "RoyalFlush15", "RoyalFox29", "RoyalGlow39", "RoyalIce667", "RoyalLegend926", "RoyalLuck", "RoyalOdds121", "RoyalPro9",
    "RoyalRider730", "RoyalSpark16", "RoyalThrone61", "RoyalWin70", "Royal_Flare35", "Royal_Flush870", "Royal_Gains42", "Royal_Glow85", "Royal_Hand681", "Royal_Pro54",
    "Royal_Pulse67", "Royal_Rider968", "Royal_Shot485", "Royal_Storm352", "RubyBear212", "RubyFlash667", "RubyFox870", "RubyHeist97", "RubyNinja226", "RubyPrize674",
    "RubyRoller226", "RubyWizard46", "Ruby_Master835", "Ruby_Pot730", "Ruby_Stash884", "Ruby_X31", "RushBlade23", "RushBounty80", "RushCash828", "RushChamp233",
    "RushClick842", "RushDeal268", "RushDice1", "RushDice877", "RushDice89", "RushFire9", "RushHawk48", "RushJoe51", "RushMax856", "RushMax968",
    "RushPool114", "RushPunk53", "RushRider156", "RushStreak898", "RushWolf", "Rush_Click18", "Rush_Gains42", "Rush_Loot506", "Rush_Master226", "Rush_Owl674",
    "Rush_Trick9", "SafeBoss75", "SafeCap73", "SafeChad68", "SafeChamp793", "SafeEdge709", "SafeFire226", "SafeFlare359", "SafeFlare40", "SafeGains177",
    "SafeHeist83", "SafeHit786", "SafeJoe359", "SafeLine352", "SafeLine548", "SafeOdds800", "SafePop100", "SafePot723", "SafeRun709", "SafeSamurai716",
    "Safe_Bear26", "Safe_Deal98", "Safe_Drift49", "Safe_Flip765", "Safe_King303", "Safe_Titan408", "Safe_Token", "SapphireBlade66", "SapphireChip33", "SapphireEdge26",
    "SapphireGains282", "SapphireHawk72", "SapphireJoe", "SapphireNinja79", "SapphireNova947", "SapphireOutlaw996", "SapphirePlay429", "SapphirePrize60", "SapphireRogue954", "SapphireRoller16",
    "SapphireRush821", "SapphireStack22", "SapphireStack926", "Sapphire_Bandit261", "Sapphire_Boss64", "Sapphire_Chad114", "Sapphire_Chief33", "Sapphire_Chip5", "Sapphire_Coin121", "Sapphire_Hawk68",
    "Sapphire_Orbit19", "Sapphire_Pop107", "Sapphire_Shark", "Sapphire_Shark751", "Sapphire_Viper59", "ShadowBear43", "ShadowCash240", "ShadowDice135", "ShadowHand933", "ShadowJoe870",
    "ShadowNinja548", "ShadowOwl205", "ShadowPool513", "ShadowRich8", "ShadowRoll135", "Shadow_Cap849", "Shadow_Dice6", "Shadow_Hawk793", "Shadow_Orbit506", "Shadow_Spin716",
    "SharkBet576", "SharkBlade499", "SharkBolt317", "SharkCap66", "SharkDeal947", "SharkDrift99", "SharkHand88", "SharkJoe520", "SharkKnight56", "SharkMax59",
    "SharkOdds95", "SharkPot37", "SharkPro198", "SharkPunk548", "SharkRoll562", "SharkRush989", "SharkScore527", "SharkShark191", "SharkSlots28", "SharkToken590",
    "SharkWhale940", "SharkWin25", "Shark_Bear394", "Shark_Hawk170", "Shark_Ice513", "Shark_Ninja13", "Shark_Pool331", "Shark_Rogue219", "Shark_Rogue233", "Shark_Roller576",
    "Shark_Stash604", "Shark_Throne373", "Shark_Throne744", "Shark_Token555", "SharpBandit359", "SharpBull", "SharpEdge289", "SharpGlow499", "SharpHawk254", "SharpHero457",
    "SharpLuck373", "SharpMoon604", "SharpProfit44", "SharpSage100", "SharpStorm48", "Sharp_Rider13", "Sharp_Samurai170", "Sharp_Wizard66", "SilverClick100", "SilverDeal226",
    "SilverFire247", "SilverNova310", "SilverPlay5", "SilverPlay95", "SilverPrize184", "SilverPrize55", "SilverProfit77", "SilverRebel730", "SilverRocket772", "SilverRoller46",
    "SilverWizard156", "SilverX2", "Silver_Bandit240", "Silver_Bull95", "Silver_Chad331", "Silver_Guru702", "Silver_Knight65", "Silver_Knight8", "Silver_Owl1", "Silver_Run39",
    "Silver_Slots89", "Silver_Viper464", "SmokeBlade485", "SmokeChad33", "SmokeCoin37", "SmokeDice940", "SmokeDraw156", "SmokeFire90", "SmokeFrost90", "SmokeGlow99",
    "SmokeHit807", "SmokeRich723", "SmokeRoller205", "SmokeShot499", "SmokeSpark569", "SmokeSpin99", "SmokeStar506", "SmokeThrone877", "SmokeToken996", "SmokeTrick646",
    "Smoke_Loot576", "Smoke_Ninja", "Smoke_Orbit45", "Smoke_Punk394", "Smoke_Stash44", "Smoke_Streak590", "Smoke_Wave99", "SonicBear996", "SonicCap849", "SonicChamp93",
    "SonicDraw41", "SonicEdge21", "SonicFlash170", "SonicHand177", "SonicIce555", "SonicKing31", "SonicNova569", "SonicPilot989", "SonicRich100", "SonicRich41",
    "SonicShot", "SonicThrone730", "SonicVault163", "SonicWave548", "Sonic_Boom74", "Sonic_Knight", "Sonic_Sage275", "Sonic_Samurai90", "Sonic_Stack9", "Sonic_Zen968",
    "SpinBull254", "SpinChief772", "SpinCoin85", "SpinDash982", "SpinDeal219", "SpinFrost744", "SpinPlay261", "SpinPop95", "SpinPulse4", "SpinRush81",
    "SpinSamurai42", "SpinShot219", "SpinThrone779", "Spin_Chad61", "Spin_Degen77", "Spin_Fox261", "Spin_Gains520", "Spin_Max723", "Spin_Rocket674", "Spin_Sage541",
    "Spin_X56", "StackBlade730", "StackBolt43", "StackBoss940", "StackClick1", "StackDice77", "StackDriver352", "StackIce22", "StackNinja27", "StackOwl84",
    "StackShark", "StackThrone16", "StackTrick81", "Stack_Bounty751", "Stack_Joe345", "Stack_King4", "Stack_Play25", "Stack_Profit926", "Stack_Spark34", "Stack_Strike62",
    "StarAce765", "StarCash303", "StarCrown4", "StarDraw121", "StarDriver989", "StarFire5", "StarFire982", "StarFlush191", "StarHit22", "StarHit75",
    "StarKing870", "StarPlay76", "StarPot1", "StarSage317", "StarScore83", "StarTitan821", "StarToken800", "StarWave513", "Star_Chip149", "Star_Drift23",
    "Star_Flip", "Star_Fox32", "Star_Knight87", "Star_Samurai345", "Star_Star91", "Star_Token57", "SteelBang53", "SteelChief793", "SteelChip23", "SteelCoin569",
    "SteelDraw1", "SteelDriver68", "SteelFlare954", "SteelFlush940", "SteelIce83", "SteelJoe16", "SteelKnight912", "SteelKnight996", "SteelMaster59", "SteelOdds625",
    "SteelPilot73", "SteelPulse99", "SteelRacer702", "SteelScore59", "SteelSpark170", "SteelStorm478", "SteelVault18", "SteelViper366", "SteelWolf513", "Steel_Bear",
    "Steel_Flare90", "Steel_Glow95", "Steel_Hand968", "Steel_Hero38", "Steel_Slots198", "Steel_Star22", "Steel_Star660", "Steel_Streak387", "StoneBandit604", "StoneCash12",
    "StoneDriver415", "StoneEagle639", "StoneGlow53", "StoneKnight492", "StoneNova485", "StoneOdds632", "StoneOdds80", "StonePot13", "StoneProfit905", "StoneRider52",
    "StoneRider807", "StoneRush485", "StoneRush772", "StoneSlots142", "StoneStreak737", "StoneThrone90", "StoneViper107", "Stone_Blaze6", "Stone_Bolt744", "Stone_Deal968",
    "Stone_Dice646", "Stone_Edge77", "Stone_Ice863", "Stone_Luck968", "Stone_Roller36", "Stone_Rush15", "Stone_Score71", "Stone_Spark653", "Stone_X61", "Stone_X98",
    "StormAce1", "StormAce12", "StormBandit639", "StormBang38", "StormBear996", "StormBlaze303", "StormBlaze387", "StormBoss737", "StormBounty905", "StormCap52",
    "StormCap807", "StormCoin814", "StormDrift800", "StormFox", "StormFrost90", "StormGains450", "StormHero35", "StormHit53", "StormKing9", "StormLine352",
    "StormMoon849", "StormPilot114", "StormPlay310", "StormPlay569", "StormPunk338", "StormRich31", "StormRich63", "StormRoll20", "StormShark660", "StormShark75",
    "StormShot1", "StormStash478", "StormVault96", "StormWave254", "StormWhale170", "StormWin373", "StormWizard88", "StormZen380", "Storm_Bang45", "Storm_Bet50",
    "Storm_Fire19", "Storm_Flare933", "Storm_Fox61", "Storm_Guru814", "Storm_Moon184", "Storm_Pop296", "Storm_Pulse9", "Storm_Racer", "Storm_Racer89", "Storm_Roller44",
    "Storm_Star41", "Storm_Stash982", "Storm_Wolf74", "Storm_Zen8", "SummitEdge38", "SummitFlush33", "SummitFlush5", "SummitFox53", "SummitGuru84", "SummitHeist26",
    "SummitHero807", "SummitHit751", "SummitLuck10", "SummitMoon604", "SummitPrize688", "SummitProfit77", "SummitRider240", "SummitRocket50", "SummitShot86", "SummitSpark52",
    "SummitStash67", "SummitStorm541", "SummitStreak56", "Summit_Bang660", "Summit_Boom702", "Summit_Cash4", "Summit_Chad", "Summit_Hand520", "Summit_Knight205", "Summit_Pro",
    "SuperBlade618", "SuperBlade88", "SuperCash247", "SuperChad184", "SuperChief80", "SuperCrown32", "SuperDrift597", "SuperDriver653", "SuperLoot56", "SuperLoot69",
    "SuperOdds849", "SuperPop95", "SuperRider807", "SuperRocket67", "SuperScore443", "SuperShark99", "Super_Bolt", "Super_Orbit471", "Super_Pop83", "Super_Pulse45",
    "Super_Rogue464", "Super_Slots702", "Super_Snap303", "Super_Titan63", "Super_Whale373", "Super_Win29", "Super_Wizard40", "SurgeBet352", "SurgeBolt57", "SurgeDegen12",
    "SurgeFlash688", "SurgeFox702", "SurgePrize27", "SurgeRay38", "SurgeRay40", "SurgeRocket499", "SurgeRogue688", "SurgeSnap604", "SurgeTitan34", "SurgeTitan793",
    "Surge_Bolt520", "Surge_Driver730", "Surge_Knight926", "Surge_Shark34", "Surge_Shot835", "Surge_Snap67", "Surge_Win135", "SwiftAce30", "SwiftCoin387", "SwiftFlip891",
    "SwiftFlush70", "SwiftPlay39", "SwiftPrize49", "SwiftPro8", "SwiftProfit205", "SwiftPunk996", "SwiftRoller534", "SwiftScore3", "SwiftTitan534", "SwiftToken91",
    "Swift_Dash149", "Swift_Heist", "Swift_Pilot947", "Swift_Wizard240", "ThunderAce646", "ThunderBlaze64", "ThunderDriver66", "ThunderEdge26", "ThunderFlip646", "ThunderFlush71",
    "ThunderHeist884", "ThunderPool891", "ThunderPot39", "ThunderPulse50", "ThunderRacer25", "ThunderRacer674", "ThunderScore55", "ThunderShark84", "ThunderWolf95", "Thunder_Ace76",
    "Thunder_Bull968", "Thunder_Cash62", "Thunder_Edge352", "Thunder_Glow450", "Thunder_King737", "Thunder_Outlaw366", "Thunder_Owl87", "Thunder_Pot163", "Thunder_Shark86", "Thunder_Storm485",
    "Thunder_Wave653", "TigerChad975", "TigerDeal128", "TigerDice317", "TigerEagle786", "TigerGuru47", "TigerJoe219", "TigerMaster338", "TigerPilot618", "TigerPulse121",
    "TigerRich352", "TigerShark317", "TigerSnap76", "TigerTrick653", "TigerViper", "TigerX513", "Tiger_Bang709", "Tiger_Bull89", "Tiger_Draw891", "Tiger_Frost74",
    "Tiger_Loot639", "Tiger_Samurai142", "Tiger_Snap35", "Tiger_Storm478", "Tiger_Vault19", "TitanBull191", "TitanCap5", "TitanCard366", "TitanGlow667", "TitanKnight75",
    "TitanMaster450", "TitanOdds41", "TitanPlay33", "TitanProfit65", "TitanRacer821", "TitanRacer88", "TitanRay541", "TitanRocket83", "TitanRoller184", "TitanStorm",
    "TitanTrick408", "TitanWolf95", "Titan_Bandit660", "Titan_Bear77", "Titan_Boss821", "Titan_Chief331", "Titan_Frost870", "Titan_Knight21", "Titan_Max55", "Titan_Spin35",
    "Titan_Token33", "TurboBolt387", "TurboBoss32", "TurboDice42", "TurboDriver60", "TurboEdge275", "TurboFlip14", "TurboGains849", "TurboHawk926", "TurboKing",
    "TurboLine618", "TurboLoot57", "TurboLuck793", "TurboNinja11", "TurboNinja68", "TurboPrize47", "TurboProfit338", "TurboRich30", "TurboStar555", "TurboStar590",
    "TurboStrike86", "TurboTrick779", "TurboWave35", "TurboWolf83", "Turbo_Bounty821", "Turbo_Chad674", "Turbo_Fire919", "Turbo_King44", "Turbo_Legend66", "Turbo_Line961",
    "Turbo_Prize40", "Turbo_Roll64", "Turbo_Score450", "Turbo_Titan219", "Turbo_Token6", "UltraCap632", "UltraKing59", "UltraLine191", "UltraMaster49", "UltraOdds436",
    "UltraPlay48", "UltraPop163", "UltraPrize68", "UltraRay24", "UltraRun611", "UltraSnap64", "UltraSpark457", "UltraStorm415", "UltraTitan89", "UltraVault576",
    "Ultra_Boom394", "Ultra_Fox513", "Ultra_Glow898", "Ultra_Hero681", "Ultra_Moon625", "Ultra_Racer114", "Ultra_Shark653", "Ultra_Slots5", "Ultra_Star289", "Ultra_Star68",
    "VaultBoom40", "VaultChad93", "VaultChip394", "VaultDegen254", "VaultDrift828", "VaultFire4", "VaultFrost408", "VaultJoe65", "VaultLine", "VaultNova275",
    "VaultOutlaw968", "VaultRogue36", "VaultRogue72", "VaultSage520", "Vault_Bet779", "Vault_Fire961", "Vault_Ice751", "Vault_Rider25", "Vault_Strike639", "Vault_Strike891",
    "Vault_Trick57", "VegasBandit268", "VegasBoom730", "VegasBoom905", "VegasCrown53", "VegasDegen7", "VegasDice702", "VegasDrift688", "VegasDrift74", "VegasDriver135",
    "VegasFlush6", "VegasJoe443", "VegasLoot877", "VegasOwl54", "VegasRogue401", "VegasShot107", "VegasTitan387", "VegasTrick54", "VegasYield562", "Vegas_Bear828",
    "Vegas_Cash32", "Vegas_Chad513", "Vegas_Click24", "Vegas_Frost765", "Vegas_Hand63", "Vegas_Pulse20", "Vegas_Rich793", "VenomBang39", "VenomCoin14", "VenomDriver72",
    "VenomGamer16", "VenomLoot163", "VenomMaster254", "VenomMoon653", "VenomNinja10", "VenomOutlaw597", "VenomRacer352", "VenomRay98", "VenomRich457", "VenomRush6",
    "VenomStrike6", "VenomToken919", "VenomX29", "VenomZen46", "Venom_Flush10", "Venom_Hero576", "Venom_Pot569", "Venom_Pro380", "Venom_Roll499", "Venom_Shark618",
    "Venom_Star27", "Venom_Storm121", "Venom_Vault919", "Venom_Wave142", "ViperBang184", "ViperCrown296", "ViperLine408", "ViperOdds709", "ViperPot5", "ViperSage814",
    "ViperStar92", "ViperStreak331", "ViperStrike835", "ViperToken94", "ViperTrick1", "ViperWave11", "ViperWin82", "Viper_Blaze562", "Viper_Edge9", "Viper_Fire919",
    "Viper_Hand36", "Viper_Rocket555", "Viper_Roller98", "Viper_Whale98", "VoltAce464", "VoltChamp32", "VoltDrift1", "VoltKing31", "VoltLuck4", "VoltPilot765",
    "VoltRider88", "VoltRocket79", "VoltSpark48", "VoltWhale240", "Volt_Bull527", "Volt_Hero394", "Volt_Rocket90", "Volt_Token11", "Volt_Wizard198", "WaveCard53",
    "WaveFire45", "WaveHero14", "WaveMaster96", "WavePilot191", "WavePot233", "WavePulse77", "WaveSamurai25", "WaveScore947", "WaveSlots10", "WaveSpin702",
    "WaveToken884", "WaveWhale142", "WaveWizard422", "WaveX317", "Wave_Bear940", "Wave_Bounty723", "Wave_Card891", "Wave_Chad772", "Wave_Champ849", "Wave_Fire30",
    "Wave_Legend28", "Wave_Rider723", "Wave_Score457", "Wave_Token80", "Wave_Wave968", "Wave_Zen912", "WildBlade84", "WildIce97", "WildLuck121", "WildMaster",
    "WildNinja478", "WildNinja982", "WildProfit135", "Wild_Eagle667", "Wild_Sage905", "Wild_Zen1", "WolfBandit91", "WolfBounty4", "WolfCash695", "WolfChip450",
    "WolfCoin13", "WolfDraw646", "WolfFox19", "WolfFrost345", "WolfHit499", "WolfKing268", "WolfMaster98", "WolfRebel97", "WolfRider639", "WolfScore877",
    "WolfStrike53", "Wolf_Bandit9", "Wolf_Frost82", "Wolf_Shot23", "Wolf_Wizard569", "ZenithBandit373", "ZenithChip772", "ZenithCrown569", "ZenithDash226", "ZenithHand20",
    "ZenithKing184", "ZenithKing436", "ZenithOwl443", "ZenithPilot49", "ZenithPrize415", "ZenithPrize65", "ZenithPunk184", "ZenithRebel26", "ZenithSamurai82", "ZenithStack",
    "ZenithToken44", "ZenithWave95", "ZenithWhale48", "Zenith_Bolt63", "Zenith_Bounty163", "Zenith_Owl926", "Zenith_Racer317", "Zenith_Ray233", "Zenith_Rebel99", "Zenith_Whale61",
    "Zenith_X73", "ZeroChip82", "ZeroDeal69", "ZeroFrost863", "ZeroHero779", "ZeroKing29", "ZeroNinja82", "ZeroRay36", "ZeroRich4", "ZeroSlots15",
    "ZeroTitan12", "ZeroWizard541", "Zero_Champ359", "Zero_Draw359", "Zero_Gains54", "Zero_Legend240", "Zero_Pot59", "Zero_Pro282", "Zero_Rider53", "Zero_Roller20"
  ];

  const loadDefaults = () => {
    const filtered = defaultNames.filter(n => !realUsernames.has(n.toLowerCase()));
    save({ usernames: filtered });
  };

  return (
    <PanelView title="Ghost Users" onBack={onBack}>
      <div className="space-y-4 max-w-lg">
        {loading ? <p className="text-muted-foreground text-sm">Loading...</p> : (
          <>
            {/* Master Toggle */}
            <div className="rounded-xl border border-border bg-card p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-display font-bold text-sm">Ghost Users</p>
                  <p className={`text-xs font-semibold mt-0.5 ${enabled ? "text-casino-green" : "text-muted-foreground"}`}>
                    {enabled ? "👻 Active — Fake users are online" : "Disabled"}
                  </p>
                </div>
                <Switch checked={enabled} onCheckedChange={(v) => save({ enabled: v })} disabled={saving} />
              </div>
              <p className="text-[11px] text-muted-foreground">
                When enabled, ghost users appear online in the social tab and presence counters. They look like real players but are entirely simulated.
              </p>
            </div>

            {/* Online Schedule */}
            <div className="rounded-xl border border-border bg-card p-5 space-y-4">
              <p className="font-display font-bold text-sm">Online Schedule</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">Min Online</Label>
                  <Input type="number" min="0" max="200" value={minOnline}
                    onChange={(e) => save({ min_online: Number(e.target.value) })}
                    className="bg-secondary border-border mt-1 h-9 text-sm" />
                  <p className="text-[10px] text-muted-foreground mt-1">Minimum ghost users always online</p>
                </div>
                <div>
                  <Label className="text-xs">Peak Online</Label>
                  <Input type="number" min="0" max="500" value={peakOnline}
                    onChange={(e) => save({ peak_online: Number(e.target.value) })}
                    className="bg-secondary border-border mt-1 h-9 text-sm" />
                  <p className="text-[10px] text-muted-foreground mt-1">Max ghost users during peak hours</p>
                </div>
                <div>
                  <Label className="text-xs">Ramp Up Period (hours)</Label>
                  <Input type="number" min="1" max="24" value={rampHours}
                    onChange={(e) => save({ ramp_hours: Number(e.target.value) })}
                    className="bg-secondary border-border mt-1 h-9 text-sm" />
                  <p className="text-[10px] text-muted-foreground mt-1">Hours to reach peak from min</p>
                </div>
                <div>
                  <Label className="text-xs">Go Offline / Hour</Label>
                  <Input type="number" min="1" max="50" value={offlinePerHour}
                    onChange={(e) => save({ offline_per_hour: Number(e.target.value) })}
                    className="bg-secondary border-border mt-1 h-9 text-sm" />
                  <p className="text-[10px] text-muted-foreground mt-1">How many go offline per hour after peak</p>
                </div>
              </div>
            </div>

            {/* Visibility */}
            <div className="rounded-xl border border-border bg-card p-5 space-y-3">
              <p className="font-display font-bold text-sm">Visibility Options</p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm">Show in social/online list</p>
                  <p className="text-[10px] text-muted-foreground">Ghost users appear in the online members tab</p>
                </div>
                <Switch checked={showInPresence} onCheckedChange={(v) => save({ show_in_presence: v })} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm">Show in game chat</p>
                  <p className="text-[10px] text-muted-foreground">Ghost users occasionally post in game chats</p>
                </div>
                <Switch checked={showInChat} onCheckedChange={(v) => save({ show_in_chat: v })} />
              </div>
            </div>

            {/* Custom Usernames */}
            <div className="rounded-xl border border-border bg-card p-5 space-y-3">
              <div className="flex items-center justify-between">
                <p className="font-display font-bold text-sm">Custom Usernames ({usernames.length})</p>
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={loadDefaults}>
                  Load Defaults ({defaultNames.length})
                </Button>
              </div>
              <div className="flex gap-2">
                <Input value={newUsername} onChange={(e) => setNewUsername(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addUsername()}
                  placeholder="Add username..." className="bg-secondary border-border text-sm" />
                <Button variant="gold" size="sm" onClick={addUsername}>Add</Button>
              </div>
              {usernames.length > 0 && (
                <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
                  {usernames.map((name, i) => {
                    const isReal = realUsernames.has(name.toLowerCase());
                    return (
                      <span key={i} className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs ${isReal ? "bg-destructive/20 text-destructive ring-1 ring-destructive/40" : "bg-secondary"}`}>
                        {isReal && "⚠ "}{name}
                        <button onClick={() => removeUsername(i)} className="text-muted-foreground hover:text-destructive">×</button>
                      </span>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="rounded-xl border border-casino-gold/30 bg-casino-gold/5 p-4">
              <p className="text-xs font-bold mb-1">💡 How Ghost Users Work</p>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Ghost users cycle on/off naturally based on your schedule settings</li>
                <li>• Each ghost picks a random username from your list</li>
                <li>• They appear in the online counter, social tab, and optionally in game chats</li>
                <li>• Login/logout times are staggered to appear natural</li>
                <li>• Ghost users cannot be messaged or friended by real users</li>
              </ul>
            </div>
          </>
        )}
      </div>
    </PanelView>
  );
}

// ── Broadcast Notifications Panel ────────────────────────────────
function BroadcastPanel({ onBack }: { onBack: () => void }) {
  const { user } = useAuth();
  const [broadcasts, setBroadcasts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [type, setType] = useState("info");

  const fetchBroadcasts = async () => {
    setLoading(true);
    const { data } = await supabase.from("broadcast_messages" as any).select("*").order("created_at", { ascending: false }).limit(50);
    setBroadcasts((data as any[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchBroadcasts(); }, []);

  const handleSend = async () => {
    if (!title.trim() || !content.trim()) { toast.error("Title and content are required"); return; }
    if (!user) return;
    setSending(true);
    const { error } = await supabase.from("broadcast_messages" as any).insert({
      title: title.trim(),
      content: content.trim(),
      type,
      sent_by: user.id,
    });
    if (error) { toast.error("Failed to send broadcast"); setSending(false); return; }
    toast.success("Broadcast sent to all users!");
    setTitle(""); setContent(""); setType("info");
    setSending(false);
    fetchBroadcasts();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this broadcast?")) return;
    await supabase.from("broadcast_messages" as any).delete().eq("id", id);
    toast.success("Broadcast deleted");
    fetchBroadcasts();
  };

  const handleToggle = async (id: string, isActive: boolean) => {
    await supabase.from("broadcast_messages" as any).update({ is_active: !isActive }).eq("id", id);
    toast.success(isActive ? "Broadcast hidden" : "Broadcast activated");
    fetchBroadcasts();
  };

  const typeOptions = [
    { value: "info", label: "ℹ️ Info", color: "text-blue-400" },
    { value: "update", label: "🔄 Update", color: "text-green-400" },
    { value: "warning", label: "⚠️ Warning", color: "text-yellow-400" },
    { value: "promo", label: "🎁 Promo", color: "text-purple-400" },
  ];

  return (
    <PanelView title="Broadcast Notifications" onBack={onBack}>
      {/* Compose */}
      <div className="rounded-lg bg-card border border-border p-4 space-y-3 mb-6">
        <h3 className="font-display font-bold text-sm flex items-center gap-2"><Bell className="h-4 w-4 text-casino-gold" /> Send Broadcast</h3>
        <div>
          <Label className="text-xs">Type</Label>
          <div className="flex gap-2 mt-1">
            {typeOptions.map(opt => (
              <button
                key={opt.value}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${type === opt.value ? "bg-primary/20 border-primary text-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}
                onClick={() => setType(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <Label className="text-xs">Title</Label>
          <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. New Feature Released!" className="mt-1" />
        </div>
        <div>
          <Label className="text-xs">Message</Label>
          <Textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Write your message to all users..." className="mt-1" rows={3} />
        </div>
        <Button onClick={handleSend} disabled={sending || !title.trim() || !content.trim()} className="w-full">
          {sending ? "Sending..." : "📢 Send to All Users"}
        </Button>
      </div>

      {/* History */}
      <div className="space-y-3">
        <h3 className="font-display font-bold text-sm">Broadcast History</h3>
        {loading ? (
          <p className="text-muted-foreground text-sm">Loading...</p>
        ) : broadcasts.length === 0 ? (
          <p className="text-muted-foreground text-sm">No broadcasts sent yet.</p>
        ) : (
          broadcasts.map((b: any) => {
            const typeIcon = b.type === "warning" ? "⚠️" : b.type === "update" ? "🔄" : b.type === "promo" ? "🎁" : "ℹ️";
            return (
              <div key={b.id} className={`rounded-lg border p-3 ${b.is_active ? "bg-card border-border" : "bg-muted/30 border-muted opacity-60"}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm">{typeIcon} {b.title}</p>
                    <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{b.content}</p>
                    <p className="text-[10px] text-muted-foreground mt-2">
                      {new Date(b.created_at).toLocaleString()} · {b.is_active ? "🟢 Active" : "⚫ Hidden"}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleToggle(b.id, b.is_active)}>
                      {b.is_active ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(b.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </PanelView>
  );
}

// ── Main cPanel Page ────────────────────────────────────────────

// ── Sports Promo Banner Uploader ────────────────────────────────
const SPORTS_BANNER_SLOTS: { key: "home_hero" | "football_top"; label: string; description: string; ratio: string }[] = [
  { key: "home_hero", label: "Homepage Hero Banner", description: "Top banner shown on the homepage above the games.", ratio: "Recommended ~1600×400 (4:1)" },
  { key: "football_top", label: "Football Section Banner", description: "Top banner shown inside Sports Betting → Football.", ratio: "Recommended ~1600×400 (4:1)" },
];

function SportsPromoUploaderPanel({ onBack }: { onBack: () => void }) {
  const [banners, setBanners] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("site_settings").select("value").eq("key", "sports_promo_banners").maybeSingle();
    setBanners(((data?.value as Record<string, string>) || {}));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const persist = async (next: Record<string, string>) => {
    const { data: existing } = await supabase.from("site_settings").select("id").eq("key", "sports_promo_banners").maybeSingle();
    if (existing) {
      await supabase.from("site_settings").update({ value: next as any }).eq("key", "sports_promo_banners");
    } else {
      await supabase.from("site_settings").insert({ key: "sports_promo_banners", value: next as any });
    }
  };

  const handleUpload = async (slot: string, file: File) => {
    if (!file.type.startsWith("image/")) { toast.error("Please select an image file"); return; }
    if (file.size > 8 * 1024 * 1024) { toast.error("Image must be under 8MB"); return; }
    setUploadingKey(slot);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${slot}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("promo-banners").upload(path, file, {
        cacheControl: "3600", upsert: true, contentType: file.type,
      });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("promo-banners").getPublicUrl(path);
      const next = { ...banners, [slot]: pub.publicUrl };
      await persist(next);
      setBanners(next);
      toast.success("Banner updated — players will see it on next page load");
    } catch (e: any) {
      toast.error(e?.message || "Upload failed");
    } finally {
      setUploadingKey(null);
    }
  };

  const handleReset = async (slot: string) => {
    const next = { ...banners };
    delete next[slot];
    await persist(next);
    setBanners(next);
    toast.success("Reset to default banner");
  };

  return (
    <PanelView title="Sports Betting — Promo Banners" onBack={onBack}>
      <p className="text-sm text-muted-foreground -mt-2 mb-2">
        Upload images here to instantly replace the promo banners across the homepage and the football section. Existing players will see the new banner on their next page load.
      </p>
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="space-y-4">
          {SPORTS_BANNER_SLOTS.map((slot) => {
            const current = banners[slot.key];
            const isUploading = uploadingKey === slot.key;
            return (
              <div key={slot.key} className="rounded-xl border border-border bg-card p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-display font-bold text-sm">{slot.label}</p>
                    <p className="text-xs text-muted-foreground">{slot.description}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{slot.ratio}</p>
                  </div>
                  {current && (
                    <Button variant="outline" size="sm" onClick={() => handleReset(slot.key)}>
                      <Trash2 className="h-3 w-3 mr-1" /> Reset
                    </Button>
                  )}
                </div>
                <div className="rounded-lg overflow-hidden border border-border bg-secondary/40">
                  {current ? (
                    <img src={current} alt={slot.label} className="w-full h-32 md:h-40 object-cover" />
                  ) : (
                    <div className="w-full h-24 md:h-28 flex items-center justify-center text-xs text-muted-foreground">
                      Using default built-in banner
                    </div>
                  )}
                </div>
                <label className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-casino-gold/40 bg-casino-gold/5 hover:bg-casino-gold/10 cursor-pointer px-4 py-3 transition">
                  <ImagePlus className="h-4 w-4 text-casino-gold" />
                  <span className="text-xs font-semibold text-casino-gold">
                    {isUploading ? "Uploading…" : current ? "Replace banner" : "Upload banner image"}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={isUploading}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleUpload(slot.key, f);
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>
            );
          })}
        </div>
      )}
    </PanelView>
  );
}

type ActivePanel = null | "users" | "files" | "database" | "config" | "security" | "maintenance" | "logs" | "house-edge" | "game-probability" | "bonus-probability" | "slots-config" | "promotions" | "wallet-mode" | "deposits-withdrawals" | "welcome-config" | "ghost-users" | "broadcasts" | "dev-console" | "ai-agent" | "sports-promos";

export default function CPanel() {
  const { isAdmin, isOwner, loading, profile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const initialPanel: ActivePanel =
    tabParam === "games" ? "game-probability" :
    tabParam === "users" ? "users" : null;
  const [activePanel, setActivePanel] = useState<ActivePanel>(initialPanel);
  const { stats, loading: analyticsLoading } = useAnalytics();

  // React to tab query param changes
  useEffect(() => {
    if (tabParam === "games") {
      setActivePanel("game-probability");
    } else if (tabParam === "users") {
      setActivePanel("users");
    }
  }, [tabParam]);

  const [sectionToggles, setSectionToggles] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!loading && !isAdmin) { navigate("/"); return; }
    supabase.from("site_settings").select("value").eq("key", "panel_visibility").maybeSingle().then(({ data }) => {
      const vis = (data?.value as Record<string, boolean>) || {};
      if (isAdmin && !isOwner && vis.cpanel_access === false) navigate("/");
      setSectionToggles(vis);
    });
  }, [isAdmin, loading]);

  const sec = (key: string) => isOwner || sectionToggles[key] !== false;

  if (loading) return <div className="min-h-screen gradient-casino-bg flex items-center justify-center"><p>Loading...</p></div>;

  // Render a drill-down panel
  if (activePanel) {
    const back = () => setActivePanel(null);
    return (
      <div className="min-h-screen gradient-casino-bg">
        <Header />
        <div className="container max-w-6xl py-6 px-4">
          {activePanel === "users" && <UsersWrapper onBack={back} />}
          {activePanel === "files" && <FileManager onBack={back} />}
          {activePanel === "database" && <DatabaseManager onBack={back} />}
          {activePanel === "config" && <SiteConfiguration onBack={back} />}
          {activePanel === "security" && <SecurityCenter onBack={back} />}
          {activePanel === "maintenance" && <MaintenancePanel onBack={back} />}
          {activePanel === "logs" && <ErrorLogs onBack={back} />}
          {activePanel === "house-edge" && <HouseEdgeWrapper onBack={back} />}
          {activePanel === "game-probability" && <GameProbabilityWrapper onBack={back} />}
          {activePanel === "bonus-probability" && <BonusProbabilityWrapper onBack={back} />}
          {activePanel === "slots-config" && <SlotsConfigWrapper onBack={back} />}
          {activePanel === "promotions" && <PromotionsWrapper onBack={back} />}
          {activePanel === "wallet-mode" && <WalletModePanel onBack={back} />}
          {activePanel === "deposits-withdrawals" && <DepositsWithdrawalsPanel onBack={back} />}
          {activePanel === "welcome-config" && <WelcomeConfigPanel onBack={back} />}
          {activePanel === "ghost-users" && <GhostUsersPanel onBack={back} />}
          {activePanel === "broadcasts" && <BroadcastPanel onBack={back} />}
          {activePanel === "dev-console" && <DevConsole onBack={back} />}
          {activePanel === "ai-agent" && <AiAgentPanel onBack={back} />}
          {activePanel === "sports-promos" && <SportsPromoUploaderPanel onBack={back} />}
        </div>
      </div>
    );
  }

  // Main cPanel grid view
  return (
    <div className="min-h-screen gradient-casino-bg">
      <Header />
      <div className="container max-w-6xl py-6 px-4">
        {/* Header bar */}
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-casino-gold/20 flex items-center justify-center">
              <Shield className="h-6 w-6 text-casino-gold" />
            </div>
            <div>
              <h1 className="font-display text-xl font-black tracking-wide">cPanel</h1>
              <p className="text-xs text-muted-foreground">PhantomBet Administration</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Main content area */}
          <div className="flex-1 space-y-5">
            {/* ── Statistics ─────────────────────────── */}
            {sec("cpanel_statistics") && (
            <CpanelSection title="Statistics" icon={<BarChart3 className="h-5 w-5" />}>
              {analyticsLoading ? (
                <p className="text-muted-foreground text-sm">Loading stats...</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                  <StatCard icon={<Users className="h-4 w-4" />} label="Total Users" value={stats.totalUsers} color="text-casino-gold" />
                  <StatCard icon={<Activity className="h-4 w-4" />} label="Online Now" value={stats.onlineUsers} color="text-green-400" />
                  <StatCard icon={<CreditCard className="h-4 w-4" />} label="Total Balance" value={`$${stats.totalBalance.toFixed(2)}`} color="text-emerald-400" />
                  <StatCard icon={<Clock className="h-4 w-4" />} label="Transactions" value={stats.totalTransactions} color="text-blue-400" />
                  <StatCard icon={<Gamepad2 className="h-4 w-4" />} label="Games" value={stats.totalGames} color="text-purple-400" />
                  <StatCard icon={<MessageSquare className="h-4 w-4" />} label="Messages" value={stats.totalMessages} color="text-pink-400" />
                  <StatCard icon={<Ban className="h-4 w-4" />} label="Active Bans" value={stats.totalBans} color="text-destructive" />
                  <StatCard icon={<Zap className="h-4 w-4" />} label="Prize Spins" value={stats.totalSpins} color="text-casino-gold" />
                  <StatCard icon={<Bell className="h-4 w-4" />} label="New This Week" value={stats.recentSignups} color="text-green-400" />
                  <StatCard icon={<UserCheck className="h-4 w-4" />} label="Friendships" value={stats.activeFriendships} color="text-blue-400" />
                </div>
              )}
            </CpanelSection>
            )}

            {/* ── Deposits & Withdrawals ─────────────── */}
            {sec("cpanel_deposits") && (
            <CpanelSection title="Deposits & Withdrawals" icon={<CreditCard className="h-5 w-5" />}>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-1">
                <ToolCard icon={<CreditCard className="h-6 w-6" />} label="Payment Hub" onClick={() => setActivePanel("deposits-withdrawals")} />
                <ToolCard icon={<Shield className="h-6 w-6" />} label="Withdrawal Approval" onClick={() => setActivePanel("deposits-withdrawals")} />
                <ToolCard icon={<Wallet className="h-6 w-6" />} label="Wallet Mode" onClick={() => setActivePanel("wallet-mode")} />
                <ToolCard icon={<Megaphone className="h-6 w-6" />} label="Welcome Messages" onClick={() => setActivePanel("welcome-config")} />
                <ToolCard icon={<Activity className="h-6 w-6" />} label="Transaction Log" onClick={() => setActivePanel("deposits-withdrawals")} />
              </div>
            </CpanelSection>
            )}

            {/* ── User Management ────────────────────── */}
            {sec("cpanel_users") && (
            <CpanelSection title="User Management" icon={<Users className="h-5 w-5" />}>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-1">
                <ToolCard icon={<Users className="h-6 w-6" />} label="Manage Users" onClick={() => setActivePanel("users")} active={activePanel === "users"} />
                <ToolCard icon={<Shield className="h-6 w-6" />} label="User Roles" onClick={() => setActivePanel("users")} />
                <ToolCard icon={<Ban className="h-6 w-6" />} label="Ban Manager" onClick={() => setActivePanel("security")} />
                <ToolCard icon={<Activity className="h-6 w-6" />} label="Online Users" onClick={() => setActivePanel("users")} />
                <ToolCard icon={<UserCheck className="h-6 w-6" />} label="Friendships" onClick={() => setActivePanel("database")} />
                <ToolCard icon={<MessageSquare className="h-6 w-6" />} label="Messages" onClick={() => setActivePanel("database")} />
                <ToolCard icon={<Users className="h-6 w-6" />} label="Ghost Users" onClick={() => setActivePanel("ghost-users")} active={activePanel === "ghost-users"} />
              </div>
            </CpanelSection>
            )}

            {/* ── Games & Finance ────────────────────── */}
            {sec("cpanel_games") && (
            <CpanelSection title="Games & Finance" icon={<Gamepad2 className="h-5 w-5" />}>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-1">
                {sec("slot_house_edge") && <ToolCard icon={<Percent className="h-6 w-6" />} label="House Edge" onClick={() => setActivePanel("house-edge")} />}
                {sec("slot_probability") && <ToolCard icon={<LayoutGrid className="h-6 w-6" />} label="Win Probability" onClick={() => setActivePanel("game-probability")} />}
                <ToolCard icon={<Gift className="h-6 w-6" />} label="Bonus Probability" onClick={() => setActivePanel("bonus-probability")} />
                <ToolCard icon={<Sparkles className="h-6 w-6" />} label="Slots Config" onClick={() => setActivePanel("slots-config")} active={activePanel === "slots-config"} />
                {sec("slot_game_manager") && <ToolCard icon={<Gamepad2 className="h-6 w-6" />} label="Game Manager" onClick={() => setActivePanel("database")} />}
                {sec("slot_transactions") && <ToolCard icon={<CreditCard className="h-6 w-6" />} label="Transactions" onClick={() => setActivePanel("logs")} />}
                {sec("slot_prizes") && <ToolCard icon={<Trophy className="h-6 w-6" />} label="Prize Spins" onClick={() => setActivePanel("database")} />}
                {sec("slot_scratch") && <ToolCard icon={<Hash className="h-6 w-6" />} label="Scratch Cards" onClick={() => setActivePanel("database")} />}
                {sec("slot_wallet") && <ToolCard icon={<Wallet className="h-6 w-6" />} label="Wallet Mode" onClick={() => setActivePanel("wallet-mode")} />}
              </div>
            </CpanelSection>
            )}

            {/* ── Promotions ─────────────────────────── */}
            {sec("cpanel_promotions") && (
            <CpanelSection title="Promotions & Marketing" icon={<Gift className="h-5 w-5" />}>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-1">
                <ToolCard icon={<Gift className="h-6 w-6" />} label="Promotions" onClick={() => setActivePanel("promotions")} />
                <ToolCard icon={<Megaphone className="h-6 w-6" />} label="Announcements" onClick={() => setActivePanel("maintenance")} />
                <ToolCard icon={<Bell className="h-6 w-6" />} label="Broadcasts" onClick={() => setActivePanel("broadcasts")} />
              </div>
            </CpanelSection>
            )}

            {/* ── Files ──────────────────────────────── */}
            {sec("cpanel_files") && (
            <CpanelSection title="Files" icon={<FolderOpen className="h-5 w-5" />}>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-1">
                <ToolCard icon={<FolderOpen className="h-6 w-6" />} label="File Manager" onClick={() => setActivePanel("files")} />
                <ToolCard icon={<Image className="h-6 w-6" />} label="Images" onClick={() => setActivePanel("files")} />
                <ToolCard icon={<HardDrive className="h-6 w-6" />} label="Disk Usage" onClick={() => setActivePanel("files")} />
                <ToolCard icon={<Download className="h-6 w-6" />} label="Backup" onClick={() => setActivePanel("database")} />
              </div>
            </CpanelSection>
            )}

            {/* ── Databases ─────────────────────────── */}
            {sec("cpanel_databases") && (
            <CpanelSection title="Databases" icon={<Database className="h-5 w-5" />}>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-1">
                <ToolCard icon={<Database className="h-6 w-6" />} label="Database Browser" onClick={() => setActivePanel("database")} />
                <ToolCard icon={<Download className="h-6 w-6" />} label="Export Table" onClick={() => setActivePanel("database")} />
                <ToolCard icon={<Archive className="h-6 w-6" />} label="Full Backup" onClick={() => setActivePanel("database")} />
                <ToolCard icon={<Table className="h-6 w-6" />} label="View Tables" onClick={() => setActivePanel("database")} />
              </div>
            </CpanelSection>
            )}

            {/* ── Security ──────────────────────────── */}
            {sec("cpanel_security") && (
            <CpanelSection title="Security" icon={<Lock className="h-5 w-5" />}>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-1">
                <ToolCard icon={<Lock className="h-6 w-6" />} label="Security Center" onClick={() => setActivePanel("security")} />
                <ToolCard icon={<Shield className="h-6 w-6" />} label="Moderation Log" onClick={() => setActivePanel("security")} />
                <ToolCard icon={<Ban className="h-6 w-6" />} label="Chat Bans" onClick={() => setActivePanel("security")} />
                <ToolCard icon={<AlertTriangle className="h-6 w-6" />} label="Activity Logs" onClick={() => setActivePanel("logs")} />
              </div>
            </CpanelSection>
            )}

            {/* ── Site Configuration ─────────────────── */}
            {sec("cpanel_config") && (
            <CpanelSection title="Site Configuration" icon={<Settings className="h-5 w-5" />}>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-1">
                <ToolCard icon={<Settings className="h-6 w-6" />} label="Site Settings" onClick={() => setActivePanel("config")} />
                <ToolCard icon={<Wrench className="h-6 w-6" />} label="Maintenance Mode" onClick={() => setActivePanel("maintenance")} />
                <ToolCard icon={<Megaphone className="h-6 w-6" />} label="Announcements" onClick={() => setActivePanel("maintenance")} />
                <ToolCard icon={<Power className="h-6 w-6" />} label="Toggles" onClick={() => setActivePanel("config")} />
              </div>
            </CpanelSection>
            )}

            {/* ── Dev Console ────────────────────────── */}
            {sec("cpanel_dev") && (
            <CpanelSection title="Dev Console" icon={<Terminal className="h-5 w-5" />} defaultOpen={false}>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-1">
                <ToolCard icon={<Sparkles className="h-6 w-6" />} label="AI Agent" onClick={() => setActivePanel("ai-agent")} />
                <ToolCard icon={<Terminal className="h-6 w-6" />} label="Code Editor" onClick={() => setActivePanel("dev-console")} />
                <ToolCard icon={<Gamepad2 className="h-6 w-6" />} label="Install Game" onClick={() => setActivePanel("dev-console")} />
                <ToolCard icon={<Code className="h-6 w-6" />} label="Edit Game Files" onClick={() => setActivePanel("dev-console")} />
                <ToolCard icon={<Search className="h-6 w-6" />} label="Search Code" onClick={() => setActivePanel("dev-console")} />
                <ToolCard icon={<FolderOpen className="h-6 w-6" />} label="File Manager" onClick={() => setActivePanel("dev-console")} />
                <ToolCard icon={<Download className="h-6 w-6" />} label="Export Files" onClick={() => setActivePanel("dev-console")} />
              </div>
            </CpanelSection>
            )}
          </div>

          {/* ── Sidebar (General Information) ─────── */}
          <div className="w-full lg:w-72 shrink-0 space-y-4">
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="px-4 py-3 bg-secondary/60 flex items-center justify-between">
                <h3 className="font-display text-sm font-bold">General Information</h3>
                <Info className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="p-4 space-y-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Current Admin</p>
                  <p className="font-medium">{profile?.username || "Admin"}</p>
                </div>
                <div className="border-t border-border pt-3">
                  <p className="text-xs text-muted-foreground">Platform</p>
                  <p className="font-medium text-casino-gold">PhantomBet Casino</p>
                </div>
                <div className="border-t border-border pt-3">
                  <p className="text-xs text-muted-foreground">Server Status</p>
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                    <span className="text-green-400 font-medium text-xs">Online</span>
                  </div>
                </div>
                <div className="border-t border-border pt-3">
                  <p className="text-xs text-muted-foreground">Total Users</p>
                  <p className="font-medium">{analyticsLoading ? "..." : stats.totalUsers}</p>
                </div>
                <div className="border-t border-border pt-3">
                  <p className="text-xs text-muted-foreground">Online Now</p>
                  <p className="font-medium text-green-400">{analyticsLoading ? "..." : stats.onlineUsers}</p>
                </div>
                <div className="border-t border-border pt-3">
                  <p className="text-xs text-muted-foreground">Platform Balance</p>
                  <p className="font-medium text-casino-gold">{analyticsLoading ? "..." : `$${stats.totalBalance.toFixed(2)}`}</p>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="px-4 py-3 bg-secondary/60">
                <h3 className="font-display text-sm font-bold">Quick Actions</h3>
              </div>
              <div className="p-3 space-y-1.5">
                <Button variant="outline" size="sm" className="w-full justify-start text-xs" onClick={() => setActivePanel("users")}>
                  <Users className="h-3 w-3 mr-2" /> User Management
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start text-xs" onClick={() => setActivePanel("house-edge")}>
                  <Percent className="h-3 w-3 mr-2" /> House Edge
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start text-xs" onClick={() => setActivePanel("game-probability")}>
                  <LayoutGrid className="h-3 w-3 mr-2" /> Win Probability
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start text-xs" onClick={() => setActivePanel("promotions")}>
                  <Gift className="h-3 w-3 mr-2" /> Promotions
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start text-xs" onClick={() => setActivePanel("maintenance")}>
                  <Wrench className="h-3 w-3 mr-2" /> Maintenance Mode
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start text-xs" onClick={() => setActivePanel("database")}>
                  <Database className="h-3 w-3 mr-2" /> Database
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start text-xs" onClick={() => setActivePanel("logs")}>
                  <AlertTriangle className="h-3 w-3 mr-2" /> View Logs
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
