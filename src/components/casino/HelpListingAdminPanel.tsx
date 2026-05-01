import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ArrowLeft, Plus, Trash2, Save, Mail, ExternalLink, CheckCircle2, XCircle, Clock, Coins, Info, FileQuestion } from "lucide-react";
import { toast } from "sonner";

type InfoLink = { id: string; label: string; url: string; description?: string };
type FormField = {
  id: string;
  label: string;
  type: "text" | "email" | "url" | "textarea";
  required?: boolean;
  placeholder?: string;
};
type Application = {
  id: string;
  email: string;
  project_name: string;
  symbol: string;
  network: string | null;
  contract_address: string | null;
  website: string | null;
  whitepaper_url: string | null;
  description: string | null;
  team_info: string | null;
  social_links: string | null;
  extra_data: Record<string, string>;
  status: string;
  admin_notes: string | null;
  created_at: string;
};

const FIELD_TYPES = ["text", "email", "url", "textarea"] as const;

async function loadSetting(key: string): Promise<any> {
  const { data } = await supabase.from("site_settings").select("value").eq("key", key).maybeSingle();
  return data?.value ?? null;
}

async function saveSetting(key: string, value: any) {
  const { data: existing } = await supabase.from("site_settings").select("id").eq("key", key).maybeSingle();
  if (existing) {
    await supabase.from("site_settings").update({ value }).eq("key", key);
  } else {
    await supabase.from("site_settings").insert({ key, value });
  }
}

export function HelpListingAdminPanel({ onBack }: { onBack: () => void }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h2 className="font-display text-xl font-black text-casino-gold">Help & Listings Manager</h2>
      </div>

      <Tabs defaultValue="applications" className="space-y-4">
        <TabsList className="bg-card border border-border">
          <TabsTrigger value="applications" className="gap-1"><FileQuestion className="h-4 w-4" /> Applications</TabsTrigger>
          <TabsTrigger value="info-links" className="gap-1"><Info className="h-4 w-4" /> Info Links</TabsTrigger>
          <TabsTrigger value="form-fields" className="gap-1"><Coins className="h-4 w-4" /> Listing Form</TabsTrigger>
        </TabsList>

        <TabsContent value="applications" className="mt-0"><ApplicationsManager /></TabsContent>
        <TabsContent value="info-links" className="mt-0"><InfoLinksManager /></TabsContent>
        <TabsContent value="form-fields" className="mt-0"><FormFieldsManager /></TabsContent>
      </Tabs>
    </div>
  );
}

/* ── Applications ─────────────────────────────────────────────────── */
function ApplicationsManager() {
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("pending");

  const fetchApps = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("coin_listing_applications")
      .select("id,email,project_name,symbol,network,contract_address,website,whitepaper_url,description,team_info,social_links,extra_data,status,admin_notes,created_at")
      .order("created_at", { ascending: false });
    setApps((data as any) || []);
    setLoading(false);
  };
  useEffect(() => { fetchApps(); }, []);

  const updateStatus = async (id: string, status: string, notes?: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("coin_listing_applications")
      .update({ status, admin_notes: notes ?? null, reviewed_by: user?.id, reviewed_at: new Date().toISOString() })
      .eq("id", id);
    if (error) { toast.error("Failed to update"); return; }
    toast.success(`Application ${status}`);
    fetchApps();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this application permanently?")) return;
    await supabase.from("coin_listing_applications").delete().eq("id", id);
    toast.success("Deleted");
    fetchApps();
  };

  const filtered = apps.filter((a) => filter === "all" || a.status === filter);
  const counts = {
    pending: apps.filter((a) => a.status === "pending").length,
    approved: apps.filter((a) => a.status === "approved").length,
    rejected: apps.filter((a) => a.status === "rejected").length,
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {[
          { id: "pending", label: `Pending (${counts.pending})`, icon: Clock },
          { id: "approved", label: `Approved (${counts.approved})`, icon: CheckCircle2 },
          { id: "rejected", label: `Rejected (${counts.rejected})`, icon: XCircle },
          { id: "all", label: `All (${apps.length})`, icon: FileQuestion },
        ].map((b) => {
          const Icon = b.icon;
          return (
            <Button key={b.id} size="sm" variant={filter === b.id ? "gold" : "outline"} onClick={() => setFilter(b.id)}>
              <Icon className="h-3 w-3 mr-1" /> {b.label}
            </Button>
          );
        })}
      </div>

      {loading ? <p className="text-muted-foreground text-sm py-6 text-center">Loading...</p>
        : filtered.length === 0 ? <p className="text-muted-foreground text-sm py-6 text-center">No applications.</p>
        : (
          <div className="space-y-3">
            {filtered.map((app) => <ApplicationCard key={app.id} app={app} onStatus={updateStatus} onDelete={remove} />)}
          </div>
        )}
    </div>
  );
}

