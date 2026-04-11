import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, MessageCircle, ShieldAlert, Ban, Trash2, AlertTriangle, X } from "lucide-react";
import { toast } from "sonner";
import { StaffUsername, type StaffRole } from "./StaffUsername";

interface ChatMessage {
  id: string;
  user_id: string;
  username: string | null;
  content: string;
  created_at: string;
}

export function GameChat({ gameRoom }: { gameRoom: string }) {
  const { user, profile, hasStaffAccess } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isBanned, setIsBanned] = useState(false);
  const [selectedMsg, setSelectedMsg] = useState<ChatMessage | null>(null);
  const [banReason, setBanReason] = useState("");
  const [showBanModal, setShowBanModal] = useState(false);
  const [banTarget, setBanTarget] = useState<{ userId: string; username: string } | null>(null);
  const [banDuration, setBanDuration] = useState<string>("permanent");
  const [userRoles, setUserRoles] = useState<Record<string, StaffRole>>({});
  const bottomRef = useRef<HTMLDivElement>(null);

  // Check if current user is banned
  useEffect(() => {
    if (!user) return;
    const checkBan = async () => {
      const now = new Date().toISOString();
      const { data } = await supabase
        .from("chat_bans")
        .select("id, expires_at")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .or(`game_room.is.null,game_room.eq.${gameRoom}`);
      if (data && data.length > 0) {
        const activeBan = data.some(
          (b: any) => !b.expires_at || new Date(b.expires_at) > new Date()
        );
        setIsBanned(activeBan);
      } else {
        setIsBanned(false);
      }
    };
    checkBan();
  }, [user, gameRoom]);

  useEffect(() => {
    if (!isOpen) return;

    supabase
      .from("game_chat")
      .select("*")
      .eq("game_room", gameRoom)
      .order("created_at", { ascending: true })
      .limit(50)
      .then(({ data }) => {
        if (data) setMessages(data as ChatMessage[]);
      });

    // Fetch roles for users in chat
    const fetchRoles = async (userIds: string[]) => {
      if (userIds.length === 0) return;
      const { data } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", userIds)
        .in("role", ["admin", "moderator", "staff"]);
      if (data) {
        const rolesMap: Record<string, StaffRole> = {};
        data.forEach((r: any) => {
          // Priority: admin > moderator > staff
          const priority = { admin: 3, moderator: 2, staff: 1 };
          const existing = rolesMap[r.user_id];
          if (!existing || (priority[r.role as keyof typeof priority] || 0) > (priority[existing as keyof typeof priority] || 0)) {
            rolesMap[r.user_id] = r.role;
          }
        });
        setUserRoles((prev) => ({ ...prev, ...rolesMap }));
      }
    };

    supabase
      .from("game_chat")
      .select("*")
      .eq("game_room", gameRoom)
      .order("created_at", { ascending: true })
      .limit(50)
      .then(({ data }) => {
        if (data) {
          setMessages(data as ChatMessage[]);
          const uniqueIds = [...new Set(data.map((m: any) => m.user_id))];
          fetchRoles(uniqueIds);
        }
      });

    const channel = supabase
      .channel(`game-chat-${gameRoom}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "game_chat", filter: `game_room=eq.${gameRoom}` },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setMessages((prev) => [...prev.slice(-99), payload.new as ChatMessage]);
            const newUserId = (payload.new as ChatMessage).user_id;
            if (!userRoles[newUserId]) fetchRoles([newUserId]);
          } else if (payload.eventType === "DELETE") {
            setMessages((prev) => prev.filter((m) => m.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [isOpen, gameRoom]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim() || !user || isBanned) return;
    const content = newMessage.trim();
    setNewMessage("");
    await supabase.from("game_chat").insert({
      user_id: user.id,
      game_room: gameRoom,
      username: profile?.username || "Anonymous",
      content,
    });
  };

  const handleDeleteMessage = async (msg: ChatMessage) => {
    if (!user) return;
    await supabase.from("game_chat").delete().eq("id", msg.id);
    await supabase.from("moderation_log").insert({
      action_type: "delete_message",
      target_user_id: msg.user_id,
      moderator_id: user.id,
      reason: "Message deleted by moderator",
      game_room: gameRoom,
      metadata: { message_content: msg.content, message_id: msg.id },
    } as any);
    setMessages((prev) => prev.filter((m) => m.id !== msg.id));
    setSelectedMsg(null);
    toast.success("Message deleted");
  };

  const openBanModal = (userId: string, username: string) => {
    setBanTarget({ userId, username });
    setBanReason("");
    setBanDuration("permanent");
    setShowBanModal(true);
    setSelectedMsg(null);
  };

  const handleBanUser = async () => {
    if (!user || !banTarget) return;
    const expiresAt = banDuration === "permanent"
      ? null
      : banDuration === "1h"
        ? new Date(Date.now() + 3600000).toISOString()
        : banDuration === "24h"
          ? new Date(Date.now() + 86400000).toISOString()
          : banDuration === "7d"
            ? new Date(Date.now() + 604800000).toISOString()
            : null;

    const { error } = await supabase.from("chat_bans").insert({
      user_id: banTarget.userId,
      banned_by: user.id,
      reason: banReason || "No reason provided",
      game_room: banDuration === "global" ? null : gameRoom,
      expires_at: banDuration === "global" ? null : expiresAt,
      is_active: true,
    } as any);

    if (error) {
      toast.error("Failed to ban user");
      return;
    }

    await supabase.from("moderation_log").insert({
      action_type: "ban",
      target_user_id: banTarget.userId,
      moderator_id: user.id,
      reason: banReason || "No reason provided",
      game_room: gameRoom,
      metadata: { duration: banDuration },
    } as any);

    toast.success(`${banTarget.username} has been banned from chat`);
    setShowBanModal(false);
    setBanTarget(null);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="w-full rounded-xl border border-border bg-card p-3 flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
      >
        <MessageCircle className="h-4 w-4" />
        Open Game Chat
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden relative">
      {/* Ban Modal */}
      {showBanModal && banTarget && (
        <div className="absolute inset-0 z-20 bg-background/95 backdrop-blur-sm flex flex-col p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold flex items-center gap-1.5 text-destructive">
              <Ban className="h-4 w-4" /> Ban {banTarget.username}
            </h4>
            <button onClick={() => setShowBanModal(false)}><X className="h-4 w-4" /></button>
          </div>
          <Input
            value={banReason}
            onChange={(e) => setBanReason(e.target.value)}
            placeholder="Reason for ban..."
            className="bg-secondary border-border text-xs h-8"
          />
          <select
            value={banDuration}
            onChange={(e) => setBanDuration(e.target.value)}
            className="bg-secondary border border-border rounded-md text-xs px-2 py-1.5 text-foreground"
          >
            <option value="1h">1 Hour</option>
            <option value="24h">24 Hours</option>
            <option value="7d">7 Days</option>
            <option value="permanent">Permanent</option>
            <option value="global">Global Ban (All Chats)</option>
          </select>
          <Button variant="destructive" size="sm" onClick={handleBanUser} className="text-xs">
            <Ban className="h-3 w-3 mr-1" /> Confirm Ban
          </Button>
        </div>
      )}

      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-secondary/50">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-[hsl(var(--casino-gold))]" />
          <span className="text-sm font-bold">Game Chat</span>
          {hasStaffAccess && (
            <ShieldAlert className="h-3.5 w-3.5 text-casino-pink" />
          )}
        </div>
        <button onClick={() => setIsOpen(false)} className="text-xs text-muted-foreground hover:text-foreground">
          Minimize
        </button>
      </div>

      <div className="h-48 overflow-y-auto px-3 py-2 space-y-1.5">
        {messages.length === 0 && (
          <p className="text-center text-muted-foreground text-xs py-6">No messages yet — say hello! 👋</p>
        )}
        {messages.map((msg) => {
          const isMine = msg.user_id === user?.id;
          return (
            <div key={msg.id} className={`group flex flex-col ${isMine ? "items-end" : "items-start"}`}>
              <span className="mb-0.5">
                {isMine ? (
                  <span className="text-[10px] text-muted-foreground">You</span>
                ) : userRoles[msg.user_id] ? (
                  <StaffUsername username={msg.username || "Anon"} role={userRoles[msg.user_id]} size="xs" />
                ) : (
                  <span className="text-[10px] text-muted-foreground">{msg.username || "Anon"}</span>
                )}
              </span>
              <div className="flex items-center gap-1">
                {hasStaffAccess && !isMine && (
                  <div className="hidden group-hover:flex items-center gap-0.5 order-first">
                    <button
                      onClick={() => handleDeleteMessage(msg)}
                      className="p-0.5 rounded hover:bg-destructive/20 text-destructive"
                      title="Delete message"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => openBanModal(msg.user_id, msg.username || "Unknown")}
                      className="p-0.5 rounded hover:bg-destructive/20 text-destructive"
                      title="Ban user"
                    >
                      <Ban className="h-3 w-3" />
                    </button>
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-lg px-3 py-1.5 text-xs break-words ${
                    isMine
                      ? "bg-[hsl(var(--casino-gold))] text-accent-foreground"
                      : "bg-secondary text-foreground"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {isBanned ? (
        <div className="border-t border-border p-2 text-center text-xs text-destructive flex items-center justify-center gap-1">
          <Ban className="h-3 w-3" /> You are banned from this chat
        </div>
      ) : user ? (
        <div className="border-t border-border p-2 flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Type a message..."
            className="bg-secondary border-border text-xs h-8"
            maxLength={300}
          />
          <Button variant="gold" size="icon" className="h-8 w-8 shrink-0" onClick={handleSend} disabled={!newMessage.trim()}>
            <Send className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        <div className="border-t border-border p-2 text-center text-xs text-muted-foreground">
          Sign in to chat
        </div>
      )}
    </div>
  );
}
