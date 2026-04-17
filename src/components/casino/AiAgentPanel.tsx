import { useState, useRef, useEffect } from "react";
import { ArrowLeft, Send, Sparkles, Database, FolderOpen, Code, AlertCircle, CheckCircle2, Copy, History, Megaphone, Gamepad2, UserCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

const MODELS = [
  { value: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro (smartest)" },
  { value: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash (fast)" },
  { value: "openai/gpt-5", label: "GPT-5 (precise)" },
  { value: "openai/gpt-5-mini", label: "GPT-5 Mini" },
];

type ToolResult = {
  tool: string;
  ok: boolean;
  message?: string;
  file_path?: string;
  explanation?: string;
  code?: string;
  files?: any[];
  path?: string;
  key?: string;
  value?: any;
  action?: string;
  from?: string;
  to?: string;
};

type Turn = {
  role: "user" | "assistant";
  content: string;
  results?: ToolResult[];
};

const EXAMPLES = [
  "Enable maintenance mode",
  "Post a broadcast: 'Weekend cashback is live, 10% back on all losses!' as type promo",
  "Deactivate Plinko Pro game",
  "Find user phantom and show their roles",
  "Grant staff role to username phantom",
  "List files in the slot-cowboy folder",
  "Suggest code to add a 'New' badge to the homepage hero",
];

export default function AiAgentPanel({ onBack }: { onBack: () => void }) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [model, setModel] = useState<string>(MODELS[0].value);
  const [history, setHistory] = useState<any[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  async function loadHistory() {
    const { data } = await supabase
      .from("ai_agent_log")
      .select("id,prompt,reply,tool_results,created_at")
      .order("created_at", { ascending: false })
      .limit(25);
    setHistory(data || []);
  }

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [turns, loading]);

  async function send(promptText?: string) {
    const text = (promptText ?? input).trim();
    if (!text || loading) return;
    setInput("");
    const newTurns: Turn[] = [...turns, { role: "user", content: text }];
    setTurns(newTurns);
    setLoading(true);

    try {
      const history = newTurns.slice(-10).slice(0, -1).map((t) => ({
        role: t.role,
        content: t.content,
      }));
      const hist = newTurns.slice(-10).slice(0, -1).map((t) => ({ role: t.role, content: t.content }));
      const { data, error } = await supabase.functions.invoke("ai-agent", {
        body: { prompt: text, history: hist, model },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setTurns((prev) => [
        ...prev,
        { role: "assistant", content: data.reply || "Done.", results: data.tool_results || [] },
      ]);
    } catch (e: any) {
      toast.error(e?.message || "Agent failed");
      setTurns((prev) => [
        ...prev,
        { role: "assistant", content: `⚠️ ${e?.message || "Agent failed"}` },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="h-5 w-5" /></Button>
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-bold">AI Agent</h1>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-3 text-xs text-muted-foreground">
        The agent can update site settings, manage game-files storage, and suggest code edits. Source-code changes still require pasting into the Lovable chat.
      </div>

      <div ref={scrollRef} className="rounded-xl border border-border bg-card/50 h-[420px] overflow-y-auto p-4 space-y-4">
        {turns.length === 0 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Try:</p>
            <div className="flex flex-wrap gap-2">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  onClick={() => send(ex)}
                  className="text-xs px-3 py-1.5 rounded-full border border-border bg-secondary/40 hover:bg-secondary transition"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>
        )}

        {turns.map((t, i) => (
          <div key={i} className={`flex ${t.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${t.role === "user" ? "bg-primary text-primary-foreground" : "bg-secondary/60"}`}>
              <div className="whitespace-pre-wrap">{t.content}</div>
              {t.results?.map((r, j) => (
                <ToolResultCard key={j} result={r} />
              ))}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-secondary/60 rounded-lg px-3 py-2 text-sm flex items-center gap-2">
              <Sparkles className="h-4 w-4 animate-pulse" /> Thinking…
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder="Ask the agent to change a setting, manage files, or suggest code…"
          className="min-h-[60px] resize-none"
          disabled={loading}
        />
        <Button onClick={() => send()} disabled={loading || !input.trim()} className="self-end">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function ToolResultCard({ result }: { result: ToolResult }) {
  const Icon = result.tool === "update_site_setting" ? Database
    : result.tool === "manage_storage_file" ? FolderOpen
    : Code;

  return (
    <div className={`mt-3 rounded-md border p-2 text-xs ${result.ok ? "border-primary/30 bg-primary/5" : "border-destructive/30 bg-destructive/5"}`}>
      <div className="flex items-center gap-2 font-medium mb-1">
        {result.ok ? <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> : <AlertCircle className="h-3.5 w-3.5 text-destructive" />}
        <Icon className="h-3.5 w-3.5" />
        <span>{result.tool}</span>
      </div>

      {result.tool === "update_site_setting" && result.ok && (
        <div>
          <div><span className="text-muted-foreground">key:</span> <code>{result.key}</code></div>
          <pre className="mt-1 max-h-32 overflow-auto bg-background/50 p-1.5 rounded text-[10px]">{JSON.stringify(result.value, null, 2)}</pre>
        </div>
      )}

      {result.tool === "manage_storage_file" && result.ok && result.action === "list" && (
        <div>
          <div className="text-muted-foreground mb-1">{result.files?.length ?? 0} item(s) in /{result.path}</div>
          <ul className="max-h-32 overflow-auto space-y-0.5">
            {result.files?.map((f: any) => (
              <li key={f.name} className="font-mono text-[10px]">{f.name}{f.metadata?.size ? ` · ${f.metadata.size}b` : ""}</li>
            ))}
          </ul>
        </div>
      )}

      {result.tool === "manage_storage_file" && result.ok && result.action === "delete" && (
        <div>Deleted <code>{result.path}</code></div>
      )}
      {result.tool === "manage_storage_file" && result.ok && result.action === "rename" && (
        <div>Renamed <code>{result.from}</code> → <code>{result.to}</code></div>
      )}

      {result.tool === "suggest_code_change" && (
        <div>
          <div><span className="text-muted-foreground">file:</span> <code>{result.file_path}</code></div>
          <div className="my-1">{result.explanation}</div>
          <div className="relative">
            <pre className="max-h-48 overflow-auto bg-background/70 p-2 rounded text-[10px] pr-8">{result.code}</pre>
            <button
              onClick={() => {
                navigator.clipboard.writeText(result.code || "");
                toast.success("Code copied");
              }}
              className="absolute top-1 right-1 p-1 rounded hover:bg-secondary"
              aria-label="Copy code"
            >
              <Copy className="h-3 w-3" />
            </button>
          </div>
          <div className="text-[10px] text-muted-foreground mt-1">Paste this into the Lovable chat to apply.</div>
        </div>
      )}

      {!result.ok && <div className="text-destructive">{result.message}</div>}
    </div>
  );
}
