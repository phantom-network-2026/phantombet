import { useMemo } from "react";
import { Wallet, ArrowDownUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCoinHoldings } from "@/hooks/useCoinHoldings";

interface Coin {
  symbol: string;
  name?: string;
  price?: number | string;
}

interface Props {
  coins: Coin[];
  onSwap?: (symbol: string) => void;
}

function parsePrice(p: number | string | undefined): number {
  if (p == null) return 0;
  if (typeof p === "number") return p;
  return Number(String(p).replace(/[^0-9.\-]/g, "")) || 0;
}

export function HoldingsPanel({ coins, onSwap }: Props) {
  const { holdings, loading } = useCoinHoldings();

  const priceBySymbol = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of coins) m.set(c.symbol, parsePrice(c.price));
    return m;
  }, [coins]);

  const enriched = useMemo(() => {
    return holdings.map((h) => {
      const price = priceBySymbol.get(h.symbol) ?? (h.symbol === "USDT" ? 1 : 0);
      return { ...h, price, value: h.available * price };
    });
  }, [holdings, priceBySymbol]);

  const total = enriched.reduce((sum, h) => sum + h.value, 0);

  return (
    <section className="glass-panel border border-border rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-black flex items-center gap-2">
          <Wallet className="text-primary" /> Your Holdings
        </h2>
        <div className="text-right">
          <p className="text-[10px] uppercase text-muted-foreground">Total</p>
          <p className="font-bold text-gold">${total.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
        </div>
      </div>

      {loading && <p className="text-xs text-muted-foreground">Loading…</p>}
      {!loading && enriched.length === 0 && (
        <p className="text-xs text-muted-foreground">
          No coin holdings yet. Deposit USDT or swap from your USD balance to get started.
        </p>
      )}

      <div className="space-y-1.5">
        {enriched.map((h) => (
          <div key={h.symbol} className="flex items-center justify-between rounded-lg bg-secondary/80 p-2.5">
            <div className="min-w-0">
              <p className="font-bold text-sm">{h.symbol}</p>
              <p className="text-[10px] text-muted-foreground truncate">
                {h.available.toLocaleString(undefined, { maximumFractionDigits: 8 })}
                {h.locked > 0 && ` · ${h.locked.toFixed(4)} locked`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-right">
                <p className="text-sm font-bold text-gold">
                  ${h.value.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </p>
                {h.price > 0 && (
                  <p className="text-[10px] text-muted-foreground">
                    @ ${h.price.toLocaleString(undefined, { maximumFractionDigits: h.price < 1 ? 6 : 2 })}
                  </p>
                )}
              </div>
              {onSwap && (
                <Button size="icon" variant="glass" className="h-7 w-7" onClick={() => onSwap(h.symbol)}>
                  <ArrowDownUp className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}