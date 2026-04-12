import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Gift, Rocket, Crown, Zap, Sparkles } from "lucide-react";

interface WelcomeConfig {
  mock_title?: string;
  mock_body?: string;
  mock_perk?: string;
  real_title?: string;
  real_body?: string;
  welcome_bonuses?: WelcomeBonus[];
}

interface WelcomeBonus {
  id: string;
  label: string;
  description: string;
  icon: string;
  amount: number;
  enabled: boolean;
}

const DEFAULT_MOCK_CONFIG = {
  mock_title: "🚧 Early Access — Development Mode",
  mock_body: "PhantomBet is still in development. Real deposits are not available yet. Every new account receives $100 in mock funds to explore our games!",
  mock_perk: "🎁 Loyal members who register now will receive a free 3-month VIP subscription on launch day!",
};

const DEFAULT_REAL_CONFIG = {
  real_title: "🎰 Welcome to PhantomBet",
  real_body: "Join the ultimate crypto casino experience. Deposit USDT and start playing instantly with provably fair games!",
  welcome_bonuses: [
    { id: "deposit_match", label: "100% Deposit Match", description: "Double your first deposit up to $50", icon: "rocket", amount: 50, enabled: true },
    { id: "free_spins", label: "50 Free Spins", description: "Get 50 free spins on your first $10 deposit and wagered", icon: "sparkles", amount: 0, enabled: true },
    { id: "vip_trial", label: "7-Day VIP Trial", description: "Experience VIP perks free for your first week", icon: "crown", amount: 0, enabled: true },
  ] as WelcomeBonus[],
};

const ICONS: Record<string, React.ReactNode> = {
  rocket: <Rocket className="h-5 w-5" />,
  sparkles: <Sparkles className="h-5 w-5" />,
  crown: <Crown className="h-5 w-5" />,
  gift: <Gift className="h-5 w-5" />,
  zap: <Zap className="h-5 w-5" />,
};

interface WelcomeBannerProps {
  variant: "login" | "signup";
  onBonusSelect?: (bonusId: string) => void;
  selectedBonus?: string;
}

export default function WelcomeBanner({ variant, onBonusSelect, selectedBonus }: WelcomeBannerProps) {
  const [isMock, setIsMock] = useState<boolean | null>(null);
  const [config, setConfig] = useState<WelcomeConfig>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("get-public-settings", {
          body: { keys: ["wallet_mode", "welcome_config"] },
        });
        if (!error && data?.settings) {
          const wm = data.settings.wallet_mode;
          setIsMock(wm?.mock !== false); // default to mock
          if (data.settings.welcome_config) {
            setConfig(data.settings.welcome_config);
          }
        }
      } catch {
        setIsMock(true);
      }
      setLoading(false);
    })();
  }, []);

  if (loading || isMock === null) return null;

  if (isMock) {
    const title = config.mock_title || DEFAULT_MOCK_CONFIG.mock_title;
    const body = config.mock_body || DEFAULT_MOCK_CONFIG.mock_body;
    const perk = config.mock_perk || DEFAULT_MOCK_CONFIG.mock_perk;

    return (
      <div className="rounded-xl border border-[hsl(var(--casino-gold))/0.3] bg-[hsl(var(--casino-gold))/0.08] p-4 space-y-2">
        <p className="text-sm font-bold text-[hsl(var(--casino-gold))]">{title}</p>
        <p className="text-xs text-muted-foreground leading-relaxed">{body}</p>
        {perk && (
          <p className="text-xs text-muted-foreground leading-relaxed">
            <span className="text-[hsl(var(--casino-green))] font-semibold">{perk}</span>
          </p>
        )}
      </div>
    );
  }

  // Real funds mode
  const title = config.real_title || DEFAULT_REAL_CONFIG.real_title;
  const body = config.real_body || DEFAULT_REAL_CONFIG.real_body;
  const bonuses = (config.welcome_bonuses?.length ? config.welcome_bonuses : DEFAULT_REAL_CONFIG.welcome_bonuses).filter(b => b.enabled);

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-[hsl(var(--casino-green))/0.3] bg-[hsl(var(--casino-green))/0.08] p-4 space-y-2">
        <p className="text-sm font-bold text-[hsl(var(--casino-green))]">{title}</p>
        <p className="text-xs text-muted-foreground leading-relaxed">{body}</p>
      </div>

      {/* Welcome bonus picker — only on signup */}
      {variant === "signup" && bonuses.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">🎁 Choose Your Welcome Bonus</p>
          <div className="space-y-2">
            {bonuses.map((bonus) => (
              <button
                key={bonus.id}
                type="button"
                onClick={() => onBonusSelect?.(bonus.id)}
                className={`w-full text-left rounded-lg border p-3 transition-all duration-200 ${
                  selectedBonus === bonus.id
                    ? "border-[hsl(var(--casino-gold))] bg-[hsl(var(--casino-gold))/0.1] shadow-[0_0_12px_hsl(var(--casino-gold)/0.2)]"
                    : "border-border bg-card hover:border-[hsl(var(--casino-gold))/0.4] hover:bg-secondary/60"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`rounded-lg p-2 ${
                    selectedBonus === bonus.id
                      ? "bg-[hsl(var(--casino-gold))/0.2] text-[hsl(var(--casino-gold))]"
                      : "bg-secondary text-muted-foreground"
                  }`}>
                    {ICONS[bonus.icon] || <Gift className="h-5 w-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-bold ${selectedBonus === bonus.id ? "text-[hsl(var(--casino-gold))]" : "text-foreground"}`}>
                      {bonus.label}
                    </p>
                    <p className="text-xs text-muted-foreground">{bonus.description}</p>
                  </div>
                  <div className={`h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    selectedBonus === bonus.id ? "border-[hsl(var(--casino-gold))] bg-[hsl(var(--casino-gold))]" : "border-muted-foreground"
                  }`}>
                    {selectedBonus === bonus.id && <div className="h-1.5 w-1.5 rounded-full bg-background" />}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
