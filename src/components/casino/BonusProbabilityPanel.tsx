import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Gift, Save, RotateCcw, Sparkles } from "lucide-react";

// Slugs of the 5 cloned slot games that share SlotEngine + the standalone Pirate Plunder.
// These must match SlotTheme.slug used by each game page.
const SLOT_GAMES: { slug: string; name: string }[] = [
  { slug: "pirate-plunder", name: "Pirate Plunder" },
  { slug: "fishing-mayhem", name: "Fishing Mayhem" },
  { slug: "castle-defence", name: "Castle Defence" },
  { slug: "lucky-7s", name: "Lucky 7s" },
  { slug: "jackpotjoy", name: "JackpotJoy" },
  { slug: "royal-flush", name: "Royal Flush" },
  { slug: "aztec-gold", name: "Aztec Gold" },
  { slug: "galactic-spins", name: "Galactic Spins" },
  { slug: "sweet-bonanza", name: "Sweet Bonanza" },
];

interface GameBonus {
  slug: string;
  name: string;
  probability: number; // 0-100, chance per paid spin to trigger the bonus
  enabled: boolean;
}

interface BonusConfig {
  perGame: GameBonus[];
}

const DEFAULT_PROB = 6; // matches the historical hardcoded 6%

export function BonusProbabilityPanel() {
  const [config, setConfig] = useState<BonusConfig>({
    perGame: SLOT_GAMES.map((g) => ({ ...g, probability: DEFAULT_PROB, enabled: false })),
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "bonus_probability")
        .maybeSingle();
      const saved = (data?.value || {}) as any;
      const savedList: any[] = saved.perGame || [];
      setConfig({
        perGame: SLOT_GAMES.map((g) => {
          const existing = savedList.find((p) => p.slug === g.slug);
          return {
            slug: g.slug,
            name: g.name,
            probability: existing?.probability ?? DEFAULT_PROB,
            enabled: existing?.enabled ?? false,
          };
        }),
      });
      setLoading(false);
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    const payload = { perGame: config.perGame };
    const { data: existing } = await supabase
      .from("site_settings")
      .select("id")
      .eq("key", "bonus_probability")
      .maybeSingle();
    if (existing) {
      await supabase.from("site_settings").update({ value: payload as any }).eq("key", "bonus_probability");
    } else {
      await supabase.from("site_settings").insert({ key: "bonus_probability", value: payload as any });
    }
    setSaving(false);
    toast.success("Bonus probability settings saved");
  };

  const updateProb = (slug: string, probability: number) =>
    setConfig((prev) => ({
      perGame: prev.perGame.map((g) => (g.slug === slug ? { ...g, probability } : g)),
    }));

  const toggle = (slug: string, enabled: boolean) =>
    setConfig((prev) => ({
      perGame: prev.perGame.map((g) => (g.slug === slug ? { ...g, enabled } : g)),
    }));

  const setAll = (probability: number) => {
    setConfig((prev) => ({
      perGame: prev.perGame.map((g) => ({ ...g, probability, enabled: true })),
    }));
    toast.info(`All slots set to ${probability}% bonus chance (unsaved)`);
  };

  const reset = () => {
    setConfig((prev) => ({
      perGame: prev.perGame.map((g) => ({ ...g, probability: DEFAULT_PROB, enabled: false })),
    }));
    toast.info("Reset to defaults (unsaved)");
  };

  const probColor = (v: number) => {
    if (v >= 80) return "text-green-400";
    if (v >= 50) return "text-emerald-400";
    if (v >= 25) return "text-yellow-400";
    if (v > 0) return "text-orange-400";
    return "text-red-400";
  };
  const probBg = (v: number) => {
    if (v >= 80) return "bg-green-500/20 border-green-500/30";
    if (v >= 50) return "bg-emerald-500/20 border-emerald-500/30";
    if (v >= 25) return "bg-yellow-500/20 border-yellow-500/30";
    if (v > 0) return "bg-orange-500/20 border-orange-500/30";
    return "bg-red-500/20 border-red-500/30";
  };

  if (loading) return <p className="text-muted-foreground text-sm">Loading slot games...</p>;

  return (
    <div className="space-y-5">
      {/* Intro */}
      <div className="rounded-xl bg-gradient-to-br from-secondary/80 to-secondary/40 border border-border p-5 space-y-2">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-casino-gold/20 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-casino-gold" />
          </div>
          <div>
            <p className="font-display font-bold text-sm">Bonus Round Probability</p>
            <p className="text-xs text-muted-foreground">
              0% = bonus never triggers · 100% = bonus on every paid spin
            </p>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => setAll(0)} className="text-xs">Set All 0%</Button>
        <Button variant="outline" size="sm" onClick={() => setAll(6)} className="text-xs">Set All 6%</Button>
        <Button variant="outline" size="sm" onClick={() => setAll(25)} className="text-xs">Set All 25%</Button>
        <Button variant="outline" size="sm" onClick={() => setAll(50)} className="text-xs">Set All 50%</Button>
        <Button variant="outline" size="sm" onClick={() => setAll(100)} className="text-xs">Set All 100%</Button>
        <Button variant="ghost" size="sm" onClick={reset} className="text-xs text-muted-foreground">
          <RotateCcw className="h-3 w-3 mr-1" /> Reset
        </Button>
      </div>

      {/* Per-game list */}
      <div className="space-y-2">
        {config.perGame.map((g) => (
          <div
            key={g.slug}
            className={`rounded-lg border p-3 transition-all ${
              g.enabled ? probBg(g.probability) : "bg-card border-border"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <Gift className="h-4 w-4 text-casino-gold shrink-0" />
                <span className="text-sm font-medium truncate">{g.name}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {g.enabled && (
                  <span className={`font-mono text-sm font-bold ${probColor(g.probability)}`}>
                    {g.probability}%
                  </span>
                )}
                <Label className="text-[10px] text-muted-foreground uppercase">Override</Label>
                <Switch checked={g.enabled} onCheckedChange={(v) => toggle(g.slug, v)} />
              </div>
            </div>
            {g.enabled && (
              <div className="mt-2">
                <Slider
                  value={[g.probability]}
                  onValueChange={([v]) => updateProb(g.slug, v)}
                  min={0}
                  max={100}
                  step={1}
                  className="py-1"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                  <span>0% — Never</span>
                  <span>50%</span>
                  <span>100% — Every Spin</span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="sticky bottom-0 pt-3 bg-gradient-to-t from-background to-transparent">
        <Button variant="gold" className="w-full" onClick={save} disabled={saving}>
          <Save className="h-4 w-4 mr-2" /> {saving ? "Saving..." : "Save Bonus Probability"}
        </Button>
      </div>
    </div>
  );
}
