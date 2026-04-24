import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import Editor from "@monaco-editor/react";
import {
  ArrowLeft, FolderOpen, File, FilePlus, Trash2, Save, Search,
  Upload, Download, RefreshCw, ChevronRight, Code, Image, Music,
  FileText, Plus, X, Copy, Eye, Undo2, Redo2, Replace,
  Terminal, Gamepad2, FolderPlus, Pencil, Check, FileCode,
  Braces, Palette, Globe, Layers, Package, OctagonX
} from "lucide-react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const BUCKET = "game-files";

const BUILTIN_GAMES = [
  "chicken-cross", "crypto-call", "cut-wire-pro", "dream-11",
  "head-and-tail", "hero-casino", "jackpot-highway", "marvel-betting",
  "meter-crash", "neon-bounce", "plane-crash", "plinko-pro",
  "race-kings", "royal-derby", "royal-heist", "safe-door",
  "scatter-bomb", "scratch-royale", "slot-cowboy", "spin-wheel-royale",
  "stack-up-casino", "stake-mines"
];

interface StorageFile {
  name: string;
  id?: string;
  metadata?: { size?: number; mimetype?: string } | null;
  created_at?: string;
}

function getFileLanguage(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  const map: Record<string, string> = {
    js: "javascript", ts: "typescript", tsx: "typescript", jsx: "javascript",
    html: "html", htm: "html", css: "css", json: "json", md: "markdown",
    xml: "xml", svg: "xml", sql: "sql", py: "python", sh: "shell",
    yaml: "yaml", yml: "yaml", txt: "plaintext",
  };
  return map[ext] || "plaintext";
}

function getFileIcon(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  if (["jpg","jpeg","png","gif","svg","webp","ico"].includes(ext)) return <Image className="h-3.5 w-3.5 text-purple-400" />;
  if (["mp3","wav","ogg","m4a"].includes(ext)) return <Music className="h-3.5 w-3.5 text-pink-400" />;
  if (["html","htm"].includes(ext)) return <Globe className="h-3.5 w-3.5 text-orange-400" />;
  if (["css"].includes(ext)) return <Palette className="h-3.5 w-3.5 text-blue-400" />;
  if (["js","ts","tsx","jsx"].includes(ext)) return <Braces className="h-3.5 w-3.5 text-yellow-400" />;
  if (["json"].includes(ext)) return <FileCode className="h-3.5 w-3.5 text-green-400" />;
  return <File className="h-3.5 w-3.5 text-muted-foreground" />;
}

function isTextFile(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  return ["js","ts","tsx","jsx","html","htm","css","json","md","xml","svg","sql","py","sh","yaml","yml","txt","wasm","map"].includes(ext);
}

function getContentType(name: string, fallback = "application/octet-stream") {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  const map: Record<string, string> = {
    html: "text/html",
    htm: "text/html",
    css: "text/css",
    js: "text/javascript",
    mjs: "text/javascript",
    cjs: "text/javascript",
    ts: "text/plain",
    tsx: "text/plain",
    jsx: "text/plain",
    json: "application/json",
    map: "application/json",
    txt: "text/plain",
    md: "text/markdown",
    xml: "application/xml",
    svg: "image/svg+xml",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    webp: "image/webp",
    ico: "image/x-icon",
    mp3: "audio/mpeg",
    wav: "audio/wav",
    ogg: "audio/ogg",
    m4a: "audio/mp4",
    wasm: "application/wasm",
    sql: "text/plain",
    py: "text/plain",
    sh: "text/plain",
    yaml: "text/yaml",
    yml: "text/yaml",
  };

  return map[ext] || fallback;
}

