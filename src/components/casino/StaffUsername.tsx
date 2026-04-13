import { Shield, ShieldCheck, Crown, Trophy } from "lucide-react";

export type StaffRole = "admin" | "moderator" | "staff" | null;

const ROLE_CONFIG: Record<string, { icon: typeof Shield; prefix: string; colorClass: string; glowClass: string }> = {
  admin: {
    icon: Crown,
    prefix: "ADMINISTRATOR",
    colorClass: "text-red-400",
    glowClass: "drop-shadow-[0_0_6px_rgba(248,113,113,0.8)]",
  },
  moderator: {
    icon: ShieldCheck,
    prefix: "MOD",
    colorClass: "text-emerald-400",
    glowClass: "drop-shadow-[0_0_6px_rgba(52,211,153,0.8)]",
  },
  staff: {
    icon: Shield,
    prefix: "STAFF",
    colorClass: "text-sky-400",
    glowClass: "drop-shadow-[0_0_6px_rgba(56,189,248,0.8)]",
  },
};

interface StaffUsernameProps {
  username: string;
  role?: StaffRole;
  className?: string;
  size?: "xs" | "sm" | "md";
  hasHighRoller?: boolean;
}

export function StaffUsername({ username, role, className = "", size = "sm", hasHighRoller }: StaffUsernameProps) {
  const config = role ? ROLE_CONFIG[role] : null;

  const sizeClasses = {
    xs: { icon: "h-2.5 w-2.5", prefix: "text-[8px]", name: "text-[10px]" },
    sm: { icon: "h-3 w-3", prefix: "text-[9px]", name: "text-xs" },
    md: { icon: "h-4 w-4", prefix: "text-[10px]", name: "text-sm" },
  }[size];

  // HIGH ROLLER with no staff role
  if (!config && hasHighRoller) {
    return (
      <span className={`inline-flex items-center gap-1 ${className}`}>
        <Trophy className={`${sizeClasses.icon} text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.9)] animate-pulse`} />
        <span className={`${sizeClasses.name} font-black bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 bg-clip-text text-transparent drop-shadow-[0_0_8px_rgba(250,204,21,0.6)]`} style={{ animationDuration: "2s" }}>
          {username}
        </span>
      </span>
    );
  }

  if (!config) {
    if (hasHighRoller) {
      return (
        <span className={`inline-flex items-center gap-1 ${className}`}>
          <Trophy className={`${sizeClasses.icon} text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.9)]`} />
          <span className={`${sizeClasses.name} font-black bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 bg-clip-text text-transparent`}>
            {username}
          </span>
        </span>
      );
    }
    return <span className={className}>{username}</span>;
  }

  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      <Icon className={`${sizeClasses.icon} ${config.colorClass} ${config.glowClass}`} />
      <span className={`${sizeClasses.prefix} font-black uppercase tracking-wider ${config.colorClass} ${config.glowClass}`}>
        {config.prefix}
      </span>
      {hasHighRoller ? (
        <span className={`${sizeClasses.name} font-black bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 bg-clip-text text-transparent drop-shadow-[0_0_8px_rgba(250,204,21,0.6)]`}>
          {username}
        </span>
      ) : (
        <span className={`${sizeClasses.name} font-bold ${config.colorClass} ${config.glowClass}`}>
          {username}
        </span>
      )}
    </span>
  );
}
