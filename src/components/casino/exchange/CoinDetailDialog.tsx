import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkline } from "./Sparkline";
import { Star, Bell, TrendingUp, Globe, Shield, Trash2 } from "lucide-react";
import { useWatchlist } from "@/hooks/useWatchlist";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface CoinDetail {
  symbol: string;
  name: string;
  network: string;
  price: string;
  change: string;
  volume: string;
  status: string;
  risk: number;
  sector: string;
}

interface Alert {
  id: string;
  symbol: string;
  target_price: number;
  direction: string;
  is_active: boolean;
}

interface Props {
  coin: CoinDetail | null;
  open: boolean;
  onClose: () => void;
}

const NEWS = [
  "Liquidity providers rotate into Phantom incubation pools",
  "Audit cleared with 91/100 integrity score",
  "Whale wallet accumulated 1.2M tokens in last 24h",
  "Roadmap milestone unlocked — staking opens next week",
];

export function CoinDetailDialog({ coin, open, onClose }: Props) {
  const { user } = useAuth();
  const { has, toggle } = useWatchlist();
  const [alertPrice, setAlertPrice] = useState("");
  const [alertDir, setAlertDir] = useState<"above" | "below">("above");
  const [alerts, setAlerts] = useState<Alert[]>([]);

  useEffect(() => {
    if (!coin || !user) return;
    supabase
      .from("price_alerts")
      .select("id,symbol,target_price,direction,is_active")
      .eq("user_id", user.id)
      .eq("symbol", coin.symbol)
      .then(({ data }) => setAlerts((data as Alert[]) ?? []));
  }, [coin, user, open]);

  if (!coin) return null;

  const positive = !coin.change.startsWith("-");
  const watched = has(coin.symbol);

  const handleAlert = async () => {
    const price = parseFloat(alertPrice);
    if (!user || !price || price <= 0) {
      toast.error("Enter a valid target price");
      return;
    }
    const { data, error } = await supabase
      .from("price_alerts")
      .insert({ user_id: user.id, symbol: coin.symbol, target_price: price, direction: alertDir })
      .select("id,symbol,target_price,direction,is_active")
      .single();
    if (error) {
      toast.error("Could not save alert");
      return;
    }
    setAlerts((a) => [...a, data as Alert]);
    setAlertPrice("");
    toast.success(`Alert set for ${coin.symbol} ${alertDir} $${price}`);
  };

  const removeAlert = async (id: string) => {
    await supabase.from("price_alerts").delete().eq("id", id);
    setAlerts((a) => a.filter((x) => x.id !== id));
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-primary/15 font-display font-black text-primary text-lg">
              {coin.symbol.slice(0, 2)}
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-xl font-black">{coin.symbol}</span>
              <span className="block text-xs font-normal text-muted-foreground">{coin.name}</span>
            </span>
            <Button
              size="sm"
              variant={watched ? "gold" : "outline"}
              onClick={() => toggle(coin.symbol)}
            >
              <Star className={`h-4 w-4 ${watched ? "fill-current" : ""}`} />
            </Button>
          </DialogTitle>
        </DialogHeader>

        {/* Price + chart */}
        <div className="space-y-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-3xl font-black text-gold">{coin.price}</p>
              <p className={`text-sm font-bold ${positive ? "text-profit" : "text-loss"}`}>
                {coin.change} 24h
              </p>
            </div>
            <Sparkline seed={coin.symbol} positive={positive} width={200} height={64} />
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              ["Network", coin.network, Globe],
              ["Volume 24h", coin.volume, TrendingUp],
              ["Risk Score", `${coin.risk}/100`, Shield],
              ["Status", coin.status, Star],
            ].map(([label, value, Icon]: any) => (
              <div key={label} className="rounded-lg border border-border bg-secondary/50 p-2">
                <p className="text-[10px] uppercase text-muted-foreground flex items-center gap-1">
                  <Icon className="h-3 w-3" /> {label}
                </p>
                <b className="text-sm">{value}</b>
              </div>
            ))}
          </div>

          {/* Price alerts */}
          <div className="rounded-lg border border-border bg-card p-3 space-y-3">
            <h3 className="font-display text-sm font-black flex items-center gap-2">
              <Bell className="h-4 w-4 text-primary" /> Price Alerts
            </h3>
            <div className="flex gap-2">
              <select
                value={alertDir}
                onChange={(e) => setAlertDir(e.target.value as "above" | "below")}
                className="rounded-md border border-border bg-secondary px-2 text-xs"
              >
                <option value="above">Above</option>
                <option value="below">Below</option>
              </select>
              <Input
                value={alertPrice}
                onChange={(e) => setAlertPrice(e.target.value)}
                placeholder="Target price USD"
                inputMode="decimal"
                className="text-sm"
              />
              <Button size="sm" variant="pink" onClick={handleAlert}>Set</Button>
            </div>
            {alerts.length > 0 && (
              <div className="space-y-1">
                {alerts.map((a) => (
                  <div key={a.id} className="flex items-center justify-between rounded-md bg-secondary/60 px-2 py-1 text-xs">
                    <span>
                      <b>{a.symbol}</b> {a.direction} <span className="text-gold">${a.target_price}</span>
                    </span>
                    <button onClick={() => removeAlert(a.id)} className="text-muted-foreground hover:text-loss">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* News feed */}
          <div className="rounded-lg border border-border bg-card p-3 space-y-2">
            <h3 className="font-display text-sm font-black">Latest News</h3>
            {NEWS.map((n) => (
              <div key={n} className="text-xs text-muted-foreground border-l-2 border-primary/40 pl-2">
                {n}
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}