function ApplicationCard({ app, onStatus, onDelete }: {
  app: Application;
  onStatus: (id: string, status: string, notes?: string) => void;
  onDelete: (id: string) => void;
}) {
  const [notes, setNotes] = useState(app.admin_notes || "");
  const [open, setOpen] = useState(false);
  const statusColor = app.status === "approved" ? "text-green-400" : app.status === "rejected" ? "text-loss" : "text-casino-gold";

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h4 className="font-display font-bold flex items-center gap-2">
            {app.project_name} <span className="text-xs text-muted-foreground">({app.symbol})</span>
          </h4>
          <a href={`mailto:${app.email}`} className="text-xs text-casino-gold flex items-center gap-1 hover:underline">
            <Mail className="h-3 w-3" /> {app.email}
          </a>
          <p className="text-[10px] text-muted-foreground mt-1">
            {new Date(app.created_at).toLocaleString()} · <span className={`uppercase font-bold ${statusColor}`}>{app.status}</span>
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setOpen(!open)}>{open ? "Hide" : "Details"}</Button>
      </div>

      {open && (
        <div className="space-y-2 pt-2 border-t border-border text-xs">
          {app.network && <div><b>Network:</b> {app.network}</div>}
          {app.contract_address && <div className="break-all"><b>Contract:</b> {app.contract_address}</div>}
          {app.website && <div><b>Website:</b> <a href={app.website} target="_blank" rel="noreferrer" className="text-casino-gold inline-flex items-center gap-1">{app.website} <ExternalLink className="h-3 w-3" /></a></div>}
          {app.whitepaper_url && <div><b>Whitepaper:</b> <a href={app.whitepaper_url} target="_blank" rel="noreferrer" className="text-casino-gold inline-flex items-center gap-1">link <ExternalLink className="h-3 w-3" /></a></div>}
          {app.description && <div><b>Description:</b><br /><span className="text-muted-foreground whitespace-pre-wrap">{app.description}</span></div>}
          {app.team_info && <div><b>Team:</b><br /><span className="text-muted-foreground whitespace-pre-wrap">{app.team_info}</span></div>}
          {app.social_links && <div><b>Socials:</b><br /><span className="text-muted-foreground whitespace-pre-wrap">{app.social_links}</span></div>}
          {app.extra_data && Object.keys(app.extra_data).length > 0 && (
            <div>
              <b>Additional fields:</b>
              <ul className="text-muted-foreground list-disc pl-4">
                {Object.entries(app.extra_data).map(([k, v]) => <li key={k}><b>{k}:</b> {String(v)}</li>)}
              </ul>
            </div>
          )}
          <div className="space-y-1 pt-2">
            <Label className="text-xs">Admin notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="text-xs min-h-[60px]" placeholder="Internal notes..." />
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            <Button size="sm" variant="gold" onClick={() => onStatus(app.id, "approved", notes)}>
              <CheckCircle2 className="h-3 w-3 mr-1" /> Approve
            </Button>
            <Button size="sm" variant="outline" onClick={() => onStatus(app.id, "rejected", notes)}>
              <XCircle className="h-3 w-3 mr-1" /> Reject
            </Button>
            <Button size="sm" variant="outline" onClick={() => onStatus(app.id, "pending", notes)}>
              <Clock className="h-3 w-3 mr-1" /> Mark Pending
            </Button>
            <Button size="sm" variant="destructive" onClick={() => onDelete(app.id)}>
              <Trash2 className="h-3 w-3 mr-1" /> Delete
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Info Links Manager ───────────────────────────────────────────── */
function InfoLinksManager() {
  const [links, setLinks] = useState<InfoLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { (async () => {
    const v = await loadSetting("help_info_links");
    setLinks(v?.links || []);
    setLoading(false);
  })(); }, []);

  const update = (i: number, patch: Partial<InfoLink>) => {
    setLinks((arr) => arr.map((l, idx) => idx === i ? { ...l, ...patch } : l));
  };
  const add = () => setLinks((arr) => [...arr, { id: `link_${Date.now()}`, label: "New Link", url: "#", description: "" }]);
  const remove = (i: number) => setLinks((arr) => arr.filter((_, idx) => idx !== i));
  const save = async () => {
    setSaving(true);
    await saveSetting("help_info_links", { links });
    setSaving(false);
    toast.success("Info links saved");
  };

  if (loading) return <p className="text-muted-foreground text-sm py-6 text-center">Loading...</p>;

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">Manage links shown under Help → Info tab. Use full URLs (https://...) for external resources.</p>
      {links.map((link, i) => (
        <div key={i} className="rounded-lg border border-border bg-card p-3 space-y-2">
          <div className="grid sm:grid-cols-2 gap-2">
            <div><Label className="text-xs">Label</Label><Input value={link.label} onChange={(e) => update(i, { label: e.target.value })} /></div>
            <div><Label className="text-xs">URL</Label><Input value={link.url} onChange={(e) => update(i, { url: e.target.value })} placeholder="https://..." /></div>
          </div>
          <div><Label className="text-xs">Description</Label><Input value={link.description || ""} onChange={(e) => update(i, { description: e.target.value })} /></div>
          <Button variant="destructive" size="sm" onClick={() => remove(i)}><Trash2 className="h-3 w-3 mr-1" /> Remove</Button>
        </div>
      ))}
      <div className="flex gap-2">
        <Button variant="outline" onClick={add}><Plus className="h-4 w-4 mr-1" /> Add Link</Button>
        <Button variant="gold" onClick={save} disabled={saving}><Save className="h-4 w-4 mr-1" /> {saving ? "Saving..." : "Save Changes"}</Button>
      </div>
    </div>
  );
}

