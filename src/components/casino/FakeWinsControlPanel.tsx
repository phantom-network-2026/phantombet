import { useState, useEffect } from "react";
import { getFakeWinsConfig, saveFakeWinsConfig, FAKE_WINS_STORAGE_KEY } from "./FakeWinsTicker";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Trophy, Save, RotateCcw } from "lucide-react";
import { toast } from "sonner";

export function FakeWinsControlPanel() {
  const [config, setConfig] = useState(getFakeWinsConfig);

  useEffect(() => {
    const handler = () => setConfig(getFakeWinsConfig());
    window.addEventListener("fake-wins-config-change", handler);
    return () => window.removeEventListener("fake-wins-config-change", handler);
  }, []);

  const update = (partial: Partial<typeof config>) => {
    setConfig((prev) => ({ ...prev, ...partial }));
  };

  const handleSave = () => {
    saveFakeWinsConfig(config);
    toast.success("Fake wins ticker settings saved!");
  };

  const handleReset = () => {
    localStorage.removeItem(FAKE_WINS_STORAGE_KEY);
    setConfig(getFakeWinsConfig());
    window.dispatchEvent(new Event("fake-wins-config-change"));
    toast.success("Settings reset to defaults");
  };

  return (
    <div className="rounded-xl bg-card border border-border p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg font-bold flex items-center gap-2">
          <Trophy className="h-5 w-5 text-casino-gold" /> Fake Wins Ticker
        </h3>
        <Switch
          checked={config.enabled}
          onCheckedChange={(enabled) => {
            update({ enabled });
            saveFakeWinsConfig({ ...config, enabled });
          }}
        />
      </div>

      <p className="text-xs text-muted-foreground">
        Displays a scrolling ticker of imitation user winnings at the top of the page to create excitement.
      </p>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Min Win ($)</Label>
          <Input
            type="number"
            step="0.1"
            min="0.01"
            value={config.minAmount}
            onChange={(e) => update({ minAmount: Number(e.target.value) })}
            className="bg-background border-border"
          />
        </div>
        <div>
          <Label className="text-xs">Max Win ($)</Label>
          <Input
            type="number"
            step="1"
            min="0.01"
            value={config.maxAmount}
            onChange={(e) => update({ maxAmount: Number(e.target.value) })}
            className="bg-background border-border"
          />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Random Interval</Label>
          <Switch
            checked={config.randomInterval}
            onCheckedChange={(v) => update({ randomInterval: v })}
          />
        </div>
        {config.randomInterval ? (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Min Delay (sec)</Label>
              <Input
                type="number" step="1" min="1" max="60"
                value={config.minIntervalSeconds}
                onChange={(e) => update({ minIntervalSeconds: Number(e.target.value) })}
                className="bg-background border-border"
              />
            </div>
            <div>
              <Label className="text-xs">Max Delay (sec)</Label>
              <Input
                type="number" step="1" min="1" max="120"
                value={config.maxIntervalSeconds}
                onChange={(e) => update({ maxIntervalSeconds: Number(e.target.value) })}
                className="bg-background border-border"
              />
            </div>
          </div>
        ) : (
          <div>
            <Label className="text-xs">Fixed Interval (seconds)</Label>
            <Input
              type="number" step="1" min="1" max="60"
              value={config.intervalSeconds}
              onChange={(e) => update({ intervalSeconds: Number(e.target.value) })}
              className="bg-background border-border"
            />
          </div>
        )}
      </div>

      <div>
        <Label className="text-xs">Game Names (one per line)</Label>
        <Textarea
          value={config.games.join("\n")}
          onChange={(e) => update({ games: e.target.value.split("\n").filter(Boolean) })}
          rows={4}
          className="bg-background border-border text-xs"
        />
      </div>

      <div>
        <Label className="text-xs">Fake Usernames (one per line)</Label>
        <Textarea
          value={config.usernames.join("\n")}
          onChange={(e) => update({ usernames: e.target.value.split("\n").filter(Boolean) })}
          rows={4}
          className="bg-background border-border text-xs"
        />
      </div>

      <div className="flex gap-2">
        <Button variant="gold" size="sm" onClick={handleSave} className="flex-1">
          <Save className="h-3 w-3 mr-1" /> Save Settings
        </Button>
        <Button variant="outline" size="sm" onClick={handleReset}>
          <RotateCcw className="h-3 w-3 mr-1" /> Reset
        </Button>
      </div>
    </div>
  );
}
