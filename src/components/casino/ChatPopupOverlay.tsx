import { useEffect, useState, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface PopupMessage {
  id: string;
  username: string;
  content: string;
  isMine: boolean;
}

interface ChatPopupOverlayProps {
  gameRoom: string;
  /** Tailwind positioning classes for the container. Default sits above the bottom game bar. */
  positionClassName?: string;
  /** How long each popup stays visible (ms). */
  duration?: number;
  /** Max number of popups stacked at once. */
  maxVisible?: number;
}

/**
 * Floating animated chat popups for in-game chat.
 * Subscribes to realtime inserts on game_chat for the given room and
 * shows a brief animated bubble at the bottom of the game viewport
 * so players can see messages without opening the full chat panel.
 */
export function ChatPopupOverlay({
  gameRoom,
  positionClassName = "absolute left-2 right-2 bottom-2 z-30",
  duration = 5000,
  maxVisible = 4,
}: ChatPopupOverlayProps) {
  const { user } = useAuth();
  const [popups, setPopups] = useState<PopupMessage[]>([]);
  const timersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    const channel = supabase
      .channel(`game-chat-popup-${gameRoom}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "game_chat",
          filter: `game_room=eq.${gameRoom}`,
        },
        (payload) => {
          const row = payload.new as {
            id: string;
            user_id: string;
            username: string | null;
            content: string;
          };
          const popup: PopupMessage = {
            id: row.id,
            username: row.username || "Anon",
            content: row.content,
            isMine: row.user_id === user?.id,
          };
          setPopups((prev) => [...prev.slice(-(maxVisible - 1)), popup]);
          timersRef.current[popup.id] = setTimeout(() => {
            setPopups((prev) => prev.filter((p) => p.id !== popup.id));
            delete timersRef.current[popup.id];
          }, duration);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      Object.values(timersRef.current).forEach((t) => clearTimeout(t));
      timersRef.current = {};
    };
  }, [gameRoom, user?.id, duration, maxVisible]);

  if (popups.length === 0) return null;

  return (
    <div className={`pointer-events-none ${positionClassName} flex flex-col items-start gap-1.5`}>
      <AnimatePresence initial={false}>
        {popups.map((p) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, y: 16, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 320, damping: 26 }}
            className={`max-w-[85%] rounded-xl border backdrop-blur-md px-3 py-1.5 shadow-lg ${
              p.isMine
                ? "bg-[hsl(var(--casino-gold))]/85 border-[hsl(var(--casino-gold))]/70 text-accent-foreground"
                : "bg-black/70 border-white/15 text-white"
            }`}
          >
            <div className="flex items-start gap-1.5">
              <MessageCircle className="h-3 w-3 mt-0.5 shrink-0 opacity-80" />
              <div className="text-[11px] leading-tight break-words">
                <span className="font-bold mr-1 opacity-90">
                  {p.isMine ? "You" : p.username}:
                </span>
                <span>{p.content}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

export default ChatPopupOverlay;