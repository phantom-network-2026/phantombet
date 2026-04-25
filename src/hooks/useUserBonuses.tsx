import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface UserBonus {
  id: string;
  bonus_type: string;
  source: string;
  source_label: string | null;
  total_count: number;
  remaining_count: number;
  stake_value: number;
  status: "active" | "used" | "expired";
  awarded_at: string;
  expires_at: string;
}

export function useUserBonuses() {
  const { user } = useAuth();
  const [bonuses, setBonuses] = useState<UserBonus[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setBonuses([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    // Opportunistically expire stale bonuses
    await supabase.rpc("expire_old_bonuses" as any, { p_user_id: user.id });
    const { data } = await supabase
      .from("user_bonuses" as any)
      .select("*")
      .eq("user_id", user.id)
      .order("expires_at", { ascending: true });
    setBonuses(((data as unknown) as UserBonus[]) || []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("user-bonuses-" + user.id)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_bonuses", filter: `user_id=eq.${user.id}` },
        () => refresh(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, refresh]);

  const active = bonuses.filter((b) => b.status === "active" && b.remaining_count > 0);
  const totalFreeSpins = active
    .filter((b) => b.bonus_type === "free_spin")
    .reduce((sum, b) => sum + b.remaining_count, 0);
  const expiringSoon = active.filter((b) => {
    const days = (new Date(b.expires_at).getTime() - Date.now()) / 86400000;
    return days <= 3;
  });

  const consumeFreeSpin = useCallback(async () => {
    if (!user) return { success: false, stake_value: 0 };
    const { data, error } = await supabase.rpc("consume_free_spin" as any, {
      p_user_id: user.id,
    });
    if (error) return { success: false, stake_value: 0 };
    const row = Array.isArray(data) ? data[0] : data;
    await refresh();
    return {
      success: !!row?.success,
      stake_value: Number(row?.stake_value || 0),
    };
  }, [user, refresh]);

  return { bonuses, active, totalFreeSpins, expiringSoon, loading, refresh, consumeFreeSpin };
}