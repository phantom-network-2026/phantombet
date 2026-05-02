import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Header } from "@/components/casino/Header";
import { BottomNav } from "@/components/casino/BottomNav";
import { AuthGuard } from "@/components/casino/AuthGuard";
import { Shield, ShieldCheck, Truck, PackageCheck, AlertTriangle, Plus, Image as ImageIcon, Camera, Video, Hash, Loader2, Lock } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import escrowBanner from "@/assets/escrow-banner.jpg";

type Deal = {
  id: string;
  sender_id: string;
  receiver_id: string;
  sender_username: string;
  receiver_username: string;
  title: string;
  description: string;
  amount_usdt: number;
  fee_amount: number;
  total_locked: number;
  payout_amount: number;
  tracking_number: string | null;
  tracking_carrier: string | null;
  status: string;
  delivered_at: string | null;
  auto_release_at: string | null;
  resolved_at: string | null;
  created_at: string;
};

type Proof = {
  id: string;
  deal_id: string;
  uploaded_by: string;
  kind: string;
  file_path: string | null;
  text_value: string | null;
  caption: string | null;
  created_at: string;
};

type EventRow = {
  id: string; deal_id: string; actor_id: string | null; event_type: string; detail: string | null; created_at: string;
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-500/20 text-yellow-400 border-yellow-400/40",
  accepted: "bg-blue-500/20 text-blue-400 border-blue-400/40",
  shipped: "bg-purple-500/20 text-purple-300 border-purple-400/40",
  delivered: "bg-cyan-500/20 text-cyan-300 border-cyan-400/40",
  disputed: "bg-red-500/20 text-red-400 border-red-400/40",
  released: "bg-green-500/20 text-green-400 border-green-400/40",
  refunded: "bg-orange-500/20 text-orange-400 border-orange-400/40",
  cancelled: "bg-muted text-muted-foreground border-border",
  expired: "bg-muted text-muted-foreground border-border",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold uppercase tracking-wider ${STATUS_COLORS[status] || "bg-muted text-muted-foreground border-border"}`}>
      {status}
    </span>
  );
}

async function callAction(payload: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("escrow-action", { body: payload });
  if (error) throw new Error(error.message || "Action failed");
  if ((data as any)?.error) throw new Error((data as any).error);
  return data;
}

async function uploadProofFile(dealId: string, userId: string, file: File): Promise<string> {
  const ext = file.name.split(".").pop() || "bin";
  const path = `${dealId}/${userId}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("escrow-proofs").upload(path, file, { upsert: false });
  if (error) throw new Error(error.message);
  return path;
}

async function signedUrl(path: string): Promise<string | null> {
  const { data } = await supabase.storage.from("escrow-proofs").createSignedUrl(path, 3600);
  return data?.signedUrl || null;
}

function CreateDealDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [receiver, setReceiver] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  const fee = useMemo(() => {
    const a = Number(amount);
    return Number.isFinite(a) && a > 0 ? +(a * 0.1).toFixed(2) : 0;
  }, [amount]);
  const total = Number(amount || 0) + fee;

  const submit = async () => {
    if (!receiver.trim() || !title.trim() || !description.trim() || !amount) {
      toast.error("Fill in all fields");
      return;
    }
    setLoading(true);
    try {
      await callAction({
        action: "create",
        receiver_username: receiver.trim(),
        title: title.trim(),
        description: description.trim(),
        amount_usdt: Number(amount),
      });
      toast.success("Escrow deal created and funds locked");
      setOpen(false);
      setReceiver(""); setTitle(""); setDescription(""); setAmount("");
      onCreated();
    } catch (e: any) {
      toast.error(e.message);
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="gold" className="shrink-0">
          <Plus className="w-4 h-4 mr-1" /> New Deal
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-casino-gold" /> New Escrow Deal</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Receiver username (seller)</Label>
            <Input value={receiver} onChange={(e) => setReceiver(e.target.value)} placeholder="e.g. NeonHawk" />
          </div>
          <div>
            <Label>Item / service title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Vintage GPU" maxLength={100} />
          </div>
          <div>
            <Label>Description (what is being delivered)</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Be specific. Condition, quantity, expected delivery method." maxLength={1000} />
          </div>
          <div>
            <Label>Amount (USDT)</Label>
            <Input type="number" min="1" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="100.00" />
          </div>
          <div className="rounded-lg border border-casino-gold/30 bg-casino-gold/5 p-3 text-xs space-y-1">
            <div className="flex justify-between"><span>Item amount</span><span>{Number(amount || 0).toFixed(2)} USDT</span></div>
            <div className="flex justify-between"><span>Platform fee (10%)</span><span>{fee.toFixed(2)} USDT</span></div>
            <div className="flex justify-between font-bold text-casino-gold"><span>Total locked from your USDT</span><span>{total.toFixed(2)} USDT</span></div>
          </div>
          <p className="text-[11px] text-muted-foreground">Funds are deducted from your real USDT balance and held until the deal completes. The seller receives the item amount; the 10% fee is the platform fee.</p>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="gold" onClick={submit} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Lock Funds & Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ProofRow({ proof }: { proof: Proof }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (proof.file_path) signedUrl(proof.file_path).then(setUrl);
  }, [proof.file_path]);

  const Icon = proof.kind === "delivery_video" ? Video : proof.kind === "tracking" ? Hash : proof.kind === "postage" ? Truck : ImageIcon;
  const isVideo = proof.kind === "delivery_video" || (proof.file_path?.match(/\.(mp4|webm|mov)$/i));

  return (
    <div className="rounded-lg border border-border bg-card/50 p-3 space-y-2">
      <div className="flex items-center gap-2 text-xs">
        <Icon className="w-3.5 h-3.5 text-casino-gold" />
        <span className="font-bold uppercase tracking-wider">{proof.kind.replace("_", " ")}</span>
        <span className="text-muted-foreground">· {formatDistanceToNow(new Date(proof.created_at), { addSuffix: true })}</span>
      </div>
      {proof.text_value && <div className="text-sm font-mono break-all">{proof.text_value}</div>}
      {proof.caption && <div className="text-xs text-muted-foreground">{proof.caption}</div>}
      {url && !isVideo && (
        <a href={url} target="_blank" rel="noreferrer" className="block">
          <img src={url} alt={proof.kind} className="rounded-lg max-h-64 w-auto border border-border" />
        </a>
      )}
      {url && isVideo && (
        <video src={url} controls className="rounded-lg max-h-64 w-full border border-border" />
      )}
    </div>
  );
}

function ProofUploader({ deal, kind, label, accept, onUploaded }: { deal: Deal; kind: string; label: string; accept: string; onUploaded: () => void }) {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [tracking, setTracking] = useState("");
  const [carrier, setCarrier] = useState("");
  const [loading, setLoading] = useState(false);

  const isShip = kind === "mark_shipped";
  const isDeliver = kind === "mark_delivered";

  const submit = async () => {
    if (!user) return;
    setLoading(true);
    try {
      let proofPath: string | undefined;
      if (file) {
        proofPath = await uploadProofFile(deal.id, user.id, file);
      }
      if (isShip) {
        if (!tracking && !proofPath) { toast.error("Provide tracking or upload postage proof"); setLoading(false); return; }
        await callAction({ action: "mark_shipped", deal_id: deal.id, tracking_number: tracking || undefined, tracking_carrier: carrier || undefined, proof_file_path: proofPath, proof_caption: caption || undefined });
      } else if (isDeliver) {
        if (!proofPath) { toast.error("Photo or video proof of delivery is required"); setLoading(false); return; }
        const proofKind = file?.type.startsWith("video/") ? "delivery_video" : "delivery_photo";
        await callAction({ action: "mark_delivered", deal_id: deal.id, proof_file_path: proofPath, proof_kind: proofKind, proof_caption: caption || undefined });
      } else {
        await callAction({ action: "upload_proof", deal_id: deal.id, proof_file_path: proofPath, proof_kind: "other", proof_caption: caption || undefined });
      }
      toast.success("Proof submitted");
      setFile(null); setCaption(""); setTracking(""); setCarrier("");
      onUploaded();
    } catch (e: any) {
      toast.error(e.message);
    }
    setLoading(false);
  };

  return (
    <div className="rounded-lg border border-casino-gold/30 bg-casino-gold/5 p-3 space-y-2">
      <div className="text-sm font-bold text-casino-gold">{label}</div>
      {isShip && (
        <div className="grid grid-cols-2 gap-2">
          <Input placeholder="Tracking #" value={tracking} onChange={(e) => setTracking(e.target.value)} />
          <Input placeholder="Carrier (Royal Mail, UPS...)" value={carrier} onChange={(e) => setCarrier(e.target.value)} />
        </div>
      )}
      <Input type="file" accept={accept} onChange={(e) => setFile(e.target.files?.[0] || null)} />
      <Input placeholder="Optional caption" value={caption} onChange={(e) => setCaption(e.target.value)} />
      <Button variant="gold" size="sm" onClick={submit} disabled={loading} className="w-full">
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit"}
      </Button>
    </div>
  );
}

