import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export type ReactionKind = "like" | "love" | "fire" | "target" | "laugh";

const REACTIONS: { id: ReactionKind; emoji: string; label: string }[] = [
  { id: "like",   emoji: "👍", label: "Like" },
  { id: "love",   emoji: "❤️", label: "Love" },
  { id: "fire",   emoji: "🔥", label: "Fire" },
  { id: "target", emoji: "🎯", label: "Insightful" },
  { id: "laugh",  emoji: "😂", label: "Funny" },
];

interface Props {
  threadId?: string;
  replyId?: string;
  compact?: boolean;
}

interface Counts { [k: string]: number }

export function ReactionBar({ threadId, replyId, compact }: Props) {
  const { user } = useAuth();
  const [counts, setCounts] = useState<Counts>({});
  const [mine, setMine] = useState<Set<ReactionKind>>(new Set());
  const [open, setOpen] = useState(false);

  const load = async () => {
    const filter = threadId ? { col: "thread_id", val: threadId } : { col: "reply_id", val: replyId! };
    const { data } = await supabase
      .from("forum_reactions")
      .select("reaction,user_id")
      .eq(filter.col, filter.val);
    if (!data) return;
    const c: Counts = {};
    const m = new Set<ReactionKind>();
    for (const r of data as any[]) {
      c[r.reaction] = (c[r.reaction] || 0) + 1;
      if (user && r.user_id === user.id) m.add(r.reaction);
    }
    setCounts(c);
    setMine(m);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [threadId, replyId, user?.id]);

  const toggle = async (kind: ReactionKind) => {
    if (!user) { toast.error("Sign in to react"); return; }
    const has = mine.has(kind);
    if (has) {
      const q = supabase.from("forum_reactions").delete().eq("user_id", user.id).eq("reaction", kind);
      threadId ? await q.eq("thread_id", threadId) : await q.eq("reply_id", replyId!);
      setMine((s) => { const n = new Set(s); n.delete(kind); return n; });
      setCounts((c) => ({ ...c, [kind]: Math.max(0, (c[kind] || 1) - 1) }));
    } else {
      const payload: any = { user_id: user.id, reaction: kind };
      if (threadId) payload.thread_id = threadId; else payload.reply_id = replyId;
      const { error } = await supabase.from("forum_reactions").insert(payload);
      if (error) return;
      setMine((s) => new Set(s).add(kind));
      setCounts((c) => ({ ...c, [kind]: (c[kind] || 0) + 1 }));
    }
  };

  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const visible = REACTIONS.filter((r) => counts[r.id] > 0 || mine.has(r.id));

  return (
    <div className="relative inline-flex items-center gap-1 flex-wrap">
      {visible.map((r) => (
        <button
          key={r.id}
          onClick={() => toggle(r.id)}
          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] transition ${
            mine.has(r.id)
              ? "border-casino-gold/60 bg-casino-gold/10 text-casino-gold"
              : "border-border bg-secondary/60 text-muted-foreground hover:border-casino-gold/40"
          }`}
          aria-label={r.label}
        >
          <span>{r.emoji}</span>
          <span className="font-bold">{counts[r.id] || 0}</span>
        </button>
      ))}
      <button
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center justify-center rounded-full border border-border bg-secondary/60 text-muted-foreground hover:text-casino-gold hover:border-casino-gold/40 h-6 w-6 text-[12px]"
        aria-label="Add reaction"
      >
        +
      </button>
      {!compact && total === 0 && visible.length === 0 && (
        <span className="text-[10px] text-muted-foreground">React</span>
      )}
      {open && (
        <div className="absolute z-20 top-full mt-1 left-0 rounded-xl border border-border bg-card p-1.5 shadow-2xl flex gap-1">
          {REACTIONS.map((r) => (
            <button
              key={r.id}
              onClick={() => { toggle(r.id); setOpen(false); }}
              className="h-8 w-8 rounded-md hover:bg-secondary transition text-base"
              title={r.label}
            >
              {r.emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}