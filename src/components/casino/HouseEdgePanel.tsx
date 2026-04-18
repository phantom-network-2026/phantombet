import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Percent, Save, RotateCcw, Loader2, TrendingDown, TrendingUp } from "lucide-react";
import { toast } from "sonner";

interface GameEdge {
  name: string;
  edge: number; // -100 to 100, positive = house advantage, negative = player advantage
  enabled: boolean;
}

interface HouseEdgeConfig {
  globalEnabled: boolean;
  globalEdge: number;
  perGame: GameEdge[];
}

const DEFAULT_CONFIG: HouseEdgeConfig = {
  globalEnabled: false,
  globalEdge: 5,
  perGame: [],
};

const KNOWN_GAMES = [
  "Penny Roulette", "Blackjack", "Scratch Card", "Prize Reel",
  "Chicken Cross", "Crypto Call", "Cut Wire Pro", "Dream 11",
  "Head & Tail", "Hero Casino", "Jackpot Highway", "Marvel Betting",
  "Meter Crash", "Neon Bounce", "Plane Crash", "Plinko Pro",
  "Race Kings", "Royal Derby", "Royal Heist", "Safe Door",
  "Scratch Royale", "Spin Wheel Royale", "Stack Up Casino", "Stake Mines",
  "Slot Cowboy", "Roulette", "Scatter Bomb", "Pirate Plunder",
  "Fishing Mayhem", "Castle Defence", "Lucky 7s", "JackpotJoy",
];

async function fetchHouseEdgeConfig(): Promise<HouseEdgeConfig> {
  const { data } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", "house_edge_config")
    .maybeSingle();
  if (data?.value) {
    const v = data.value as any;
    return {
      globalEnabled: v.globalEnabled ?? false,
      globalEdge: v.globalEdge ?? 5,
      perGame: v.perGame ?? [],
    };
  }
  return DEFAULT_CONFIG;
}

async function saveHouseEdgeConfig(config: HouseEdgeConfig): Promise<boolean> {
  const { data: existing } = await supabase
    .from("site_settings")
    .select("id")
    .eq("key", "house_edge_config")
    .maybeSingle();
  if (existing) {
    const { error } = await supabase
      .from("site_settings")
      .update({ value: config as any })
      .eq("key", "house_edge_config");
    return !error;
  } else {
    const { error } = await supabase
      .from("site_settings")
      .insert({ key: "house_edge_config", value: config as any });
    return !error;
  }
}

export function HouseEdgePanel() {
  const [config, setConfig] = useState<HouseEdgeConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchHouseEdgeConfig().then((c) => {
      // Ensure all known games exist in perGame
      const existing = new Set(c.perGame.map((g) => g.name));
      const merged = [...c.perGame];
      KNOWN_GAMES.forEach((name) => {
        if (!existing.has(name)) {
          merged.push({ name, edge: c.globalEdge, enabled: false });
        }
      });
      setConfig({ ...c, perGame: merged });
      setLoading(false);
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const ok = await saveHouseEdgeConfig(config);
    if (ok) toast.success("House edge settings saved!");
    else toast.error("Failed to save — are you an admin?");
    setSaving(false);
  };

  const handleGlobalToggle = async (enabled: boolean) => {
    const updated = { ...config, globalEnabled: enabled };
    setConfig(updated);
    setSaving(true);
    const ok = await saveHouseEdgeConfig(updated);
    if (ok) toast.success(enabled ? "House edge enabled globally" : "House edge disabled");
    else toast.error("Failed to save");
    setSaving(false);
  };

  const updateGame = (index: number, partial: Partial<GameEdge>) => {
    setConfig((prev) => {
      const perGame = [...prev.perGame];
      perGame[index] = { ...perGame[index], ...partial };
      return { ...prev, perGame };
    });
  };

  const handleReset = async () => {
    setSaving(true);
    const ok = await saveHouseEdgeConfig(DEFAULT_CONFIG);
    if (ok) {
      const merged = KNOWN_GAMES.map((name) => ({ name, edge: 5, enabled: false }));
      setConfig({ ...DEFAULT_CONFIG, perGame: merged });
      toast.success("Reset to defaults");
    } else toast.error("Failed to reset");
    setSaving(false);
  };

  const edgeColor = (edge: number) => {
    if (edge > 0) return "text-green-400"; // house profit
    if (edge < 0) return "text-red-400"; // player advantage
    return "text-muted-foreground";
  };

  const edgeLabel = (edge: number) => {
    if (edge > 0) return `${edge}% house edge`;
    if (edge < 0) return `${Math.abs(edge)}% player edge`;
    return "No edge (fair)";
  };

  if (loading) {
    return (
      <div className="rounded-xl bg-card border border-border p-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading house edge settings...
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-card border border-border p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg font-bold flex items-center gap-2">
          <Percent className="h-5 w-5 text-casino-gold" /> House Edge Control
        </h3>
        <Switch checked={config.globalEnabled} onCheckedChange={handleGlobalToggle} />
      </div>

      <p className="text-xs text-muted-foreground">
        Controls the payout multiplier on wins. Positive = house profits more, Negative = players win more.
        Per-game overrides take priority when enabled.
      </p>

      {/* Global Edge Slider */}
      <div className="space-y-2 rounded-lg bg-secondary/50 p-3">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-bold">Global Default Edge</Label>
          <span className={`text-xs font-mono font-bold ${edgeColor(config.globalEdge)}`}>
            {config.globalEdge > 0 ? "+" : ""}{config.globalEdge}%
          </span>
        </div>
        <Slider
          value={[config.globalEdge]}
          onValueChange={([v]) => setConfig((prev) => ({ ...prev, globalEdge: v }))}
          min={-50}
          max={50}
          step={1}
          className="w-full"
        />
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1"><TrendingUp className="h-3 w-3" /> Player advantage</span>
          <span>Fair</span>
          <span className="flex items-center gap-1">House advantage <TrendingDown className="h-3 w-3" /></span>
        </div>
      </div>

      {/* Per-Game Overrides */}
      <div className="space-y-2">
        <Label className="text-xs font-bold">Per-Game Overrides</Label>
        <div className="max-h-[400px] overflow-y-auto space-y-1 pr-1">
          {config.perGame.map((game, i) => (
            <div key={game.name} className="rounded-lg bg-background border border-border p-2 space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <Switch
                    checked={game.enabled}
                    onCheckedChange={(v) => updateGame(i, { enabled: v })}
                    className="scale-75"
                  />
                  <span className="text-xs font-medium truncate">{game.name}</span>
                </div>
                <span className={`text-[10px] font-mono font-bold shrink-0 ${game.enabled ? edgeColor(game.edge) : "text-muted-foreground/50"}`}>
                  {game.enabled ? edgeLabel(game.edge) : "Using global"}
                </span>
              </div>
              {game.enabled && (
                <div className="flex items-center gap-2 pl-8">
                  <Slider
                    value={[game.edge]}
                    onValueChange={([v]) => updateGame(i, { edge: v })}
                    min={-50}
                    max={50}
                    step={1}
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    value={game.edge}
                    onChange={(e) => updateGame(i, { edge: Number(e.target.value) })}
                    className="w-16 h-7 text-xs bg-card border-border text-center"
                    min={-50}
                    max={50}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <Button variant="gold" size="sm" onClick={handleSave} className="flex-1" disabled={saving}>
          {saving ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Save className="h-3 w-3 mr-1" />}
          Save Settings
        </Button>
        <Button variant="outline" size="sm" onClick={handleReset} disabled={saving}>
          <RotateCcw className="h-3 w-3 mr-1" /> Reset
        </Button>
      </div>
    </div>
  );
}
