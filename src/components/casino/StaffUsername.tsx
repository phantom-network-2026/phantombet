import { Shield, ShieldCheck, Crown } from "lucide-react";

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
}

export function StaffUsername({ username, role, className = "", size = "sm" }: StaffUsernameProps) {
  const config = role ? ROLE_CONFIG[role] : null;

  if (!config) {
    return <span className={className}>{username}</span>;
  }

  const Icon = config.icon;
  const sizeClasses = {
    xs: { icon: "h-2.5 w-2.5", prefix: "text-[8px]", name: "text-[10px]" },
    sm: { icon: "h-3 w-3", prefix: "text-[9px]", name: "text-xs" },
    md: { icon: "h-4 w-4", prefix: "text-[10px]", name: "text-sm" },
  }[size];

  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      <Icon className={`${sizeClasses.icon} ${config.colorClass} ${config.glowClass}`} />
      <span className={`${sizeClasses.prefix} font-black uppercase tracking-wider ${config.colorClass} ${config.glowClass}`}>
        {config.prefix}
      </span>
      <span className={`${sizeClasses.name} font-bold ${config.colorClass} ${config.glowClass}`}>
        {username}
      </span>
    </span>
  );
}
