import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Header } from "@/components/casino/Header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  ArrowLeft, FolderOpen, Database, Settings, Upload, Trash2, Download,
  RefreshCw, Search, Table, FileText, Eye, ChevronDown, ChevronRight,
  File, Image, Music, Video, Archive, Code, Globe, Shield
} from "lucide-react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

// ── File Manager ────────────────────────────────────────────────
interface StorageFile {
  name: string;
  id: string;
  created_at: string;
  updated_at: string;
  metadata: { size?: number; mimetype?: string } | null;
}

function getFileIcon(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  if (["jpg", "jpeg", "png", "gif", "svg", "webp", "ico"].includes(ext)) return <Image className="h-4 w-4 text-purple-400" />;
  if (["mp3", "wav", "ogg", "m4a"].includes(ext)) return <Music className="h-4 w-4 text-pink-400" />;
  if (["mp4", "webm", "mov", "avi"].includes(ext)) return <Video className="h-4 w-4 text-blue-400" />;
  if (["zip", "tar", "gz", "rar", "7z"].includes(ext)) return <Archive className="h-4 w-4 text-yellow-400" />;
  if (["js", "ts", "tsx", "jsx", "html", "css", "json", "xml", "sql"].includes(ext)) return <Code className="h-4 w-4 text-green-400" />;
  return <File className="h-4 w-4 text-muted-foreground" />;
}