function DisputeDialog({ dealId, onResolved }: { dealId: string; onResolved: () => void }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const submit = async () => {
    setLoading(true);
    try {
      await callAction({ action: "dispute", deal_id: dealId, reason });
      toast.success("Dispute opened — staff will review");
      setOpen(false); setReason("");
      onResolved();
    } catch (e: any) { toast.error(e.message); }
    setLoading(false);
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm"><AlertTriangle className="w-3.5 h-3.5 mr-1" /> Open Dispute</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Open Dispute</DialogTitle></DialogHeader>
        <Textarea placeholder="Explain what's wrong (be specific — staff will review proofs)" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={1000} />
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="destructive" onClick={submit} disabled={loading}>{loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Open Dispute"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DealDetail({ deal, onBack, onChange }: { deal: Deal; onBack: () => void; onChange: () => void }) {
  const { user } = useAuth();
  const [proofs, setProofs] = useState<Proof[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [busy, setBusy] = useState(false);

  const isSender = user?.id === deal.sender_id;
  const isReceiver = user?.id === deal.receiver_id;

  const reload = async () => {
    const [{ data: p }, { data: e }] = await Promise.all([
      supabase.from("escrow_proofs").select("id, deal_id, uploaded_by, kind, file_path, text_value, caption, created_at").eq("deal_id", deal.id).order("created_at", { ascending: false }),
      supabase.from("escrow_events").select("id, deal_id, actor_id, event_type, detail, created_at").eq("deal_id", deal.id).order("created_at", { ascending: true }),
    ]);
    setProofs((p as any) || []);
    setEvents((e as any) || []);
  };
  useEffect(() => { reload(); }, [deal.id]);

  const doAction = async (action: string, extra: Record<string, unknown> = {}) => {
    setBusy(true);
    try {
      await callAction({ action, deal_id: deal.id, ...extra });
      toast.success("Done");
      onChange();
      reload();
    } catch (e: any) { toast.error(e.message); }
    setBusy(false);
  };

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="text-xs text-muted-foreground hover:text-foreground">← Back to deals</button>

      <div className="rounded-2xl border border-casino-gold/30 bg-card/60 backdrop-blur p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="font-display font-black text-xl">{deal.title}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isSender ? `You → @${deal.receiver_username}` : `@${deal.sender_username} → You`}
            </p>
          </div>
          <StatusBadge status={deal.status} />
        </div>
        <p className="text-sm text-foreground/80 whitespace-pre-wrap">{deal.description}</p>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="rounded-lg bg-secondary/40 p-2">
            <div className="text-muted-foreground">Amount</div>
            <div className="font-bold text-casino-gold">{Number(deal.amount_usdt).toFixed(2)} USDT</div>
          </div>
          <div className="rounded-lg bg-secondary/40 p-2">
            <div className="text-muted-foreground">Fee (10%)</div>
            <div className="font-bold">{Number(deal.fee_amount).toFixed(2)} USDT</div>
          </div>
          <div className="rounded-lg bg-secondary/40 p-2">
            <div className="text-muted-foreground">Locked</div>
            <div className="font-bold">{Number(deal.total_locked).toFixed(2)} USDT</div>
          </div>
        </div>
        {deal.tracking_number && (
          <div className="text-xs text-muted-foreground">Tracking: <span className="font-mono text-foreground">{deal.tracking_number}</span> {deal.tracking_carrier && `· ${deal.tracking_carrier}`}</div>
        )}
        {deal.status === "delivered" && deal.auto_release_at && (
          <div className="text-xs text-cyan-300">⏱ Auto-release {formatDistanceToNow(new Date(deal.auto_release_at), { addSuffix: true })}</div>
        )}
      </div>

      {/* Action panel */}
      <div className="grid sm:grid-cols-2 gap-3">
        {/* Receiver actions */}
        {isReceiver && deal.status === "pending" && (
          <Button variant="gold" disabled={busy} onClick={() => doAction("accept")}>Accept Deal</Button>
        )}
        {isReceiver && deal.status === "pending" && (
          <Button variant="destructive" disabled={busy} onClick={() => doAction("cancel", { reason: "Receiver declined" })}>Decline</Button>
        )}
        {isReceiver && deal.status === "accepted" && (
          <ProofUploader deal={deal} kind="mark_shipped" label="📮 Mark Shipped (proof of postage or tracking #)" accept="image/*,application/pdf" onUploaded={() => { onChange(); reload(); }} />
        )}
        {isReceiver && (deal.status === "shipped" || deal.status === "accepted") && (
          <ProofUploader deal={deal} kind="mark_delivered" label="📦 Mark Delivered (photo or video required)" accept="image/*,video/*" onUploaded={() => { onChange(); reload(); }} />
        )}

        {/* Sender actions */}
        {isSender && deal.status === "pending" && (
          <Button variant="destructive" disabled={busy} onClick={() => doAction("cancel", { reason: "Sender cancelled" })}>Cancel (full refund)</Button>
        )}
        {isSender && deal.status === "accepted" && (
          <Button variant="destructive" disabled={busy} onClick={() => doAction("cancel", { reason: "Sender cancelled" })}>Cancel (full refund)</Button>
        )}
        {isSender && (deal.status === "shipped" || deal.status === "delivered") && (
          <Button variant="gold" disabled={busy} onClick={() => doAction("confirm_received")}><PackageCheck className="w-4 h-4 mr-1" /> Confirm received & release</Button>
        )}

        {/* Disputes (any party, while in flight) */}
        {(isSender || isReceiver) && ["accepted","shipped","delivered"].includes(deal.status) && (
          <DisputeDialog dealId={deal.id} onResolved={() => { onChange(); reload(); }} />
        )}

        {/* Optional extra proof upload */}
        {(isSender || isReceiver) && ["accepted","shipped","delivered","disputed"].includes(deal.status) && (
          <ProofUploader deal={deal} kind="upload_proof" label="📎 Upload extra proof / evidence" accept="image/*,video/*,application/pdf" onUploaded={() => { onChange(); reload(); }} />
        )}
      </div>

      {/* Proofs */}
      <div className="space-y-2">
        <h3 className="font-display font-bold text-sm uppercase tracking-wider text-muted-foreground">Proofs</h3>
        {proofs.length === 0 && <p className="text-xs text-muted-foreground">No proofs uploaded yet.</p>}
        <div className="grid sm:grid-cols-2 gap-3">
          {proofs.map((p) => <ProofRow key={p.id} proof={p} />)}
        </div>
      </div>

      {/* Timeline */}
      <div className="space-y-2">
        <h3 className="font-display font-bold text-sm uppercase tracking-wider text-muted-foreground">Timeline</h3>
        <div className="space-y-1">
          {events.map((e) => (
            <div key={e.id} className="text-xs flex items-center gap-2">
              <span className="text-casino-gold font-bold uppercase">{e.event_type.replace(/_/g, " ")}</span>
              {e.detail && <span className="text-foreground/80">· {e.detail}</span>}
              <span className="text-muted-foreground ml-auto">{formatDistanceToNow(new Date(e.created_at), { addSuffix: true })}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DealList({ deals, onSelect }: { deals: Deal[]; onSelect: (d: Deal) => void }) {
  if (deals.length === 0) return <p className="text-center text-sm text-muted-foreground py-8">No deals here yet.</p>;
  return (
    <div className="space-y-2">
      {deals.map((d) => (
        <button key={d.id} onClick={() => onSelect(d)} className="w-full text-left rounded-xl border border-border bg-card/50 hover:border-casino-gold/50 transition p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="font-bold text-sm truncate">{d.title}</div>
              <div className="text-[11px] text-muted-foreground">@{d.sender_username} → @{d.receiver_username}</div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-sm font-bold text-casino-gold">{Number(d.amount_usdt).toFixed(2)} USDT</div>
              <StatusBadge status={d.status} />
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

function EscrowInner() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [selected, setSelected] = useState<Deal | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("escrow_deals")
      .select("id, sender_id, receiver_id, sender_username, receiver_username, title, description, amount_usdt, fee_amount, total_locked, payout_amount, tracking_number, tracking_carrier, status, delivered_at, auto_release_at, resolved_at, created_at")
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order("created_at", { ascending: false });
    setDeals((data as any) || []);
    if (selected) {
      const fresh = (data as any[] | null)?.find((d) => d.id === selected.id);
      if (fresh) setSelected(fresh);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [user?.id]);

  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`escrow-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "escrow_deals" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id]);

  const incoming = deals.filter((d) => d.receiver_id === user?.id);
  const outgoing = deals.filter((d) => d.sender_id === user?.id);
  const active = deals.filter((d) => !["released","refunded","cancelled","expired"].includes(d.status));
  const closed = deals.filter((d) => ["released","refunded","cancelled","expired"].includes(d.status));

  return (
    <div className="min-h-screen gradient-casino-bg pb-24">
      <Header />
      <div className="container max-w-3xl py-4 space-y-4 px-3">
        <div className="rounded-2xl border border-casino-gold/40 bg-gradient-to-br from-casino-gold/10 to-primary/10 p-4">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-casino-gold/20 border border-casino-gold/40 flex items-center justify-center text-casino-gold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="font-display text-xl font-black">Phantom Escrow</h1>
              <p className="text-xs text-muted-foreground">Safe peer-to-peer trading in USDT. Funds are locked until both sides are happy. 10% platform fee.</p>
            </div>
            <CreateDealDialog onCreated={load} />
          </div>
        </div>

        {selected ? (
          <DealDetail deal={selected} onBack={() => setSelected(null)} onChange={load} />
        ) : loading ? (
          <div className="text-center text-sm text-muted-foreground py-8">Loading…</div>
        ) : (
          <Tabs defaultValue="active">
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="active">Active ({active.length})</TabsTrigger>
              <TabsTrigger value="incoming">Incoming ({incoming.length})</TabsTrigger>
              <TabsTrigger value="outgoing">Outgoing ({outgoing.length})</TabsTrigger>
              <TabsTrigger value="closed">Closed ({closed.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="active" className="mt-3"><DealList deals={active} onSelect={setSelected} /></TabsContent>
            <TabsContent value="incoming" className="mt-3"><DealList deals={incoming} onSelect={setSelected} /></TabsContent>
            <TabsContent value="outgoing" className="mt-3"><DealList deals={outgoing} onSelect={setSelected} /></TabsContent>
            <TabsContent value="closed" className="mt-3"><DealList deals={closed} onSelect={setSelected} /></TabsContent>
          </Tabs>
        )}

        <div className="rounded-xl border border-border bg-card/40 p-3 text-[11px] text-muted-foreground space-y-1">
          <div className="flex items-center gap-1 font-bold text-foreground"><Lock className="w-3 h-3" /> How it works</div>
          <p>1. Buyer creates a deal → 10% fee + amount is locked from their USDT balance.</p>
          <p>2. Seller accepts and ships → uploads <strong>proof of postage</strong> or a <strong>tracking number</strong>.</p>
          <p>3. On delivery, the seller uploads a <strong>photo or video</strong> proof. A 7-day auto-release timer starts.</p>
          <p>4. Buyer can confirm early, or open a dispute. Disputes are reviewed by Phantom staff.</p>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}

export default function Escrow() {
  return (
    <AuthGuard>
      <EscrowInner />
    </AuthGuard>
  );
}