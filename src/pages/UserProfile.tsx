import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth, getLevel, getXpForLevel, getTitle, getTitleColor } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/casino/Header";
import { BottomNav } from "@/components/casino/BottomNav";
import { ProfileAvatar } from "@/components/casino/ProfileAvatar";
import { StaffUsername, type StaffRole } from "@/components/casino/StaffUsername";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Trophy, Star, Crown, Twitter, Instagram, MessageCircle, Globe, UserPlus, Zap } from "lucide-react";
import { toast } from "sonner";

interface PublicProfile {
  user_id: string;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  biggest_win: number | null;
  biggest_win_game: string | null;
  has_animated_avatar: boolean | null;
  has_animated_border: boolean | null;
  border_style: string | null;
  social_links: Record<string, string> | null;
  created_at: string | null;
  xp: number;
  has_high_roller: boolean | null;
  name_color: string | null;
  purchased_borders: string[];
}

const SOCIAL_ICONS: Record<string, any> = {
  twitter: Twitter,
  instagram: Instagram,
  tiktok: MessageCircle,
  discord: MessageCircle,
  website: Globe,
};

export default function UserProfile() {
  const { userId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [staffRole, setStaffRole] = useState<StaffRole>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [isFriend, setIsFriend] = useState(false);
  const [friendshipId, setFriendshipId] = useState<string | null>(null);
  const [pendingSent, setPendingSent] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId || !user) { navigate("/login"); return; }
    if (userId === user.id) { navigate("/profile"); return; }
    fetchProfile();
  }, [userId, user]);

  const fetchProfile = async () => {
    if (!userId || !user) return;
    setLoading(true);

    // Fetch public profile
    const { data: prof } = await supabase
      .from("profiles_public" as any)
      .select("*")
      .eq("user_id", userId)
      .single() as { data: any };

    if (prof) setProfile(prof as PublicProfile);

    // Fetch role
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    if (roles && roles.length > 0) {
      const priority: Record<string, number> = { admin: 3, moderator: 2, staff: 1 };
      const staffRoles = roles.filter(r => ["admin", "moderator", "staff"].includes(r.role));
      if (staffRoles.length > 0) {
        const best = staffRoles.reduce((a, b) => (priority[b.role] || 0) > (priority[a.role] || 0) ? b : a);
        setStaffRole(best.role as StaffRole);
      }
    }

    // Fetch presence
    const { data: presence } = await supabase
      .from("user_presence" as any)
      .select("is_online, last_seen")
      .eq("user_id", userId)
      .single() as { data: any };
    if (presence) {
      setIsOnline(presence.is_online && (Date.now() - new Date(presence.last_seen).getTime()) < 60000);
    }

    // Fetch friendship
    const { data: friendships } = await supabase
      .from("friendships")
      .select("*")
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);
    if (friendships) {
      const f = friendships.find(f => f.requester_id === userId || f.addressee_id === userId);
      if (f) {
        setFriendshipId(f.id);
        if (f.status === "accepted") setIsFriend(true);
        if (f.status === "pending" && f.requester_id === user.id) setPendingSent(true);
      }
    }

    setLoading(false);
  };

  const sendRequest = async () => {
    if (!user || !userId) return;
    const { error } = await supabase.from("friendships").insert({
      requester_id: user.id,
      addressee_id: userId,
    });
    if (error) {
      if (error.code === "23505") toast.error("Friend request already sent");
      else toast.error(error.message);
    } else {
      toast.success("Friend request sent!");
      setPendingSent(true);
    }
  };

  if (loading || !profile) {
    return (
      <div className="min-h-screen gradient-casino-bg pb-20">
        <Header />
        <div className="flex items-center justify-center py-20">
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
        <BottomNav />
      </div>
    );
  }

  const level = getLevel(profile.xp || 0);
  const title = getTitle(level);
  const titleColor = getTitleColor(level);
  const currentXp = profile.xp || 0;
  const xpForCurrent = getXpForLevel(level);
  const xpForNext = getXpForLevel(level + 1);
  const xpProgress = xpForNext > xpForCurrent ? ((currentXp - xpForCurrent) / (xpForNext - xpForCurrent)) * 100 : 100;

  const socialLinks = (profile.social_links || {}) as Record<string, string>;
  const hasSocials = Object.values(socialLinks).some(v => v && v.trim());

  return (
    <div className="min-h-screen gradient-casino-bg pb-20 md:pb-0">
      <Header />
      <div className="container max-w-lg py-6 px-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>

        {/* Profile Card */}
        <div className="rounded-2xl bg-card border border-border p-6 text-center space-y-4">
          {/* Avatar */}
          <div className="flex justify-center">
            <div className="relative">
              <ProfileAvatar
                avatarUrl={profile.avatar_url}
                username={profile.username}
                borderStyle={profile.border_style}
                hasAnimatedBorder={profile.has_animated_border}
                hasAnimatedAvatar={profile.has_animated_avatar}
                size="lg"
              />
              {isOnline && (
                <div className="absolute bottom-1 right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-card" />
              )}
            </div>
          </div>

          {/* Name */}
          <div>
            <StaffUsername
              username={profile.username || "Unknown"}
              role={staffRole}
              hasHighRoller={profile.has_high_roller || false}
              nameColor={profile.name_color}
              size="lg"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {isOnline ? <span className="text-green-400">● Online</span> : "● Offline"}
            </p>
          </div>

          {/* Level & Title */}
          <div className="bg-secondary/50 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-casino-gold" />
                <span className="text-sm font-bold">Level {level}</span>
              </div>
              <Badge variant="outline" className={titleColor}>
                {title}
              </Badge>
            </div>
            <Progress value={xpProgress} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {Math.floor(currentXp)} / {Math.floor(xpForNext)} XP
            </p>
          </div>

          {/* HIGH ROLLER Badge */}
          {profile.has_high_roller && (
            <div className="bg-gradient-to-r from-yellow-500/20 via-orange-500/20 to-red-500/20 border border-yellow-500/30 rounded-xl p-3 flex items-center justify-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-400" />
              <span className="font-black bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 bg-clip-text text-transparent text-sm">
                HIGH ROLLER
              </span>
              <Trophy className="h-5 w-5 text-yellow-400" />
            </div>
          )}

          {/* Biggest Win */}
          {(profile.biggest_win || 0) > 0 && (
            <div className="flex items-center justify-center gap-2 text-casino-gold">
              <Trophy className="h-4 w-4" />
              <span className="text-sm font-bold">
                Biggest Win: ${Number(profile.biggest_win).toFixed(2)} — {profile.biggest_win_game || "Unknown"}
              </span>
            </div>
          )}

          {/* Bio */}
          {profile.bio && (
            <p className="text-sm text-muted-foreground italic">"{profile.bio}"</p>
          )}

          {/* Purchased Borders showcase */}
          {profile.purchased_borders && profile.purchased_borders.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-bold uppercase">Owned Borders</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {profile.purchased_borders.map((b: string) => (
                  <Badge key={b} variant="secondary" className="text-xs capitalize">
                    <Star className="h-3 w-3 mr-1 text-casino-gold" /> {b.replace("-", " ")}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Social Links */}
          {hasSocials && (
            <div className="flex justify-center gap-3 pt-2">
              {Object.entries(socialLinks).map(([key, val]) => {
                if (!val || !val.trim()) return null;
                const Icon = SOCIAL_ICONS[key] || Globe;
                return (
                  <a key={key} href={val.startsWith("http") ? val : `https://${val}`} target="_blank" rel="noopener noreferrer" className="p-2 rounded-full bg-secondary hover:bg-secondary/80 transition">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </a>
                );
              })}
            </div>
          )}

          {/* Joined date */}
          <p className="text-xs text-muted-foreground">
            Joined {profile.created_at ? new Date(profile.created_at).toLocaleDateString() : "Unknown"}
          </p>

          {/* Actions */}
          <div className="flex gap-2 justify-center pt-2">
            {isFriend ? (
              <Button variant="gold" onClick={() => navigate(`/messages/${userId}`)}>
                <MessageCircle className="h-4 w-4 mr-2" /> Message
              </Button>
            ) : pendingSent ? (
              <Button variant="secondary" disabled>
                Request Sent
              </Button>
            ) : (
              <Button variant="gold" onClick={sendRequest}>
                <UserPlus className="h-4 w-4 mr-2" /> Add Friend
              </Button>
            )}
          </div>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
