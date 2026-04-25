import { Header } from "@/components/casino/Header";
import { BottomNav } from "@/components/casino/BottomNav";
import { AuthGuard } from "@/components/casino/AuthGuard";
import { BalanceDisplay } from "@/components/casino/BalanceDisplay";
import { Clock, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { motion } from "framer-motion";
import { MyBonusesPanel } from "@/components/casino/MyBonusesPanel";

const WALLET_CRYPTOS = [
  { symbol: "BTC", name: "Bitcoin", icon: "₿", balance: 0 },
  { symbol: "ETH", name: "Ethereum", icon: "Ξ", balance: 0 },
  { symbol: "BNB", name: "BNB", icon: "⬡", balance: 0 },
  { symbol: "SOL", name: "Solana", icon: "◎", balance: 0 },
  { symbol: "XRP", name: "XRP", icon: "✕", balance: 0 },
  { symbol: "ADA", name: "Cardano", icon: "₳", balance: 0 },
  { symbol: "DOGE", name: "Dogecoin", icon: "Ð", balance: 0 },
  { symbol: "DOT", name: "Polkadot", icon: "●", balance: 0 },
  { symbol: "AVAX", name: "Avalanche", icon: "▲", balance: 0 },
  { symbol: "LINK", name: "Chainlink", icon: "⬡", balance: 0 },
  { symbol: "MATIC", name: "Polygon", icon: "⬡", balance: 0 },
  { symbol: "LTC", name: "Litecoin", icon: "Ł", balance: 0 },
  { symbol: "TRX", name: "TRON", icon: "◈", balance: 0 },
  { symbol: "SHIB", name: "Shiba Inu", icon: "🐕", balance: 0 },
];

export default function Wallet() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <AuthGuard>
        <div className="container max-w-lg mx-auto px-4 pt-4 pb-24 space-y-5">
          {/* Header */}
          <div>
            <h1 className="font-display text-2xl font-black text-foreground">My Wallet</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Manage your crypto assets</p>
          </div>

          {/* Main balance card */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-[hsl(var(--casino-gold))/0.3] bg-gradient-to-br from-[hsl(var(--casino-gold))/0.08] via-card to-card p-5"
          >
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Total Balance</p>
            <BalanceDisplay size="lg" showIcon={false} />
            <div className="flex gap-2 mt-4">
              <button className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-[hsl(var(--casino-gold))/0.15] border border-[hsl(var(--casino-gold))/0.3] py-2.5 text-xs font-semibold text-[hsl(var(--casino-gold))] opacity-50 cursor-not-allowed">
                <ArrowDownToLine className="h-3.5 w-3.5" /> Deposit
              </button>
              <button className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-secondary border border-border py-2.5 text-xs font-semibold text-muted-foreground opacity-50 cursor-not-allowed">
                <ArrowUpFromLine className="h-3.5 w-3.5" /> Withdraw
              </button>
            </div>
          </motion.div>

          {/* My Bonuses */}
          <MyBonusesPanel />

          {/* Coming soon banner */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15 }}
            className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex items-center gap-3"
          >
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="shrink-0 rounded-lg bg-primary/10 p-2"
            >
              <Clock className="h-5 w-5 text-primary" />
            </motion.div>
            <div>
              <p className="text-sm font-bold text-foreground">Multi-Crypto Wallet — Coming Soon</p>
              <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">
                Deposit & withdraw in multiple cryptocurrencies directly from your wallet. This feature is currently under development.
              </p>
            </div>
          </motion.div>

          {/* Crypto assets list */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Your Assets</p>
            <div className="space-y-2">
              {WALLET_CRYPTOS.map((crypto, i) => (
                <motion.div
                  key={crypto.symbol}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * i }}
                  className="rounded-xl bg-card border border-border p-4 flex items-center gap-3"
                >
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-secondary to-secondary/50 flex items-center justify-center text-lg font-bold text-foreground shrink-0">
                    {crypto.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground">{crypto.name}</p>
                    <p className="text-[11px] text-muted-foreground">{crypto.symbol}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-foreground">{crypto.balance.toFixed(4)}</p>
                    <p className="text-[10px] text-muted-foreground">$0.00</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </AuthGuard>
      <BottomNav />
    </div>
  );
}
