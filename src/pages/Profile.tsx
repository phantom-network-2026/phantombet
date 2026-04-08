import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/casino/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowLeft, Trophy, Save, User, Link as LinkIcon,
  Twitter, Instagram, MessageCircle, Globe, Sparkles, Crown, Camera, Circle,
} from "lucide-react";
import { toast } from "sonner";
import { usePresence, getStatusColor, getStatusLabel, type AppearanceStatus } from "@/hooks/usePresence";

const BORDER_STYLES = [
  { id: "none", label: "None", price: 0, preview: "" },
  { id: "gold-pulse", label: "Gold Pulse", price: 5, preview: "animate-border-gold" },
  { id: "rainbow", label: "Rainbow Glow", price: 10, preview: "animate-border-rainbow" },
  { id: "fire", label: "Fire Ring", price: 8, preview: "animate-border-fire" },
  { id: "diamond", label: "Diamond Sparkle", price: 15, preview: "animate-border-diamond" },
  { id: "neon", label: "Neon Cyber", price: 12, preview: "animate-border-neon" },
];

const ANIMATED_AVATAR_PRICE = 10;

export default function Profile() {
  const { user, profile, refreshProfile } = useAuth();
  const { appearanceStatus, setAppearanceStatus } = usePresence();
  const navigate = useNavigate();
  const [bio, setBio] = useState("");
  const [socialLinks, setSocialLinks] = useState<Record<string, string>>({
    twitter: "", instagram: "", tiktok: "", discord: "", website: "",
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) { navigate("/login"); return; }
    if (profile) {
      setBio(profile.bio || "");
      setSocialLinks({
        twitter: profile.social_links?.twitter || "",
        instagram: profile.social_links?.instagram || "",
        tiktok: profile.social_links?.tiktok || "",
        discord: profile.social_links?.discord || "",
        website: profile.social_links?.website || "",
      });
    }
  }, [profile, user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        bio,
        social_links: socialLinks,
      } as any)
      .eq("user_id", user.id);
    if (error) {
      toast.error("Failed to save profile");
    } else {
      toast.success("Profile updated!");
      await refreshProfile();
    }
    setSaving(false);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be under 2MB");
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true });
    if (uploadError) {
      toast.error("Upload failed");
      setUploading(false);
      return;
    }
    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
    const avatar_url = `${urlData.publicUrl}?t=${Date.now()}`;
    await supabase.from("profiles").update({ avatar_url } as any).eq("user_id", user.id);
    toast.success("Profile picture updated!");
    await refreshProfile();
    setUploading(false);
  };

  const handlePurchaseAnimatedAvatar = async () => {
    if (!user || !profile) return;
    if (profile.balance < ANIMATED_AVATAR_PRICE) {
      toast.error(`Not enough balance! You need $${ANIMATED_AVATAR_PRICE}.`);
      return;
    }
    if (profile.has_animated_avatar) {
      toast.info("You already have an animated avatar!");
      return;
    }
    // Deduct balance via game-settle
    const { error } = await supabase.functions.invoke("game-settle", {
      body: {
        userId: user.id,
        game: "profile-upgrade",
        betAmount: ANIMATED_AVATAR_PRICE,
        result: "loss",
        payout: 0,
      },
    });
    if (error) { toast.error("Purchase failed"); return; }
    // Enable animated avatar
    await supabase.from("profiles").update({ has_animated_avatar: true } as any).eq("user_id", user.id);
    toast.success("🎉 Animated avatar unlocked!");
    await refreshProfile();
  };

  const handlePurchaseBorder = async (style: typeof BORDER_STYLES[0]) => {
    if (!user || !profile) return;
    if (style.id === "none") {
      await supabase.from("profiles").update({ border_style: "none" } as any).eq("user_id", user.id);
      toast.success("Border removed");
      await refreshProfile();
      return;
    }
    if (profile.border_style === style.id) {
      toast.info("You already have this border equipped!");
      return;
    }
    if (profile.balance < style.price) {
      toast.error(`Not enough balance! You need $${style.price}.`);
      return;
    }
    const { error } = await supabase.functions.invoke("game-settle", {
      body: {
        userId: user.id,
        game: "profile-upgrade",
        betAmount: style.price,
        result: "loss",
        payout: 0,
      },
    });
    if (error) { toast.error("Purchase failed"); return; }
    await supabase.from("profiles").update({ border_style: style.id, has_animated_border: true } as any).eq("user_id", user.id);
    toast.success(`🎉 ${style.label} border unlocked!`);
    await refreshProfile();
  };

  if (!profile) return null;

  return (
    <div className="min-h-screen gradient-casino-bg">
      <Header />
      <div className="container max-w-lg py-6 px-4 space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-display text-2xl font-black text-gold flex items-center gap-2">
            <User className="h-6 w-6" /> My Profile
          </h1>
        </div>

        {/* Profile Card */}
        <div className="rounded-xl bg-card border border-border p-5 text-center space-y-3">
          <div className="flex justify-center">
            <div className={`relative w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold bg-secondary text-casino-gold overflow-hidden ${profile.has_animated_border && profile.border_style !== "none" ? `${BORDER_STYLES.find(b => b.id === profile.border_style)?.preview || ""} ring-4` : "ring-2 ring-border"} ${profile.has_animated_avatar ? "animate-pulse" : ""}`}>
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                profile.username?.charAt(0).toUpperCase() || "?"
              )}
              {profile.has_animated_avatar && (
                <Sparkles className="absolute -top-1 -right-1 h-5 w-5 text-casino-gold animate-spin" style={{ animationDuration: "3s" }} />
              )}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="absolute bottom-0 right-0 bg-primary rounded-full p-1 shadow-lg hover:bg-primary/80 transition-colors"
              >
                <Camera className="h-3 w-3 text-primary-foreground" />
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
            </div>
          </div>
          <div className="flex items-center justify-center gap-2">
            <Circle className={`h-3 w-3 ${getStatusColor(appearanceStatus)}`} />
            <h2 className="font-display text-xl font-bold">{profile.username}</h2>
          </div>
          {profile.bio && <p className="text-sm text-muted-foreground">{profile.bio}</p>}

          {/* Online Status Selector */}
          <div className="flex items-center justify-center gap-3 pt-1">
            <Label className="text-xs text-muted-foreground">Status:</Label>
            <Select value={appearanceStatus} onValueChange={(v) => setAppearanceStatus(v as AppearanceStatus)}>
              <SelectTrigger className="w-[130px] h-8 text-xs bg-secondary border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="online">
                  <span className="flex items-center gap-2"><Circle className="h-2 w-2 fill-green-400 text-green-400" /> Online</span>
                </SelectItem>
                <SelectItem value="idle">
                  <span className="flex items-center gap-2"><Circle className="h-2 w-2 fill-yellow-400 text-yellow-400" /> Idle</span>
                </SelectItem>
                <SelectItem value="offline">
                  <span className="flex items-center gap-2"><Circle className="h-2 w-2 fill-muted-foreground/30 text-muted-foreground/30" /> Appear Offline</span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Biggest Win */}
          <div className="flex items-center justify-center gap-2 rounded-lg bg-secondary/50 p-3">
            <Trophy className="h-5 w-5 text-casino-gold" />
            <div>
              <p className="text-xs text-muted-foreground">Biggest Win</p>
              <p className="font-display font-bold text-casino-green text-lg">
                ${profile.biggest_win.toFixed(2)}
              </p>
              {profile.biggest_win_game && (
                <p className="text-xs text-muted-foreground">on {profile.biggest_win_game}</p>
              )}
            </div>
          </div>

          {/* Social Links Display */}
          {Object.values(socialLinks).some(Boolean) && (
            <div className="flex justify-center gap-3 pt-2">
              {socialLinks.twitter && (
                <a href={`https://twitter.com/${socialLinks.twitter}`} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
                  <Twitter className="h-5 w-5" />
                </a>
              )}
              {socialLinks.instagram && (
                <a href={`https://instagram.com/${socialLinks.instagram}`} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
                  <Instagram className="h-5 w-5" />
                </a>
              )}
              {socialLinks.tiktok && (
                <a href={`https://tiktok.com/@${socialLinks.tiktok}`} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
                  <Globe className="h-5 w-5" />
                </a>
              )}
              {socialLinks.discord && (
                <span className="text-muted-foreground flex items-center gap-1 text-xs">
                  <MessageCircle className="h-4 w-4" /> {socialLinks.discord}
                </span>
              )}
              {socialLinks.website && (
                <a href={socialLinks.website.startsWith("http") ? socialLinks.website : `https://${socialLinks.website}`} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
                  <LinkIcon className="h-5 w-5" />
                </a>
              )}
            </div>
          )}
        </div>

        {/* Edit Bio */}
        <div className="rounded-xl bg-card border border-border p-4 space-y-3">
          <h3 className="font-display font-bold text-sm">About Me</h3>
          <Textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell people about yourself..."
            rows={3}
            maxLength={200}
            className="bg-background border-border text-sm"
          />
          <p className="text-xs text-muted-foreground text-right">{bio.length}/200</p>
        </div>

        {/* Social Links */}
        <div className="rounded-xl bg-card border border-border p-4 space-y-3">
          <h3 className="font-display font-bold text-sm flex items-center gap-2">
            <LinkIcon className="h-4 w-4 text-casino-gold" /> Social Links
          </h3>
          <div className="space-y-2">
            <div>
              <Label className="text-xs flex items-center gap-1"><Twitter className="h-3 w-3" /> Twitter / X</Label>
              <Input value={socialLinks.twitter} onChange={(e) => setSocialLinks(p => ({ ...p, twitter: e.target.value }))} placeholder="username" className="bg-background border-border text-sm" />
            </div>
            <div>
              <Label className="text-xs flex items-center gap-1"><Instagram className="h-3 w-3" /> Instagram</Label>
              <Input value={socialLinks.instagram} onChange={(e) => setSocialLinks(p => ({ ...p, instagram: e.target.value }))} placeholder="username" className="bg-background border-border text-sm" />
            </div>
            <div>
              <Label className="text-xs flex items-center gap-1"><Globe className="h-3 w-3" /> TikTok</Label>
              <Input value={socialLinks.tiktok} onChange={(e) => setSocialLinks(p => ({ ...p, tiktok: e.target.value }))} placeholder="username" className="bg-background border-border text-sm" />
            </div>
            <div>
              <Label className="text-xs flex items-center gap-1"><MessageCircle className="h-3 w-3" /> Discord</Label>
              <Input value={socialLinks.discord} onChange={(e) => setSocialLinks(p => ({ ...p, discord: e.target.value }))} placeholder="user#1234" className="bg-background border-border text-sm" />
            </div>
            <div>
              <Label className="text-xs flex items-center gap-1"><LinkIcon className="h-3 w-3" /> Website</Label>
              <Input value={socialLinks.website} onChange={(e) => setSocialLinks(p => ({ ...p, website: e.target.value }))} placeholder="https://yoursite.com" className="bg-background border-border text-sm" />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <Button variant="gold" className="w-full" onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" /> {saving ? "Saving..." : "Save Profile"}
        </Button>

        {/* Animated Avatar Purchase */}
        <div className="rounded-xl bg-card border border-border p-4 space-y-3">
          <h3 className="font-display font-bold text-sm flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-casino-gold" /> Animated Avatar
          </h3>
          <p className="text-xs text-muted-foreground">
            Make your profile picture animated with a glowing pulse effect and sparkle icon.
          </p>
          {profile.has_animated_avatar ? (
            <p className="text-xs text-casino-green font-bold">✅ Unlocked</p>
          ) : (
            <Button variant="gold" size="sm" onClick={handlePurchaseAnimatedAvatar}>
              <Sparkles className="h-3 w-3 mr-1" /> Purchase — ${ANIMATED_AVATAR_PRICE}
            </Button>
          )}
        </div>

        {/* Animated Borders */}
        <div className="rounded-xl bg-card border border-border p-4 space-y-3">
          <h3 className="font-display font-bold text-sm flex items-center gap-2">
            <Crown className="h-4 w-4 text-casino-gold" /> Profile Borders
          </h3>
          <p className="text-xs text-muted-foreground">
            Add an animated border around your profile picture. Stand out from the crowd!
          </p>
          <div className="grid grid-cols-2 gap-2">
            {BORDER_STYLES.map((style) => (
              <button
                key={style.id}
                onClick={() => handlePurchaseBorder(style)}
                className={`rounded-lg border p-3 text-center text-xs transition-all ${
                  profile.border_style === style.id
                    ? "border-casino-gold bg-casino-gold/10"
                    : "border-border hover:border-casino-gold/50"
                }`}
              >
                <div className={`w-10 h-10 rounded-full mx-auto mb-1 bg-secondary flex items-center justify-center ${style.preview} ${style.id !== "none" ? "ring-4" : ""}`}>
                  <span className="text-sm font-bold text-casino-gold">
                    {profile.username?.charAt(0).toUpperCase() || "?"}
                  </span>
                </div>
                <p className="font-bold">{style.label}</p>
                {style.price > 0 ? (
                  profile.border_style === style.id ? (
                    <p className="text-casino-green text-[10px]">Equipped</p>
                  ) : (
                    <p className="text-casino-gold text-[10px]">${style.price}</p>
                  )
                ) : (
                  <p className="text-muted-foreground text-[10px]">Free</p>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
