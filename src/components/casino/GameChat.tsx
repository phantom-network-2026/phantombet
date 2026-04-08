import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, MessageCircle } from "lucide-react";

interface ChatMessage {
  id: string;
  user_id: string;
  username: string | null;
  content: string;
  created_at: string;
}

export function GameChat({ gameRoom }: { gameRoom: string }) {
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Fetch recent messages
    supabase
      .from("game_chat")
      .select("*")
      .eq("game_room", gameRoom)
      .order("created_at", { ascending: true })
      .limit(50)
      .then(({ data }) => {
        if (data) setMessages(data as ChatMessage[]);
      });

    // Subscribe to new messages
    const channel = supabase
      .channel(`game-chat-${gameRoom}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "game_chat", filter: `game_room=eq.${gameRoom}` },
        (payload) => {
          setMessages((prev) => [...prev.slice(-99), payload.new as ChatMessage]);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [isOpen, gameRoom]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim() || !user) return;
    const content = newMessage.trim();
    setNewMessage("");

    await supabase.from("game_chat").insert({
      user_id: user.id,
      game_room: gameRoom,
      username: profile?.username || "Anonymous",
      content,
    });
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
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-secondary/50">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-[hsl(var(--casino-gold))]" />
          <span className="text-sm font-bold">Game Chat</span>
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
            <div key={msg.id} className={`flex flex-col ${isMine ? "items-end" : "items-start"}`}>
              <span className="text-[10px] text-muted-foreground mb-0.5">
                {isMine ? "You" : msg.username || "Anon"}
              </span>
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
          );
        })}
        <div ref={bottomRef} />
      </div>

      {user ? (
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
