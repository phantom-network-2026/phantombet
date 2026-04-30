import { useNavigate, useLocation } from "react-router-dom";
import { Home, Dice5, Trophy, Users, HelpCircle, Medal, ArrowLeftRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage, type LanguageCode } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { toast } from "sonner";

const navItems = [
  { icon: Home, labelKey: "home" as const, path: "/", requiresAuth: false },
  { icon: Dice5, labelKey: "games" as const, path: "/games", requiresAuth: false },
  { icon: Medal, labelKey: "home" as const, path: "/sportsbook", requiresAuth: true, label: "Sports" },
  { icon: ArrowLeftRight, labelKey: "home" as const, path: "/exchange", requiresAuth: true, label: "Exchange" },
  { icon: Users, labelKey: "friends" as const, path: "/friends", requiresAuth: true, label: "Social" },
  { icon: Trophy, labelKey: "promos" as const, path: "/promotions", requiresAuth: true },
  { icon: HelpCircle, labelKey: "help" as const, path: "/help", requiresAuth: false },
];

export function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [socialBadge, setSocialBadge] = useState(0);

  useEffect(() => {
    if (!user) return;
    const check = async () => {
      const [{ count: reqCount }, { count: msgCount }] = await Promise.all([
        supabase.from("friendships").select("*", { count: "exact", head: true })
          .eq("addressee_id", user.id).eq("status", "pending"),
        supabase.from("messages").select("*", { count: "exact", head: true })
          .eq("receiver_id", user.id).eq("is_read", false),
      ]);
      setSocialBadge((reqCount || 0) + (msgCount || 0));
    };
    check();
    const interval = setInterval(check, 10000);

    // Realtime for instant updates
    const channel = supabase.channel("social-notifs")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "friendships", filter: `addressee_id=eq.${user.id}` }, check)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `receiver_id=eq.${user.id}` }, check)
      .subscribe();

    return () => { clearInterval(interval); supabase.removeChannel(channel); };
  }, [user]);

  const handleClick = (item: typeof navItems[0]) => {
    if (item.requiresAuth && !user) {
      toast("Sign in required", {
        description: "You need to log in or create an account to access this.",
        action: { label: "Sign Up", onClick: () => navigate("/signup") },
      });
      return;
    }
    const externalUrl = (item as any).externalUrl as string | undefined;
    if (externalUrl) {
      window.open(externalUrl, "_blank", "noopener,noreferrer");
      return;
    }
    navigate(item.path);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur md:hidden">
      <div className="flex items-center justify-around py-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const showBadge = item.path === "/friends" && socialBadge > 0;
          return (
            <button
              key={item.path}
              onClick={() => handleClick(item)}
              className={`relative flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-all ${
                isActive
                  ? "text-casino-gold bg-casino-gold/10 ring-1 ring-casino-gold/50 shadow-[0_0_12px_hsl(42_90%_55%/0.5)]"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <div className="relative">
                <item.icon className="h-5 w-5" />
                {showBadge && (
                  <span className="absolute -top-1.5 -right-2.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-casino-pink text-[9px] font-bold text-white px-1">
                    {socialBadge > 99 ? "99+" : socialBadge}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium">{(item as any).label || t(item.labelKey)}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
