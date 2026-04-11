import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Gamepad2, Search, Save, RotateCcw, Zap, Filter } from "lucide-react";

interface GameProbability {
  gameId: string;
  gameName: string;
  category: string;
  probability: number; // 0-100
  enabled: boolean; // whether override is active
}

interface ProbabilityConfig {
  globalProbability: number;
  globalEnabled: boolean;
  perGame: GameProbability[];
}

const CATEGORY_COLORS: Record<string, string> = {
  slots: "text-purple-400",
  table: "text-blue-400",
  instant: "text-yellow-400",
  jackpot: "text-emerald-400",
  scratch: "text-pink-400",
  live: "text-red-400",
};

const CATEGORY_LABELS: Record<string, string> = {
  slots: "🎰 Slots",
  table: "🃏 Table",
  instant: "⚡ Instant",
  jackpot: "💎 Jackpot",
  scratch: "🎟️ Scratch",
  live: "🔴 Live",
};

export function GameProbabilityPanel() {
  const [config, setConfig] = useState<ProbabilityConfig>({
    globalProbability: 50,
    globalEnabled: false,
    perGame: [],
  });
  const [games, setGames] = useState<{ id: string; name: string; category: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [gamesRes, settingRes] = await Promise.all([
      supabase.from("games").select("id, name, category").eq("is_active", true).order("category").order("name"),
      supabase.from("site_settings").select("value").eq("key", "game_win_probability").maybeSingle(),
    ]);

    const gameList = (gamesRes.data || []) as { id: string; name: string; category: string }[];
    setGames(gameList);

    if (settingRes.data?.value) {
      const saved = settingRes.data.value as any;
      setConfig({
        globalProbability: saved.globalProbability ?? 50,
        globalEnabled: saved.globalEnabled ?? false,
        perGame: gameList.map((g) => {
          const existing = (saved.perGame || []).find((p: any) => p.gameId === g.id);
          return {
            gameId: g.id,
            gameName: g.name,
            category: g.category,
            probability: existing?.probability ?? 50,
            enabled: existing?.enabled ?? false,
          };
        }),
      });
    } else {
      setConfig({
        globalProbability: 50,
        globalEnabled: false,
        perGame: gameList.map((g) => ({
          gameId: g.id,
          gameName: g.name,
          category: g.category,
          probability: 50,
          enabled: false,
        })),
      });
    }
    setLoading(false);
  };

  const saveConfig = async () => {
    setSaving(true);
    const payload = {
      globalProbability: config.globalProbability,
      globalEnabled: config.globalEnabled,
      perGame: config.perGame.filter((g) => g.enabled).map((g) => ({
        gameId: g.gameId,
        gameName: g.gameName,
        category: g.category,
        probability: g.probability,
        enabled: g.enabled,
      })),
    };

    const { data: existing } = await supabase
      .from("site_settings")
      .select("id")
      .eq("key", "game_win_probability")
      .maybeSingle();

    if (existing) {
      await supabase.from("site_settings").update({ value: payload as any }).eq("key", "game_win_probability");
    } else {
      await supabase.from("site_settings").insert({ key: "game_win_probability", value: payload as any });
    }
    setSaving(false);
    toast.success("Win probability settings saved");
  };

  const updateGameProbability = (gameId: string, probability: number) => {
    setConfig((prev) => ({
      ...prev,
      perGame: prev.perGame.map((g) =>
        g.gameId === gameId ? { ...g, probability } : g
      ),
    }));
  };

  const toggleGameOverride = (gameId: string, enabled: boolean) => {
    setConfig((prev) => ({
      ...prev,
      perGame: prev.perGame.map((g) =>
        g.gameId === gameId ? { ...g, enabled } : g
      ),
    }));
  };

  const resetAll = () => {
    setConfig((prev) => ({
      ...prev,
      globalProbability: 50,
      globalEnabled: false,
      perGame: prev.perGame.map((g) => ({ ...g, probability: 50, enabled: false })),
    }));
    toast.info("Reset to defaults (unsaved)");
  };

  const setAllGames = (probability: number) => {
    setConfig((prev) => ({
      ...prev,
      perGame: prev.perGame.map((g) => ({ ...g, probability, enabled: true })),
    }));
    toast.info(`All games set to ${probability}% (unsaved)`);
  };

  const categories = [...new Set(games.map((g) => g.category))];
  const filtered = config.perGame.filter((g) => {
    const matchesSearch = g.gameName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !activeCategory || g.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const getProbabilityColor = (val: number) => {
    if (val >= 80) return "text-green-400";
    if (val >= 60) return "text-emerald-400";
    if (val >= 40) return "text-yellow-400";
    if (val >= 20) return "text-orange-400";
    return "text-red-400";
  };

  const getProbabilityBg = (val: number) => {
    if (val >= 80) return "bg-green-500/20 border-green-500/30";
    if (val >= 60) return "bg-emerald-500/20 border-emerald-500/30";
    if (val >= 40) return "bg-yellow-500/20 border-yellow-500/30";
    if (val >= 20) return "bg-orange-500/20 border-orange-500/30";
    return "bg-red-500/20 border-red-500/30";
  };

  if (loading) return <p className="text-muted-foreground text-sm">Loading games...</p>;

  return (
    <div className="space-y-5">
      {/* Global Control */}
      <div className="rounded-xl bg-gradient-to-br from-secondary/80 to-secondary/40 border border-border p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-casino-gold/20 flex items-center justify-center">
              <Zap className="h-5 w-5 text-casino-gold" />
            </div>
            <div>
              <p className="font-display font-bold text-sm">Global Win Probability</p>
              <p className="text-xs text-muted-foreground">Default for all games without individual overrides</p>
            </div>
          </div>
          <Switch
            checked={config.globalEnabled}
            onCheckedChange={(checked) => setConfig((prev) => ({ ...prev, globalEnabled: checked }))}
          />
        </div>
        {config.globalEnabled && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Win Chance</Label>
              <span className={`font-mono text-lg font-bold ${getProbabilityColor(config.globalProbability)}`}>
                {config.globalProbability}%
              </span>
            </div>
            <Slider
              value={[config.globalProbability]}
              onValueChange={([v]) => setConfig((prev) => ({ ...prev, globalProbability: v }))}
              min={0}
              max={100}
              step={1}
              className="py-2"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>0% — Always Lose</span>
              <span>50% — Fair</span>
              <span>100% — Always Win</span>
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => setAllGames(0)} className="text-xs">
          Set All 0%
        </Button>
        <Button variant="outline" size="sm" onClick={() => setAllGames(25)} className="text-xs">
          Set All 25%
        </Button>
        <Button variant="outline" size="sm" onClick={() => setAllGames(50)} className="text-xs">
          Set All 50%
        </Button>
        <Button variant="outline" size="sm" onClick={() => setAllGames(75)} className="text-xs">
          Set All 75%
        </Button>
        <Button variant="outline" size="sm" onClick={() => setAllGames(100)} className="text-xs">
          Set All 100%
        </Button>
        <Button variant="ghost" size="sm" onClick={resetAll} className="text-xs text-muted-foreground">
          <RotateCcw className="h-3 w-3 mr-1" /> Reset All
        </Button>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search games..."
            className="pl-9 bg-background border-border text-sm"
          />
        </div>
        <div className="flex gap-1 overflow-x-auto">
          <Button
            variant={!activeCategory ? "gold" : "outline"}
            size="sm"
            onClick={() => setActiveCategory(null)}
            className="text-xs shrink-0"
          >
            All
          </Button>
          {categories.map((cat) => (
            <Button
              key={cat}
              variant={activeCategory === cat ? "gold" : "outline"}
              size="sm"
              onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
              className="text-xs shrink-0"
            >
              {CATEGORY_LABELS[cat] || cat}
            </Button>
          ))}
        </div>
      </div>

      {/* Per-Game List */}
      <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
        {filtered.map((game) => (
          <div
            key={game.gameId}
            className={`rounded-lg border p-3 transition-all ${
              game.enabled
                ? getProbabilityBg(game.probability)
                : "bg-card border-border"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2 min-w-0">
                <Gamepad2 className={`h-4 w-4 shrink-0 ${CATEGORY_COLORS[game.category] || "text-muted-foreground"}`} />
                <span className="text-sm font-medium truncate">{game.gameName}</span>
                <span className="text-[10px] text-muted-foreground uppercase shrink-0">{game.category}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {game.enabled && (
                  <span className={`font-mono text-sm font-bold ${getProbabilityColor(game.probability)}`}>
                    {game.probability}%
                  </span>
                )}
                <Switch
                  checked={game.enabled}
                  onCheckedChange={(checked) => toggleGameOverride(game.gameId, checked)}
                />
              </div>
            </div>
            {game.enabled && (
              <div className="mt-2">
                <Slider
                  value={[game.probability]}
                  onValueChange={([v]) => updateGameProbability(game.gameId, v)}
                  min={0}
                  max={100}
                  step={1}
                  className="py-1"
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Save Button */}
      <div className="sticky bottom-0 pt-3 bg-gradient-to-t from-background to-transparent">
        <Button variant="gold" className="w-full" onClick={saveConfig} disabled={saving}>
          <Save className="h-4 w-4 mr-2" /> {saving ? "Saving..." : "Save Probability Settings"}
        </Button>
      </div>
    </div>
  );
}
