import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/casino/Header";
import { BottomNav } from "@/components/casino/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ArrowLeft, Send, Bot, User, HelpCircle, CreditCard,
  Wallet, Gift, Gamepad2, Shield, Loader2,
} from "lucide-react";

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/support-chat`;

type Msg = { role: "user" | "assistant"; content: string };

const FAQ_ITEMS = [
  { icon: CreditCard, label: "How to deposit?", q: "How do I make a deposit on PhantomBet?" },
  { icon: Wallet, label: "Withdrawal help", q: "How do I withdraw my winnings?" },
  { icon: Gift, label: "Welcome bonus", q: "What welcome bonus do I get as a new user?" },
  { icon: Gamepad2, label: "Game issues", q: "A game isn't loading, what should I do?" },
  { icon: Shield, label: "Account security", q: "How do I keep my account secure?" },
];

async function streamChat({
  messages,
  onDelta,
  onDone,
  onError,
}: {
  messages: Msg[];
  onDelta: (t: string) => void;
  onDone: () => void;
  onError: (msg: string) => void;
}) {
  const resp = await fetch(CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ messages }),
  });

  if (!resp.ok) {
    const data = await resp.json().catch(() => ({}));
    onError(data.error || "Something went wrong. Please try again.");
    return;
  }

  if (!resp.body) { onError("No response body"); return; }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });

    let idx: number;
    while ((idx = buf.indexOf("\n")) !== -1) {
      let line = buf.slice(0, idx);
      buf = buf.slice(idx + 1);
      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (!line.startsWith("data: ")) continue;
      const json = line.slice(6).trim();
      if (json === "[DONE]") { onDone(); return; }
      try {
        const parsed = JSON.parse(json);
        const c = parsed.choices?.[0]?.delta?.content;
        if (c) onDelta(c);
      } catch { /* partial */ }
    }
  }
  onDone();
}

export default function Help() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Msg = { role: "user", content: text.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    let assistantSoFar = "";
    const upsert = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
        }
        return [...prev, { role: "assistant", content: assistantSoFar }];
      });
    };

    try {
      await streamChat({
        messages: newMessages,
        onDelta: upsert,
        onDone: () => setLoading(false),
        onError: (msg) => {
          setMessages((prev) => [...prev, { role: "assistant", content: `⚠️ ${msg}` }]);
          setLoading(false);
        },
      });
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "⚠️ Connection error. Please try again." }]);
      setLoading(false);
    }
  };

  const showChat = messages.length > 0;

  return (
    <div className="min-h-screen gradient-casino-bg flex flex-col">
      <Header />
      <div className="flex-1 flex flex-col container max-w-lg px-4 pb-20">
        {/* Top bar */}
        <div className="flex items-center gap-3 py-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-display text-xl font-black text-casino-gold flex items-center gap-2">
            <HelpCircle className="h-5 w-5" /> Help & Support
          </h1>
        </div>

        {!showChat ? (
          /* FAQ Quick Actions */
          <div className="space-y-4 animate-fade-in">
            <div className="rounded-xl bg-card border border-border p-4 text-center space-y-2">
              <div className="w-14 h-14 rounded-full bg-casino-gold/20 flex items-center justify-center mx-auto">
                <Bot className="h-7 w-7 text-casino-gold" />
              </div>
              <h2 className="font-display font-bold text-lg">PhantomBot Assistant</h2>
              <p className="text-sm text-muted-foreground">
                I can help with deposits, withdrawals, bonuses, account issues and more.
              </p>
            </div>

            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Common Questions</p>
            <div className="grid gap-2">
              {FAQ_ITEMS.map((faq) => (
                <button
                  key={faq.label}
                  onClick={() => send(faq.q)}
                  className="flex items-center gap-3 rounded-lg bg-card border border-border p-3 text-left hover:border-casino-gold/50 transition-colors"
                >
                  <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                    <faq.icon className="h-4 w-4 text-casino-gold" />
                  </div>
                  <span className="text-sm font-medium">{faq.label}</span>
                </button>
              ))}
            </div>

            {/* Free text */}
            <div className="flex gap-2 pt-2">
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send(input)}
                placeholder="Ask me anything..."
                className="bg-card border-border text-sm"
              />
              <Button size="icon" variant="gold" onClick={() => send(input)} disabled={!input.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : (
          /* Chat View */
          <div className="flex-1 flex flex-col min-h-0">
            <ScrollArea className="flex-1 pr-2" ref={scrollRef as any}>
              <div className="space-y-3 pb-2">
                {messages.map((msg, i) => (
                  <div key={i} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    {msg.role === "assistant" && (
                      <div className="w-7 h-7 rounded-full bg-casino-gold/20 flex items-center justify-center shrink-0 mt-1">
                        <Bot className="h-4 w-4 text-casino-gold" />
                      </div>
                    )}
                    <div
                      className={`max-w-[80%] rounded-xl px-3 py-2 text-sm whitespace-pre-wrap ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-card border border-border"
                      }`}
                    >
                      {msg.content}
                    </div>
                    {msg.role === "user" && (
                      <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center shrink-0 mt-1">
                        <User className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                ))}
                {loading && messages[messages.length - 1]?.role === "user" && (
                  <div className="flex gap-2">
                    <div className="w-7 h-7 rounded-full bg-casino-gold/20 flex items-center justify-center shrink-0">
                      <Bot className="h-4 w-4 text-casino-gold" />
                    </div>
                    <div className="bg-card border border-border rounded-xl px-3 py-2">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            <div className="flex gap-2 pt-3 border-t border-border mt-2">
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send(input)}
                placeholder="Type a message..."
                className="bg-card border-border text-sm"
                disabled={loading}
              />
              <Button size="icon" variant="gold" onClick={() => send(input)} disabled={!input.trim() || loading}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
