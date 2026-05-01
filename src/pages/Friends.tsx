import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/casino/Header";
import { BottomNav } from "@/components/casino/BottomNav";
import { ProfileAvatar } from "@/components/casino/ProfileAvatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, UserPlus, Search, MessageCircle, Check, X, Clock, Circle, MessageSquare, Sparkles, Trophy, Inbox, PartyPopper } from "lucide-react";
import { toast } from "sonner";
import PartyChat from "@/components/casino/PartyChat";
import Forum from "@/components/casino/Forum";
import socialHero from "@/assets/social-hero.jpg";
import tileForum from "@/assets/social-tile-forum.jpg";
import tileFriends from "@/assets/social-tile-friends.jpg";
import tileParty from "@/assets/social-tile-party.jpg";

interface UserResult {
  user_id: string;
  username: string | null;
  avatar_url?: string | null;
  border_style?: string | null;
  has_animated_border?: boolean | null;
  has_animated_avatar?: boolean | null;
}

interface Friendship {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: "pending" | "accepted" | "rejected";
}

export default function Friends() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (searchParams.get("tab") as any) || "forum";
  const [tab, setTab] = useState<"forum" | "friends" | "party" | "online" | "requests" | "search" | "messages" | "leaderboard">(initialTab);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserResult[]>([]);
  const [friendships, setFriendships] = useState<Friendship[]>([]);
  const [profiles, setProfiles] = useState<Record<string, UserResult>>({});
  const [onlineUsers, setOnlineUsers] = useState<UserResult[]>([]);
  const [leaderboard, setLeaderboard] = useState<Array<UserResult & { level?: number; total_wagered?: number }>>([]);
  const [recentDms, setRecentDms] = useState<Array<{ user_id: string; preview: string; at: string; unread: number }>>([]);

  useEffect(() => {
    if (!user) { navigate("/login"); return; }
    fetchFriendships();
    fetchOnlineUsers();
  }, [user]);

  useEffect(() => {
    if (tab === "leaderboard") fetchLeaderboard();
    if (tab === "messages") fetchRecentDms();
    // keep URL in sync
    const sp = new URLSearchParams(searchParams);
    sp.set("tab", tab);
    setSearchParams(sp, { replace: true });
    // eslint-disable-next-line
  }, [tab]);

  const fetchLeaderboard = async () => {
    const { data } = await supabase
      .from("profiles_public" as any)
      .select("user_id, username, avatar_url, border_style, has_animated_border, has_animated_avatar, level, total_wagered")
      .order("level", { ascending: false })
      .limit(25) as { data: any[] | null };
    setLeaderboard((data || []) as any);
  };

  const fetchRecentDms = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("messages")
      .select("sender_id,receiver_id,content,created_at,is_read")
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order("created_at", { ascending: false })
      .limit(80) as { data: any[] | null };
    if (!data) { setRecentDms([]); return; }
    const map = new Map<string, { user_id: string; preview: string; at: string; unread: number }>();
    for (const m of data) {
      const other = m.sender_id === user.id ? m.receiver_id : m.sender_id;
      const existing = map.get(other);
      const unreadInc = m.receiver_id === user.id && !m.is_read ? 1 : 0;
      if (!existing) {
        map.set(other, { user_id: other, preview: m.content, at: m.created_at, unread: unreadInc });
      } else {
        existing.unread += unreadInc;
      }
    }
    const list = Array.from(map.values());
    const ids = list.map((l) => l.user_id);
    if (ids.length) {
      const { data: profs } = await supabase
        .from("profiles_public" as any)
        .select("user_id, username, avatar_url, border_style, has_animated_border, has_animated_avatar")
        .in("user_id", ids) as { data: any[] | null };
      const map2: Record<string, UserResult> = {};
      (profs || []).forEach((p: any) => { map2[p.user_id] = p; });
      setProfiles((prev) => ({ ...prev, ...map2 }));
    }
    setRecentDms(list);
  };

  const fetchFriendships = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("friendships")
      .select("*")
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

    if (data) {
      setFriendships(data);
      const userIds = new Set<string>();
      data.forEach((f) => { userIds.add(f.requester_id); userIds.add(f.addressee_id); });
      userIds.delete(user.id);

      if (userIds.size > 0) {
        const { data: profs } = await supabase
          .from("profiles_public" as any)
          .select("user_id, username, avatar_url, border_style, has_animated_border, has_animated_avatar")
          .in("user_id", Array.from(userIds)) as { data: any[] | null };
        if (profs) {
          const map: Record<string, UserResult> = {};
          profs.forEach((p: any) => { map[p.user_id] = p; });
          setProfiles(map);
        }
      }
    }
  };

  const fetchOnlineUsers = async () => {
    if (!user) return;

    // Fetch real online users — only those seen in the last 2 minutes
    const twoMinAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    const { data: presenceData } = await supabase
      .from("user_presence" as any)
      .select("user_id")
      .eq("is_online", true)
      .neq("user_id", user.id)
      .gte("last_seen", twoMinAgo)
      .limit(50) as { data: any[] | null };

    let realOnline: UserResult[] = [];
    if (presenceData && presenceData.length > 0) {
      const userIds = presenceData.map((p: any) => p.user_id);
      const { data: profs } = await supabase
        .from("profiles_public" as any)
        .select("user_id, username, avatar_url, border_style, has_animated_border, has_animated_avatar")
        .in("user_id", userIds) as { data: any[] | null };
      realOnline = (profs || []) as UserResult[];
    }

    // Fetch ghost users config
    try {
      const { data } = await supabase.functions.invoke("get-public-settings", {
        body: { keys: ["ghost_users"] },
      });
      const ghostConfig = data?.settings?.ghost_users;
      if (ghostConfig?.enabled && ghostConfig?.show_in_presence !== false && ghostConfig?.usernames?.length > 0) {
        // Filter out any names that match real usernames
        const realNames = new Set(realOnline.map(u => u.username?.toLowerCase()));
        const availableGhosts = ghostConfig.usernames.filter(
          (name: string) => !realNames.has(name.toLowerCase())
        );
        // Determine how many ghosts to show
        const minOnline = ghostConfig.min_online || 5;
        const peakOnline = ghostConfig.peak_online || 20;
        const hour = new Date().getHours();
        const isPeak = hour >= 18 && hour <= 23;
        const ghostCount = Math.min(
          availableGhosts.length,
          isPeak ? peakOnline : minOnline
        );
        // Shuffle and pick
        const shuffled = [...availableGhosts].sort(() => Math.random() - 0.5);
        const ghostUsers: UserResult[] = shuffled.slice(0, ghostCount).map((name: string) => ({
          user_id: `ghost_${name}`,
          username: name,
          avatar_url: null,
          border_style: null,
          has_animated_border: false,
          has_animated_avatar: false,
        }));
        setOnlineUsers([...realOnline, ...ghostUsers]);
        return;
      }
    } catch {}

    setOnlineUsers(realOnline);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim() || !user) return;
    const { data } = await supabase
      .from("profiles_public" as any)
      .select("user_id, username, avatar_url, border_style, has_animated_border, has_animated_avatar")
      .ilike("username", `%${searchQuery}%`)
      .neq("user_id", user.id)
      .limit(10) as { data: any[] | null };
    setSearchResults((data || []) as UserResult[]);
  };

  const sendRequest = async (targetId: string) => {
    if (!user) return;
    const { error } = await supabase.from("friendships").insert({
      requester_id: user.id,
      addressee_id: targetId,
    });
    if (error) {
      if (error.code === "23505") toast.error("Friend request already sent");
      else toast.error(error.message);
    } else {
      toast.success("Friend request sent!");
      fetchFriendships();
    }
  };

  const respondToRequest = async (friendshipId: string, status: "accepted" | "rejected") => {
    const { error } = await supabase
      .from("friendships")
      .update({ status })
      .eq("id", friendshipId);
    if (error) toast.error(error.message);
    else {
      toast.success(status === "accepted" ? "Friend added!" : "Request declined");
      fetchFriendships();
    }
  };

  const removeFriend = async (friendshipId: string) => {
    const { error } = await supabase.from("friendships").delete().eq("id", friendshipId);
    if (error) toast.error(error.message);
    else { toast.success("Friend removed"); fetchFriendships(); }
  };

  const accepted = friendships.filter((f) => f.status === "accepted");
  const pendingReceived = friendships.filter(
    (f) => f.status === "pending" && f.addressee_id === user?.id
  );
  const pendingSent = friendships.filter(
    (f) => f.status === "pending" && f.requester_id === user?.id
  );

  const getFriendId = (f: Friendship) =>
    f.requester_id === user?.id ? f.addressee_id : f.requester_id;

  const getProfile = (userId: string): UserResult => profiles[userId] || { user_id: userId, username: "Unknown" };

  return (
    <div className="min-h-screen gradient-casino-bg pb-24">
      <Header />
      {/* Cinematic Hero */}
      <div className="relative w-full overflow-hidden">
        <div className="relative h-[280px] sm:h-[340px] md:h-[400px] w-full">
          <img
            src={socialHero}
            alt="Phantom Social network"
            className="absolute inset-0 h-full w-full object-cover"
            width={1920}
            height={1080}
          />
          {/* Gradient overlays */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/40 to-background" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,hsl(var(--background))_85%)]" />
          {/* Animated glow accents */}
          <div className="absolute -top-16 left-1/4 h-56 w-56 rounded-full bg-casino-gold/20 blur-3xl animate-pulse" />
          <div className="absolute -bottom-10 right-10 h-56 w-56 rounded-full bg-primary/30 blur-3xl animate-pulse" style={{ animationDelay: "1.2s" }} />

          <div className="relative z-10 h-full container max-w-3xl px-4 flex flex-col justify-end pb-6">
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-casino-gold/40 bg-black/50 backdrop-blur px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-casino-gold">
              <Sparkles className="h-3 w-3" /> The Network
            </span>
            <h1 className="mt-3 font-display text-4xl sm:text-5xl font-black leading-none bg-gradient-to-r from-casino-gold via-amber-100 to-casino-gold bg-clip-text text-transparent drop-shadow-[0_0_25px_hsl(45_95%_55%/0.35)]">
              Phantom Social
            </h1>
            <p className="mt-2 max-w-md text-sm text-muted-foreground/90">
              Connect, post, party. The encrypted hub where the network gathers.
            </p>
          </div>
        </div>
      </div>

      <div className="container max-w-3xl py-4 px-4">
        {/* Quick-pick image tiles */}
        <div className="grid grid-cols-5 gap-2 mb-4">
          {[
            { id: "forum",       label: "Forum",   img: tileForum,   icon: MessageSquare, count: undefined as number | undefined },
            { id: "friends",     label: "Friends", img: tileFriends, icon: Users,         count: accepted.length },
            { id: "messages",    label: "DMs",     img: tileFriends, icon: Inbox,         count: undefined },
            { id: "party",       label: "Party",   img: tileParty,   icon: PartyPopper,   count: undefined },
            { id: "leaderboard", label: "Top",     img: tileParty,   icon: Trophy,        count: undefined },
          ].map((tile) => (
            <button
              key={tile.id}
              onClick={() => setTab(tile.id as any)}
              className={`group relative aspect-square overflow-hidden rounded-2xl border transition-all ${
                tab === tile.id
                  ? "border-casino-gold shadow-[0_0_25px_hsl(45_95%_55%/0.45)]"
                  : "border-border hover:border-casino-gold/60"
              }`}
            >
              <img src={tile.img} alt={tile.label} className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-110 opacity-70" loading="lazy" width={512} height={512} />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
              {tab === tile.id && (
                <div className="absolute inset-0 ring-2 ring-inset ring-casino-gold/70 animate-pulse" />
              )}
              <div className="absolute top-1.5 right-1.5 h-6 w-6 rounded-md bg-black/60 border border-casino-gold/30 text-casino-gold flex items-center justify-center backdrop-blur">
                <tile.icon className="h-3 w-3" />
              </div>
              <div className="absolute bottom-0 inset-x-0 p-1.5 text-left">
                <p className="font-display font-black text-[11px] text-white drop-shadow leading-none">{tile.label}</p>
                {typeof tile.count === "number" && tile.count > 0 && (
                  <p className="text-[9px] text-casino-gold mt-0.5">{tile.count} active</p>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Secondary tab pills */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {(["forum", "friends", "messages", "party", "online", "leaderboard", "requests", "search"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-full px-4 py-2 text-xs font-display font-semibold transition-all capitalize shrink-0 border ${
                tab === t
                  ? "gradient-gold text-accent-foreground border-casino-gold shadow-[0_0_15px_hsl(45_95%_55%/0.4)]"
                  : "bg-secondary/60 text-muted-foreground border-border hover:border-casino-gold/40"
              }`}
            >
              {t}
              {t === "requests" && pendingReceived.length > 0 && (
                <span className="ml-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-casino-pink text-[9px] text-primary-foreground">
                  {pendingReceived.length}
                </span>
              )}
              {t === "online" && onlineUsers.length > 0 && (
                <span className="ml-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-green-500 text-[9px] text-white">
                  {onlineUsers.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Forum */}
        {tab === "forum" && <Forum />}

        {/* Party Chat */}
        {tab === "party" && <PartyChat />}

        {/* Messages list */}
        {tab === "messages" && (
          <div className="space-y-2">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-display font-bold text-sm flex items-center gap-2"><Inbox className="h-4 w-4 text-casino-gold" /> Direct Messages</h3>
              <Button variant="ghost" size="sm" onClick={() => setTab("friends")}>Start new</Button>
            </div>
            {recentDms.length === 0 ? (
              <p className="text-center text-muted-foreground py-8 text-sm">No conversations yet — message a friend to get started.</p>
            ) : recentDms.map((dm) => {
              const prof = getProfile(dm.user_id);
              return (
                <button key={dm.user_id} onClick={() => navigate(`/messages/${dm.user_id}`)}
                  className="w-full flex items-center gap-3 rounded-xl bg-card border border-border p-3 hover:border-casino-gold/50 transition text-left">
                  <ProfileAvatar avatarUrl={prof.avatar_url} username={prof.username} borderStyle={prof.border_style}
                    hasAnimatedBorder={prof.has_animated_border} hasAnimatedAvatar={prof.has_animated_avatar} size="md" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-display font-bold truncate">{prof.username || "Unknown"}</p>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {new Date(dm.at).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{dm.preview}</p>
                  </div>
                  {dm.unread > 0 && (
                    <span className="h-5 min-w-5 px-1.5 inline-flex items-center justify-center rounded-full bg-casino-pink text-[10px] font-bold text-white">
                      {dm.unread}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Leaderboard */}
        {tab === "leaderboard" && (
          <div className="space-y-2">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-display font-bold text-sm flex items-center gap-2"><Trophy className="h-4 w-4 text-casino-gold" /> Network Leaderboard</h3>
              <span className="text-[10px] text-muted-foreground">Top 25 by level</span>
            </div>
            {leaderboard.length === 0 ? (
              <p className="text-center text-muted-foreground py-8 text-sm">Loading rankings...</p>
            ) : leaderboard.map((u, i) => (
              <div key={u.user_id} className="flex items-center gap-3 rounded-xl bg-card border border-border p-3">
                <span className={`w-7 text-center font-display font-black text-sm ${
                  i === 0 ? "text-casino-gold" : i === 1 ? "text-zinc-300" : i === 2 ? "text-amber-700" : "text-muted-foreground"
                }`}>#{i + 1}</span>
                <div className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer" onClick={() => navigate(`/user/${u.user_id}`)}>
                  <ProfileAvatar avatarUrl={u.avatar_url} username={u.username} borderStyle={u.border_style}
                    hasAnimatedBorder={u.has_animated_border} hasAnimatedAvatar={u.has_animated_avatar} size="md" />
                  <div className="min-w-0">
                    <p className="font-display font-bold truncate hover:text-casino-gold transition">{u.username || "Unknown"}</p>
                    <p className="text-[11px] text-muted-foreground">Level {u.level ?? 1}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Friends List */}
        {tab === "friends" && (
          <div className="space-y-3">
            {accepted.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No friends yet. Search for users to add!</p>
            ) : (
              accepted.map((f) => {
                const friendId = getFriendId(f);
                const prof = getProfile(friendId);
                return (
                  <div key={f.id} className="flex items-center justify-between rounded-xl bg-card border border-border p-4">
                    <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate(`/user/${friendId}`)}>
                      <ProfileAvatar
                        avatarUrl={prof.avatar_url}
                        username={prof.username}
                        borderStyle={prof.border_style}
                        hasAnimatedBorder={prof.has_animated_border}
                        hasAnimatedAvatar={prof.has_animated_avatar}
                        size="md"
                      />
                      <div>
                        <p className="font-display font-bold hover:text-casino-gold transition">{prof.username || "Unknown"}</p>
                        <p className="text-xs text-muted-foreground">Friend</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="gold" size="sm" onClick={() => navigate(`/messages/${friendId}`)}>
                        <MessageCircle className="h-4 w-4 mr-1" /> Chat
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => removeFriend(f.id)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Online Members */}
        {tab === "online" && (
          <div className="space-y-3">
            {onlineUsers.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No users online right now.</p>
            ) : (
              onlineUsers.map((u) => {
                const isGhost = u.user_id.startsWith("ghost_");
                const existing = isGhost ? null : friendships.find(
                  (f) => f.requester_id === u.user_id || f.addressee_id === u.user_id
                );
                return (
                  <div key={u.user_id} className="flex items-center justify-between rounded-xl bg-card border border-border p-4">
                    <div className={`flex items-center gap-3 ${isGhost ? "" : "cursor-pointer"}`} onClick={() => !isGhost && navigate(`/user/${u.user_id}`)}>
                      <div className="relative">
                        <ProfileAvatar
                          avatarUrl={u.avatar_url}
                          username={u.username}
                          borderStyle={u.border_style}
                          hasAnimatedBorder={u.has_animated_border}
                          hasAnimatedAvatar={u.has_animated_avatar}
                          size="md"
                        />
                        <Circle className="absolute -bottom-0.5 -right-0.5 h-3 w-3 fill-green-400 text-green-400" />
                      </div>
                      <div>
                        <p className="font-display font-bold hover:text-casino-gold transition">{u.username || "Unknown"}</p>
                        <p className="text-xs text-green-400">Online</p>
                      </div>
                    </div>
                    {isGhost ? (
                      <Button variant="gold" size="icon" className="h-8 w-8 rounded-full" onClick={() => toast.info("This user is not accepting requests right now")}>
                        <UserPlus className="h-4 w-4" />
                      </Button>
                    ) : existing ? (
                      <span className="text-xs text-muted-foreground capitalize px-3 py-1 bg-secondary rounded-full">{existing.status}</span>
                    ) : (
                      <Button variant="gold" size="icon" className="h-8 w-8 rounded-full" onClick={() => sendRequest(u.user_id)}>
                        <UserPlus className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Requests */}
        {tab === "requests" && (
          <div className="space-y-3">
            {pendingReceived.length > 0 && (
              <>
                <h3 className="text-sm font-bold text-muted-foreground">Received</h3>
                {pendingReceived.map((f) => {
                  const prof = getProfile(f.requester_id);
                  return (
                    <div key={f.id} className="flex items-center justify-between rounded-xl bg-card border border-border p-4">
                      <div className="flex items-center gap-3">
                        <ProfileAvatar avatarUrl={prof.avatar_url} username={prof.username} borderStyle={prof.border_style} hasAnimatedBorder={prof.has_animated_border} size="sm" />
                        <p className="font-display font-bold">{prof.username || "Unknown"}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="gold" size="sm" onClick={() => respondToRequest(f.id, "accepted")}>
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => respondToRequest(f.id, "rejected")}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
            {pendingSent.length > 0 && (
              <>
                <h3 className="text-sm font-bold text-muted-foreground mt-4">Sent</h3>
                {pendingSent.map((f) => {
                  const prof = getProfile(f.addressee_id);
                  return (
                    <div key={f.id} className="flex items-center justify-between rounded-xl bg-card border border-border p-4">
                      <div className="flex items-center gap-3">
                        <ProfileAvatar avatarUrl={prof.avatar_url} username={prof.username} borderStyle={prof.border_style} hasAnimatedBorder={prof.has_animated_border} size="sm" />
                        <p className="font-display font-bold">{prof.username || "Unknown"}</p>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground text-sm">
                        <Clock className="h-4 w-4" /> Pending
                      </div>
                    </div>
                  );
                })}
              </>
            )}
            {pendingReceived.length === 0 && pendingSent.length === 0 && (
              <p className="text-center text-muted-foreground py-8">No pending requests.</p>
            )}
          </div>
        )}

        {/* Search */}
        {tab === "search" && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  placeholder="Search by username..."
                  className="pl-10 bg-secondary border-border"
                />
              </div>
              <Button variant="gold" onClick={handleSearch}>Search</Button>
            </div>
            <div className="space-y-3">
              {searchResults.map((u) => {
                const existing = friendships.find(
                  (f) => f.requester_id === u.user_id || f.addressee_id === u.user_id
                );
                return (
                  <div key={u.user_id} className="flex items-center justify-between rounded-xl bg-card border border-border p-4">
                    <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate(`/user/${u.user_id}`)}>
                      <ProfileAvatar avatarUrl={u.avatar_url} username={u.username} borderStyle={u.border_style} hasAnimatedBorder={u.has_animated_border} size="md" />
                      <p className="font-display font-bold hover:text-casino-gold transition">{u.username || "Unknown"}</p>
                    </div>
                    {existing ? (
                      <span className="text-xs text-muted-foreground capitalize">{existing.status}</span>
                    ) : (
                      <Button variant="gold" size="icon" className="h-8 w-8 rounded-full" onClick={() => sendRequest(u.user_id)}>
                        <UserPlus className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
