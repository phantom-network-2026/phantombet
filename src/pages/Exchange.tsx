import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/casino/Header";
import { BottomNav } from "@/components/casino/BottomNav";
import { AuthGuard } from "@/components/casino/AuthGuard";
import { FakeTradesTicker } from "@/components/casino/FakeTradesTicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Activity, ArrowDownUp, BarChart3, Boxes, ChevronDown, Crown, Gauge,
  Globe, Rocket, Search, Shield, Zap, Coins, Sparkles, Star, Bell,
} from "lucide-react";
import { toast } from "sonner";
import { Sparkline } from "@/components/casino/exchange/Sparkline";
import { CoinDetailDialog, type CoinDetail } from "@/components/casino/exchange/CoinDetailDialog";
import { SwapDialog } from "@/components/casino/exchange/SwapDialog";
import { useWatchlist } from "@/hooks/useWatchlist";
import { useExchangeCoins } from "@/hooks/useExchangeCoins";

const markets = [
  ["PHX/USDT", "$0.0521", "+28.4%", "148M", "Listed"],
  ["SHDW/ETH", "$1.86", "+7.8%", "32M", "Incubating"],
  ["WRAITH/USDT", "$0.0084", "-3.2%", "81M", "Watch"],
  ["GHOST/USDT", "$0.114", "+14.6%", "17M", "Listed"],
];

const platformDirectoryFallback = [
  { symbol: "BTC", name: "Bitcoin", network: "Bitcoin", price: "$63,420", change: "+2.1%", volume: "912M", status: "Listed", risk: 8, sector: "Majors" },
  { symbol: "ETH", name: "Ethereum", network: "Ethereum", price: "$3,180", change: "+3.6%", volume: "744M", status: "Listed", risk: 12, sector: "Majors" },
  { symbol: "SOL", name: "Solana", network: "Solana", price: "$142.60", change: "+6.4%", volume: "268M", status: "Listed", risk: 22, sector: "Layer 1" },
  { symbol: "BNB", name: "BNB", network: "BNB Chain", price: "$586.20", change: "+1.7%", volume: "118M", status: "Listed", risk: 18, sector: "Layer 1" },
  { symbol: "XRP", name: "XRP", network: "XRPL", price: "$0.61", change: "+4.2%", volume: "96M", status: "Listed", risk: 28, sector: "Payments" },
  { symbol: "DOGE", name: "Dogecoin", network: "Dogecoin", price: "$0.14", change: "+8.8%", volume: "82M", status: "Listed", risk: 42, sector: "Meme" },
  { symbol: "USDT", name: "Tether", network: "Multi-chain", price: "$1.00", change: "+0.0%", volume: "1.8B", status: "Listed", risk: 20, sector: "Stablecoin" },
  { symbol: "USDC", name: "USD Coin", network: "Multi-chain", price: "$1.00", change: "+0.0%", volume: "1.1B", status: "Listed", risk: 14, sector: "Stablecoin" },
  { symbol: "PHX", name: "Phantom Exchange", network: "Ethereum", price: "$0.0521", change: "+28.4%", volume: "148M", status: "Listed", risk: 18, sector: "Phantom" },
  { symbol: "GHOST", name: "Ghost Protocol", network: "Base", price: "$0.114", change: "+14.6%", volume: "17M", status: "Listed", risk: 31, sector: "Phantom" },
  { symbol: "SHDW", name: "Shadow Coin", network: "Ethereum", price: "$1.86", change: "+7.8%", volume: "32M", status: "Incubating", risk: 47, sector: "Launchpad" },
  { symbol: "WRAITH", name: "Wraith", network: "Polygon", price: "$0.0084", change: "-3.2%", volume: "81M", status: "Watch", risk: 66, sector: "High Risk" },
];

const exchangeMenus = [
  { id: "trade", label: "Trade", icon: ArrowDownUp, options: ["Instant swap", "Limit orders", "Stop-loss", "TWAP", "Recurring buys", "Copy trade", "P2P desk", "OTC quote"] },
  { id: "markets", label: "Markets", icon: BarChart3, options: ["All coins", "New listings", "Top gainers", "High volume", "Stablecoins", "Meme coins", "Layer 1", "Watchlist"] },
  { id: "launch", label: "Launch", icon: Rocket, options: ["Coin installer", "Pool architect", "Source audit", "Tokenomics", "Vesting", "Airdrops", "Presale", "Listing queue"] },
  { id: "analytics", label: "Analytics", icon: Gauge, options: ["Depth", "Liquidity", "Holder map", "Whale alerts", "Integrity scanner", "Fee simulator", "PnL", "Tax export"] },
  { id: "security", label: "Security", icon: Shield, options: ["KYC status", "Withdrawal locks", "Device sessions", "API keys", "2FA", "Cold wallet", "Contract checks", "Report scam"] },
];

