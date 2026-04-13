import { useState, useEffect, useMemo } from "react";
import { Bell, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

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
    <div className="relative">
      <button
        onClick={() => { setOpen(!open); }}
        className="relative p-1.5 rounded-lg hover:bg-muted transition-colors"
      >
        <Bell className="h-5 w-5 text-muted-foreground" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-white px-1">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          {/* Dropdown */}
          <div className="absolute right-0 top-full mt-2 w-80 max-h-96 overflow-y-auto rounded-xl border border-border bg-card shadow-xl z-50">
            <div className="sticky top-0 bg-card border-b border-border p-3 flex items-center justify-between">
              <h3 className="font-display font-bold text-sm">Notifications</h3>
              <div className="flex gap-2">
                {unreadCount > 0 && (
                  <button onClick={markAllRead} className="text-[10px] text-primary hover:underline">
                    Mark all read
                  </button>
                )}
                <button onClick={() => setOpen(false)}>
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
            </div>
            {broadcasts.length === 0 ? (
              <p className="text-sm text-muted-foreground p-4 text-center">No notifications yet</p>
            ) : (
              <div className="divide-y divide-border">
                {broadcasts.map(b => {
                  const isRead = readIds.has(b.id);
                  return (
                    <button
                      key={b.id}
                      onClick={() => markAsRead(b.id)}
                      className={`w-full text-left p-3 hover:bg-muted/50 transition-colors ${!isRead ? "bg-primary/5" : ""}`}
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-sm shrink-0">{typeIcon(b.type)}</span>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium ${!isRead ? "text-foreground" : "text-muted-foreground"}`}>{b.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{b.content}</p>
                          <p className="text-[10px] text-muted-foreground/60 mt-1">
                            {new Date(b.created_at).toLocaleDateString()} · {new Date(b.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                        {!isRead && <span className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1.5" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
