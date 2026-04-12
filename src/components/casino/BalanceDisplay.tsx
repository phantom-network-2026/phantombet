import { Wallet } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface BalanceDisplayProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  showIcon?: boolean;
}

export function BalanceDisplay({ size = "md", className = "", showIcon = true }: BalanceDisplayProps) {
  const { profile, isMockMode } = useAuth();

  const balance = isMockMode ? (profile?.balance ?? 0) : (profile?.real_balance ?? 0);

  const sizeClasses = {
    sm: "text-xs gap-1.5 px-2.5 py-1",
    md: "text-sm gap-1.5 px-3 py-1.5",
    lg: "text-base gap-2 px-3.5 py-2",
  };

  const iconSize = {
    sm: "h-3 w-3",
    md: "h-3.5 w-3.5",
    lg: "h-4 w-4",
  };

  return (
    <div className={`flex items-center rounded-full bg-secondary/80 border border-border/50 font-display font-bold shrink-0 ${sizeClasses[size]} ${className}`}>
      {showIcon && <Wallet className={`${iconSize[size]} text-casino-gold`} />}
      <span className="text-casino-gold whitespace-nowrap">
        ${balance.toFixed(2)}
      </span>
      <span className="text-muted-foreground font-normal text-[0.7em] whitespace-nowrap">
        {isMockMode ? "MOCK" : "USDT"}
      </span>
    </div>
  );
}
