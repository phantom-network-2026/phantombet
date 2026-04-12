import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/casino/Header";
import { BottomNav } from "@/components/casino/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, UserPlus, Search, MessageCircle, Check, X, Clock } from "lucide-react";
import { toast } from "sonner";

interface UserResult {
  user_id: string;
  username: string | null;
}

interface Friendship {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: "pending" | "accepted" | "rejected";
  requester_profile?: UserResult;
  addressee_profile?: UserResult;
}

export default function Friends() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"friends" | "requests" | "search">("friends");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserResult[]>([]);
  const [friendships, setFriendships] = useState<Friendship[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!user) { navigate("/login"); return; }
    fetchFriendships();
  }, [user]);

  const fetchFriendships = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("friendships")
      .select("*")
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

    if (data) {
      setFriendships(data);
      // Fetch all related profiles
      const userIds = new Set<string>();
      data.forEach((f) => { userIds.add(f.requester_id); userIds.add(f.addressee_id); });
      userIds.delete(user.id);

      if (userIds.size > 0) {
        const { data: profs } = await supabase
          .from("profiles_public" as any)
          .select("user_id, username")
          .in("user_id", Array.from(userIds)) as { data: any[] | null };
        if (profs) {
          const map: Record<string, string> = {};
          profs.forEach((p: any) => { map[p.user_id] = p.username || "Unknown"; });
          setProfiles(map);
        }
      }
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim() || !user) return;
    const { data } = await supabase
      .from("profiles_public" as any)
      .select("user_id, username")
      .ilike("username", `%${searchQuery}%`)
      .neq("user_id", user.id)
      .limit(10) as { data: any[] | null };
    setSearchResults((data || []) as any);
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

  return (
    <div className="min-h-screen gradient-casino-bg pb-20 md:pb-0">
      <Header />
      <div className="container max-w-2xl py-6 px-4">
        <h1 className="font-display text-2xl font-black text-gold mb-4 flex items-center gap-2">
          <Users className="h-6 w-6" /> Friends
        </h1>

        {/* Tabs */}
        <div className="flex gap-1 mb-6">
          {(["friends", "requests", "search"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-full px-4 py-2 text-sm font-display font-semibold transition-all capitalize ${
                tab === t ? "gradient-gold text-accent-foreground" : "bg-secondary text-muted-foreground"
              }`}
            >
              {t}
              {t === "requests" && pendingReceived.length > 0 && (
                <span className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-casino-pink text-[10px] text-primary-foreground">
                  {pendingReceived.length}
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
                return (
                  <div key={f.id} className="flex items-center justify-between rounded-xl bg-card border border-border p-4">
                    <div>
                      <p className="font-display font-bold">{profiles[friendId] || "Unknown"}</p>
                      <p className="text-xs text-muted-foreground">Friend</p>
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

        {/* Requests */}
        {tab === "requests" && (
          <div className="space-y-3">
            {pendingReceived.length > 0 && (
              <>
                <h3 className="text-sm font-bold text-muted-foreground">Received</h3>
                {pendingReceived.map((f) => (
                  <div key={f.id} className="flex items-center justify-between rounded-xl bg-card border border-border p-4">
                    <p className="font-display font-bold">{profiles[f.requester_id] || "Unknown"}</p>
                    <div className="flex gap-2">
                      <Button variant="gold" size="sm" onClick={() => respondToRequest(f.id, "accepted")}>
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => respondToRequest(f.id, "rejected")}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </>
            )}
            {pendingSent.length > 0 && (
              <>
                <h3 className="text-sm font-bold text-muted-foreground mt-4">Sent</h3>
                {pendingSent.map((f) => (
                  <div key={f.id} className="flex items-center justify-between rounded-xl bg-card border border-border p-4">
                    <p className="font-display font-bold">{profiles[f.addressee_id] || "Unknown"}</p>
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                      <Clock className="h-4 w-4" /> Pending
                    </div>
                  </div>
                ))}
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
                    <p className="font-display font-bold">{u.username || "Unknown"}</p>
                    {existing ? (
                      <span className="text-xs text-muted-foreground capitalize">{existing.status}</span>
                    ) : (
                      <Button variant="gold" size="sm" onClick={() => sendRequest(u.user_id)}>
                        <UserPlus className="h-4 w-4 mr-1" /> Add
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
