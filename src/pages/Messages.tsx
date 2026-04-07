import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/casino/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Send } from "lucide-react";

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

export default function Messages() {
  const { friendId } = useParams<{ friendId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [friendName, setFriendName] = useState("...");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user || !friendId) { navigate("/friends"); return; }

    // Fetch friend name
    supabase.from("profiles").select("username").eq("user_id", friendId).single()
      .then(({ data }) => { if (data) setFriendName(data.username || "Unknown"); });

    // Fetch messages
    fetchMessages();

    // Subscribe to new messages
    const channel = supabase
      .channel(`messages-${friendId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          const msg = payload.new as Message;
          if (
            (msg.sender_id === user.id && msg.receiver_id === friendId) ||
            (msg.sender_id === friendId && msg.receiver_id === user.id)
          ) {
            setMessages((prev) => [...prev, msg]);
            // Mark as read if we're the receiver
            if (msg.receiver_id === user.id) {
              supabase.from("messages").update({ is_read: true }).eq("id", msg.id);
            }
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, friendId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchMessages = async () => {
    if (!user || !friendId) return;
    const { data } = await supabase
      .from("messages")
      .select("*")
      .or(
        `and(sender_id.eq.${user.id},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${user.id})`
      )
      .order("created_at", { ascending: true });

    if (data) {
      setMessages(data);
      // Mark unread as read
      const unread = data.filter((m) => m.receiver_id === user.id && !m.is_read);
      for (const m of unread) {
        supabase.from("messages").update({ is_read: true }).eq("id", m.id);
      }
    }
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !user || !friendId) return;
    const content = newMessage.trim();
    setNewMessage("");

    const { error } = await supabase.from("messages").insert({
      sender_id: user.id,
      receiver_id: friendId,
      content,
    });
    if (error) {
      setNewMessage(content);
    }
  };

  return (
    <div className="min-h-screen gradient-casino-bg flex flex-col">
      <Header />
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card">
        <Button variant="ghost" size="icon" onClick={() => navigate("/friends")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h2 className="font-display font-bold text-lg">{friendName}</h2>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-center text-muted-foreground py-12">No messages yet. Say hello! 👋</p>
        )}
        {messages.map((msg) => {
          const isMine = msg.sender_id === user?.id;
          return (
            <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                  isMine
                    ? "gradient-gold text-accent-foreground rounded-br-md"
                    : "bg-secondary text-foreground rounded-bl-md"
                }`}
              >
                <p className="text-sm break-words">{msg.content}</p>
                <p className={`text-[10px] mt-1 ${isMine ? "text-accent-foreground/60" : "text-muted-foreground"}`}>
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border bg-card p-3">
        <div className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Type a message..."
            className="bg-secondary border-border"
            maxLength={1000}
          />
          <Button variant="gold" size="icon" onClick={handleSend} disabled={!newMessage.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
