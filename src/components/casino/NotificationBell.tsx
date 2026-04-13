import { useEffect, useMemo, useState } from "react";
import { Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface Broadcast {
  id: string;
  title: string;
  content: string;
  type: string;
  created_at: string;
}

export function NotificationBell() {
  const { user } = useAuth();
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const channelName = useMemo(
    () => `broadcasts-${Math.random().toString(36).slice(2, 10)}`,
    []
  );

  const fetchBroadcasts = async () => {
    if (!user) return;
    const { data: msgs } = await supabase.from("broadcast_messages" as any).select("id, title, content, type, created_at").eq("is_active", true).order("created_at", { ascending: false }).limit(20) as { data: any[] | null };
    const { data: reads } = await supabase.from("broadcast_reads" as any).select("broadcast_id").eq("user_id", user.id) as { data: any[] | null };
    setBroadcasts((msgs || []) as Broadcast[]);
    setReadIds(new Set((reads || []).map((r: any) => r.broadcast_id)));
  };

  useEffect(() => {
    if (!user) return;
    fetchBroadcasts();

    supabase
      .getChannels()
      .filter((channel) => channel.topic === `realtime:${channelName}`)
      .forEach((channel) => {
        void supabase.removeChannel(channel);
      });

    // Realtime for new broadcasts
    const channel = supabase.channel(channelName)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "broadcast_messages" }, fetchBroadcasts)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id, channelName]);

  const unreadCount = broadcasts.filter(b => !readIds.has(b.id)).length;

  const markAsRead = async (id: string) => {
    if (!user || readIds.has(id)) return;
    await supabase.from("broadcast_reads" as any).insert({ broadcast_id: id, user_id: user.id });
    setReadIds(prev => new Set([...prev, id]));
  };

  const markAllRead = async () => {
    if (!user) return;
    const unread = broadcasts.filter(b => !readIds.has(b.id));
    if (unread.length === 0) return;
    const inserts = unread.map(b => ({ broadcast_id: b.id, user_id: user.id }));
    await supabase.from("broadcast_reads" as any).insert(inserts);
    setReadIds(prev => new Set([...prev, ...unread.map(b => b.id)]));
  };

  if (!user) return null;

  const typeIcon = (type: string) => {
    switch (type) {
      case "warning": return "⚠️";
      case "update": return "🔄";
      case "promo": return "🎁";
      default: return "ℹ️";
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="relative shrink-0 rounded-lg p-1.5 transition-colors hover:bg-muted"
          aria-label={unreadCount > 0 ? `${unreadCount} unread notifications` : "Notifications"}
        >
          <Bell className="h-5 w-5 text-muted-foreground" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[min(20rem,calc(100vw-1rem))] max-h-96 overflow-y-auto rounded-xl border border-border bg-card p-0 shadow-xl"
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-border bg-card p-3">
          <h3 className="font-display text-sm font-bold">Notifications</h3>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllRead}
              className="text-[10px] text-primary hover:underline"
            >
              Mark all read
            </button>
          )}
        </div>

        {broadcasts.length === 0 ? (
          <p className="p-4 text-center text-sm text-muted-foreground">No notifications yet</p>
        ) : (
              <div className="divide-y divide-border">
            {broadcasts.map((b) => {
              const isRead = readIds.has(b.id);
              const isExpanded = expandedId === b.id;

              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => {
                    setExpandedId(isExpanded ? null : b.id);
                    if (!isRead) markAsRead(b.id);
                  }}
                  className={`w-full p-3 text-left transition-colors hover:bg-muted/50 ${!isRead ? "bg-primary/5" : ""}`}
                >
                  <div className="flex items-start gap-2">
                    <span className="shrink-0 text-sm">{typeIcon(b.type)}</span>
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-medium ${!isRead ? "text-foreground" : "text-muted-foreground"}`}>{b.title}</p>
                      <p className={`mt-0.5 text-xs text-muted-foreground whitespace-pre-line ${isExpanded ? "" : "line-clamp-2"}`}>{b.content}</p>
                      <p className="mt-1 text-[10px] text-muted-foreground/60">
                        {new Date(b.created_at).toLocaleDateString()} · {new Date(b.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    {!isRead && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