export default function DevConsole({ onBack }: { onBack: () => void }) {
  const [mode, setMode] = useState<"editor" | "installer">("editor");
  const [games, setGames] = useState<string[]>([]);
  const [selectedGame, setSelectedGame] = useState<string>("");
  const [gameSource, setGameSource] = useState<"builtin" | "storage">("builtin");
  const [files, setFiles] = useState<StorageFile[]>([]);
  const [currentPath, setCurrentPath] = useState("");
  const [selectedFile, setSelectedFile] = useState<string>("");
  const [fileContent, setFileContent] = useState("");
  const [originalContent, setOriginalContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchInFiles, setSearchInFiles] = useState("");
  const [searchResults, setSearchResults] = useState<{ file: string; line: number; text: string }[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [showNewFile, setShowNewFile] = useState(false);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [renamingFile, setRenamingFile] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [openTabs, setOpenTabs] = useState<string[]>([]);
  const [storageGames, setStorageGames] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const fetchStorageGames = async () => {
    const { data } = await supabase.storage.from(BUCKET).list("", { limit: 200 });
    const folders = (data || []).filter(f => !f.metadata?.mimetype && !f.id).map(f => f.name);
    setStorageGames(folders);
    setGames([...BUILTIN_GAMES, ...folders.filter(f => !BUILTIN_GAMES.includes(f))]);
  };

  useEffect(() => { fetchStorageGames(); }, []);

  const fetchFiles = async (gameName: string, path = "") => {
    setLoading(true);
    const source = storageGames.includes(gameName) ? "storage" : "builtin";
    setGameSource(source);

    if (source === "storage") {
      const fullPath = path ? `${gameName}/${path}` : gameName;
      const { data, error } = await supabase.storage.from(BUCKET).list(fullPath, { limit: 500, sortBy: { column: "name", order: "asc" } });
      if (error) { toast.error("Failed to load files"); setLoading(false); return; }
      setFiles((data || []) as StorageFile[]);
    } else {
      try {
        const basePath = `/games/${gameName}`;
        const knownFiles = ["index.html", "script.js", "style.css", "game.js", "math.js"];
        const discovered: StorageFile[] = [];
        const subfolders = gameName === "slot-cowboy" ? ["scripts"] : [];
        
        for (const f of knownFiles) {
          try {
            const filePath = path ? `${basePath}/${path}/${f}` : `${basePath}/${f}`;
            const resp = await fetch(filePath, { method: "HEAD" });
            if (resp.ok) discovered.push({ name: f, metadata: { size: parseInt(resp.headers.get("content-length") || "0"), mimetype: "text/plain" } });
          } catch {}
        }
        
        for (const sub of subfolders) {
          if (!path) discovered.push({ name: sub });
        }
        setFiles(discovered);
      } catch {
        setFiles([]);
      }
    }
    setLoading(false);
  };

  const selectGame = (name: string) => {
    setSelectedGame(name);
    setCurrentPath("");
    setSelectedFile("");
    setFileContent("");
    setOriginalContent("");
    setOpenTabs([]);
    fetchFiles(name);
  };

  const loadFile = async (fileName: string) => {
    const fullRelPath = currentPath ? `${currentPath}/${fileName}` : fileName;
    setSelectedFile(fullRelPath);
    if (!openTabs.includes(fullRelPath)) setOpenTabs(prev => [...prev, fullRelPath]);

    setLoading(true);
    try {
      if (gameSource === "storage") {
        const storagePath = `${selectedGame}/${fullRelPath}`;
        const { data, error } = await supabase.storage.from(BUCKET).download(storagePath);
        if (error) throw error;
        const text = await data.text();
        setFileContent(text);
        setOriginalContent(text);
      } else {
        const url = `/games/${selectedGame}/${fullRelPath}`;
        const resp = await fetch(url);
        if (!resp.ok) throw new Error("Not found");
        const text = await resp.text();
        setFileContent(text);
        setOriginalContent(text);
      }
    } catch (err: any) {
      toast.error(`Failed to load: ${err.message}`);
      setFileContent("");
      setOriginalContent("");
    }
    setLoading(false);
  };

  const saveFile = async () => {
    if (gameSource === "builtin") {
      const storagePath = `${selectedGame}/${selectedFile}`;
      setSaving(true);
      const contentType = getContentType(selectedFile, "text/plain");
      const blob = new Blob([fileContent], { type: contentType });
      const { error } = await supabase.storage.from(BUCKET).upload(storagePath, blob, { upsert: true, contentType });
      if (error) { toast.error("Save failed: " + error.message); setSaving(false); return; }
      toast.success("Saved to storage (override)");
      setOriginalContent(fileContent);
      if (!storageGames.includes(selectedGame)) {
        setStorageGames(prev => [...prev, selectedGame]);
        setGameSource("storage");
      }
      setSaving(false);
      return;
    }

    const storagePath = `${selectedGame}/${selectedFile}`;
    setSaving(true);
    const contentType = getContentType(selectedFile, "text/plain");
    const blob = new Blob([fileContent], { type: contentType });
    const { error } = await supabase.storage.from(BUCKET).upload(storagePath, blob, { upsert: true, contentType });
    if (error) { toast.error("Save failed: " + error.message); setSaving(false); return; }
    toast.success("File saved");
    setOriginalContent(fileContent);
    setSaving(false);
  };

  const deleteFile = async (fileName: string) => {
    const fullPath = currentPath ? `${selectedGame}/${currentPath}/${fileName}` : `${selectedGame}/${fileName}`;
    const { error } = await supabase.storage.from(BUCKET).remove([fullPath]);
    if (error) { toast.error("Delete failed"); return; }
    toast.success(`Deleted ${fileName}`);
    const relPath = currentPath ? `${currentPath}/${fileName}` : fileName;
    if (selectedFile === relPath) { setSelectedFile(""); setFileContent(""); }
    setOpenTabs(prev => prev.filter(t => t !== relPath));
    fetchFiles(selectedGame, currentPath);
  };

  const createFile = async () => {
    if (!newFileName.trim()) return;
    const fullPath = currentPath ? `${selectedGame}/${currentPath}/${newFileName}` : `${selectedGame}/${newFileName}`;
    const contentType = getContentType(newFileName, "text/plain");
    const blob = new Blob([""], { type: contentType });
    const { error } = await supabase.storage.from(BUCKET).upload(fullPath, blob, { upsert: false, contentType });
    if (error) { toast.error("Create failed: " + error.message); return; }
    toast.success(`Created ${newFileName}`);
    setNewFileName("");
    setShowNewFile(false);
    fetchFiles(selectedGame, currentPath);
  };

  const createFolder = async () => {
    if (!newFolderName.trim()) return;
    const fullPath = currentPath
      ? `${selectedGame}/${currentPath}/${newFolderName}/.keep`
      : `${selectedGame}/${newFolderName}/.keep`;
    const blob = new Blob([""], { type: "text/plain" });
    const { error } = await supabase.storage.from(BUCKET).upload(fullPath, blob);
    if (error) { toast.error("Create folder failed"); return; }
    toast.success(`Created folder ${newFolderName}`);
    setNewFolderName("");
    setShowNewFolder(false);
    fetchFiles(selectedGame, currentPath);
  };

  const renameFile = async (oldName: string) => {
    if (!renameValue.trim() || renameValue === oldName) { setRenamingFile(null); return; }
    const oldPath = currentPath ? `${selectedGame}/${currentPath}/${oldName}` : `${selectedGame}/${oldName}`;
    const newPath = currentPath ? `${selectedGame}/${currentPath}/${renameValue}` : `${selectedGame}/${renameValue}`;
    const { data } = await supabase.storage.from(BUCKET).download(oldPath);
    if (!data) { toast.error("Rename failed"); return; }
    await supabase.storage.from(BUCKET).upload(newPath, data, { upsert: true });
    await supabase.storage.from(BUCKET).remove([oldPath]);
    toast.success(`Renamed to ${renameValue}`);
    setRenamingFile(null);
    fetchFiles(selectedGame, currentPath);
  };

  const handleSearchInFiles = async () => {
    if (!searchInFiles.trim() || !selectedGame) return;
    toast.info("Searching...");
    const results: { file: string; line: number; text: string }[] = [];
    
    const searchFile = async (filePath: string, content: string) => {
      const lines = content.split("\n");
      lines.forEach((line, i) => {
        if (line.toLowerCase().includes(searchInFiles.toLowerCase())) {
          results.push({ file: filePath, line: i + 1, text: line.trim() });
        }
      });
    };

    for (const f of files) {
      if (!f.metadata?.mimetype && !f.id) continue;
      if (!isTextFile(f.name)) continue;
      try {
        const path = currentPath ? `${currentPath}/${f.name}` : f.name;
        let content: string;
        if (gameSource === "storage") {
          const { data } = await supabase.storage.from(BUCKET).download(`${selectedGame}/${path}`);
          if (!data) continue;
          content = await data.text();
        } else {
          const resp = await fetch(`/games/${selectedGame}/${path}`);
          if (!resp.ok) continue;
          content = await resp.text();
        }
        searchFile(path, content);
      } catch {}
    }
    setSearchResults(results);
    toast.success(`Found ${results.length} matches`);
  };

  const downloadFile = (fileName: string) => {
    const fullRelPath = currentPath ? `${currentPath}/${fileName}` : fileName;
    if (gameSource === "storage") {
      const url = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${selectedGame}/${fullRelPath}`;
      window.open(url, "_blank");
    } else {
      window.open(`/games/${selectedGame}/${fullRelPath}`, "_blank");
    }
  };

  const closeTab = (tab: string) => {
    setOpenTabs(prev => prev.filter(t => t !== tab));
    if (selectedFile === tab) {
      const remaining = openTabs.filter(t => t !== tab);
      if (remaining.length) {
        setSelectedFile(remaining[remaining.length - 1]);
      } else {
        setSelectedFile("");
        setFileContent("");
      }
    }
  };

  const enterFolder = (folderName: string) => {
    const newPath = currentPath ? `${currentPath}/${folderName}` : folderName;
    setCurrentPath(newPath);
    fetchFiles(selectedGame, newPath);
  };

  const goUp = () => {
    const parts = currentPath.split("/").filter(Boolean);
    parts.pop();
    const newPath = parts.join("/");
    setCurrentPath(newPath);
    fetchFiles(selectedGame, newPath);
  };

  const hasChanges = fileContent !== originalContent;
  const filtered = files.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const [installName, setInstallName] = useState("");
  const [installCategory, setInstallCategory] = useState<string>("instant");
  const [installing, setInstalling] = useState(false);
  const [installFiles, setInstallFiles] = useState<File[]>([]);

  const handleInstallSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    setInstallFiles(selected);
    if (selected.length > 0 && !installName) {
      const path = selected[0].webkitRelativePath || selected[0].name;
      const folderName = path.split("/")[0];
      if (folderName) setInstallName(folderName.toLowerCase().replace(/\s+/g, "-"));
    }
  };

  const handleInstallGame = async () => {
    if (!installName.trim()) { toast.error("Game name required"); return; }
    if (!installFiles.length) { toast.error("No files selected"); return; }
    setInstalling(true);
    const slug = installName.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-");
    let success = 0;
    let indexHtmlFound = false;

    // Upload bridge.js into THIS game's folder first so relative path always resolves.
    try {
      const bridgeResp = await fetch("/games/bridge.js");
      if (bridgeResp.ok) {
        const bridgeBlob = await bridgeResp.blob();
        await supabase.storage.from(BUCKET).upload(`${slug}/bridge.js`, bridgeBlob, { upsert: true, contentType: "application/javascript" });
        // Also at bucket root for legacy ../bridge.js paths
        await supabase.storage.from(BUCKET).upload("bridge.js", bridgeBlob, { upsert: true, contentType: "application/javascript" });
      }
    } catch (e) {
      console.warn("Could not upload bridge.js", e);
    }

    for (const file of installFiles) {
      const relativePath = file.webkitRelativePath
        ? file.webkitRelativePath.split("/").slice(1).join("/")
        : file.name;
      // Skip any bridge.js the user included — we manage our own.
      if (relativePath.toLowerCase() === "bridge.js") continue;
      const storagePath = `${slug}/${relativePath}`;

      // Auto-inject PhantomBridge into index.html so the game can sync balance.
      // CRITICAL: must load BEFORE game scripts, so inject into <head>.
      let toUpload: Blob = file;
      if (relativePath.toLowerCase() === "index.html") {
        indexHtmlFound = true;
        try {
          const text = await file.text();
          // Strip any existing bridge.js script tags (wrong path/order from prior installs)
          let patched = text.replace(/<script[^>]*src=["'][^"']*bridge\.js["'][^>]*><\/script>\s*/gi, "");
          const inject = `<script src="bridge.js"></script>\n`;
          if (/<\/head>/i.test(patched)) {
            patched = patched.replace(/<\/head>/i, `  ${inject}</head>`);
          } else if (/<head[^>]*>/i.test(patched)) {
            patched = patched.replace(/<head[^>]*>/i, (m) => `${m}\n  ${inject}`);
          } else if (/<body[^>]*>/i.test(patched)) {
            patched = patched.replace(/<body[^>]*>/i, (m) => `${m}\n${inject}`);
          } else {
            patched = inject + patched;
          }
          toUpload = new Blob([patched], { type: "text/html" });
        } catch (e) {
          console.warn("Could not patch index.html", e);
        }
      }

      const contentType = getContentType(relativePath, file.type || (isTextFile(relativePath) ? "text/plain" : "application/octet-stream"));
      const { error } = await supabase.storage.from(BUCKET).upload(storagePath, toUpload, { upsert: true, contentType });
      if (error) { console.error(`Failed: ${storagePath}`, error); } else { success++; }
    }

    if (!indexHtmlFound) {
      toast.error("No index.html found in folder. Game won't be playable.");
    }

    if (success > 0) {
      const displayName = installName.trim().split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
      const { error: dbErr } = await supabase.from("games").insert({
        name: displayName,
        slug,
        source: "storage",
        category: installCategory as any,
        description: `Custom installed game: ${displayName}`,
        is_active: true,
        is_featured: false,
      } as any);
      if (dbErr) {
        console.error("DB insert error:", dbErr);
        toast.error("Files uploaded but game registration failed: " + dbErr.message);
      } else {
        toast.success(`✓ Installed "${displayName}" — appears in /games now!`);
      }
      setInstallFiles([]);
      setInstallName("");
      fetchStorageGames();
    } else {
      toast.error("Installation failed");
    }
    setInstalling(false);
  };

  const uninstallGame = async (slug: string) => {
    const isBuiltIn = BUILTIN_GAMES.includes(slug);
    const confirmed = window.confirm(
      isBuiltIn
        ? `Uninstall ${slug}? This will hide it from the casino and remove any editable override files stored for it.`
        : `Uninstall ${slug}? This will remove the game entry and delete its uploaded files.`
    );
    if (!confirmed) return;

    const gameFolder = slug;
    const prefixes = [gameFolder];
    let removedFiles = 0;

    try {
      for (const prefix of prefixes) {
        const queue = [prefix];
        while (queue.length > 0) {
          const current = queue.shift()!;
          const { data, error } = await supabase.storage.from(BUCKET).list(current, { limit: 500 });
          if (error) continue;

          const filePaths: string[] = [];
          for (const entry of data || []) {
            const entryPath = `${current}/${entry.name}`;
            const isFolder = !entry.metadata?.mimetype && !entry.id;
            if (isFolder) queue.push(entryPath);
            else filePaths.push(entryPath);
          }

          if (filePaths.length) {
            const { error: removeError } = await supabase.storage.from(BUCKET).remove(filePaths);
            if (removeError) throw removeError;
            removedFiles += filePaths.length;
          }
        }
      }

      const { error: deleteDbError } = await supabase.from("games").delete().eq("slug", slug);
      if (deleteDbError) throw deleteDbError;

      setStorageGames((prev) => prev.filter((game) => game !== slug));
      setGames((prev) => prev.filter((game) => game !== slug));
      if (selectedGame === slug) {
        setSelectedGame("");
        setSelectedFile("");
        setFileContent("");
        setOriginalContent("");
        setFiles([]);
        setOpenTabs([]);
        setCurrentPath("");
      }

      await fetchStorageGames();
      toast.success(`${slug} uninstalled${removedFiles ? ` (${removedFiles} files removed)` : ""}`);
    } catch (error: any) {
      console.error("Failed to uninstall game", error);
      toast.error(error?.message || "Failed to uninstall game");
    }
  };

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-casino-gold hover:underline">
        <ArrowLeft className="h-4 w-4" /> Back to Tools
      </button>
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg font-bold flex items-center gap-2">
          <Terminal className="h-5 w-5 text-casino-gold" /> Dev Console
        </h3>
        <div className="flex gap-2">
          <Button variant={mode === "editor" ? "gold" : "outline"} size="sm" onClick={() => setMode("editor")}>
            <Code className="h-3 w-3 mr-1" /> Code Editor
          </Button>
          <Button variant={mode === "installer" ? "gold" : "outline"} size="sm" onClick={() => setMode("installer")}>
            <Package className="h-3 w-3 mr-1" /> Install Game
          </Button>
        </div>
      </div>

      {mode === "installer" ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <h4 className="font-bold flex items-center gap-2"><Package className="h-4 w-4 text-casino-gold" /> Install New Game</h4>
            <p className="text-xs text-muted-foreground">Upload a folder containing your casino game files (index.html, script.js, style.css, etc). The game will be automatically registered and categorized.</p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Game Name (slug)</Label>
                <Input value={installName} onChange={e => setInstallName(e.target.value)} placeholder="my-awesome-game" className="bg-background border-border" />
              </div>
              <div>
                <Label className="text-xs">Category</Label>
                <select
                  value={installCategory}
                  onChange={e => setInstallCategory(e.target.value)}
                  className="w-full h-10 rounded-md border border-border bg-background px-3 text-sm"
                >
                  <option value="slots">Slots</option>
                  <option value="table">Table</option>
                  <option value="instant">Instant</option>
                  <option value="scratch">Scratch</option>
                  <option value="jackpot">Jackpot</option>
                </select>
              </div>
            </div>

            <div className="border-2 border-dashed border-border rounded-lg p-6 text-center space-y-3">
              <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Select game folder to upload</p>
              <input
                ref={folderInputRef}
                type="file"
                // @ts-ignore
                webkitdirectory=""
                directory=""
                multiple
                className="hidden"
                onChange={handleInstallSelect}
              />
              <Button variant="outline" onClick={() => folderInputRef.current?.click()}>
                <FolderOpen className="h-4 w-4 mr-2" /> Select Folder
              </Button>
              {installFiles.length > 0 && (
                <div className="text-left mt-3 max-h-40 overflow-y-auto space-y-1">
                  <p className="text-xs font-bold text-casino-gold">{installFiles.length} files selected:</p>
                  {installFiles.slice(0, 20).map((f, i) => (
                    <p key={i} className="text-xs text-muted-foreground truncate">{f.webkitRelativePath || f.name}</p>
                  ))}
                  {installFiles.length > 20 && <p className="text-xs text-muted-foreground">...and {installFiles.length - 20} more</p>}
                </div>
              )}
            </div>

            <Button variant="gold" className="w-full" onClick={handleInstallGame} disabled={installing || !installFiles.length || !installName}>
              {installing ? <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Installing...</> : <><Gamepad2 className="h-4 w-4 mr-2" /> Install Game</>}
            </Button>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 space-y-3">
            <h4 className="font-bold flex items-center gap-2"><Layers className="h-4 w-4 text-casino-gold" /> Installed Games ({storageGames.length} custom + {BUILTIN_GAMES.length} built-in)</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {games.map(g => (
                <div
                  key={g}
                  className={`rounded-lg border p-3 text-left text-xs font-medium transition-all ${
                    storageGames.includes(g) ? "border-green-500/30 bg-green-500/5" : "border-border"
                  }`}
                >
                  <button
                    onClick={() => { setMode("editor"); selectGame(g); }}
                    className="w-full text-left"
                  >
                    <div className="flex items-center gap-2">
                      <Gamepad2 className="h-3.5 w-3.5 text-casino-gold shrink-0" />
                      <span className="truncate">{g}</span>
                    </div>
                    <span className={`text-[10px] mt-1 block ${storageGames.includes(g) ? "text-green-400" : "text-muted-foreground"}`}>
                      {storageGames.includes(g) ? "Custom" : "Built-in"}
                    </span>
                  </button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 h-7 w-full justify-center text-[10px]"
                    onClick={() => uninstallGame(g)}
                  >
                    <OctagonX className="h-3 w-3 mr-1" /> Uninstall
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-4 min-h-[600px]">
          <div className="w-full lg:w-64 shrink-0 space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Select Game</Label>
              <select
                value={selectedGame}
                onChange={e => selectGame(e.target.value)}
                className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm"
              >
                <option value="">— Choose game —</option>
                <optgroup label="Built-in Games">
                  {BUILTIN_GAMES.map(g => <option key={g} value={g}>{g}</option>)}
                </optgroup>
                {storageGames.filter(g => !BUILTIN_GAMES.includes(g)).length > 0 && (
                  <optgroup label="Custom Games">
                    {storageGames.filter(g => !BUILTIN_GAMES.includes(g)).map(g => <option key={g} value={g}>{g}</option>)}
                  </optgroup>
                )}
              </select>
            </div>

            {selectedGame && (
              <>
                <div className="flex items-center gap-1 flex-wrap">
                  <Button variant="ghost" size="icon" className="h-7 w-7" title="New File" onClick={() => setShowNewFile(true)}>
                    <FilePlus className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" title="New Folder" onClick={() => setShowNewFolder(true)}>
                    <FolderPlus className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" title="Upload Files" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" title="Refresh" onClick={() => fetchFiles(selectedGame, currentPath)}>
                    <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" title="Search in Files" onClick={() => setShowSearch(!showSearch)}>
                    <Search className="h-3.5 w-3.5" />
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={async (e) => {
                      const uploadFiles = e.target.files;
                      if (!uploadFiles?.length) return;
                      let success = 0;
                      for (const file of Array.from(uploadFiles)) {
                        const path = currentPath ? `${selectedGame}/${currentPath}/${file.name}` : `${selectedGame}/${file.name}`;
                         const contentType = getContentType(file.name, file.type || (isTextFile(file.name) ? "text/plain" : "application/octet-stream"));
                         const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true, contentType });
                        if (!error) success++;
                      }
                      if (success) toast.success(`${success} file(s) uploaded`);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                      fetchFiles(selectedGame, currentPath);
                    }}
                  />
                </div>

                {showSearch && (
                  <div className="space-y-2 p-2 rounded-lg bg-secondary/30 border border-border">
                    <div className="flex gap-1">
                      <Input
                        value={searchInFiles}
                        onChange={e => setSearchInFiles(e.target.value)}
                        placeholder="Search in files..."
                        className="h-7 text-xs bg-background border-border"
                        onKeyDown={e => e.key === "Enter" && handleSearchInFiles()}
                      />
                      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={handleSearchInFiles}>
                        <Search className="h-3 w-3" />
                      </Button>
                    </div>
                    {searchResults.length > 0 && (
                      <div className="max-h-40 overflow-y-auto space-y-1">
                        {searchResults.map((r, i) => (
                          <button
                            key={i}
                            onClick={() => {
                              const fileName = r.file.split("/").pop() || "";
                              const dir = r.file.includes("/") ? r.file.split("/").slice(0, -1).join("/") : "";
                              if (dir !== currentPath) { setCurrentPath(dir); fetchFiles(selectedGame, dir); }
                              loadFile(fileName);
                            }}
                            className="w-full text-left p-1.5 rounded text-[10px] hover:bg-secondary/50"
                          >
                            <span className="text-casino-gold font-medium">{r.file}:{r.line}</span>
                            <p className="text-muted-foreground truncate">{r.text}</p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {showNewFile && (
                  <div className="flex gap-1">
                    <Input
                      value={newFileName}
                      onChange={e => setNewFileName(e.target.value)}
                      placeholder="filename.js"
                      className="h-7 text-xs bg-background border-border"
                      onKeyDown={e => e.key === "Enter" && createFile()}
                      autoFocus
                    />
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={createFile}><Check className="h-3 w-3" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowNewFile(false)}><X className="h-3 w-3" /></Button>
                  </div>
                )}
                {showNewFolder && (
                  <div className="flex gap-1">
                    <Input
                      value={newFolderName}
                      onChange={e => setNewFolderName(e.target.value)}
                      placeholder="folder-name"
                      className="h-7 text-xs bg-background border-border"
                      onKeyDown={e => e.key === "Enter" && createFolder()}
                      autoFocus
                    />
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={createFolder}><Check className="h-3 w-3" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowNewFolder(false)}><X className="h-3 w-3" /></Button>
                  </div>
                )}

                <Input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Filter files..."
                  className="h-7 text-xs bg-background border-border"
                />

                <div className="flex items-center gap-1 text-xs flex-wrap">
                  <button onClick={() => { setCurrentPath(""); fetchFiles(selectedGame); }} className="text-casino-gold hover:underline font-medium">{selectedGame}</button>
                  {currentPath.split("/").filter(Boolean).map((part, i, arr) => (
                    <span key={i} className="flex items-center gap-1">
                      <ChevronRight className="h-3 w-3 text-muted-foreground" />
                      <button onClick={() => {
                        const newPath = arr.slice(0, i + 1).join("/");
                        setCurrentPath(newPath);
                        fetchFiles(selectedGame, newPath);
                      }} className="text-casino-gold hover:underline font-medium">{part}</button>
                    </span>
                  ))}
                </div>

                {currentPath && (
                  <button onClick={goUp} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                    <ArrowLeft className="h-3 w-3" /> ..
                  </button>
                )}

                <div className="space-y-0.5 max-h-[400px] overflow-y-auto">
                  {loading && !selectedFile ? (
                    <p className="text-xs text-muted-foreground py-4 text-center">Loading...</p>
                  ) : filtered.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-4 text-center">No files found</p>
                  ) : filtered.map(f => {
                    const isFolder = !f.metadata?.mimetype && !f.id;
                    const relPath = currentPath ? `${currentPath}/${f.name}` : f.name;
                    const isActive = selectedFile === relPath;

                    if (f.name === ".keep" || f.name === ".emptyFolderPlaceholder") return null;

                    return (
                      <div key={f.name} className={`group flex items-center gap-1.5 rounded px-2 py-1 text-xs cursor-pointer transition-colors ${
                        isActive ? "bg-casino-gold/15 text-casino-gold" : "hover:bg-secondary/50"
                      }`}>
                        {isFolder ? (
                          <button onClick={() => enterFolder(f.name)} className="flex items-center gap-1.5 flex-1 min-w-0">
                            <FolderOpen className="h-3.5 w-3.5 text-casino-gold shrink-0" />
                            {renamingFile === f.name ? (
                              <Input
                                value={renameValue}
                                onChange={e => setRenameValue(e.target.value)}
                                onKeyDown={e => e.key === "Enter" && renameFile(f.name)}
                                onBlur={() => setRenamingFile(null)}
                                className="h-5 text-xs bg-background border-border flex-1"
                                autoFocus
                              />
                            ) : (
                              <span className="truncate">{f.name}</span>
                            )}
                          </button>
                        ) : (
                          <>
                            <button onClick={() => loadFile(f.name)} className="flex items-center gap-1.5 flex-1 min-w-0">
                              {getFileIcon(f.name)}
                              {renamingFile === f.name ? (
                                <Input
                                  value={renameValue}
                                  onChange={e => setRenameValue(e.target.value)}
                                  onKeyDown={e => e.key === "Enter" && renameFile(f.name)}
                                  onBlur={() => setRenamingFile(null)}
                                  className="h-5 text-xs bg-background border-border flex-1"
                                  autoFocus
                                />
                              ) : (
                                <span className="truncate">{f.name}</span>
                              )}
                            </button>
                            <div className="hidden group-hover:flex items-center gap-0.5 shrink-0">
                              <button onClick={() => { setRenamingFile(f.name); setRenameValue(f.name); }} title="Rename"><Pencil className="h-3 w-3 text-muted-foreground hover:text-foreground" /></button>
                              <button onClick={() => downloadFile(f.name)} title="Download"><Download className="h-3 w-3 text-muted-foreground hover:text-foreground" /></button>
                              <button onClick={() => navigator.clipboard.writeText(
                                gameSource === "storage"
                                  ? `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${selectedGame}/${relPath}`
                                  : `/games/${selectedGame}/${relPath}`
                              ).then(() => toast.success("Path copied"))} title="Copy Path"><Copy className="h-3 w-3 text-muted-foreground hover:text-foreground" /></button>
                              {gameSource === "storage" && (
                                <button onClick={() => deleteFile(f.name)} title="Delete"><Trash2 className="h-3 w-3 text-destructive/70 hover:text-destructive" /></button>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <div className={`h-1.5 w-1.5 rounded-full ${gameSource === "storage" ? "bg-green-400" : "bg-blue-400"}`} />
                  {gameSource === "storage" ? "Editable (Storage)" : "Read-only (Built-in) — Saves create storage override"}
                </div>
              </>
            )}
          </div>

          <div className="flex-1 min-w-0 flex flex-col rounded-xl border border-border bg-card overflow-hidden">
            {openTabs.length > 0 && (
              <div className="flex items-center gap-0 border-b border-border bg-secondary/40 overflow-x-auto">
                {openTabs.map(tab => (
                  <div
                    key={tab}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs cursor-pointer border-r border-border shrink-0 ${
                      selectedFile === tab ? "bg-card text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                    }`}
                  >
                    <button onClick={() => {
                      setSelectedFile(tab);
                      const fileName = tab.split("/").pop() || "";
                      const dir = tab.includes("/") ? tab.split("/").slice(0, -1).join("/") : "";
                      if (dir !== currentPath) { setCurrentPath(dir); }
                      loadFile(fileName);
                    }} className="flex items-center gap-1.5">
                      {getFileIcon(tab.split("/").pop() || "")}
                      <span>{tab.split("/").pop()}</span>
                    </button>
                    <button onClick={() => closeTab(tab)} className="hover:text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {selectedFile && (
              <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-secondary/20">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-mono">{selectedGame}/{selectedFile}</span>
                  {hasChanges && <span className="text-casino-gold font-bold">● Modified</span>}
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setFileContent(originalContent)} disabled={!hasChanges}>
                    <Undo2 className="h-3 w-3 mr-1" /> Revert
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => {
                    navigator.clipboard.writeText(fileContent);
                    toast.success("Copied to clipboard");
                  }}>
                    <Copy className="h-3 w-3 mr-1" /> Copy
                  </Button>
                  <Button variant="gold" size="sm" className="h-7 text-xs" onClick={saveFile} disabled={saving || !hasChanges}>
                    <Save className="h-3 w-3 mr-1" /> {saving ? "Saving..." : "Save"}
                  </Button>
                </div>
              </div>
            )}

            <div className="flex-1 min-h-0">
              {selectedFile ? (
                isTextFile(selectedFile) ? (
                  <Editor
                    height="100%"
                    language={getFileLanguage(selectedFile)}
                    value={fileContent}
                    onChange={v => setFileContent(v || "")}
                    theme="vs-dark"
                    options={{
                      minimap: { enabled: false },
                      fontSize: 13,
                      lineNumbers: "on",
                      wordWrap: "on",
                      scrollBeyondLastLine: false,
                      automaticLayout: true,
                      tabSize: 2,
                      renderWhitespace: "selection",
                      bracketPairColorization: { enabled: true },
                      folding: true,
                      suggestOnTriggerCharacters: true,
                      quickSuggestions: true,
                      formatOnPaste: true,
                    }}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    <div className="text-center space-y-2">
                      <Eye className="h-8 w-8 mx-auto opacity-30" />
                      <p className="text-sm">Binary file — cannot edit in browser</p>
                      <Button variant="outline" size="sm" onClick={() => downloadFile(selectedFile.split("/").pop() || "")}>
                        <Download className="h-3 w-3 mr-1" /> Download
                      </Button>
                    </div>
                  </div>
                )
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <div className="text-center space-y-3">
                    <Terminal className="h-12 w-12 mx-auto opacity-20" />
                    <p className="text-sm font-medium">Select a game and file to start editing</p>
                    <p className="text-xs">Built-in game edits are saved as storage overrides</p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between px-3 py-1 border-t border-border bg-secondary/20 text-[10px] text-muted-foreground">
              <div className="flex items-center gap-3">
                {selectedFile && <span>{getFileLanguage(selectedFile).toUpperCase()}</span>}
                {selectedFile && <span>UTF-8</span>}
                {fileContent && <span>{fileContent.split("\n").length} lines</span>}
              </div>
              <div className="flex items-center gap-2">
                <span>{gameSource === "storage" ? "Storage" : "Built-in"}</span>
                {hasChanges && <span className="text-casino-gold">Unsaved changes</span>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
