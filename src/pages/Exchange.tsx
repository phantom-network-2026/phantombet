import { useState, useEffect } from "react";
import { Header } from "@/components/casino/Header";
import { BottomNav } from "@/components/casino/BottomNav";
import { AuthGuard } from "@/components/casino/AuthGuard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowDownUp, TrendingUp, TrendingDown, Minus, Search, Clock, BadgeCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";

interface CryptoAsset {
  id: string;
  symbol: string;
  name: string;
  icon: string;
  price: number;
  change24h: number;
}

const DEFAULT_CRYPTO_LIST: CryptoAsset[] = [
  { id: "bitcoin", symbol: "BTC", name: "Bitcoin", icon: "₿", price: 0, change24h: 0 },
  { id: "ethereum", symbol: "ETH", name: "Ethereum", icon: "Ξ", price: 0, change24h: 0 },
  { id: "binancecoin", symbol: "BNB", name: "BNB", icon: "⬡", price: 0, change24h: 0 },
  { id: "solana", symbol: "SOL", name: "Solana", icon: "◎", price: 0, change24h: 0 },
  { id: "ripple", symbol: "XRP", name: "XRP", icon: "✕", price: 0, change24h: 0 },
  { id: "cardano", symbol: "ADA", name: "Cardano", icon: "₳", price: 0, change24h: 0 },
  { id: "dogecoin", symbol: "DOGE", name: "Dogecoin", icon: "Ð", price: 0, change24h: 0 },
  { id: "polkadot", symbol: "DOT", name: "Polkadot", icon: "●", price: 0, change24h: 0 },
  { id: "avalanche-2", symbol: "AVAX", name: "Avalanche", icon: "▲", price: 0, change24h: 0 },
  { id: "chainlink", symbol: "LINK", name: "Chainlink", icon: "⬡", price: 0, change24h: 0 },
  { id: "matic-network", symbol: "MATIC", name: "Polygon", icon: "⬡", price: 0, change24h: 0 },
  { id: "litecoin", symbol: "LTC", name: "Litecoin", icon: "Ł", price: 0, change24h: 0 },
  { id: "tron", symbol: "TRX", name: "TRON", icon: "◈", price: 0, change24h: 0 },
  { id: "shiba-inu", symbol: "SHIB", name: "Shiba Inu", icon: "🐕", price: 0, change24h: 0 },
];

interface WelcomeConfig {
  enabled: boolean;
  title: string;
  message: string;
  banner_url: string;
}

const DEFAULT_WELCOME: WelcomeConfig = {
  enabled: true,
  title: "Exchange — Launching in a couple of weeks!",
  message: "Every coin listed below has been approved for listing at launch. Get ready to swap directly on PhantomBet.",
  banner_url: "",
};

