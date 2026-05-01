import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ProfileAvatar } from "@/components/casino/ProfileAvatar";
import { toast } from "sonner";
import { MessageSquare, Plus, Pin, Lock, Clock, ArrowLeft, Send } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type Prefix = "tutorial" | "question" | "release" | "issue" | "discussion";

const PREFIX_META: Record<Prefix, { label: string; cls: string }> = {
  tutorial:   { label: "TUTORIAL",   cls: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" },
  question:   { label: "QUESTION",   cls: "bg-cyan-500/20 text-cyan-300 border-cyan-500/40" },
  release:    { label: "RELEASE",    cls: "bg-amber-500/20 text-amber-300 border-amber-500/40" },
  issue:      { label: "ISSUE",      cls: "bg-rose-500/20 text-rose-300 border-rose-500/40" },
  discussion: { label: "DISCUSSION", cls: "bg-purple-500/20 text-purple-300 border-purple-500/40" },
};

interface Thread {
  id: string;
  author_id: string;
  title: string;
  body: string;
  prefix: Prefix;
  is_pinned: boolean;
  is_locked: boolean;
  reply_count: number;
  last_activity_at: string;
  created_at: string;
}

interface Reply {
  id: string;
  thread_id: string;
  author_id: string;
  body: string;
  created_at: string;
}

interface Profile {
  user_id: string;
  username: string | null;
  avatar_url?: string | null;
  border_style?: string | null;
  has_animated_border?: boolean | null;
  has_animated_avatar?: boolean | null;
}

export default function Forum() {
  const { user } = useAuth();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [filter, setFilter] = useState<"all" | Prefix>("all");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<Thread | null>(null);

  // composer
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [prefix, setPrefix] = useState<Prefix>("discussion");
  const [posting, setPosting] = useState(false);

  const loadThreads = async () => {
    let q = supabase
      .from("forum_threads")
      .select("id,author_id,title,body,prefix,is_pinned,is_locked,reply_count,last_activity_at,created_at")
      .order("is_pinned", { ascending: false })
      .order("last_activity_at", { ascending: false })
      .limit(50);
    if (filter !== "all") q = q.eq("prefix", filter);
    const { data, error } = await q;
    if (error) { toast.error(error.message); return; }
    setThreads((data as Thread[]) || []);
    const ids = Array.from(new Set((data || []).map((t: any) => t.author_id)));
    if (ids.length) {
      const { data: profs } = await supabase
        .from("profiles_public" as any)
        .select("user_id, username, avatar_url, border_style, has_animated_border, has_animated_avatar")
        .in("user_id", ids) as { data: any[] | null };
      const map: Record<string, Profile> = {};
      (profs || []).forEach((p: any) => { map[p.user_id] = p; });
      setProfiles((prev) => ({ ...prev, ...map }));
    }
  };

  useEffect(() => { loadThreads(); /* eslint-disable-next-line */ }, [filter]);

  const submitThread = async () => {
    if (!user) { toast.error("Sign in required"); return; }
    if (!title.trim() || !body.trim()) { toast.error("Title and body are required"); return; }
    setPosting(true);
    const { error } = await supabase.from("forum_threads").insert({
      author_id: user.id, title: title.trim(), body: body.trim(), prefix,
    });
    setPosting(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Thread posted");
    setTitle(""); setBody(""); setPrefix("discussion"); setOpen(false);
    loadThreads();
  };

  if (active) {
    return <ThreadView thread={active} onBack={() => { setActive(null); loadThreads(); }} authorProfile={profiles[active.author_id]} />;
  }

  return (
    <div className="space-y-4">
      {/* header */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="font-display text-lg font-black flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-casino-gold" /> Forum
          </h2>
          <p className="text-xs text-muted-foreground">Share tutorials, ask questions, post releases & issues.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="gold" size="sm" disabled={!user}>
              <Plus className="h-4 w-4 mr-1" /> New Thread
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Create Thread</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {(Object.keys(PREFIX_META) as Prefix[]).map((p) => (
                  <button key={p} type="button" onClick={() => setPrefix(p)}
                    className={`text-[10px] font-bold px-2 py-1 rounded-md border transition ${prefix === p ? PREFIX_META[p].cls : "bg-secondary text-muted-foreground border-border"}`}>
                    {PREFIX_META[p].label}
                  </button>
                ))}
              </div>
              <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={140} />
              <Textarea placeholder="Write your post..." value={body} onChange={(e) => setBody(e.target.value)} rows={6} maxLength={5000} />
              <Button variant="gold" className="w-full" onClick={submitThread} disabled={posting}>
                {posting ? "Posting..." : "Post Thread"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* filters */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {(["all", ...Object.keys(PREFIX_META)] as ("all" | Prefix)[]).map((p) => (
          <button key={p} onClick={() => setFilter(p)}
            className={`shrink-0 text-[10px] font-bold px-3 py-1.5 rounded-full border transition ${
              filter === p
                ? "bg-casino-gold text-accent-foreground border-casino-gold"
                : "bg-secondary text-muted-foreground border-border"
            }`}>
            {p === "all" ? "ALL" : PREFIX_META[p as Prefix].label}
          </button>
        ))}
      </div>

      {/* list */}
      <div className="space-y-2">
        {threads.length === 0 && (
          <p className="text-center text-muted-foreground py-10">No threads yet — be the first to post.</p>
        )}
        {threads.map((t) => {
          const prof = profiles[t.author_id];
          return (
            <button key={t.id} onClick={() => setActive(t)}
              className="w-full text-left rounded-xl border border-border bg-card hover:border-casino-gold/50 transition p-4 group">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${PREFIX_META[t.prefix].cls}`}>
                  {PREFIX_META[t.prefix].label}
                </span>
                {t.is_pinned && <Pin className="h-3 w-3 text-casino-gold" />}
                {t.is_locked && <Lock className="h-3 w-3 text-muted-foreground" />}
                <span className="ml-auto text-[10px] text-muted-foreground inline-flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDistanceToNow(new Date(t.last_activity_at), { addSuffix: true })}
                </span>
              </div>
              <h3 className="font-display font-bold text-base group-hover:text-casino-gold transition line-clamp-1">
                {t.title}
              </h3>
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-2 min-w-0">
                  <ProfileAvatar avatarUrl={prof?.avatar_url} username={prof?.username} borderStyle={prof?.border_style}
                    hasAnimatedBorder={prof?.has_animated_border} hasAnimatedAvatar={prof?.has_animated_avatar} size="sm" />
                  <span className="text-xs text-muted-foreground truncate">{prof?.username || "Unknown"}</span>
                </div>
                <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                  <MessageSquare className="h-3 w-3" /> {t.reply_count}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ThreadView({ thread, authorProfile, onBack }: { thread: Thread; authorProfile?: Profile; onBack: () => void }) {
  const { user } = useAuth();
  const [replies, setReplies] = useState<Reply[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>(authorProfile ? { [authorProfile.user_id]: authorProfile } : {});
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from("forum_replies")
      .select("id,thread_id,author_id,body,created_at")
      .eq("thread_id", thread.id)
      .order("created_at", { ascending: true });
    setReplies((data as Reply[]) || []);
    const ids = Array.from(new Set([thread.author_id, ...((data || []).map((r: any) => r.author_id))]));
    const { data: profs } = await supabase
      .from("profiles_public" as any)
      .select("user_id, username, avatar_url, border_style, has_animated_border, has_animated_avatar")
      .in("user_id", ids) as { data: any[] | null };
    const map: Record<string, Profile> = {};
    (profs || []).forEach((p: any) => { map[p.user_id] = p; });
    setProfiles(map);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [thread.id]);

  const send = async () => {
    if (!user) { toast.error("Sign in required"); return; }
    if (!text.trim()) return;
    if (thread.is_locked) { toast.error("Thread is locked"); return; }
    setSending(true);
    const { error } = await supabase.from("forum_replies").insert({
      thread_id: thread.id, author_id: user.id, body: text.trim(),
    });
    setSending(false);
    if (error) { toast.error(error.message); return; }
    setText(""); load();
  };

  const author = profiles[thread.author_id];
  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft className="h-4 w-4 mr-1" /> Back to forum</Button>
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${PREFIX_META[thread.prefix].cls}`}>
            {PREFIX_META[thread.prefix].label}
          </span>
          {thread.is_pinned && <Pin className="h-3 w-3 text-casino-gold" />}
          {thread.is_locked && <Lock className="h-3 w-3 text-muted-foreground" />}
        </div>
        <h1 className="font-display font-black text-xl">{thread.title}</h1>
        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
          <ProfileAvatar avatarUrl={author?.avatar_url} username={author?.username} borderStyle={author?.border_style}
            hasAnimatedBorder={author?.has_animated_border} hasAnimatedAvatar={author?.has_animated_avatar} size="sm" />
          <span>{author?.username || "Unknown"}</span>
          <span>•</span>
          <span>{formatDistanceToNow(new Date(thread.created_at), { addSuffix: true })}</span>
        </div>
        <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed">{thread.body}</p>
      </div>

      <div className="space-y-2">
        {replies.map((r) => {
          const p = profiles[r.author_id];
          return (
            <div key={r.id} className="rounded-xl border border-border bg-card/60 p-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <ProfileAvatar avatarUrl={p?.avatar_url} username={p?.username} borderStyle={p?.border_style}
                  hasAnimatedBorder={p?.has_animated_border} hasAnimatedAvatar={p?.has_animated_avatar} size="sm" />
                <span className="font-bold text-foreground">{p?.username || "Unknown"}</span>
                <span>•</span>
                <span>{formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}</span>
              </div>
              <p className="text-sm whitespace-pre-wrap">{r.body}</p>
            </div>
          );
        })}
        {replies.length === 0 && <p className="text-center text-xs text-muted-foreground py-4">No replies yet.</p>}
      </div>

      {!thread.is_locked && (
        <div className="flex gap-2">
          <Textarea placeholder="Write a reply..." value={text} onChange={(e) => setText(e.target.value)} rows={2} maxLength={3000} />
          <Button variant="gold" onClick={send} disabled={sending || !text.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}