import { useNavigate, useLocation } from "react-router-dom";
import { Home, Dice5, Trophy, Users, HelpCircle, ArrowLeftRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const navItems = [
  { icon: Home, label: "Home", path: "/", requiresAuth: false },
  { icon: Dice5, label: "Games", path: "/games", requiresAuth: false },
  { icon: Users, label: "Friends", path: "/friends", requiresAuth: true },
  { icon: Trophy, label: "Promos", path: "/promotions", requiresAuth: true },
  { icon: ArrowLeftRight, label: "Exchange", path: "/exchange", requiresAuth: true },
  { icon: HelpCircle, label: "Help", path: "/help", requiresAuth: false },
];

export function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const handleClick = (item: typeof navItems[0]) => {
    if (item.requiresAuth && !user) {
      toast("Sign in required", {
        description: "You need to log in or create an account to access this.",
        action: {
          label: "Sign Up",
          onClick: () => navigate("/signup"),
        },
      });
      return;
    }
    navigate(item.path);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur md:hidden">
      <div className="flex items-center justify-around py-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => handleClick(item)}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-colors ${
                isActive ? "text-casino-gold" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
