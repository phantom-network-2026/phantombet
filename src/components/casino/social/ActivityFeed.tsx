import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trophy, MessageSquare, Gift, Star, Zap, Send } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface FeedItem {
  id: string;
  user_id: string;
  username: string;
  activity_type: string;
  title: string;
  detail: string | null;
  amount: number | null;
  created_at: string;
}

const ICONS: Record<string, any> = {
  win: Trophy,
  level_up: Star,
  forum_post: MessageSquare,
  achievement: Star,
  gift: Gift,
  status: Zap,
};

const COLORS: Record<string, string> = {
  win: "text-casino-gold",
  level_up: "text-casino-pink",
  forum_post: "text-cyan",
  achievement: "text-casino-gold",
  gift: "text-casino-pink",
  status: "text-primary",
};

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

export function ActivityFeed() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<FeedItem[]>([]);
  const [statusMsg, setStatusMsg] = useState("");
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("activity_feed")
        .select("id,user_id,username,activity_type,title,detail,amount,created_at")
        .order("created_at", { ascending: false })
        .limit(50);
      if (active && data) setItems(data as FeedItem[]);
    })();

    const channel = supabase
      .channel("activity-feed-stream")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "activity_feed" },
        (payload) => {
          setItems((prev) => [payload.new as FeedItem, ...prev].slice(0, 50));
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const postStatus = async () => {
    if (!user || !statusMsg.trim()) return;
    setPosting(true);
    const { data: profile } = await supabase
      .from("profiles")
      .select("username")
      .eq("user_id", user.id)
      .maybeSingle();
    const username = profile?.username || "Phantom";
    await supabase.from("activity_feed").insert({
      user_id: user.id,
      username,
      activity_type: "status",
      title: statusMsg.trim().slice(0, 140),
    });
    // also update profile status
    await supabase
      .from("profiles")
      .update({ status_message: statusMsg.trim().slice(0, 140) })
      .eq("user_id", user.id);
    setStatusMsg("");
    setPosting(false);
    toast.success("Status posted");
  };

  return (
    <div className="space-y-3">
      {/* Status composer */}
      <div className="rounded-xl border border-casino-gold/30 bg-card p-3 space-y-2">
        <p className="text-xs font-display font-black uppercase tracking-wider text-casino-gold">What's happening?</p>
        <div className="flex gap-2">
          <Input
            value={statusMsg}
            onChange={(e) => setStatusMsg(e.target.value)}
            placeholder="Share a status with the network..."
            maxLength={140}
            onKeyDown={(e) => e.key === "Enter" && postStatus()}
          />
          <Button size="sm" variant="gold" onClick={postStatus} disabled={posting || !statusMsg.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Feed */}
      {items.length === 0 && (
        <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          No activity yet — be the first to post.
        </div>
      )}
      {items.map((item) => {
        const Icon = ICONS[item.activity_type] || Zap;
        const color = COLORS[item.activity_type] || "text-primary";
        return (
          <div key={item.id} className="flex gap-3 rounded-xl border border-border bg-card p-3 hover:border-casino-gold/40 transition">
            <div className={`shrink-0 grid h-10 w-10 place-items-center rounded-full bg-secondary ${color}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm">
                <button
                  onClick={() => navigate(`/u/${item.user_id}`)}
                  className="font-bold text-foreground hover:text-casino-gold"
                >
                  {item.username}
                </button>
                <span className="text-muted-foreground"> · {timeAgo(item.created_at)}</span>
              </p>
              <p className="text-sm mt-0.5">{item.title}</p>
              {item.detail && <p className="text-xs text-muted-foreground mt-0.5">{item.detail}</p>}
              {item.amount && item.amount > 0 && (
                <p className={`text-xs font-bold mt-0.5 ${color}`}>+${Number(item.amount).toFixed(2)}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}