const orderBook: [string, string, "buy" | "sell"][] = [
  ["0.0528", "21,500", "sell"], ["0.0525", "18,420", "sell"], ["0.0522", "9,880", "sell"],
  ["0.0519", "12,140", "buy"], ["0.0516", "27,910", "buy"], ["0.0512", "34,805", "buy"],
];

const activity = [
  "Pool Architect seeded SHDW with 42 ETH",
  "Integrity scanner cleared PHX audit band",
  "Maker fee tier reduced for Apex traders",
  "Cold wallet quorum signed withdrawal batch",
];

import exchangeBanner from "@/assets/phantom-exchange-banner.png";
import freeListingBanner from "@/assets/free-listing-banner.jpg";

export default function Exchange() {
  const navigate = useNavigate();
  const [fromAmount, setFromAmount] = useState("250");
  const [activeMenu, setActiveMenu] = useState("trade");
  const [assetFilter, setAssetFilter] = useState("All");
  const [assetSearch, setAssetSearch] = useState("");
  const [selectedCoin, setSelectedCoin] = useState<CoinDetail | null>(null);
  const [showWatchlistOnly, setShowWatchlistOnly] = useState(false);
  const [swapOpen, setSwapOpen] = useState(false);
  const [swapDefaults, setSwapDefaults] = useState<{ from: string; to: string }>({ from: "USDT", to: "BTC" });
  const { has: isWatched, toggle: toggleWatch } = useWatchlist();
  const { coins: liveCoins, loading: liveLoading } = useExchangeCoins();
  const platformDirectory = liveCoins.length > 0 ? liveCoins : platformDirectoryFallback;

  const estimate = useMemo(
    () => (Number(fromAmount || 0) / 0.0521).toLocaleString(undefined, { maximumFractionDigits: 2 }),
    [fromAmount]
  );
  const sectors = useMemo(
    () => ["All", ...Array.from(new Set(platformDirectory.map((c) => c.sector)))],
    [platformDirectory]
  );
  const listedAssets = useMemo(() => platformDirectory.filter((coin) => {
    const matchesSector = assetFilter === "All" || coin.sector === assetFilter;
    const needle = assetSearch.trim().toLowerCase();
    const matchesSearch = !needle || coin.symbol.toLowerCase().includes(needle) || coin.name.toLowerCase().includes(needle) || coin.network.toLowerCase().includes(needle);
    const matchesWatch = !showWatchlistOnly || isWatched(coin.symbol);
    return matchesSector && matchesSearch && matchesWatch;
  }), [assetFilter, assetSearch, showWatchlistOnly, isWatched, platformDirectory]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <FakeTradesTicker />
      <AuthGuard>
        <div className="container relative px-3 py-4 md:py-7 space-y-4 md:space-y-6 pb-24">
          {/* Banner */}
          <section className="relative overflow-hidden rounded-xl border border-primary/30 bg-card shadow-[0_20px_80px_hsl(var(--casino-gold)/0.10)] animate-slide-up">
            <img
              src={exchangeBanner}
              alt="Welcome to PHANTOM EXCHANGE non-KYC crypto trading banner"
              className="block aspect-[2.4/1] w-full object-cover object-center sm:aspect-[2.8/1] lg:aspect-[3.2/1]"
            />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-background/85 to-transparent" />
          </section>

          {/* Free Listing Banner */}
          <section className="relative overflow-hidden rounded-xl border border-casino-gold/40 bg-card shadow-[0_20px_80px_hsl(var(--casino-pink)/0.15)] animate-slide-up group cursor-pointer"
            onClick={() => navigate("/help?tab=list-coin")}
            role="button"
            aria-label="List your coin or token for free"
          >
            <img
              src={freeListingBanner}
              alt="Free coin and token listings on Phantom Exchange — building communities together"
              loading="lazy"
              width={1920}
              height={1080}
              className="block aspect-[2.8/1] w-full object-cover object-center sm:aspect-[3.2/1] lg:aspect-[3.6/1] transition-transform duration-500 group-hover:scale-[1.02]"
            />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-background/95 via-background/40 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
              <div>
                <p className="text-[10px] sm:text-xs uppercase tracking-widest text-casino-gold/80 font-bold flex items-center gap-1">
                  <Sparkles className="h-3 w-3" /> Community First
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground max-w-md">
                  We never charge to list your coin or token. Apply now and grow your community with us.
                </p>
              </div>
              <Button variant="gold" size="sm" className="shrink-0" onClick={(e) => { e.stopPropagation(); navigate("/help?tab=list-coin"); }}>
                <Coins className="h-4 w-4 mr-1" /> List Your Coin Free
              </Button>
            </div>
          </section>

          {/* Menu tabs */}
          <section className="glass-panel overflow-hidden rounded-xl border border-border animate-slide-up">
            <div className="grid grid-cols-2 gap-2 border-b border-border p-2 min-[380px]:grid-cols-3 sm:flex sm:overflow-x-auto">
              {exchangeMenus.map((menu) => {
                const Icon = menu.icon;
                const active = activeMenu === menu.id;
                return (
                  <button
                    key={menu.id}
                    onClick={() => setActiveMenu(menu.id)}
                    className={`flex min-w-0 items-center justify-center gap-1 rounded-lg px-2 py-2 text-[11px] font-bold transition min-[380px]:text-xs sm:shrink-0 sm:gap-2 sm:px-3 sm:text-sm ${
                      active
                        ? "gradient-gold text-primary-foreground"
                        : "bg-secondary/70 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{menu.label}</span>
                  </button>
                );
              })}
            </div>
            <div className="grid gap-2 p-3 sm:grid-cols-2 lg:grid-cols-4">
              {exchangeMenus.find((m) => m.id === activeMenu)?.options.map((option, index) => (
                <button
                  key={option}
                  onClick={() => toast.info(`${option} module ready for activation`)}
                  className="group flex min-h-16 items-center justify-between rounded-lg border border-border bg-secondary/70 p-3 text-left transition hover:border-primary/60 hover:bg-casino-surface-hover"
                >
                  <span>
                    <b className="block text-sm">{option}</b>
                    <span className="text-[11px] text-muted-foreground">{index < 3 ? "Live panel" : "Queued workspace"}</span>
                  </span>
                  <ChevronDown className="h-4 w-4 -rotate-90 text-primary transition group-hover:translate-x-0.5" />
                </button>
              ))}
            </div>
          </section>

          <section className="grid gap-4 xl:grid-cols-[.78fr_1.22fr_.62fr] items-start">
            {/* Left column: Instant Swap */}
            <div className="space-y-4">
              <section className="glass-panel border border-border rounded-xl p-4 space-y-4">
                <h2 className="font-display text-xl font-black flex items-center gap-2">
                  <ArrowDownUp className="text-primary" /> Instant Swap
                </h2>
                <div className="rounded-lg border border-border bg-secondary/80 p-3">
                  <p className="text-xs text-muted-foreground">From USDT</p>
                  <Input value={fromAmount} onChange={(e) => setFromAmount(e.target.value)} className="mt-2 text-xl font-bold" />
                </div>
                <div className="mx-auto grid h-10 w-10 place-items-center rounded-full border border-primary/40 bg-primary/10">
                  <ArrowDownUp className="h-4 w-4 text-primary" />
                </div>
                <div className="rounded-lg border border-border bg-secondary/80 p-3">
                  <p className="text-xs text-muted-foreground">To PHX</p>
                  <p className="mt-2 text-xl font-bold text-gold">{estimate}</p>
                </div>
                <Button
                  variant="pink"
                  className="w-full"
                  onClick={() => {
                    setSwapDefaults({ from: "USDT", to: "BTC" });
                    setSwapOpen(true);
                  }}
                >
                  Preview Swap
                </Button>
              </section>
            </div>

            {/* Middle column: Markets, Pool, Portfolio, Listed */}
            <div className="space-y-4">
              <section className="glass-panel border border-border rounded-xl overflow-hidden">
                <div className="flex items-center justify-between gap-3 p-4 border-b border-border">
                  <h2 className="font-display text-xl font-black flex items-center gap-2">
                    <BarChart3 className="text-primary" /> Markets
                  </h2>
                  <Button variant="glass" size="sm">Pro View <ChevronDown /></Button>
                </div>
                <div className="grid grid-cols-5 gap-2 px-4 py-2 text-[10px] uppercase text-muted-foreground">
                  <span>Pair</span><span>Price</span><span>24h</span><span>Volume</span><span>Status</span>
                </div>
                <div className="divide-y divide-border">
                  {markets.map(([pair, price, change, volume, status]) => (
                    <button key={pair} className="grid w-full grid-cols-5 gap-2 px-4 py-3 text-left text-sm hover:bg-secondary/60 transition">
                      <b>{pair}</b>
                      <span>{price}</span>
                      <span className={change.startsWith("-") ? "text-loss" : "text-profit"}>{change}</span>
                      <span className="text-muted-foreground">{volume}</span>
                      <span className="text-primary">{status}</span>
                    </button>
                  ))}
                </div>
              </section>

              <section className="grid gap-4 md:grid-cols-2">
                <div className="glass-panel border border-border rounded-xl p-4 space-y-4">
                  <h2 className="font-display text-xl font-black flex items-center gap-2">
                    <Boxes className="text-primary" /> Pool Architect
                  </h2>
                  <div className="rounded-lg border border-primary/30 bg-primary/10 p-3">
                    <p className="font-bold">Zero-value incubation</p>
                    <p className="text-sm text-muted-foreground">Seed reserves, set a bonding curve, then let the first market price discover itself.</p>
                  </div>
                  {["Base reserve: 42 ETH", "Curve: constant product", "Integrity score: 91/100"].map((x) => (
                    <div key={x} className="flex items-center justify-between rounded-lg bg-secondary px-3 py-2 text-sm">
                      <span>{x}</span>
                      <Shield className="h-4 w-4 text-profit" />
                    </div>
                  ))}
                  <Button variant="gold" className="w-full">Launch Pool</Button>
                </div>
                <div className="glass-panel border border-border rounded-xl p-4 space-y-4">
                  <h2 className="font-display text-xl font-black flex items-center gap-2">
                    <Crown className="text-primary" /> Portfolio
                  </h2>
                  {[["PHX", "42,880", "+$2,180"], ["SHDW", "7,400", "+$840"], ["USDT", "3,250", "$0"]].map(([asset, qty, pnl]) => (
                    <div key={asset} className="flex items-center justify-between rounded-lg bg-secondary p-3">
                      <div>
                        <b>{asset}</b>
                        <p className="text-xs text-muted-foreground">{qty} available</p>
                      </div>
                      <span className="text-profit">{pnl}</span>
                    </div>
                  ))}
                </div>
              </section>

              <section className="glass-panel border border-border rounded-xl overflow-hidden">
                <div className="flex flex-col gap-3 border-b border-border p-4 md:flex-row md:items-center md:justify-between">
                  <h2 className="font-display text-xl font-black flex items-center gap-2">
                    <Globe className="text-cyan" /> Listed Cryptocurrencies
                  </h2>
                  <div className="flex items-center gap-2 md:w-auto">
                    <Button
                      size="sm"
                      variant={showWatchlistOnly ? "gold" : "outline"}
                      onClick={() => setShowWatchlistOnly((v) => !v)}
                    >
                      <Star className={`h-3.5 w-3.5 mr-1 ${showWatchlistOnly ? "fill-current" : ""}`} />
                      Watchlist
                    </Button>
                    <div className="relative flex-1 md:w-64">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input value={assetSearch} onChange={(e) => setAssetSearch(e.target.value)} placeholder="Search coins" className="pl-9" />
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 p-3">
                  {sectors.map((sector) => (
                    <button
                      key={sector}
                      onClick={() => setAssetFilter(sector)}
                      className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                        assetFilter === sector
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-secondary text-muted-foreground"
                      }`}
                    >
                      {sector}
                    </button>
                  ))}
                </div>
                <div className="max-h-[420px] overflow-auto divide-y divide-border">
                  {listedAssets.length === 0 && (
                    <div className="px-4 py-12 text-center text-sm text-muted-foreground">
                      {showWatchlistOnly ? "Star a coin to add it to your watchlist." : "No coins match your filter."}
                    </div>
                  )}
                  {listedAssets.map((coin) => {
                    const positive = !coin.change.startsWith("-");
                    const watched = isWatched(coin.symbol);
                    return (
                      <div key={coin.symbol} className="flex items-center gap-3 px-4 py-3 transition hover:bg-secondary/60">
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleWatch(coin.symbol); }}
                          className={`shrink-0 ${watched ? "text-casino-gold" : "text-muted-foreground hover:text-casino-gold"}`}
                          aria-label={watched ? "Remove from watchlist" : "Add to watchlist"}
                        >
                          <Star className={`h-4 w-4 ${watched ? "fill-current" : ""}`} />
                        </button>
                        <button
                          onClick={() => setSelectedCoin(coin as CoinDetail)}
                          className="grid flex-1 min-w-0 grid-cols-[auto_1fr_auto] sm:grid-cols-[auto_1fr_auto_auto_auto] items-center gap-3 text-left text-xs sm:text-sm"
                        >
                          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/15 font-display font-black text-primary">{coin.symbol.slice(0, 2)}</span>
                          <span className="min-w-0">
                            <b className="block truncate">{coin.symbol}</b>
                            <span className="block truncate text-[10px] text-muted-foreground">{coin.name} · {coin.network}</span>
                          </span>
                          <Sparkline seed={coin.symbol} positive={positive} width={64} height={24} className="hidden sm:block" />
                          <span className="text-right">
                            <b className="block">{coin.price}</b>
                            <span className={`block text-[10px] ${positive ? "text-profit" : "text-loss"}`}>{coin.change}</span>
                          </span>
                          <span className={`hidden sm:inline text-[10px] ${coin.risk > 55 ? "text-loss" : coin.risk > 30 ? "text-primary" : "text-profit"}`}>R{coin.risk}</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>

            {/* Right column: Order Book + Integrity */}
            <div className="space-y-4">
              <section className="glass-panel border border-border rounded-xl p-4 space-y-3">
                <h2 className="font-display text-xl font-black flex items-center gap-2">
                  <Activity className="text-cyan" /> Order Book
                </h2>
                <div className="grid grid-cols-2 text-xs text-muted-foreground">
                  <span>Price</span><span className="text-right">Qty</span>
                </div>
                {orderBook.map(([price, qty, side]) => (
                  <div key={`${price}-${qty}`} className="relative grid grid-cols-2 overflow-hidden rounded-md px-2 py-1.5 text-sm">
                    <span className={side === "buy" ? "text-profit" : "text-loss"}>{price}</span>
                    <span className="text-right text-muted-foreground">{qty}</span>
                    <span
                      className={`absolute inset-y-0 right-0 -z-10 ${side === "buy" ? "bg-casino-green/10" : "bg-[hsl(var(--exchange-red)/0.1)]"}`}
                      style={{ width: `${Math.min(92, Number(qty.replace(/,/g, "")) / 420)}%` }}
                    />
                  </div>
                ))}
              </section>

              <section className="glass-panel border border-border rounded-xl p-4 space-y-4">
                <h2 className="font-display text-xl font-black flex items-center gap-2">
                  <Gauge className="text-primary" /> Integrity
                </h2>
                <div className="grid gap-2">
                  {[["Maker", "0.08%"], ["Taker", "0.18%"], ["Withdrawal", "0.35%"]].map(([k, v]) => (
                    <div key={k} className="rounded-lg bg-secondary p-3">
                      <p className="text-xs text-muted-foreground">{k} fee</p>
                      <b className="text-lg text-gold">{v}</b>
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  {activity.slice(0, 3).map((item) => (
                    <div key={item} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <Zap className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> {item}
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </section>
        </div>
      </AuthGuard>
      <BottomNav />
      <CoinDetailDialog coin={selectedCoin} open={!!selectedCoin} onClose={() => setSelectedCoin(null)} />
      <SwapDialog
        open={swapOpen}
        onOpenChange={setSwapOpen}
        coins={platformDirectory.map((c: any) => ({ symbol: c.symbol, name: c.name, price: c.price ?? c.price_usd }))}
        defaultFrom={swapDefaults.from}
        defaultTo={swapDefaults.to}
      />
    </div>
  );
}
