import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Save, Sliders, LayoutTemplate, Percent, Check } from "lucide-react";
import { toast } from "sonner";

// ── Option catalog ────────────────────────────────────────────
type OptionDef = { id: string; label: string; description: string; badge?: string };

const PAYLINE_OPTIONS: OptionDef[] = [
  { id: "8",   label: "8 Lines (Classic)",        description: "Original setup — 4 straight + 4 zigzag lines across 6 reels.", badge: "Default" },
  { id: "20",  label: "20 Lines (More Wins)",     description: "Adds zigzags, V-shapes & diagonals. Noticeably higher hit frequency." },
  { id: "25",  label: "25 Lines (Vegas Standard)", description: "Industry-standard 25-line layout. Frequent multi-line wins per spin." },
  { id: "243", label: "243 Ways (Megaways-style)", description: "Wins pay for any matching symbols on adjacent reels from the left. Big jump in win frequency.", badge: "High Volatility" },
];

const LAYOUT_OPTIONS: OptionDef[] = [
  { id: "theme",   label: "Theme-Only Restyle",   description: "Same 6×4 reels — each game gets unique colors, frame, fonts, top bar & paytable badge.", badge: "Quickest" },
  { id: "grid",    label: "Restyle + Grid Variants", description: "Above plus mixed grids: some games become 5×3, 5×4 or 6×3 for real layout variety." },
  { id: "bespoke", label: "Full Bespoke Per Game", description: "Custom HUD, side panels, jackpot strips & paytable placement — every slot unique top-to-bottom.", badge: "Largest Change" },
];

const RTP_OPTIONS: OptionDef[] = [
  { id: "global",  label: "Global 97% (House Edge Slider)", description: "Sets global house edge to 3% — instant, applies to every game." },
  { id: "math",    label: "97% Baked Into Each Slot",       description: "Recalibrates each slot's pay tables so the raw math is ~97%, independent of the admin edge slider." },
  { id: "both",    label: "Both — Math + Global Edge",      description: "Recalibrate pay tables AND set global edge to 3%. Most thorough.", badge: "Recommended" },
];

type SlotsConfig = {
  paylines: string;
  layouts: string;
  rtp: string;
};

const DEFAULTS: SlotsConfig = { paylines: "8", layouts: "theme", rtp: "global" };

// ── Category card ─────────────────────────────────────────────
function Category({
  icon, title, subtitle, options, value, onChange,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  options: OptionDef[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 bg-secondary/60 border-b border-border">
        <div className="h-9 w-9 rounded-lg bg-casino-gold/15 flex items-center justify-center text-casino-gold">
          {icon}
        </div>
        <div>
          <h3 className="font-display text-sm font-bold tracking-wide">{title}</h3>
          <p className="text-[11px] text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      <div className="p-3 grid gap-2">
        {options.map((o) => {
          const selected = o.id === value;
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => onChange(o.id)}
              className={`w-full text-left rounded-lg border p-3 transition-all ${
                selected
                  ? "border-casino-gold bg-casino-gold/10 shadow-[0_0_0_1px_hsl(var(--casino-gold)/0.4)]"
                  : "border-border bg-background hover:bg-secondary/50 hover:border-casino-gold/40"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-sm font-semibold ${selected ? "text-casino-gold" : "text-foreground"}`}>
                      {o.label}
                    </span>
                    {o.badge && (
                      <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-casino-gold/20 text-casino-gold border border-casino-gold/30">
                        {o.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1 leading-snug">{o.description}</p>
                </div>
                <div
                  className={`shrink-0 mt-0.5 h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                    selected ? "border-casino-gold bg-casino-gold text-background" : "border-border"
                  }`}
                >
                  {selected && <Check className="h-3 w-3" strokeWidth={3} />}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Main panel ────────────────────────────────────────────────
export function SlotsConfigPanel() {
  const [config, setConfig] = useState<SlotsConfig>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "slots_config")
        .maybeSingle();
      if (data?.value) {
        const v = data.value as Partial<SlotsConfig>;
        setConfig({
          paylines: v.paylines ?? DEFAULTS.paylines,
          layouts:  v.layouts  ?? DEFAULTS.layouts,
          rtp:      v.rtp      ?? DEFAULTS.rtp,
        });
      }
      setLoading(false);
    })();
  }, []);

  const set = (k: keyof SlotsConfig) => (id: string) =>
    setConfig((prev) => ({ ...prev, [k]: id }));

  const save = async () => {
    setSaving(true);
    const { data: existing } = await supabase
      .from("site_settings")
      .select("id")
      .eq("key", "slots_config")
      .maybeSingle();
    const ok = existing
      ? !(await supabase.from("site_settings").update({ value: config as any }).eq("key", "slots_config")).error
      : !(await supabase.from("site_settings").insert({ key: "slots_config", value: config as any })).error;
    setSaving(false);
    if (ok) toast.success("Slots configuration saved");
    else toast.error("Failed to save — admin permission required");
  };

  if (loading) return <p className="text-sm text-muted-foreground">Loading slots configuration…</p>;

  const summary = [
    PAYLINE_OPTIONS.find((o) => o.id === config.paylines)?.label,
    LAYOUT_OPTIONS.find((o) => o.id === config.layouts)?.label,
    RTP_OPTIONS.find((o) => o.id === config.rtp)?.label,
  ];

  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-gradient-to-br from-secondary/80 to-secondary/40 border border-border p-4">
        <p className="text-xs text-muted-foreground leading-relaxed">
          Pick one option from each category below. Your selections describe how the slot games should be set up —
          paylines, visual layout variety, and target RTP. Save to lock in your choices.
        </p>
      </div>

      <Category
        icon={<Sliders className="h-5 w-5" />}
        title="Paylines"
        subtitle="How many ways players can win per spin"
        options={PAYLINE_OPTIONS}
        value={config.paylines}
        onChange={set("paylines")}
      />

      <Category
        icon={<LayoutTemplate className="h-5 w-5" />}
        title="Layouts"
        subtitle="How distinct each slot should look from the others"
        options={LAYOUT_OPTIONS}
        value={config.layouts}
        onChange={set("layouts")}
      />

      <Category
        icon={<Percent className="h-5 w-5" />}
        title="RTP / Fairness"
        subtitle="Target a 97% Return-to-Player across all slots"
        options={RTP_OPTIONS}
        value={config.rtp}
        onChange={set("rtp")}
      />

      {/* Selection summary */}
      <div className="rounded-lg border border-border bg-secondary/30 p-3">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Your Selection</p>
        <ul className="space-y-1 text-xs">
          {summary.map((s, i) => (
            <li key={i} className="flex items-center gap-2">
              <Check className="h-3 w-3 text-casino-gold" /> <span className="text-foreground">{s}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="sticky bottom-0 pt-3 bg-gradient-to-t from-background to-transparent">
        <Button variant="gold" className="w-full" onClick={save} disabled={saving}>
          <Save className="h-4 w-4 mr-2" /> {saving ? "Saving..." : "Save Slots Configuration"}
        </Button>
      </div>
    </div>
  );
}
