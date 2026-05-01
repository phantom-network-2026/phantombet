import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ProfileAvatar } from "@/components/casino/ProfileAvatar";
import { toast } from "sonner";
import { MessageSquare, Plus, Pin, Lock, Clock, ArrowLeft, Send, Search, Eye, Heart, Flame, TrendingUp, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type Prefix =
  | "tutorial" | "question" | "release" | "issue" | "discussion"
  | "announcement" | "guide" | "trade" | "offtopic" | "strategy" | "news";

const PREFIX_META: Record<Prefix, { label: string; cls: string }> = {
  announcement: { label: "ANNOUNCE",   cls: "bg-casino-gold/20 text-casino-gold border-casino-gold/50" },
  guide:        { label: "GUIDE",      cls: "bg-blue-500/20 text-blue-300 border-blue-500/40" },
  tutorial:     { label: "TUTORIAL",   cls: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" },
  question:     { label: "QUESTION",   cls: "bg-cyan-500/20 text-cyan-300 border-cyan-500/40" },
  release:      { label: "RELEASE",    cls: "bg-amber-500/20 text-amber-300 border-amber-500/40" },
  issue:        { label: "ISSUE",      cls: "bg-rose-500/20 text-rose-300 border-rose-500/40" },
  strategy:     { label: "STRATEGY",   cls: "bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/40" },
  trade:        { label: "TRADE",      cls: "bg-lime-500/20 text-lime-300 border-lime-500/40" },
  news:         { label: "NEWS",       cls: "bg-orange-500/20 text-orange-300 border-orange-500/40" },
  discussion:   { label: "DISCUSSION", cls: "bg-purple-500/20 text-purple-300 border-purple-500/40" },
  offtopic:     { label: "OFF-TOPIC",  cls: "bg-zinc-500/20 text-zinc-300 border-zinc-500/40" },
};

const PREFIX_ORDER: Prefix[] = [
  "announcement","guide","tutorial","question","release","issue","strategy","trade","news","discussion","offtopic"
];

type SortMode = "recent" | "top" | "hot";

interface Thread {
  id: string;
  author_id: string;
  title: string;
  body: string;
  prefix: Prefix;
  is_pinned: boolean;
  is_locked: boolean;
  reply_count: number;
  view_count: number;
  like_count: number;
  last_activity_at: string;
  created_at: string;
}

interface Reply {
  id: string;
  thread_id: string;
  author_id: string;
  body: string;
  created_at: string;
  like_count: number;
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
  const [sort, setSort] = useState<SortMode>("recent");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<Thread | null>(null);
  const [likedThreads, setLikedThreads] = useState<Set<string>>(new Set());

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [prefix, setPrefix] = useState<Prefix>("discussion");
  const [posting, setPosting] = useState(false);

  const loadThreads = async () => {
    let q = supabase
      .from("forum_threads")
      .select("id,author_id,title,body,prefix,is_pinned,is_locked,reply_count,view_count,like_count,last_activity_at,created_at")
      .order("is_pinned", { ascending: false });

    if (sort === "recent") q = q.order("last_activity_at", { ascending: false });
    else if (sort === "top") q = q.order("like_count", { ascending: false }).order("view_count", { ascending: false });
    else q = q.order("reply_count", { ascending: false }).order("last_activity_at", { ascending: false });

    q = q.limit(80);
    if (filter !== "all") q = q.eq("prefix", filter);
    if (search.trim()) q = q.ilike("title", `%${search.trim()}%`);

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

    if (user && (data || []).length) {
      const { data: likes } = await supabase
        .from("forum_likes")
        .select("thread_id")
        .eq("user_id", user.id)
        .in("thread_id", (data as any[]).map((t) => t.id));
      setLikedThreads(new Set((likes || []).map((l: any) => l.thread_id)));
    }
  };

  useEffect(() => { loadThreads(); /* eslint-disable-next-line */ }, [filter, sort, search]);

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

  const toggleLike = async (threadId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) { toast.error("Sign in to like"); return; }
    const liked = likedThreads.has(threadId);
    if (liked) {
      await supabase.from("forum_likes").delete()
        .eq("user_id", user.id).eq("thread_id", threadId);
      setLikedThreads((s) => { const n = new Set(s); n.delete(threadId); return n; });
      setThreads((ts) => ts.map((t) => t.id === threadId ? { ...t, like_count: Math.max(0, t.like_count - 1) } : t));
    } else {
      const { error } = await supabase.from("forum_likes").insert({
        user_id: user.id, thread_id: threadId,
      });
      if (error) return;
      setLikedThreads((s) => new Set(s).add(threadId));
      setThreads((ts) => ts.map((t) => t.id === threadId ? { ...t, like_count: t.like_count + 1 } : t));
    }
  };

  const openThread = async (t: Thread) => {
    setActive(t);
    // fire and forget view increment
    supabase.rpc("forum_increment_view" as any, { p_thread_id: t.id });
  };

  if (active) {
    return <ThreadView thread={active} onBack={() => { setActive(null); loadThreads(); }} authorProfile={profiles[active.author_id]} />;
  }

  return (
    <div className="space-y-3">
      {/* header + new thread */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="font-display text-lg font-black flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-casino-gold" /> Forum
          </h2>
          <p className="text-[11px] text-muted-foreground">Tutorials • guides • releases • trades • announcements & more.</p>
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
              <div className="flex flex-wrap gap-1.5">
                {PREFIX_ORDER.map((p) => (
                  <button key={p} type="button" onClick={() => setPrefix(p)}
                    className={`text-[10px] font-bold px-2 py-1 rounded-md border transition ${prefix === p ? PREFIX_META[p].cls : "bg-secondary text-muted-foreground border-border"}`}>
                    {PREFIX_META[p].label}
                  </button>
                ))}
              </div>
              <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={140} />
              <Textarea placeholder="Write your post... (markdown-friendly)" value={body} onChange={(e) => setBody(e.target.value)} rows={6} maxLength={5000} />
              <Button variant="gold" className="w-full" onClick={submitThread} disabled={posting}>
                {posting ? "Posting..." : "Post Thread"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* search + sort */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Search threads..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9 bg-secondary/60 border-border text-xs" />
        </div>
        <div className="flex rounded-md border border-border overflow-hidden">
          {([
            { id: "recent", icon: Clock, label: "New" },
            { id: "top",    icon: Heart, label: "Top" },
            { id: "hot",    icon: Flame, label: "Hot" },
          ] as { id: SortMode; icon: any; label: string }[]).map((s) => (
            <button key={s.id} onClick={() => setSort(s.id)}
              className={`px-2.5 h-9 text-[10px] font-bold inline-flex items-center gap-1 transition ${
                sort === s.id ? "bg-casino-gold text-accent-foreground" : "bg-secondary/60 text-muted-foreground hover:text-foreground"
              }`}>
              <s.icon className="h-3 w-3" /> {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* prefix filter chips */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {(["all", ...PREFIX_ORDER] as ("all" | Prefix)[]).map((p) => (
          <button key={p} onClick={() => setFilter(p)}
            className={`shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-full border transition ${
              filter === p
                ? "bg-casino-gold text-accent-foreground border-casino-gold"
                : "bg-secondary text-muted-foreground border-border hover:border-casino-gold/40"
            }`}>
            {p === "all" ? "ALL" : PREFIX_META[p as Prefix].label}
          </button>
        ))}
      </div>

      {/* list */}
      <div className="space-y-2">
        {threads.length === 0 && (
          <p className="text-center text-muted-foreground py-10">No threads found — be the first to post.</p>
        )}
        {threads.map((t) => {
          const prof = profiles[t.author_id];
          const liked = likedThreads.has(t.id);
          return (
            <button key={t.id} onClick={() => openThread(t)}
              className="w-full text-left rounded-xl border border-border bg-card hover:border-casino-gold/50 transition p-3 group">
              <div className="flex items-center gap-1.5 flex-wrap mb-1">
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
              <h3 className="font-display font-bold text-sm group-hover:text-casino-gold transition line-clamp-1">
                {t.title}
              </h3>
              <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">{t.body}</p>
              <div className="flex items-center justify-between mt-2 gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <ProfileAvatar avatarUrl={prof?.avatar_url} username={prof?.username} borderStyle={prof?.border_style}
                    hasAnimatedBorder={prof?.has_animated_border} hasAnimatedAvatar={prof?.has_animated_avatar} size="sm" />
                  <span className="text-[11px] text-muted-foreground truncate">{prof?.username || "Unknown"}</span>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-muted-foreground shrink-0">
                  <span className="inline-flex items-center gap-1"><Eye className="h-3 w-3" />{t.view_count}</span>
                  <span className="inline-flex items-center gap-1"><MessageSquare className="h-3 w-3" />{t.reply_count}</span>
                  <span
                    role="button"
                    onClick={(e) => toggleLike(t.id, e)}
                    className={`inline-flex items-center gap-1 transition ${liked ? "text-casino-pink" : "hover:text-casino-pink"}`}
                  >
                    <Heart className={`h-3 w-3 ${liked ? "fill-casino-pink" : ""}`} />{t.like_count}
                  </span>
                </div>
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
  const [likedReplies, setLikedReplies] = useState<Set<string>>(new Set());
  const [threadLiked, setThreadLiked] = useState(false);
  const [threadLikes, setThreadLikes] = useState(thread.like_count);

  const load = async () => {
    const { data } = await supabase
      .from("forum_replies")
      .select("id,thread_id,author_id,body,created_at,like_count")
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

    if (user) {
      const replyIds = (data || []).map((r: any) => r.id);
      const [{ data: rl }, { data: tl }] = await Promise.all([
        replyIds.length
          ? supabase.from("forum_likes").select("reply_id").eq("user_id", user.id).in("reply_id", replyIds)
          : Promise.resolve({ data: [] as any[] }) as any,
        supabase.from("forum_likes").select("id").eq("user_id", user.id).eq("thread_id", thread.id).maybeSingle(),
      ]);
      setLikedReplies(new Set((rl || []).map((x: any) => x.reply_id)));
      setThreadLiked(!!tl);
    }
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

  const toggleThreadLike = async () => {
    if (!user) return;
    if (threadLiked) {
      await supabase.from("forum_likes").delete().eq("user_id", user.id).eq("thread_id", thread.id);
      setThreadLiked(false); setThreadLikes((n) => Math.max(0, n - 1));
    } else {
      const { error } = await supabase.from("forum_likes").insert({ user_id: user.id, thread_id: thread.id });
      if (error) return;
      setThreadLiked(true); setThreadLikes((n) => n + 1);
    }
  };

  const toggleReplyLike = async (replyId: string) => {
    if (!user) return;
    const liked = likedReplies.has(replyId);
    if (liked) {
      await supabase.from("forum_likes").delete().eq("user_id", user.id).eq("reply_id", replyId);
      setLikedReplies((s) => { const n = new Set(s); n.delete(replyId); return n; });
      setReplies((rs) => rs.map((r) => r.id === replyId ? { ...r, like_count: Math.max(0, r.like_count - 1) } : r));
    } else {
      const { error } = await supabase.from("forum_likes").insert({ user_id: user.id, reply_id: replyId });
      if (error) return;
      setLikedReplies((s) => new Set(s).add(replyId));
      setReplies((rs) => rs.map((r) => r.id === replyId ? { ...r, like_count: r.like_count + 1 } : r));
    }
  };

  const deleteReply = async (replyId: string) => {
    const { error } = await supabase.from("forum_replies").delete().eq("id", replyId);
    if (error) { toast.error(error.message); return; }
    load();
  };

  const author = profiles[thread.author_id];
  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft className="h-4 w-4 mr-1" /> Back to forum</Button>
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${PREFIX_META[thread.prefix].cls}`}>
            {PREFIX_META[thread.prefix].label}
          </span>
          {thread.is_pinned && <Pin className="h-3 w-3 text-casino-gold" />}
          {thread.is_locked && <Lock className="h-3 w-3 text-muted-foreground" />}
          <span className="ml-auto inline-flex items-center gap-3 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1"><Eye className="h-3 w-3" />{thread.view_count}</span>
            <span className="inline-flex items-center gap-1"><TrendingUp className="h-3 w-3" />{thread.reply_count}</span>
          </span>
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
        <div className="mt-3 pt-3 border-t border-border/50 flex items-center gap-2">
          <Button size="sm" variant={threadLiked ? "default" : "ghost"}
            className={threadLiked ? "bg-casino-pink/20 text-casino-pink hover:bg-casino-pink/30" : ""}
            onClick={toggleThreadLike}>
            <Heart className={`h-4 w-4 mr-1 ${threadLiked ? "fill-casino-pink" : ""}`} /> {threadLikes}
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        {replies.map((r) => {
          const p = profiles[r.author_id];
          const liked = likedReplies.has(r.id);
          const isOwn = user?.id === r.author_id;
          return (
            <div key={r.id} className="rounded-xl border border-border bg-card/60 p-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <ProfileAvatar avatarUrl={p?.avatar_url} username={p?.username} borderStyle={p?.border_style}
                  hasAnimatedBorder={p?.has_animated_border} hasAnimatedAvatar={p?.has_animated_avatar} size="sm" />
                <span className="font-bold text-foreground">{p?.username || "Unknown"}</span>
                <span>•</span>
                <span>{formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}</span>
                {isOwn && (
                  <button onClick={() => deleteReply(r.id)} className="ml-auto text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <p className="text-sm whitespace-pre-wrap">{r.body}</p>
              <div className="mt-2">
                <button onClick={() => toggleReplyLike(r.id)}
                  className={`text-[11px] inline-flex items-center gap-1 transition ${liked ? "text-casino-pink" : "text-muted-foreground hover:text-casino-pink"}`}>
                  <Heart className={`h-3 w-3 ${liked ? "fill-casino-pink" : ""}`} /> {r.like_count}
                </button>
              </div>
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
