import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Flame, MessageSquare, Heart } from "lucide-react";

interface Trend {
  id: string;
  title: string;
  reply_count: number;
  like_count: number;
}

interface Props {
  onPick: (threadId: string) => void;
}

export function TrendingSidebar({ onPick }: Props) {
  const [items, setItems] = useState<Trend[]>([]);

  useEffect(() => {
    const load = async () => {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from("forum_threads")
        .select("id,title,reply_count,like_count")
        .gte("last_activity_at", since)
        .order("reply_count", { ascending: false })
        .order("like_count", { ascending: false })
        .limit(5);
      setItems((data as Trend[]) || []);
    };
    load();
  }, []);

  if (items.length === 0) return null;

  return (
    <div className="rounded-xl border border-casino-gold/30 bg-card p-3">
      <div className="flex items-center gap-2 mb-2">
        <Flame className="h-4 w-4 text-casino-pink" />
        <h3 className="font-display font-black text-xs uppercase tracking-wider text-casino-gold">Trending · 24h</h3>
      </div>
      <ol className="space-y-1.5">
        {items.map((t, i) => (
          <li key={t.id}>
            <button
              onClick={() => onPick(t.id)}
              className="w-full text-left flex items-start gap-2 p-1.5 rounded-md hover:bg-secondary/60 transition group"
            >
              <span className={`text-[11px] font-display font-black w-5 shrink-0 ${
                i === 0 ? "text-casino-pink" : i === 1 ? "text-casino-gold" : "text-muted-foreground"
              }`}>#{i + 1}</span>
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-bold line-clamp-2 group-hover:text-casino-gold transition">{t.title}</p>
                <p className="text-[10px] text-muted-foreground inline-flex items-center gap-2 mt-0.5">
                  <span className="inline-flex items-center gap-0.5"><MessageSquare className="h-2.5 w-2.5" />{t.reply_count}</span>
                  <span className="inline-flex items-center gap-0.5"><Heart className="h-2.5 w-2.5" />{t.like_count}</span>
                </p>
              </div>
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}