import { Wallet } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useUsdtRate } from "@/hooks/useUsdtRate";

interface BalanceDisplayProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  showIcon?: boolean;
}

export function BalanceDisplay({ size = "md", className = "", showIcon = true }: BalanceDisplayProps) {
  const { profile, isMockMode } = useAuth();
  const { rate } = useUsdtRate();

  const balance = profile?.balance ?? 0;
  const usdValue = balance * rate;

  const sizeClasses = {
    sm: "text-xs gap-1 px-2 py-0.5",
    md: "text-sm gap-1.5 px-2.5 py-1",
    lg: "text-base gap-2 px-3 py-1.5",
  };

  const iconSize = {
    sm: "h-3 w-3",
    md: "h-3.5 w-3.5",
    lg: "h-4 w-4",
  };

  return (
    <div className={`flex items-center rounded-lg bg-secondary font-display font-bold ${sizeClasses[size]} ${className}`}>
      {showIcon && <Wallet className={`${iconSize[size]} text-casino-gold`} />}
      <span className="text-casino-gold">
        {balance.toFixed(2)} {isMockMode ? "MC" : "USDT"}
      </span>
      <span className="text-muted-foreground font-normal">
        ≈ ${usdValue.toFixed(2)}
      </span>
    </div>
  );
}

export function ExchangeRateBadge() {
  const { rate, loading } = useUsdtRate();

  return (
    <div className="flex items-center gap-1 text-xs text-muted-foreground bg-secondary/50 rounded px-1.5 py-0.5">
      <span className="text-green-400 animate-pulse">●</span>
      <span>1 USDT = ${loading ? "..." : rate.toFixed(4)}</span>
    </div>
  );
}
