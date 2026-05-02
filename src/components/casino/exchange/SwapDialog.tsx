import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowDownUp, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface Coin {
  symbol: string;
  name?: string;
  price?: number | string;
}

interface SwapDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  coins: Coin[];
  defaultFrom?: string;
  defaultTo?: string;
  onCompleted?: () => void;
}

function parsePrice(p: number | string | undefined): number {
  if (p == null) return 0;
  if (typeof p === "number") return p;
  return Number(String(p).replace(/[^0-9.\-]/g, "")) || 0;
}

export function SwapDialog({ open, onOpenChange, coins, defaultFrom = "USDT", defaultTo = "BTC", onCompleted }: SwapDialogProps) {
  const [fromSymbol, setFromSymbol] = useState(defaultFrom);
  const [toSymbol, setToSymbol] = useState(defaultTo);
  const [amount, setAmount] = useState("100");
  const [quote, setQuote] = useState<{ to_amount: number; rate: number; fee_usd: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setFromSymbol(defaultFrom);
      setToSymbol(defaultTo);
    }
  }, [open, defaultFrom, defaultTo]);

  const fromCoin = useMemo(() => coins.find((c) => c.symbol === fromSymbol), [coins, fromSymbol]);
  const toCoin = useMemo(() => coins.find((c) => c.symbol === toSymbol), [coins, toSymbol]);

  // Local instant estimate (replaced once server quote returns)
  const localEstimate = useMemo(() => {
    const fp = parsePrice(fromCoin?.price);
    const tp = parsePrice(toCoin?.price);
    const a = Number(amount);
    if (!fp || !tp || !a) return 0;
    return (a * fp * 0.997) / tp;
  }, [fromCoin, toCoin, amount]);

  useEffect(() => {
    if (!open) return;
    const a = Number(amount);
    if (!a || a <= 0 || fromSymbol === toSymbol) { setQuote(null); return; }
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(async () => {
      const { data, error } = await supabase.functions.invoke("swap-coins", {
        body: { action: "quote", from_symbol: fromSymbol, to_symbol: toSymbol, from_amount: a },
      });
      if (cancelled) return;
      setLoading(false);
      if (error || (data as any)?.error) { setQuote(null); return; }
      setQuote({ to_amount: (data as any).to_amount, rate: (data as any).rate, fee_usd: (data as any).fee_usd });
    }, 350);
    return () => { cancelled = true; clearTimeout(t); };
  }, [open, fromSymbol, toSymbol, amount]);

  function flip() {
    setFromSymbol(toSymbol);
    setToSymbol(fromSymbol);
  }

  async function executeSwap() {
    const a = Number(amount);
    if (!a || a <= 0) { toast.error("Enter an amount"); return; }
    setSubmitting(true);
    const { data, error } = await supabase.functions.invoke("swap-coins", {
      body: { action: "swap", from_symbol: fromSymbol, to_symbol: toSymbol, from_amount: a },
    });
    setSubmitting(false);
    if (error || (data as any)?.error) {
      toast.error((data as any)?.error || error?.message || "Swap failed");
      return;
    }
    toast.success(`Swapped ${a} ${fromSymbol} → ${(data as any).to_amount.toFixed(6)} ${toSymbol}`);
    onCompleted?.();
    onOpenChange(false);
  }

  const displayTo = quote?.to_amount ?? localEstimate;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display">
            <ArrowDownUp className="text-primary" /> Instant Swap
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="rounded-lg border border-border bg-secondary/80 p-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>From</span>
              <select
                value={fromSymbol}
                onChange={(e) => setFromSymbol(e.target.value)}
                className="bg-transparent text-foreground font-bold outline-none"
              >
                {coins.map((c) => <option key={`f-${c.symbol}`} value={c.symbol}>{c.symbol}</option>)}
              </select>
            </div>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-2 text-xl font-bold border-0 bg-transparent p-0 focus-visible:ring-0"
            />
          </div>

          <button onClick={flip} className="mx-auto grid h-10 w-10 place-items-center rounded-full border border-primary/40 bg-primary/10 hover:bg-primary/20 transition">
            <ArrowDownUp className="h-4 w-4 text-primary" />
          </button>

          <div className="rounded-lg border border-border bg-secondary/80 p-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>To</span>
              <select
                value={toSymbol}
                onChange={(e) => setToSymbol(e.target.value)}
                className="bg-transparent text-foreground font-bold outline-none"
              >
                {coins.filter((c) => c.symbol !== fromSymbol).map((c) => <option key={`t-${c.symbol}`} value={c.symbol}>{c.symbol}</option>)}
              </select>
            </div>
            <p className="mt-2 text-xl font-bold text-gold">
              {loading ? <Loader2 className="h-5 w-5 animate-spin inline" /> : displayTo.toLocaleString(undefined, { maximumFractionDigits: 8 })}
            </p>
          </div>

          <div className="text-xs text-muted-foreground space-y-1 px-1">
            {quote && (
              <>
                <div className="flex justify-between"><span>Rate</span><span>1 {fromSymbol} ≈ {quote.rate.toLocaleString(undefined, { maximumFractionDigits: 8 })} {toSymbol}</span></div>
                <div className="flex justify-between"><span>Fee (0.30%)</span><span>${quote.fee_usd.toFixed(4)}</span></div>
              </>
            )}
            {!quote && <div>Live quote updates as you type.</div>}
          </div>

          <Button variant="pink" className="w-full" disabled={submitting || loading || !quote} onClick={executeSwap}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {submitting ? "Swapping…" : `Swap ${fromSymbol} → ${toSymbol}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}