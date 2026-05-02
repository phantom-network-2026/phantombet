import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ProfileAvatar } from "@/components/casino/ProfileAvatar";
import { Mic, MicOff, Lock, Users, Plus, LogOut, Crown, UserX, Flag, Volume2, PhoneOff } from "lucide-react";
import { toast } from "sonner";
import {
  Room,
  RoomEvent,
  Track,
  type RemoteParticipant,
  type LocalParticipant,
} from "livekit-client";

interface Lobby {
  id: string;
  name: string;
  host_id: string;
  is_public: boolean;
  max_members: number;
  has_password?: boolean;
  created_at: string;
}

interface Member {
  id: string;
  lobby_id: string;
  user_id: string;
  is_muted: boolean;
  joined_at: string;
}

interface ProfileLite {
  username: string | null;
  avatar_url: string | null;
  border_style: string | null;
  has_animated_border: boolean | null;
  has_animated_avatar: boolean | null;
}

async function hashPassword(pw: string): Promise<string> {
  const buf = new TextEncoder().encode(pw);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export default function PartyChat() {
  const { user, profile } = useAuth();
  const [lobbies, setLobbies] = useState<Lobby[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileLite>>({});
  const [activeLobby, setActiveLobby] = useState<Lobby | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPublic, setNewPublic] = useState(true);
  const [newPassword, setNewPassword] = useState("");
  const [joinPwOpen, setJoinPwOpen] = useState<Lobby | null>(null);
  const [joinPw, setJoinPw] = useState("");
  const [speakingIds, setSpeakingIds] = useState<Set<string>>(new Set());
  const [micOn, setMicOn] = useState(true);
  const roomRef = useRef<Room | null>(null);
  const audioElsRef = useRef<Record<string, HTMLAudioElement>>({});

  // Load lobbies + members
  useEffect(() => {
    if (!user) return;
    let mounted = true;
    const load = async () => {
      const [{ data: lo }, { data: mb }] = await Promise.all([
        supabase
          .from("party_lobbies")
          .select("id, name, host_id, is_public, max_members, created_at")
          .eq("is_active", true)
          .order("created_at", { ascending: false }),
        supabase.from("party_lobby_members").select("*"),
      ]);
      if (!mounted) return;
      // Fetch which lobbies are password protected via a server-side RPC per lobby
      const lobbiesArr = (lo as any[]) || [];
      const withFlags = await Promise.all(
        lobbiesArr.map(async (l) => {
          const { data: hasPw } = await supabase.rpc("party_lobby_has_password", { p_lobby_id: l.id });
          return { ...l, has_password: !!hasPw } as Lobby;
        })
      );
      setLobbies(withFlags);
      setMembers((mb as any) || []);
      const ids = new Set<string>();
      (lo || []).forEach((l: any) => ids.add(l.host_id));
      (mb || []).forEach((m: any) => ids.add(m.user_id));
      if (ids.size) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("user_id, username, avatar_url, border_style, has_animated_border, has_animated_avatar")
          .in("user_id", Array.from(ids));
        if (profs) {
          const map: Record<string, ProfileLite> = {};
          profs.forEach((p: any) => { map[p.user_id] = p; });
          setProfiles(map);
        }
      }
    };
    load();

    const ch = supabase
      .channel("party-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "party_lobbies" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "party_lobby_members" }, load)
      .subscribe();
    return () => { mounted = false; supabase.removeChannel(ch); };
  }, [user]);

  // Detect if I was kicked from active lobby
  useEffect(() => {
    if (!activeLobby || !user) return;
    const stillIn = members.some((m) => m.lobby_id === activeLobby.id && m.user_id === user.id);
    if (!stillIn) {
      leaveVoice();
      setActiveLobby(null);
      toast.info("You left the party");
    }
  }, [members, activeLobby, user]);

  // Apply server-mute to local mic
  useEffect(() => {
    if (!activeLobby || !user || !roomRef.current) return;
    const me = members.find((m) => m.lobby_id === activeLobby.id && m.user_id === user.id);
    if (me && me.is_muted && micOn) {
      setMicLocal(false);
      toast.warning("You were muted by the host");
    }
  }, [members, activeLobby, user]);

  const setMicLocal = async (on: boolean) => {
    const room = roomRef.current;
    if (!room) return;
    try {
      await room.localParticipant.setMicrophoneEnabled(on);
      setMicOn(on);
    } catch (e) {
      console.error(e);
    }
  };

  const connectVoice = async (lobby: Lobby) => {
    try {
      const { data, error } = await supabase.functions.invoke("livekit-token", {
        body: { lobbyId: lobby.id },
      });
      if (error || !data?.token) throw new Error(error?.message || "Token failed");

      const room = new Room({ adaptiveStream: true, dynacast: true });
      roomRef.current = room;

      room.on(RoomEvent.TrackSubscribed, (track, _pub, participant) => {
        if (track.kind === Track.Kind.Audio) {
          const el = track.attach() as HTMLAudioElement;
          el.autoplay = true;
          document.body.appendChild(el);
          audioElsRef.current[participant.identity] = el;
        }
      });
      room.on(RoomEvent.TrackUnsubscribed, (track, _pub, participant) => {
        track.detach().forEach((el) => el.remove());
        delete audioElsRef.current[participant.identity];
      });
      room.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
        setSpeakingIds(new Set(speakers.map((s) => s.identity)));
      });

      await room.connect(data.url, data.token);
      await room.localParticipant.setMicrophoneEnabled(true);
      setMicOn(true);
    } catch (e: any) {
      toast.error(e?.message || "Voice connect failed");
    }
  };

  const leaveVoice = async () => {
    const room = roomRef.current;
    if (room) {
      await room.disconnect();
      roomRef.current = null;
    }
    Object.values(audioElsRef.current).forEach((el) => el.remove());
    audioElsRef.current = {};
    setSpeakingIds(new Set());
  };

  const createLobby = async () => {
    if (!user || !newName.trim()) return;
    const pwHash = !newPublic && newPassword ? await hashPassword(newPassword) : null;
    const { data: newId, error } = await supabase.rpc("party_create_lobby", {
      p_name: newName.trim(),
      p_is_public: newPublic,
      p_max_members: 8,
      p_password_hash: pwHash,
    });
    if (error || !newId) { toast.error(error?.message || "Failed"); return; }
    const created: Lobby = {
      id: newId as unknown as string,
      name: newName.trim(),
      host_id: user.id,
      is_public: newPublic,
      max_members: 8,
      has_password: !!pwHash,
      created_at: new Date().toISOString(),
    };
    setShowCreate(false); setNewName(""); setNewPassword(""); setNewPublic(true);
    setActiveLobby(created);
    await connectVoice(created);
  };

  const joinLobby = async (lobby: Lobby, password?: string) => {
    if (!user) return;
    if (lobby.has_password && !password) { setJoinPwOpen(lobby); return; }
    const pwHash = password ? await hashPassword(password) : null;
    const { error } = await supabase.rpc("party_join_lobby", {
      p_lobby_id: lobby.id,
      p_password_hash: pwHash,
    });
    if (error) { toast.error(error.message || "Failed to join"); return; }
    setJoinPwOpen(null); setJoinPw("");
    setActiveLobby(lobby);
    await connectVoice(lobby);
  };

  const leaveLobby = async () => {
    if (!user || !activeLobby) return;
    await leaveVoice();
    const isHost = activeLobby.host_id === user.id;
    if (isHost) {
      await supabase.from("party_lobbies").delete().eq("id", activeLobby.id);
    } else {
      await supabase.from("party_lobby_members").delete().eq("lobby_id", activeLobby.id).eq("user_id", user.id);
    }
    setActiveLobby(null);
  };

  const toggleMute = async (target: Member) => {
    if (!activeLobby || !user || activeLobby.host_id !== user.id) return;
    await supabase.from("party_lobby_members").update({ is_muted: !target.is_muted }).eq("id", target.id);
    toast.success(target.is_muted ? "Unmuted" : "Muted");
  };

  const kickUser = async (target: Member) => {
    if (!activeLobby || !user || activeLobby.host_id !== user.id) return;
    await supabase.from("party_lobby_members").delete().eq("id", target.id);
    toast.success("Kicked");
  };

  const reportUser = async (targetId: string) => {
    if (!user || !activeLobby) return;
    const reason = window.prompt("Reason for report?");
    if (!reason) return;
    await supabase.from("party_reports").insert({
      lobby_id: activeLobby.id, reporter_id: user.id, reported_user_id: targetId, reason,
    });
    toast.success("Report sent to staff");
  };

  if (!user) return null;

  if (activeLobby) {
    const lobbyMembers = members.filter((m) => m.lobby_id === activeLobby.id);
    const isHost = activeLobby.host_id === user.id;

    return (
      <div className="space-y-4">
        <div className="rounded-xl bg-card border border-border p-4">
          <div className="flex items-center justify-between mb-1">
            <div>
              <h3 className="font-display font-bold text-lg flex items-center gap-2">
                {activeLobby.has_password && <Lock className="h-4 w-4 text-casino-gold" />}
                {activeLobby.name}
              </h3>
              <p className="text-xs text-muted-foreground">{lobbyMembers.length}/{activeLobby.max_members} in voice</p>
            </div>
            <Button variant="destructive" size="sm" onClick={leaveLobby}>
              <PhoneOff className="h-4 w-4 mr-1" /> Leave
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {lobbyMembers.map((m) => {
            const p = profiles[m.user_id] || { username: "User", avatar_url: null, border_style: null, has_animated_border: null, has_animated_avatar: null };
            const isSpeaking = speakingIds.has(m.user_id);
            const isHostMember = m.user_id === activeLobby.host_id;
            const isMe = m.user_id === user.id;
            return (
              <div key={m.id} className={`relative rounded-xl border p-3 flex flex-col items-center text-center transition ${isSpeaking ? "border-green-400 shadow-[0_0_20px_hsl(140_70%_50%/0.4)]" : "border-border bg-card"}`}>
                <div className={`relative ${isSpeaking ? "ring-2 ring-green-400 rounded-full" : ""}`}>
                  <ProfileAvatar
                    avatarUrl={p.avatar_url}
                    username={p.username}
                    borderStyle={p.border_style ?? undefined}
                    hasAnimatedBorder={p.has_animated_border ?? undefined}
                    hasAnimatedAvatar={p.has_animated_avatar ?? undefined}
                    size="md"
                  />
                  {isHostMember && <Crown className="absolute -top-1 -right-1 h-4 w-4 text-casino-gold fill-casino-gold" />}
                </div>
                <p className="mt-2 text-sm font-bold truncate w-full">{p.username || "User"}{isMe && " (you)"}</p>
                <div className="flex items-center gap-1 mt-1">
                  {m.is_muted ? <MicOff className="h-3 w-3 text-destructive" /> : <Mic className="h-3 w-3 text-green-400" />}
                  {isSpeaking && <Volume2 className="h-3 w-3 text-green-400" />}
                </div>
                {!isMe && (
                  <div className="flex gap-1 mt-2">
                    {isHost && (
                      <>
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => toggleMute(m)} title="Mute/unmute">
                          {m.is_muted ? <Mic className="h-3 w-3" /> : <MicOff className="h-3 w-3" />}
                        </Button>
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => kickUser(m)} title="Kick">
                          <UserX className="h-3 w-3 text-destructive" />
                        </Button>
                      </>
                    )}
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => reportUser(m.user_id)} title="Report">
                      <Flag className="h-3 w-3 text-casino-pink" />
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40">
          <Button
            variant={micOn ? "gold" : "destructive"}
            size="lg"
            className="rounded-full h-14 w-14 shadow-xl"
            onClick={() => setMicLocal(!micOn)}
          >
            {micOn ? <Mic className="h-6 w-6" /> : <MicOff className="h-6 w-6" />}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display font-bold text-lg">Party Chat</h3>
          <p className="text-xs text-muted-foreground">Voice lobbies — up to 8 per party</p>
        </div>
        <Button variant="gold" size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-1" /> Create
        </Button>
      </div>

      {lobbies.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">No active parties. Create one!</p>
      ) : (
        <div className="space-y-2">
          {lobbies.map((l) => {
            const count = members.filter((m) => m.lobby_id === l.id).length;
            const hostP = profiles[l.host_id];
            return (
              <div key={l.id} className="flex items-center justify-between rounded-xl bg-card border border-border p-4">
                <div className="min-w-0 flex-1">
                  <p className="font-display font-bold flex items-center gap-2 truncate">
                    {l.has_password && <Lock className="h-4 w-4 text-casino-gold shrink-0" />}
                    {l.name}
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center gap-2">
                    <Users className="h-3 w-3" /> {count}/{l.max_members} • host: {hostP?.username || "—"}
                  </p>
                </div>
                <Button variant="gold" size="sm" onClick={() => joinLobby(l)} disabled={count >= l.max_members}>
                  Join
                </Button>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Party</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Lobby name</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Friday night squad" maxLength={40} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Public lobby</Label>
              <Switch checked={newPublic} onCheckedChange={setNewPublic} />
            </div>
            {!newPublic && (
              <div>
                <Label>Password</Label>
                <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Required for private" />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button variant="gold" onClick={createLobby} disabled={!newName.trim() || (!newPublic && !newPassword)}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!joinPwOpen} onOpenChange={(o) => !o && setJoinPwOpen(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Enter Password</DialogTitle></DialogHeader>
          <Input type="password" value={joinPw} onChange={(e) => setJoinPw(e.target.value)} placeholder="Lobby password" />
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setJoinPwOpen(null); setJoinPw(""); }}>Cancel</Button>
            <Button variant="gold" onClick={() => joinPwOpen && joinLobby(joinPwOpen, joinPw)}>Join</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}