export default function Exchange() {
  const [coinList, setCoinList] = useState<CryptoAsset[]>(DEFAULT_CRYPTO_LIST);
  const [cryptos, setCryptos] = useState<CryptoAsset[]>(DEFAULT_CRYPTO_LIST);
  const [selected, setSelected] = useState<CryptoAsset | null>(null);
  const [amount, setAmount] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [welcome, setWelcome] = useState<WelcomeConfig>(DEFAULT_WELCOME);

  useEffect(() => {
    (async () => {
      // Fetch admin-configured coin list & welcome banner
      let list = DEFAULT_CRYPTO_LIST;
      try {
        const { data } = await supabase.functions.invoke("get-public-settings", {
          body: { keys: ["exchange_coins", "exchange_welcome"] },
        });
        const settings = (data as any)?.settings || {};
        if (settings.exchange_coins?.coins?.length) {
          list = settings.exchange_coins.coins.map((c: any) => ({
            id: c.id, symbol: c.symbol, name: c.name, icon: c.icon || c.symbol?.charAt(0) || "•",
            price: 0, change24h: 0,
          }));
        }
        if (settings.exchange_welcome) {
          setWelcome({ ...DEFAULT_WELCOME, ...settings.exchange_welcome });
        }
      } catch { /* fall back to defaults */ }
      setCoinList(list);
      setCryptos(list);

      // Fetch live prices
      try {
        const ids = list.map((c) => c.id).join(",");
        const res = await fetch(
          `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`
        );
        const priceData = await res.json();
        setCryptos(
          list.map((c) => ({
            ...c,
            price: priceData[c.id]?.usd ?? 0,
            change24h: priceData[c.id]?.usd_24h_change ?? 0,
          }))
        );
      } catch { /* keep zeros */ }
      setLoading(false);
    })();
  }, []);

  const filtered = cryptos.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.symbol.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const usdtValue = selected && amount ? parseFloat(amount) * selected.price : 0;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <AuthGuard>
        <div className="container max-w-lg mx-auto px-4 pt-4 pb-24 space-y-5">
          {/* Page header */}
          <div>
            <h1 className="font-display text-2xl font-black text-foreground">Exchange</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Trade crypto to USDT instantly</p>
          </div>

          {/* Coming soon banner */}
          {welcome.enabled && (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-xl border border-[hsl(var(--casino-gold))/0.25] bg-[hsl(var(--casino-gold))/0.06] overflow-hidden"
          >
            {welcome.banner_url && (
              <img src={welcome.banner_url} alt="Exchange launch" className="w-full h-32 object-cover" />
            )}
            <div className="p-4 flex items-start gap-3">
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="shrink-0 rounded-lg bg-[hsl(var(--casino-gold))/0.12] p-2"
              >
                <Clock className="h-5 w-5 text-[hsl(var(--casino-gold))]" />
              </motion.div>
              <div className="flex-1">
                <p className="text-sm font-bold text-[hsl(var(--casino-gold))]">{welcome.title}</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5 whitespace-pre-line">
                  {welcome.message}
                </p>
                <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[hsl(var(--casino-green))/0.12] border border-[hsl(var(--casino-green))/0.3] px-2 py-0.5">
                  <BadgeCheck className="h-3 w-3 text-[hsl(var(--casino-green))]" />
                  <span className="text-[10px] font-semibold text-[hsl(var(--casino-green))]">All coins below approved for listing at launch</span>
                </div>
              </div>
            </div>
          </motion.div>
          )}

          {/* Swap card */}
          <AnimatePresence mode="wait">
            {selected ? (
              <motion.div
                key="swap"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="rounded-2xl border border-border bg-card p-5 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setSelected(null)}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    ← Back to list
                  </button>
                  <span className="text-[10px] text-muted-foreground">
                    1 {selected.symbol} = ${selected.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </span>
                </div>

                {/* From */}
                <div className="rounded-xl bg-secondary/60 border border-border/50 p-4 space-y-2">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">You send</p>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[hsl(var(--casino-gold))] to-[hsl(var(--casino-gold))/0.6] flex items-center justify-center text-background font-bold text-lg shrink-0">
                      {selected.icon}
                    </div>
                    <div className="flex-1">
                      <Input
                        type="number"
                        placeholder="0.00"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="bg-transparent border-none text-xl font-bold p-0 h-auto focus-visible:ring-0"
                      />
                    </div>
                    <span className="text-sm font-bold text-muted-foreground">{selected.symbol}</span>
                  </div>
                </div>

                {/* Arrow */}
                <div className="flex justify-center">
                  <div className="h-9 w-9 rounded-full bg-[hsl(var(--casino-gold))/0.15] border border-[hsl(var(--casino-gold))/0.3] flex items-center justify-center">
                    <ArrowDownUp className="h-4 w-4 text-[hsl(var(--casino-gold))]" />
                  </div>
                </div>

                {/* To */}
                <div className="rounded-xl bg-secondary/60 border border-border/50 p-4 space-y-2">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">You receive</p>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[hsl(var(--casino-green))] to-[hsl(var(--casino-green))/0.6] flex items-center justify-center text-background font-bold text-sm shrink-0">
                      ₮
                    </div>
                    <p className="text-xl font-bold text-foreground flex-1">
                      {usdtValue > 0 ? usdtValue.toLocaleString(undefined, { maximumFractionDigits: 2 }) : "0.00"}
                    </p>
                    <span className="text-sm font-bold text-muted-foreground">USDT</span>
                  </div>
                </div>

                <Button variant="gold" className="w-full" disabled={!amount || usdtValue <= 0}>
                  Swap to USDT
                </Button>

                <p className="text-[10px] text-center text-muted-foreground">
                  Exchange rates are estimates. Final rate confirmed at swap time.
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="list"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                {/* Search */}
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search coins..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 bg-secondary border-border rounded-xl h-10"
                  />
                </div>

                {/* Crypto list */}
                <div className="space-y-2">
                  {loading
                    ? Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="rounded-xl bg-card border border-border p-4 animate-pulse">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-secondary" />
                            <div className="flex-1 space-y-2">
                              <div className="h-3 w-20 bg-secondary rounded" />
                              <div className="h-2.5 w-12 bg-secondary rounded" />
                            </div>
                            <div className="h-3 w-16 bg-secondary rounded" />
                          </div>
                        </div>
                      ))
                    : filtered.map((crypto, i) => (
                        <motion.div
                          key={crypto.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.03 }}
                          className="w-full rounded-xl bg-card border border-border p-4 flex items-center gap-3 opacity-60 cursor-not-allowed"
                        >
                          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-secondary to-secondary/60 flex items-center justify-center text-lg font-bold text-foreground shrink-0 group-hover:from-[hsl(var(--casino-gold))/0.2] group-hover:to-[hsl(var(--casino-gold))/0.05] transition-all">
                            {crypto.icon}
                          </div>
                          <div className="flex-1 text-left min-w-0">
                            <p className="text-sm font-bold text-foreground">{crypto.name}</p>
                            <p className="text-[11px] text-muted-foreground">{crypto.symbol}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-bold text-foreground">
                              ${crypto.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                            </p>
                            <div className={`flex items-center justify-end gap-0.5 text-[11px] font-semibold ${
                              crypto.change24h > 0
                                ? "text-[hsl(var(--casino-green))]"
                                : crypto.change24h < 0
                                ? "text-destructive"
                                : "text-muted-foreground"
                            }`}>
                              {crypto.change24h > 0 ? (
                                <TrendingUp className="h-3 w-3" />
                              ) : crypto.change24h < 0 ? (
                                <TrendingDown className="h-3 w-3" />
                              ) : (
                                <Minus className="h-3 w-3" />
                              )}
                              {Math.abs(crypto.change24h).toFixed(2)}%
                            </div>
                          </div>
                        </motion.div>
                      ))}
                  {!loading && filtered.length === 0 && (
                    <p className="text-center text-sm text-muted-foreground py-8">No coins found</p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </AuthGuard>
      <BottomNav />
    </div>
  );
}
