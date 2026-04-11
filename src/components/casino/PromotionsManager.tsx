import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  Gift, Star, Zap, Trash2, Plus, Save, GripVertical,
  Eye, EyeOff, Pencil, Copy, DollarSign, Clock, Tag,
} from "lucide-react";

interface Promotion {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  active: boolean;
  ctaText: string;
  ctaLink: string;
  badge?: string;
  expiresAt?: string;
}

const ICON_OPTIONS = [
  { value: "gift", label: "🎁 Gift" },
  { value: "star", label: "⭐ Star" },
  { value: "zap", label: "⚡ Zap" },
  { value: "dollar", label: "💰 Dollar" },
  { value: "trophy", label: "🏆 Trophy" },
  { value: "fire", label: "🔥 Fire" },
  { value: "diamond", label: "💎 Diamond" },
  { value: "crown", label: "👑 Crown" },
];

const COLOR_OPTIONS = [
  { value: "text-casino-gold", label: "Gold", bg: "bg-yellow-500" },
  { value: "text-casino-pink", label: "Pink", bg: "bg-pink-500" },
  { value: "text-casino-purple-light", label: "Purple", bg: "bg-purple-500" },
  { value: "text-green-400", label: "Green", bg: "bg-green-500" },
  { value: "text-blue-400", label: "Blue", bg: "bg-blue-500" },
  { value: "text-red-400", label: "Red", bg: "bg-red-500" },
];

function generateId() {
  return Math.random().toString(36).substring(2, 10);
}

