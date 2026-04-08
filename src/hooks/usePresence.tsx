import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function usePresence() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const upsertPresence = async (isOnline: boolean) => {
      await supabase.from("user_presence" as any).upsert(
        { user_id: user.id, is_online: isOnline, last_seen: new Date().toISOString() },
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
  }, [user]);
}
