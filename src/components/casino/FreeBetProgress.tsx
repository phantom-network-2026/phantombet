import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Gift, CheckCircle2, Clock } from "lucide-react";

interface Row {
  status: "pending" | "qualified" | "awarded" | "expired";
  deposit_progress: number;
  wager_progress: number;
  deposit_required: number;
  wager_required: number;
  award_amount: number;
  expires_at: string;
  awarded_at: string | null;
}

export function FreeBetProgress() {
  const { user } = useAuth();
  const [row, setRow] = useState<Row | null>(null);

  useEffect(() => {
    if (!user) return;
    let active = true;
    const load = async () => {
      const { data } = await supabase
        .from("free_bet_progress" as any)
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (active) setRow((data as any) || null);
    };
    load();
    // Refresh every 30s in case bet/deposit settles
    const t = setInterval(load, 30000);
    // Realtime updates
    const ch = supabase
      .channel("free-bet-progress")
      .on("postgres_changes", { event: "*", schema: "public", table: "free_bet_progress", filter: `user_id=eq.${user.id}` }, load)
      .subscribe();
    return () => { active = false; clearInterval(t); supabase.removeChannel(ch); };
  }, [user]);

  if (!user || !row) return null;
  if (row.status === "expired") return null;

  const depPct = Math.min(100, (Number(row.deposit_progress) / Number(row.deposit_required)) * 100);
  const wagPct = Math.min(100, (Number(row.wager_progress) / Number(row.wager_required)) * 100);
  const awarded = row.status === "awarded";
  const daysLeft = Math.max(0, Math.ceil((new Date(row.expires_at).getTime() - Date.now()) / 86400000));

  return (
    <div className="rounded-xl border border-casino-gold/30 bg-gradient-to-br from-casino-gold/10 to-transparent p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {awarded ? <CheckCircle2 className="h-4 w-4 text-green-400" /> : <Gift className="h-4 w-4 text-casino-gold" />}
          <p className="text-xs font-display font-bold uppercase tracking-wide text-casino-gold">
            {awarded ? `$${row.award_amount} Free Bet Awarded` : `$${row.award_amount} Free Bet Promo`}
          </p>
        </div>
        {!awarded && (
          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" />{daysLeft}d left
          </span>
        )}
      </div>
      {awarded ? (
        <p className="text-[11px] text-muted-foreground">Your $5 has been credited to your bonus balance — enjoy!</p>
      ) : (
        <div className="space-y-1.5">
          <ProgressRow label="Deposit" cur={Number(row.deposit_progress)} req={Number(row.deposit_required)} pct={depPct} />
          <ProgressRow label="Wagered" cur={Number(row.wager_progress)} req={Number(row.wager_required)} pct={wagPct} />
          <p className="text-[10px] text-muted-foreground pt-0.5">Deposit ${row.deposit_required} & wager ${row.wager_required} within 30 days to unlock your free bet.</p>
        </div>
      )}
    </div>
  );
}

function ProgressRow({ label, cur, req, pct }: { label: string; cur: number; req: number; pct: number }) {
  return (
    <div>
      <div className="flex items-center justify-between text-[10px] mb-0.5">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold text-foreground">${cur.toFixed(2)} / ${req.toFixed(2)}</span>
      </div>
      <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
        <div className="h-full bg-gradient-to-r from-casino-gold to-amber-400 transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
