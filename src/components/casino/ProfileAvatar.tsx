import { Sparkles } from "lucide-react";

const BORDER_STYLES: Record<string, string> = {
  "gold-pulse": "animate-border-gold",
  "rainbow": "animate-border-rainbow",
  "fire": "animate-border-fire",
  "diamond": "animate-border-diamond",
  "neon": "animate-border-neon",
};

interface ProfileAvatarProps {
  avatarUrl?: string | null;
  username?: string | null;
  borderStyle?: string | null;
  hasAnimatedBorder?: boolean | null;
  hasAnimatedAvatar?: boolean | null;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}

export function ProfileAvatar({
  avatarUrl,
  username,
  borderStyle,
  hasAnimatedBorder,
  hasAnimatedAvatar,
  size = "sm",
  className = "",
}: ProfileAvatarProps) {
  const sizeClasses = {
    xs: "w-5 h-5 text-[8px]",
    sm: "w-7 h-7 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-20 h-20 text-3xl",
  };

  const sparkleSize = {
    xs: "h-2 w-2 -top-0.5 -right-0.5",
    sm: "h-3 w-3 -top-0.5 -right-0.5",
    md: "h-4 w-4 -top-1 -right-1",
    lg: "h-5 w-5 -top-1 -right-1",
  };

  const borderAnim = hasAnimatedBorder && borderStyle && borderStyle !== "none"
    ? BORDER_STYLES[borderStyle] || ""
    : "";

  const hasGlow = !!borderAnim;

  return (
    <div className={`relative ${className}`} style={{ padding: hasGlow ? 3 : 0 }}>
      <div className={`${sizeClasses[size]} rounded-full flex items-center justify-center font-bold bg-secondary text-casino-gold overflow-hidden ring-1 ring-border ${hasAnimatedAvatar ? "animate-pulse" : ""} ${hasGlow ? borderAnim : ""}`}>
        {avatarUrl ? (
          <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
        ) : (
          username?.charAt(0).toUpperCase() || "?"
        )}
      </div>
      {hasAnimatedAvatar && (
        <Sparkles className={`absolute ${sparkleSize[size]} text-casino-gold animate-spin`} style={{ animationDuration: "3s" }} />
      )}
    </div>
  );
}
