import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/casino/Header";
import { BottomNav } from "@/components/casino/BottomNav";
import { ProfileAvatar } from "@/components/casino/ProfileAvatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, UserPlus, Search, MessageCircle, Check, X, Clock, Circle } from "lucide-react";
import { toast } from "sonner";

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
  const [tab, setTab] = useState<"friends" | "online" | "requests" | "search">("friends");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserResult[]>([]);
  const [friendships, setFriendships] = useState<Friendship[]>([]);
  const [profiles, setProfiles] = useState<Record<string, UserResult>>({});
  const [onlineUsers, setOnlineUsers] = useState<UserResult[]>([]);

  useEffect(() => {
    if (!user) { navigate("/login"); return; }
    fetchFriendships();
    fetchOnlineUsers();
  }, [user]);

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
    const { data: presenceData } = await supabase
      .from("user_presence" as any)
      .select("user_id")
      .eq("is_online", true)
      .neq("user_id", user.id)
      .limit(50) as { data: any[] | null };

    if (presenceData && presenceData.length > 0) {
      const userIds = presenceData.map((p: any) => p.user_id);
      const { data: profs } = await supabase
        .from("profiles_public" as any)
        .select("user_id, username, avatar_url, border_style, has_animated_border, has_animated_avatar")
        .in("user_id", userIds) as { data: any[] | null };
      setOnlineUsers((profs || []) as UserResult[]);
    }
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
    <div className="min-h-screen gradient-casino-bg pb-20 md:pb-0">
      <Header />
      <div className="container max-w-2xl py-6 px-4">
        <h1 className="font-display text-2xl font-black text-gold mb-4 flex items-center gap-2">
          <Users className="h-6 w-6" /> Social
        </h1>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 overflow-x-auto">
          {(["friends", "online", "requests", "search"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-full px-4 py-2 text-sm font-display font-semibold transition-all capitalize shrink-0 ${
                tab === t ? "gradient-gold text-accent-foreground" : "bg-secondary text-muted-foreground"
              }`}
            >
              {t}
              {t === "requests" && pendingReceived.length > 0 && (
                <span className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-casino-pink text-[10px] text-primary-foreground">
                  {pendingReceived.length}
                </span>
              )}
              {t === "online" && onlineUsers.length > 0 && (
                <span className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-green-500 text-[10px] text-white">
                  {onlineUsers.length}
                </span>
              )}
            </button>
          ))}
        </div>

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
                const existing = friendships.find(
                  (f) => f.requester_id === u.user_id || f.addressee_id === u.user_id
                );
                return (
                  <div key={u.user_id} className="flex items-center justify-between rounded-xl bg-card border border-border p-4">
                    <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate(`/user/${u.user_id}`)}>
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
                    {existing ? (
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
                    <div className="flex items-center gap-3">
                      <ProfileAvatar avatarUrl={u.avatar_url} username={u.username} borderStyle={u.border_style} hasAnimatedBorder={u.has_animated_border} size="md" />
                      <p className="font-display font-bold">{u.username || "Unknown"}</p>
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
