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
import { PromotionsManager } from "@/components/casino/PromotionsManager";
import {
  ArrowLeft, FolderOpen, Database, Settings, Upload, Trash2, Download,
  RefreshCw, Search, Table, FileText, Eye, ChevronRight, ChevronDown, ChevronUp,
  File, Image, Music, Video, Archive, Code, Globe, Shield,
  AlertTriangle, Activity, Lock, Megaphone, HardDrive, Clock,
  Ban, Users, BarChart3, Wrench, Power, Bell, Percent, Trophy,
  Gamepad2, CreditCard, MessageSquare, UserCheck, Zap, LayoutGrid,
  Info, Server, Hash, Gift, Wallet
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

// ── Promotions Wrapper ──────────────────────────────────────────
function PromotionsWrapper({ onBack }: { onBack: () => void }) {
  return (
    <PanelView title="Promotions Manager" onBack={onBack}>
      <PromotionsManager />
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

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("site_settings").select("value").eq("key", "ghost_users").single();
      if (data) setConfig(data.value as any || {});
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
    const updated = [...usernames, newUsername.trim()];
    save({ usernames: updated });
    setNewUsername("");
  };

  const removeUsername = (index: number) => {
    const updated = usernames.filter((_, i) => i !== index);
    save({ usernames: updated });
  };

  const defaultNames = [
    "LuckyAce", "CryptoKing", "NeonRider", "GoldRush", "ShadowBet",
    "DiamondHand", "MoonShot", "VegasVault", "RoyalFlush", "HighRoller",
    "WildCard", "JackpotJoe", "SpinMaster", "CoinFlip", "BetBoss",
    "PhantomX", "StarStrike", "ThunderBet", "PixelPunk", "NightOwl",
    "BlazeBet", "IceKing", "GoldenEagle", "SilverFox", "RedLine"
  ];

  const loadDefaults = () => {
    save({ usernames: defaultNames });
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
                  {usernames.map((name, i) => (
                    <span key={i} className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs">
                      {name}
                      <button onClick={() => removeUsername(i)} className="text-muted-foreground hover:text-destructive">×</button>
                    </span>
                  ))}
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

// ── Main cPanel Page ────────────────────────────────────────────
type ActivePanel = null | "files" | "database" | "config" | "security" | "maintenance" | "logs" | "house-edge" | "game-probability" | "promotions" | "wallet-mode" | "deposits-withdrawals" | "welcome-config" | "ghost-users";

export default function CPanel() {
  const { isAdmin, loading, profile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const initialPanel: ActivePanel = tabParam === "games" ? "game-probability" : null;
  const [activePanel, setActivePanel] = useState<ActivePanel>(initialPanel);
  const { stats, loading: analyticsLoading } = useAnalytics();

  // React to tab query param changes
  useEffect(() => {
    if (tabParam === "games") {
      setActivePanel("game-probability");
    }
  }, [tabParam]);

  useEffect(() => {
    if (!loading && !isAdmin) navigate("/");
  }, [isAdmin, loading]);

  if (loading) return <div className="min-h-screen gradient-casino-bg flex items-center justify-center"><p>Loading...</p></div>;

  // Render a drill-down panel
  if (activePanel) {
    const back = () => setActivePanel(null);
    return (
      <div className="min-h-screen gradient-casino-bg">
        <Header />
        <div className="container max-w-6xl py-6 px-4">
          {activePanel === "files" && <FileManager onBack={back} />}
          {activePanel === "database" && <DatabaseManager onBack={back} />}
          {activePanel === "config" && <SiteConfiguration onBack={back} />}
          {activePanel === "security" && <SecurityCenter onBack={back} />}
          {activePanel === "maintenance" && <MaintenancePanel onBack={back} />}
          {activePanel === "logs" && <ErrorLogs onBack={back} />}
          {activePanel === "house-edge" && <HouseEdgeWrapper onBack={back} />}
          {activePanel === "game-probability" && <GameProbabilityWrapper onBack={back} />}
          {activePanel === "promotions" && <PromotionsWrapper onBack={back} />}
          {activePanel === "wallet-mode" && <WalletModePanel onBack={back} />}
          {activePanel === "deposits-withdrawals" && <DepositsWithdrawalsPanel onBack={back} />}
          {activePanel === "welcome-config" && <WelcomeConfigPanel onBack={back} />}
          {activePanel === "ghost-users" && <GhostUsersPanel onBack={back} />}
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
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
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

            {/* ── Deposits & Withdrawals ─────────────── */}
            <CpanelSection title="Deposits & Withdrawals" icon={<CreditCard className="h-5 w-5" />}>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-1">
                <ToolCard icon={<CreditCard className="h-6 w-6" />} label="Payment Hub" onClick={() => setActivePanel("deposits-withdrawals")} />
                <ToolCard icon={<Shield className="h-6 w-6" />} label="Withdrawal Approval" onClick={() => setActivePanel("deposits-withdrawals")} />
                <ToolCard icon={<Wallet className="h-6 w-6" />} label="Wallet Mode" onClick={() => setActivePanel("wallet-mode")} />
                <ToolCard icon={<Megaphone className="h-6 w-6" />} label="Welcome Messages" onClick={() => setActivePanel("welcome-config")} />
                <ToolCard icon={<Activity className="h-6 w-6" />} label="Transaction Log" onClick={() => setActivePanel("deposits-withdrawals")} />
              </div>
            </CpanelSection>

            {/* ── User Management ────────────────────── */}
            <CpanelSection title="User Management" icon={<Users className="h-5 w-5" />}>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-1">
                <ToolCard icon={<Users className="h-6 w-6" />} label="Manage Users" onClick={() => navigate("/admin")} />
                <ToolCard icon={<Shield className="h-6 w-6" />} label="User Roles" onClick={() => navigate("/admin")} />
                <ToolCard icon={<Ban className="h-6 w-6" />} label="Ban Manager" onClick={() => setActivePanel("security")} />
                <ToolCard icon={<Activity className="h-6 w-6" />} label="Online Users" onClick={() => navigate("/admin")} />
                <ToolCard icon={<UserCheck className="h-6 w-6" />} label="Friendships" onClick={() => setActivePanel("database")} />
                <ToolCard icon={<MessageSquare className="h-6 w-6" />} label="Messages" onClick={() => setActivePanel("database")} />
                <ToolCard icon={<Users className="h-6 w-6" />} label="Ghost Users" onClick={() => setActivePanel("ghost-users")} active={activePanel === "ghost-users"} />
              </div>
            </CpanelSection>

            {/* ── Games & Finance ────────────────────── */}
            <CpanelSection title="Games & Finance" icon={<Gamepad2 className="h-5 w-5" />}>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-1">
                <ToolCard icon={<Percent className="h-6 w-6" />} label="House Edge" onClick={() => setActivePanel("house-edge")} />
                <ToolCard icon={<LayoutGrid className="h-6 w-6" />} label="Win Probability" onClick={() => setActivePanel("game-probability")} />
                <ToolCard icon={<Gamepad2 className="h-6 w-6" />} label="Game Manager" onClick={() => setActivePanel("database")} />
                <ToolCard icon={<CreditCard className="h-6 w-6" />} label="Transactions" onClick={() => setActivePanel("logs")} />
                <ToolCard icon={<Trophy className="h-6 w-6" />} label="Prize Spins" onClick={() => setActivePanel("database")} />
                <ToolCard icon={<Hash className="h-6 w-6" />} label="Scratch Cards" onClick={() => setActivePanel("database")} />
                <ToolCard icon={<Wallet className="h-6 w-6" />} label="Wallet Mode" onClick={() => setActivePanel("wallet-mode")} />
              </div>
            </CpanelSection>

            {/* ── Promotions ─────────────────────────── */}
            <CpanelSection title="Promotions & Marketing" icon={<Gift className="h-5 w-5" />}>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-1">
                <ToolCard icon={<Gift className="h-6 w-6" />} label="Promotions" onClick={() => setActivePanel("promotions")} />
                <ToolCard icon={<Megaphone className="h-6 w-6" />} label="Announcements" onClick={() => setActivePanel("maintenance")} />
                <ToolCard icon={<Bell className="h-6 w-6" />} label="Notifications" onClick={() => setActivePanel("maintenance")} />
              </div>
            </CpanelSection>

            {/* ── Files ──────────────────────────────── */}
            <CpanelSection title="Files" icon={<FolderOpen className="h-5 w-5" />}>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-1">
                <ToolCard icon={<FolderOpen className="h-6 w-6" />} label="File Manager" onClick={() => setActivePanel("files")} />
                <ToolCard icon={<Image className="h-6 w-6" />} label="Images" onClick={() => setActivePanel("files")} />
                <ToolCard icon={<HardDrive className="h-6 w-6" />} label="Disk Usage" onClick={() => setActivePanel("files")} />
                <ToolCard icon={<Download className="h-6 w-6" />} label="Backup" onClick={() => setActivePanel("database")} />
              </div>
            </CpanelSection>

            {/* ── Databases ─────────────────────────── */}
            <CpanelSection title="Databases" icon={<Database className="h-5 w-5" />}>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-1">
                <ToolCard icon={<Database className="h-6 w-6" />} label="Database Browser" onClick={() => setActivePanel("database")} />
                <ToolCard icon={<Download className="h-6 w-6" />} label="Export Table" onClick={() => setActivePanel("database")} />
                <ToolCard icon={<Archive className="h-6 w-6" />} label="Full Backup" onClick={() => setActivePanel("database")} />
                <ToolCard icon={<Table className="h-6 w-6" />} label="View Tables" onClick={() => setActivePanel("database")} />
              </div>
            </CpanelSection>

            {/* ── Security ──────────────────────────── */}
            <CpanelSection title="Security" icon={<Lock className="h-5 w-5" />}>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-1">
                <ToolCard icon={<Lock className="h-6 w-6" />} label="Security Center" onClick={() => setActivePanel("security")} />
                <ToolCard icon={<Shield className="h-6 w-6" />} label="Moderation Log" onClick={() => setActivePanel("security")} />
                <ToolCard icon={<Ban className="h-6 w-6" />} label="Chat Bans" onClick={() => setActivePanel("security")} />
                <ToolCard icon={<AlertTriangle className="h-6 w-6" />} label="Activity Logs" onClick={() => setActivePanel("logs")} />
              </div>
            </CpanelSection>

            {/* ── Site Configuration ─────────────────── */}
            <CpanelSection title="Site Configuration" icon={<Settings className="h-5 w-5" />}>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-1">
                <ToolCard icon={<Settings className="h-6 w-6" />} label="Site Settings" onClick={() => setActivePanel("config")} />
                <ToolCard icon={<Wrench className="h-6 w-6" />} label="Maintenance Mode" onClick={() => setActivePanel("maintenance")} />
                <ToolCard icon={<Megaphone className="h-6 w-6" />} label="Announcements" onClick={() => setActivePanel("maintenance")} />
                <ToolCard icon={<Power className="h-6 w-6" />} label="Toggles" onClick={() => setActivePanel("config")} />
              </div>
            </CpanelSection>
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
                <Button variant="outline" size="sm" className="w-full justify-start text-xs" onClick={() => navigate("/admin")}>
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