function formatFileSize(bytes?: number) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function FileManager() {
  const [files, setFiles] = useState<StorageFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPath, setCurrentPath] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchFiles = async () => {
    setLoading(true);
    const { data, error } = await supabase.storage.from("admin-files").list(currentPath || "", {
      limit: 200,
      sortBy: { column: "name", order: "asc" },
    });
    if (error) { toast.error("Failed to load files"); setLoading(false); return; }
    setFiles((data || []) as StorageFile[]);
    setLoading(false);
  };

  useEffect(() => { fetchFiles(); }, [currentPath]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadFiles = e.target.files;
    if (!uploadFiles?.length) return;
    setUploading(true);
    let success = 0;
    for (const file of Array.from(uploadFiles)) {
      const path = currentPath ? `${currentPath}/${file.name}` : file.name;
      const { error } = await supabase.storage.from("admin-files").upload(path, file, { upsert: true });
      if (error) { toast.error(`Failed: ${file.name}`); } else { success++; }
    }
    if (success) toast.success(`${success} file(s) uploaded`);
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    fetchFiles();
  };

  const handleDelete = async (name: string) => {
    const path = currentPath ? `${currentPath}/${name}` : name;
    const { error } = await supabase.storage.from("admin-files").remove([path]);
    if (error) { toast.error("Failed to delete"); return; }
    toast.success(`Deleted ${name}`);
    fetchFiles();
  };

  const getPublicUrl = (name: string) => {
    const path = currentPath ? `${currentPath}/${name}` : name;
    return `${SUPABASE_URL}/storage/v1/object/public/admin-files/${path}`;
  };

  const handleCopyUrl = (name: string) => {
    navigator.clipboard.writeText(getPublicUrl(name));
    toast.success("URL copied to clipboard");
  };

  const navigateToFolder = (folderName: string) => {
    setCurrentPath(prev => prev ? `${prev}/${folderName}` : folderName);
  };

  const navigateUp = () => {
    setCurrentPath(prev => {
      const parts = prev.split("/");
      parts.pop();
      return parts.join("/");
    });
  };

  const filtered = files.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const isImage = (name: string) => /\.(jpg|jpeg|png|gif|svg|webp|ico)$/i.test(name);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <Button variant="outline" size="sm" onClick={fetchFiles} disabled={loading}>
          <RefreshCw className={`h-3 w-3 mr-1 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
        <Button variant="gold" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
          <Upload className="h-3 w-3 mr-1" /> {uploading ? "Uploading..." : "Upload Files"}
        </Button>
        <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleUpload} />
      </div>

      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-sm">
        <button onClick={() => setCurrentPath("")} className="text-casino-gold hover:underline font-medium">Root</button>
        {currentPath.split("/").filter(Boolean).map((part, i, arr) => (
          <span key={i} className="flex items-center gap-1">
            <ChevronRight className="h-3 w-3 text-muted-foreground" />
            <button
              onClick={() => setCurrentPath(arr.slice(0, i + 1).join("/"))}
              className="text-casino-gold hover:underline font-medium"
            >
              {part}
            </button>
          </span>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search files..."
          className="pl-9 bg-background border-border"
        />
      </div>

      {currentPath && (
        <button onClick={navigateUp} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3 w-3" /> Back
        </button>
      )}

      {/* File List */}
      {loading ? (
        <p className="text-muted-foreground text-sm">Loading files...</p>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <FolderOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No files found. Upload some!</p>
        </div>
      ) : (
        <div className="space-y-1">
          {filtered.map(file => {
            const isFolder = !file.metadata?.mimetype && !file.id;
            return (
              <div key={file.name} className="flex items-center gap-3 rounded-lg bg-card border border-border p-3 hover:bg-secondary/50 transition-colors">
                {isFolder ? (
                  <button onClick={() => navigateToFolder(file.name)} className="flex items-center gap-2 flex-1 min-w-0">
                    <FolderOpen className="h-4 w-4 text-casino-gold shrink-0" />
                    <span className="text-sm font-medium truncate">{file.name}</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {getFileIcon(file.name)}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(file.metadata?.size)} · {new Date(file.created_at).toLocaleDateString()}
                      </p>
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
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleCopyUrl(file.name)}>
                      <Globe className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(file.name)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Database Manager ────────────────────────────────────────────
const DB_TABLES = [
  "profiles", "games", "transactions", "site_settings", "user_roles",
  "user_presence", "friendships", "messages", "game_chat", "chat_bans",
  "moderation_log", "scratch_card_pool", "daily_spins"
];

function DatabaseManager() {
  const [selectedTable, setSelectedTable] = useState("profiles");
  const [rows, setRows] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [rowCount, setRowCount] = useState(0);
  const [page, setPage] = useState(0);
  const pageSize = 25;

  const fetchTable = async (table: string, pageNum = 0) => {
    setLoading(true);
    setSelectedTable(table);
    setPage(pageNum);

    const from = pageNum * pageSize;
    const to = from + pageSize - 1;

    const { data, error, count } = await supabase
      .from(table as any)
      .select("*", { count: "exact" })
      .range(from, to)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error(`Failed to load ${table}: ${error.message}`);
      setLoading(false);
      return;
    }

    const tableData = (data || []) as any[];
    setRows(tableData);
    setRowCount(count || 0);
    if (tableData.length > 0) {
      setColumns(Object.keys(tableData[0]));
    }
    setLoading(false);
  };

  useEffect(() => { fetchTable("profiles"); }, []);

  const exportCSV = () => {
    if (!rows.length) return;
    const headers = columns.join(",");
    const csvRows = rows.map(r => columns.map(c => {
      const val = r[c];
      if (val === null || val === undefined) return "";
      const str = typeof val === "object" ? JSON.stringify(val) : String(val);
      return `"${str.replace(/"/g, '""')}"`;
    }).join(","));
    const csv = [headers, ...csvRows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${selectedTable}_export.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported");
  };

  const totalPages = Math.ceil(rowCount / pageSize);

  const truncateValue = (val: any): string => {
    if (val === null || val === undefined) return "—";
    const str = typeof val === "object" ? JSON.stringify(val) : String(val);
    return str.length > 50 ? str.slice(0, 47) + "..." : str;
  };

  return (
    <div className="space-y-4">
      {/* Table Selector */}
      <div className="flex flex-wrap gap-2">
        {DB_TABLES.map(table => (
          <Button
            key={table}
            variant={selectedTable === table ? "gold" : "outline"}
            size="sm"
            onClick={() => fetchTable(table, 0)}
            className="text-xs"
          >
            <Table className="h-3 w-3 mr-1" /> {table}
          </Button>
        ))}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{selectedTable}</span> · {rowCount} rows
          </p>
          <Button variant="outline" size="sm" onClick={() => fetchTable(selectedTable, page)}>
            <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
        <Button variant="outline" size="sm" onClick={exportCSV} disabled={!rows.length}>
          <Download className="h-3 w-3 mr-1" /> Export CSV
        </Button>
      </div>

      {/* Data Table */}
      {loading ? (
        <p className="text-muted-foreground text-sm">Loading...</p>
      ) : rows.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Database className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No data in this table</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-secondary">
                {columns.map(col => (
                  <th key={col} className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap border-b border-border">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className="border-b border-border/50 hover:bg-secondary/30">
                  {columns.map(col => (
                    <td key={col} className="px-3 py-2 whitespace-nowrap max-w-[200px] truncate" title={String(row[col] ?? "")}>
                      {truncateValue(row[col])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => fetchTable(selectedTable, page - 1)}>
            Prev
          </Button>
          <span className="text-sm text-muted-foreground">Page {page + 1} of {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => fetchTable(selectedTable, page + 1)}>
            Next
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Site Configuration ──────────────────────────────────────────
function SiteConfiguration() {
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
    if (error) { toast.error("Failed to add setting"); return; }
    toast.success("Setting added");
    setNewKey(""); setNewValue("");
    fetchSettings();
  };

  const handleUpdate = async (id: string) => {
    let parsed: any;
    try { parsed = JSON.parse(editValue); } catch { parsed = editValue; }
    const { error } = await supabase.from("site_settings").update({ value: parsed }).eq("id", id);
    if (error) { toast.error("Failed to update"); return; }
    toast.success("Setting updated");
    setEditingId(null); setEditValue("");
    fetchSettings();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("site_settings").delete().eq("id", id);
    if (error) { toast.error("Failed to delete"); return; }
    toast.success("Setting deleted");
    fetchSettings();
  };

  return (
    <div className="space-y-4">
      {/* Add New Setting */}
      <div className="rounded-lg bg-card border border-border p-4 space-y-3">
        <p className="text-sm font-bold flex items-center gap-2"><Settings className="h-4 w-4 text-casino-gold" /> Add New Setting</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">Key</Label>
            <Input value={newKey} onChange={e => setNewKey(e.target.value)} placeholder="setting_name" className="bg-background border-border" />
          </div>
          <div>
            <Label className="text-xs">Value (JSON or text)</Label>
            <Input value={newValue} onChange={e => setNewValue(e.target.value)} placeholder='{"enabled": true}' className="bg-background border-border" />
          </div>
        </div>
        <Button variant="gold" size="sm" onClick={handleAdd}>Add Setting</Button>
      </div>

      {/* Settings List */}
      {loading ? (
        <p className="text-muted-foreground text-sm">Loading settings...</p>
      ) : settings.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Settings className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No settings configured yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {settings.map(setting => (
            <div key={setting.id} className="rounded-lg bg-card border border-border p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-casino-gold">{setting.key}</p>
                  {editingId === setting.id ? (
                    <div className="mt-2 space-y-2">
                      <Input
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        placeholder="New value"
                        className="bg-background border-border text-xs"
                      />
                      <div className="flex gap-2">
                        <Button variant="gold" size="sm" onClick={() => handleUpdate(setting.id)}>Save</Button>
                        <Button variant="outline" size="sm" onClick={() => setEditingId(null)}>Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <pre className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap break-all max-h-24 overflow-y-auto">
                      {JSON.stringify(setting.value, null, 2)}
                    </pre>
                  )}
                </div>
                {editingId !== setting.id && (
                  <div className="flex gap-1 shrink-0">
                    <Button
                      variant="ghost" size="icon" className="h-7 w-7"
                      onClick={() => { setEditingId(setting.id); setEditValue(JSON.stringify(setting.value)); }}
                    >
                      <FileText className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(setting.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main cPanel Page ────────────────────────────────────────────
export default function CPanel() {
  const { isAdmin, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !isAdmin) navigate("/");
  }, [isAdmin, loading]);

  if (loading) return <div className="min-h-screen gradient-casino-bg flex items-center justify-center"><p>Loading...</p></div>;

  return (
    <div className="min-h-screen gradient-casino-bg">
      <Header />
      <div className="container max-w-5xl py-6 px-4">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-display text-2xl font-black text-gold flex items-center gap-2">
            <Shield className="h-6 w-6" /> cPanel
          </h1>
        </div>

        <Tabs defaultValue="files" className="space-y-4">
          <TabsList className="w-full bg-card border border-border">
            <TabsTrigger value="files" className="flex-1 text-xs sm:text-sm gap-1">
              <FolderOpen className="h-3 w-3 sm:h-4 sm:w-4" /> <span>Files</span>
            </TabsTrigger>
            <TabsTrigger value="database" className="flex-1 text-xs sm:text-sm gap-1">
              <Database className="h-3 w-3 sm:h-4 sm:w-4" /> <span>Database</span>
            </TabsTrigger>
            <TabsTrigger value="config" className="flex-1 text-xs sm:text-sm gap-1">
              <Settings className="h-3 w-3 sm:h-4 sm:w-4" /> <span>Config</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="files"><FileManager /></TabsContent>
          <TabsContent value="database"><DatabaseManager /></TabsContent>
          <TabsContent value="config"><SiteConfiguration /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