/* ── Form Fields Manager ──────────────────────────────────────────── */
function FormFieldsManager() {
  const [fields, setFields] = useState<FormField[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { (async () => {
    const v = await loadSetting("coin_listing_form_fields");
    setFields(v?.fields || []);
    setLoading(false);
  })(); }, []);

  const update = (i: number, patch: Partial<FormField>) => {
    setFields((arr) => arr.map((f, idx) => idx === i ? { ...f, ...patch } : f));
  };
  const add = () => setFields((arr) => [...arr, { id: `field_${Date.now()}`, label: "New Field", type: "text", required: false, placeholder: "" }]);
  const remove = (i: number) => setFields((arr) => arr.filter((_, idx) => idx !== i));
  const move = (i: number, dir: -1 | 1) => {
    setFields((arr) => {
      const next = [...arr];
      const j = i + dir;
      if (j < 0 || j >= next.length) return next;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  };
  const save = async () => {
    setSaving(true);
    await saveSetting("coin_listing_form_fields", { fields });
    setSaving(false);
    toast.success("Form fields saved");
  };

  if (loading) return <p className="text-muted-foreground text-sm py-6 text-center">Loading...</p>;

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Configure fields shown on the "List Coin" form. Field IDs <code className="text-casino-gold">project_name</code>,{" "}
        <code className="text-casino-gold">symbol</code>, <code className="text-casino-gold">email</code>, <code className="text-casino-gold">network</code>,{" "}
        <code className="text-casino-gold">contract_address</code>, <code className="text-casino-gold">website</code>,{" "}
        <code className="text-casino-gold">whitepaper_url</code>, <code className="text-casino-gold">description</code>,{" "}
        <code className="text-casino-gold">team_info</code>, <code className="text-casino-gold">social_links</code> are stored in dedicated columns. Other IDs go into extra data.
      </p>
      {fields.map((f, i) => (
        <div key={i} className="rounded-lg border border-border bg-card p-3 space-y-2">
          <div className="grid sm:grid-cols-3 gap-2">
            <div><Label className="text-xs">Field ID</Label><Input value={f.id} onChange={(e) => update(i, { id: e.target.value })} /></div>
            <div><Label className="text-xs">Label</Label><Input value={f.label} onChange={(e) => update(i, { label: e.target.value })} /></div>
            <div>
              <Label className="text-xs">Type</Label>
              <select value={f.type} onChange={(e) => update(i, { type: e.target.value as any })}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm">
                {FIELD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div><Label className="text-xs">Placeholder</Label><Input value={f.placeholder || ""} onChange={(e) => update(i, { placeholder: e.target.value })} /></div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm"><Switch checked={!!f.required} onCheckedChange={(v) => update(i, { required: v })} /> Required</label>
            <Button variant="outline" size="sm" onClick={() => move(i, -1)} disabled={i === 0}>↑</Button>
            <Button variant="outline" size="sm" onClick={() => move(i, 1)} disabled={i === fields.length - 1}>↓</Button>
            <Button variant="destructive" size="sm" onClick={() => remove(i)}><Trash2 className="h-3 w-3 mr-1" /> Remove</Button>
          </div>
        </div>
      ))}
      <div className="flex gap-2">
        <Button variant="outline" onClick={add}><Plus className="h-4 w-4 mr-1" /> Add Field</Button>
        <Button variant="gold" onClick={save} disabled={saving}><Save className="h-4 w-4 mr-1" /> {saving ? "Saving..." : "Save Changes"}</Button>
      </div>
    </div>
  );
}