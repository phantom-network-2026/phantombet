import { useNavigate } from "react-router-dom";
import { Sparkles, Clock, Gift, AlertTriangle, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useUserBonuses } from "@/hooks/useUserBonuses";

function formatRemaining(expiresAt: string) {
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return "expired";
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  if (days >= 1) return `${days}d ${hours}h left`;
  const mins = Math.floor((ms % 3600000) / 60000);
  return `${hours}h ${mins}m left`;
}

export function MyBonusesPanel() {
  const navigate = useNavigate();
  const { active, totalFreeSpins, expiringSoon, bonuses, loading } = useUserBonuses();

  const expired = bonuses.filter((b) => b.status === "expired").slice(0, 3);
  const used = bonuses.filter((b) => b.status === "used").slice(0, 3);

  return (
    <div className="rounded-xl border border-border bg-card/60 backdrop-blur p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Gift className="h-5 w-5 text-casino-gold" />
          <h3 className="font-display font-bold text-base">My Bonuses</h3>
        </div>
        <Badge variant="outline" className="border-casino-gold text-casino-gold">
          {totalFreeSpins} Free Spin{totalFreeSpins === 1 ? "" : "s"}
        </Badge>
      </div>

      {loading ? (
        <p className="text-xs text-muted-foreground">Loading…</p>
      ) : active.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border/60 p-4 text-center space-y-2">
          <Sparkles className="h-6 w-6 text-muted-foreground mx-auto" />
          <p className="text-sm text-muted-foreground">No active bonuses yet.</p>
          <Button size="sm" variant="secondary" onClick={() => navigate("/prize-reel")}>
            Spin the Daily Prize Reel <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {active.map((b) => {
            const expSoon = expiringSoon.some((e) => e.id === b.id);
            return (
              <div
                key={b.id}
                className={`rounded-lg border p-3 flex items-center justify-between gap-3 ${
                  expSoon ? "border-casino-gold/60 bg-casino-gold/5" : "border-border bg-secondary/30"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="h-9 w-9 rounded-full bg-casino-gold/15 flex items-center justify-center shrink-0">
                    <Sparkles className="h-4 w-4 text-casino-gold" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">
                      {b.remaining_count} × Free Spin
                      <span className="text-muted-foreground font-normal"> · ${b.stake_value.toFixed(2)} stake</span>
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {b.source_label || b.source} · {formatRemaining(b.expires_at)}
                    </p>
                  </div>
                </div>
                {expSoon && (
                  <Badge className="bg-casino-gold/20 text-casino-gold border-casino-gold/40 text-[10px] shrink-0">
                    <Clock className="h-3 w-3 mr-1" /> Expiring
                  </Badge>
                )}
              </div>
            );
          })}

          <Button
            size="sm"
            className="w-full mt-2"
            onClick={() => navigate("/games?category=slots")}
          >
            Use a Free Spin on a Slot <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </div>
      )}

      {expiringSoon.length > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-casino-gold/40 bg-casino-gold/5 p-2">
          <AlertTriangle className="h-4 w-4 text-casino-gold mt-0.5 shrink-0" />
          <p className="text-[11px] text-muted-foreground">
            <span className="text-casino-gold font-semibold">Heads up:</span> {expiringSoon.length} bonus
            {expiringSoon.length === 1 ? "" : "es"} expiring within 3 days.
          </p>
        </div>
      )}

      {(used.length > 0 || expired.length > 0) && (
        <details className="group">
          <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
            History ({used.length + expired.length})
          </summary>
          <div className="mt-2 space-y-1">
            {used.map((b) => (
              <div key={b.id} className="text-[11px] text-muted-foreground flex justify-between">
                <span>✓ {b.total_count} × free spin · {b.source_label || b.source}</span>
                <span>used</span>
              </div>
            ))}
            {expired.map((b) => (
              <div key={b.id} className="text-[11px] text-muted-foreground/70 flex justify-between">
                <span>✗ {b.remaining_count}/{b.total_count} × free spin · {b.source_label || b.source}</span>
                <span>expired</span>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}