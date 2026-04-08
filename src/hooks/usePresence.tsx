import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type AppearanceStatus = "online" | "offline" | "idle";

export function usePresence() {
  const { user } = useAuth();
  const [appearanceStatus, setAppearanceStatusState] = useState<AppearanceStatus>("online");

  useEffect(() => {
    if (!user) return;
    // Load saved appearance
    const saved = localStorage.getItem(`presence_appearance_${user.id}`);
    if (saved && ["online", "offline", "idle"].includes(saved)) {
      setAppearanceStatusState(saved as AppearanceStatus);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const upsertPresence = async (isOnline: boolean) => {
      await supabase.from("user_presence" as any).upsert(
        {
          user_id: user.id,
          is_online: isOnline,
          last_seen: new Date().toISOString(),
          appearance_status: appearanceStatus,
        },
        { onConflict: "user_id" }
      );
    };

    upsertPresence(true);
    const interval = setInterval(() => upsertPresence(true), 30000);

    const handleBeforeUnload = () => {
      navigator.sendBeacon && upsertPresence(false);
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      clearInterval(interval);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      upsertPresence(false);
    };
  }, [user, appearanceStatus]);

  const setAppearanceStatus = useCallback((status: AppearanceStatus) => {
    setAppearanceStatusState(status);
    if (user) {
      localStorage.setItem(`presence_appearance_${user.id}`, status);
      supabase.from("user_presence" as any).upsert(
        {
          user_id: user.id,
          is_online: true,
          last_seen: new Date().toISOString(),
          appearance_status: status,
        },
        { onConflict: "user_id" }
      );
    }
  }, [user]);

  return { appearanceStatus, setAppearanceStatus };
}

/** Helper to get the display status color classes */
export function getStatusColor(status: string): string {
  switch (status) {
    case "online": return "fill-green-400 text-green-400";
    case "idle": return "fill-yellow-400 text-yellow-400";
    case "offline": return "fill-muted-foreground/30 text-muted-foreground/30";
    default: return "fill-muted-foreground/30 text-muted-foreground/30";
  }
}

export function getStatusLabel(status: string): string {
  switch (status) {
    case "online": return "Online";
    case "idle": return "Idle";
    case "offline": return "Offline";
    default: return "Offline";
  }
}