export function PromotionsManager() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    fetchPromotions();
  }, []);

  const fetchPromotions = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "promotions_config")
      .maybeSingle();

    if (data?.value) {
      const saved = data.value as any;
      setPromotions(saved.promotions || []);
    } else {
      // Default promotions matching the existing ones
      setPromotions([
        {
          id: generateId(),
          title: "Welcome Bonus",
          description: "Get up to $500 on your first deposit!",
          icon: "gift",
          color: "text-casino-gold",
          active: true,
          ctaText: "Claim Now",
          ctaLink: "/deposit",
        },
        {
          id: generateId(),
          title: "VIP Rewards",
          description: "Earn loyalty points on every bet",
          icon: "star",
          color: "text-casino-pink",
          active: true,
          ctaText: "Learn More",
          ctaLink: "/deposit",
        },
        {
          id: generateId(),
          title: "Daily Spins",
          description: "Free spins every day for active players",
          icon: "zap",
          color: "text-casino-purple-light",
          active: true,
          ctaText: "Spin Now",
          ctaLink: "/prize-reel",
        },
      ]);
    }
    setLoading(false);
  };

  const savePromotions = async () => {
    setSaving(true);
    const payload = { promotions };
    const { data: existing } = await supabase
      .from("site_settings")
      .select("id")
      .eq("key", "promotions_config")
      .maybeSingle();

    if (existing) {
      await supabase
        .from("site_settings")
        .update({ value: payload as any })
        .eq("key", "promotions_config");
    } else {
      await supabase
        .from("site_settings")
        .insert({ key: "promotions_config", value: payload as any });
    }
    setSaving(false);
    toast.success("Promotions saved");
  };

  const addPromotion = () => {
    const newPromo: Promotion = {
      id: generateId(),
      title: "New Promotion",
      description: "Describe your promotion here",
      icon: "gift",
      color: "text-casino-gold",
      active: true,
      ctaText: "Claim Now",
      ctaLink: "/deposit",
    };
    setPromotions((prev) => [...prev, newPromo]);
    setEditingId(newPromo.id);
  };

  const removePromotion = (id: string) => {
    setPromotions((prev) => prev.filter((p) => p.id !== id));
    if (editingId === id) setEditingId(null);
    toast.info("Promotion removed (unsaved)");
  };

  const duplicatePromotion = (promo: Promotion) => {
    const dup = { ...promo, id: generateId(), title: promo.title + " (Copy)" };
    setPromotions((prev) => [...prev, dup]);
    toast.info("Promotion duplicated");
  };

  const updatePromotion = (id: string, updates: Partial<Promotion>) => {
    setPromotions((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
    );
  };

  const getIconEmoji = (icon: string) => {
    return ICON_OPTIONS.find((o) => o.value === icon)?.label.split(" ")[0] || "🎁";
  };

  if (loading) return <p className="text-muted-foreground text-sm">Loading promotions...</p>;

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            {promotions.filter((p) => p.active).length} active / {promotions.length} total promotions
          </p>
        </div>
        <Button variant="gold" size="sm" onClick={addPromotion}>
          <Plus className="h-3 w-3 mr-1" /> Add Promotion
        </Button>
      </div>

      {/* Promotions List */}
      <div className="space-y-3">
        {promotions.map((promo) => {
          const isEditing = editingId === promo.id;
          return (
            <div
              key={promo.id}
              className={`rounded-xl border transition-all ${
                promo.active
                  ? "bg-card border-border"
                  : "bg-card/50 border-border/50 opacity-70"
              }`}
            >
              {/* Header */}
              <div className="flex items-center gap-3 p-4">
                <span className="text-2xl">{getIconEmoji(promo.icon)}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-display font-bold text-sm truncate">{promo.title}</p>
                    {promo.badge && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-casino-gold/20 text-casino-gold font-medium">
                        {promo.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{promo.description}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Switch
                    checked={promo.active}
                    onCheckedChange={(checked) => updatePromotion(promo.id, { active: checked })}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setEditingId(isEditing ? null : promo.id)}
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => duplicatePromotion(promo)}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive"
                    onClick={() => removePromotion(promo.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              {/* Edit Form */}
              {isEditing && (
                <div className="border-t border-border p-4 space-y-4 bg-secondary/20">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Title</Label>
                      <Input
                        value={promo.title}
                        onChange={(e) => updatePromotion(promo.id, { title: e.target.value })}
                        className="bg-background border-border mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Badge (optional)</Label>
                      <Input
                        value={promo.badge || ""}
                        onChange={(e) => updatePromotion(promo.id, { badge: e.target.value })}
                        placeholder="e.g. NEW, HOT, LIMITED"
                        className="bg-background border-border mt-1"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Description</Label>
                    <Textarea
                      value={promo.description}
                      onChange={(e) => updatePromotion(promo.id, { description: e.target.value })}
                      className="bg-background border-border mt-1 text-sm"
                      rows={2}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Button Text</Label>
                      <Input
                        value={promo.ctaText}
                        onChange={(e) => updatePromotion(promo.id, { ctaText: e.target.value })}
                        className="bg-background border-border mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Button Link</Label>
                      <Input
                        value={promo.ctaLink}
                        onChange={(e) => updatePromotion(promo.id, { ctaLink: e.target.value })}
                        placeholder="/deposit"
                        className="bg-background border-border mt-1"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs mb-2 block">Icon</Label>
                      <div className="flex flex-wrap gap-1">
                        {ICON_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            onClick={() => updatePromotion(promo.id, { icon: opt.value })}
                            className={`px-2 py-1 rounded-md text-sm border transition-all ${
                              promo.icon === opt.value
                                ? "border-casino-gold bg-casino-gold/10"
                                : "border-border hover:border-casino-gold/40"
                            }`}
                          >
                            {opt.label.split(" ")[0]}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs mb-2 block">Color</Label>
                      <div className="flex flex-wrap gap-1">
                        {COLOR_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            onClick={() => updatePromotion(promo.id, { color: opt.value })}
                            className={`w-7 h-7 rounded-full border-2 transition-all ${opt.bg} ${
                              promo.color === opt.value
                                ? "border-white scale-110"
                                : "border-transparent opacity-60 hover:opacity-100"
                            }`}
                            title={opt.label}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Expires (optional)</Label>
                    <Input
                      type="datetime-local"
                      value={promo.expiresAt || ""}
                      onChange={(e) => updatePromotion(promo.id, { expiresAt: e.target.value })}
                      className="bg-background border-border mt-1"
                    />
                  </div>

                  {/* Preview */}
                  <div className="rounded-lg bg-background border border-border p-3">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Preview</p>
                    <div className="flex gap-3 items-start">
                      <div className={`rounded-lg bg-secondary p-2.5 ${promo.color}`}>
                        <span className="text-xl">{getIconEmoji(promo.icon)}</span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-display font-bold text-sm">{promo.title}</h3>
                          {promo.badge && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-casino-gold/20 text-casino-gold font-medium">
                              {promo.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{promo.description}</p>
                        <Button variant="gold" size="sm" className="mt-2 h-7 text-xs" disabled>
                          {promo.ctaText}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {promotions.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Gift className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No promotions yet</p>
          <Button variant="gold" size="sm" className="mt-3" onClick={addPromotion}>
            <Plus className="h-3 w-3 mr-1" /> Create First Promotion
          </Button>
        </div>
      )}

      {/* Save */}
      <div className="sticky bottom-0 pt-3 bg-gradient-to-t from-background to-transparent">
        <Button variant="gold" className="w-full" onClick={savePromotions} disabled={saving}>
          <Save className="h-4 w-4 mr-2" /> {saving ? "Saving..." : "Save Promotions"}
        </Button>
      </div>
    </div>
  );
}
