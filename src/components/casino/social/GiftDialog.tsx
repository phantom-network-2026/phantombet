import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Gift, Sparkles, Heart, Trophy, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const GIFT_TYPES = [
  { id: "tip", label: "Cash Tip", icon: Gift, color: "text-casino-gold", desc: "Send mock funds" },
  { id: "sticker", label: "Sticker", icon: Sparkles, color: "text-casino-pink", desc: "Pure fun, no cost" },
  { id: "badge", label: "Honor Badge", icon: Trophy, color: "text-cyan", desc: "Show appreciation" },
  { id: "heart", label: "Heart", icon: Heart, color: "text-loss", desc: "Send some love" },
];

interface Props {
  receiverId: string;
  receiverUsername: string;
  open: boolean;
  onClose: () => void;
}

export function GiftDialog({ receiverId, receiverUsername, open, onClose }: Props) {
  const { user } = useAuth();
  const [type, setType] = useState("tip");
  const [amount, setAmount] = useState("1");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const send = async () => {
    if (!user) return;
    const amt = type === "tip" ? Math.max(0, parseFloat(amount) || 0) : 0;
    setSending(true);
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("username")
        .eq("user_id", user.id)
        .maybeSingle();
      const senderName = profile?.username || "Someone";

      const { error } = await supabase.from("user_gifts").insert({
        sender_id: user.id,
        receiver_id: receiverId,
        gift_type: type,
        amount: amt,
        message: message.slice(0, 200),
      });
      if (error) throw error;

      const giftLabel = GIFT_TYPES.find((g) => g.id === type)?.label || "gift";
      await supabase.from("activity_feed").insert({
        user_id: user.id,
        username: senderName,
        activity_type: "gift",
        title: `sent ${receiverUsername} a ${giftLabel}`,
        detail: message.slice(0, 140) || null,
        amount: amt,
      });

      // Send a DM as a record of the gift
      await supabase.from("messages").insert({
        sender_id: user.id,
        receiver_id: receiverId,
        content: `🎁 Sent you a ${giftLabel}${amt > 0 ? ` ($${amt})` : ""}${message ? `: ${message}` : ""}`,
      });

      toast.success(`${giftLabel} sent to ${receiverUsername}`);
      setMessage("");
      onClose();
    } catch (e: any) {
      toast.error(e?.message || "Could not send gift");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-casino-gold" />
            Send a gift to {receiverUsername}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {GIFT_TYPES.map((g) => {
              const Icon = g.icon;
              const active = type === g.id;
              return (
                <button
                  key={g.id}
                  onClick={() => setType(g.id)}
                  className={`rounded-lg border p-3 text-left transition ${
                    active
                      ? "border-casino-gold bg-casino-gold/10 shadow-[0_0_15px_hsl(45_95%_55%/0.3)]"
                      : "border-border bg-secondary/60 hover:border-casino-gold/40"
                  }`}
                >
                  <Icon className={`h-5 w-5 ${g.color}`} />
                  <p className="font-bold text-sm mt-1">{g.label}</p>
                  <p className="text-[10px] text-muted-foreground">{g.desc}</p>
                </button>
              );
            })}
          </div>

          {type === "tip" && (
            <div>
              <p className="text-xs font-bold uppercase text-muted-foreground mb-1">Amount</p>
              <Input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                inputMode="decimal"
                placeholder="1.00"
              />
            </div>
          )}

          <div>
            <p className="text-xs font-bold uppercase text-muted-foreground mb-1">Message (optional)</p>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={200}
              placeholder="GG! Keep it up 🚀"
              rows={2}
            />
          </div>

          <Button variant="gold" className="w-full" onClick={send} disabled={sending}>
            <Zap className="h-4 w-4 mr-1" /> Send Gift
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}