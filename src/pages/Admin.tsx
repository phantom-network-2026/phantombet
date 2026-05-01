import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Header } from "@/components/casino/Header";
import { StaffUsername, type StaffRole } from "@/components/casino/StaffUsername";
import { ArrowLeft, Users, DollarSign, Plus, Minus, Edit, Save, Shield, Trash2, Circle, ShieldAlert } from "lucide-react";
import { getStatusColor, getStatusLabel } from "@/hooks/usePresence";
import { toast } from "sonner";

interface UserProfile {
  user_id: string;
  username: string | null;
  balance: number;
  created_at: string;
  roles: string[];
  is_online: boolean;
  appearance_status: string;
  last_seen: string | null;
}

const ALL_ROLES = ["admin", "moderator", "staff", "active_user", "user"] as const;
const ROLE_LABELS: Record<string, { label: string; emoji: string; color: string }> = {
  admin: { label: "Administrator", emoji: "👑", color: "text-casino-gold" },
  moderator: { label: "Moderator", emoji: "🛡️", color: "text-blue-400" },
  staff: { label: "Staff", emoji: "🔧", color: "text-purple-400" },
  active_user: { label: "Active User", emoji: "⭐", color: "text-green-400" },
  user: { label: "User", emoji: "👤", color: "text-muted-foreground" },
};

export default function Admin() {
  return <AdminInner />;
}

/** User management UI — usable standalone OR embedded inside CPanel. */
export function AdminInner({ embedded = false }: { embedded?: boolean }) {
  const { isAdmin, isOwner, hasStaffAccess, loading } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [adjustUserId, setAdjustUserId] = useState<string | null>(null);
  const [editUserId, setEditUserId] = useState<string | null>(null);
  const [rolesUserId, setRolesUserId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustDescription, setAdjustDescription] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [forceLoss, setForceLoss] = useState(false);
  const [forceLossLoading, setForceLossLoading] = useState(false);
  const [accessAllowed, setAccessAllowed] = useState(true);
  const [sectionToggles, setSectionToggles] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!loading && !hasStaffAccess) { navigate("/"); return; }
    if (hasStaffAccess) {
      supabase.from("site_settings").select("value").eq("key", "panel_visibility").maybeSingle().then(({ data }) => {
        const vis = (data?.value as Record<string, boolean>) || {};
        if (!isOwner && vis.admin_panel_access === false) { navigate("/"); return; }
        setSectionToggles(vis);
        setAccessAllowed(true);
      });
      fetchUsers();
    }
    if (isAdmin) fetchForceLoss();
  }, [hasStaffAccess, loading]);

  const sec = (key: string) => isOwner || sectionToggles[key] !== false;

  const fetchForceLoss = async () => {
    const { data } = await supabase.from("site_settings").select("value").eq("key", "force_loss").maybeSingle();
    setForceLoss(data?.value === true || (data?.value as any)?.enabled === true);
  };

  const handleToggleForceLoss = async (checked: boolean) => {
    setForceLossLoading(true);
    const { data: existing } = await supabase.from("site_settings").select("id").eq("key", "force_loss").maybeSingle();
    if (existing) {
      await supabase.from("site_settings").update({ value: { enabled: checked } as any }).eq("key", "force_loss");
    } else {
      await supabase.from("site_settings").insert({ key: "force_loss", value: { enabled: checked } as any });
    }
    setForceLoss(checked);
    setForceLossLoading(false);
    toast.success(checked ? "Force Loss ON — all bets will lose" : "Force Loss OFF — casino runs normally");
  };

  const fetchUsers = async () => {
    setLoadingUsers(true);
    const { data: profiles } = await supabase.from("profiles").select("*");
    const { data: roles } = await supabase.from("user_roles").select("*");
    const { data: presence } = await supabase.from("user_presence" as any).select("*");
    if (profiles) {
      const usersWithRoles = profiles.map((p) => {
        const userPresence = (presence as any[])?.find((pr: any) => pr.user_id === p.user_id);
        const isOnline = userPresence?.is_online && 
          userPresence?.last_seen && 
          (Date.now() - new Date(userPresence.last_seen).getTime()) < 60000;
        return {
          user_id: p.user_id,
          username: p.username,
          balance: Number(p.balance),
          created_at: p.created_at,
          roles: (roles?.filter((r) => r.user_id === p.user_id).map((r) => r.role) || []).filter(r => r !== "owner"),
          is_online: !!isOnline,
          appearance_status: userPresence?.appearance_status || "offline",
          last_seen: userPresence?.last_seen || null,
        };
      });
      usersWithRoles.sort((a, b) => {
        if (a.is_online !== b.is_online) return a.is_online ? -1 : 1;
        return (a.username || "").localeCompare(b.username || "");
      });
      setUsers(usersWithRoles);
    }
    setLoadingUsers(false);
  };

  useEffect(() => {
    if (!hasStaffAccess) return;
    const interval = setInterval(fetchUsers, 15000);
    return () => clearInterval(interval);
  }, [hasStaffAccess]);

  // Admins can only adjust bonus balance (mock balance), not real balance
  const handleAdjustBalance = async (userId: string, amount: number) => {
    const { error: txError } = await supabase.from("transactions").insert({
      user_id: userId, amount, type: "adjustment",
      description: adjustDescription || `Admin bonus adjustment: ${amount > 0 ? "+" : ""}${amount}`,
    });
    if (txError) { toast.error("Failed to create transaction"); return; }
    const user = users.find((u) => u.user_id === userId);
    if (!user) return;
    const { error } = await supabase.from("profiles").update({ balance: user.balance + amount }).eq("user_id", userId);
    if (error) { toast.error("Failed to update balance"); return; }
    toast.success(`Bonus balance ${amount > 0 ? "added" : "deducted"}: $${Math.abs(amount).toFixed(2)}`);
    setAdjustUserId(null); setAdjustAmount(""); setAdjustDescription("");
    fetchUsers();
  };

  const handleToggleRole = async (userId: string, role: string, hasRole: boolean) => {
    if (hasRole) {
      await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", role as any);
      toast.success(`${ROLE_LABELS[role]?.label || role} role removed`);
    } else {
      await supabase.from("user_roles").insert({ user_id: userId, role: role as any });
      toast.success(`${ROLE_LABELS[role]?.label || role} role granted`);
    }
    fetchUsers();
  };

  const handleEditUser = (userId: string) => {
    if (editUserId === userId) { setEditUserId(null); return; }
    setEditUserId(userId);
    const u = users.find((u) => u.user_id === userId);
    setEditUsername(u?.username || "");
  };

  // Admins can only change username, not email/password
  const handleSaveUserDetails = async (userId: string) => {
    setSaving(true);
    if (editUsername.trim()) {
      const { error } = await supabase.from("profiles").update({ username: editUsername.trim() }).eq("user_id", userId);
      if (error) { toast.error("Failed to update username"); setSaving(false); return; }
    }
    toast.success("Username updated!");
    setEditUserId(null); setEditUsername("");
    setSaving(false);
    fetchUsers();
  };

  const handleDeleteUser = async (userId: string) => {
    setDeleting(true);
    const { data, error } = await supabase.functions.invoke("admin-update-user", {
      body: { target_user_id: userId, action: "delete" },
    });
    if (error || data?.error) {
      toast.error(data?.error || "Failed to delete user");
      setDeleting(false);
      setDeleteConfirmId(null);
      return;
    }
    toast.success("User account deleted permanently");
    setDeleteConfirmId(null);
    setDeleting(false);
    fetchUsers();
  };

  const onlineCount = users.filter(u => u.is_online).length;

  if (loading) return <div className="min-h-screen gradient-casino-bg flex items-center justify-center"><p>Loading...</p></div>;

  return (
    <div className={embedded ? "" : "min-h-screen gradient-casino-bg"}>
      {!embedded && <Header />}
      <div className={embedded ? "" : "container max-w-4xl py-6 px-4"}>
        {!embedded && (
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-display text-2xl font-black text-gold flex items-center gap-2">
            <Users className="h-6 w-6" /> User Management
          </h1>
          {isAdmin && (
            <Button variant="outline" size="sm" className="ml-auto" onClick={() => navigate("/cpanel")}>
              <Shield className="h-3 w-3 mr-1" /> cPanel
            </Button>
          )}
        </div>
        )}

        {/* Stats */}
        {sec("admin_stats") && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="rounded-xl bg-card p-4 border border-border">
            <p className="text-sm text-muted-foreground">Total Users</p>
            <p className="font-display text-2xl font-bold text-casino-gold">{users.length}</p>
          </div>
          <div className="rounded-xl bg-card p-4 border border-border">
            <p className="text-sm text-muted-foreground">Online Now</p>
            <p className="font-display text-2xl font-bold text-green-400 flex items-center gap-2">
              <Circle className="h-3 w-3 fill-green-400 text-green-400" /> {onlineCount}
            </p>
          </div>
          <div className="rounded-xl bg-card p-4 border border-border overflow-hidden">
            <p className="text-sm text-muted-foreground">Total Balance</p>
            <p className="font-display text-lg font-bold text-casino-green truncate">
              ${users.reduce((sum, u) => sum + u.balance, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>
        )}

        {/* Force Loss Toggle */}
        {isAdmin && sec("admin_force_loss") && (
          <div className="rounded-xl bg-card border border-border p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ShieldAlert className="h-5 w-5 text-destructive" />
                <div>
                  <p className="font-display font-bold text-sm">Force Loss Mode</p>
                  <p className="text-xs text-muted-foreground">When ON, every bet a player places will be a loss. No wins issued.</p>
                </div>
              </div>
              <Switch
                checked={forceLoss}
                onCheckedChange={handleToggleForceLoss}
                disabled={forceLossLoading}
              />
            </div>
            {forceLoss && (
              <p className="text-xs text-destructive mt-2 font-medium">⚠️ ACTIVE — All player bets will result in losses</p>
            )}
          </div>
        )}

        {/* User List */}
        <div className="space-y-3">
          <h2 className="font-display text-lg font-bold">User Management</h2>
          {loadingUsers ? (
            <p className="text-muted-foreground">Loading users...</p>
          ) : (
            users.map((user) => (
              <div key={user.user_id} className="rounded-xl bg-card border border-border p-4">
                <div className="flex items-center justify-between mb-2 gap-2">
                   <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Circle className={`h-2.5 w-2.5 ${getStatusColor(user.is_online ? (user.appearance_status || "online") : "offline")}`} />
                      {user.roles.some((r: string) => ["admin", "moderator", "staff"].includes(r)) ? (
                        <StaffUsername
                          username={user.username || "No username"}
                          role={(["admin", "moderator", "staff"].find(r => user.roles.includes(r)) || null) as StaffRole}
                          size="sm"
                        />
                      ) : (
                        <p className="font-display font-bold truncate">{user.username || "No username"}</p>
                      )}
                      {user.is_online && (
                        <span className={`text-[10px] font-medium ${user.appearance_status === "idle" ? "text-yellow-400" : user.appearance_status === "offline" ? "text-muted-foreground" : "text-green-400"}`}>
                          {getStatusLabel(user.appearance_status || "online").toUpperCase()}
                          {user.appearance_status !== "online" && " (actually online)"}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {user.roles.map((role) => {
                        const info = ROLE_LABELS[role] || { label: role, emoji: "🏷️", color: "text-muted-foreground" };
                        return (
                          <span key={role} className={`text-xs px-2 py-0.5 rounded-full bg-secondary ${info.color} font-medium`}>
                            {info.emoji} {info.label}
                          </span>
                        );
                      })}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Joined {new Date(user.created_at).toLocaleDateString()}
                      {user.last_seen && !user.is_online && (
                        <> · Last seen {new Date(user.last_seen).toLocaleString()}</>
                      )}
                    </p>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <p className="font-display font-bold text-casino-gold text-sm truncate max-w-[100px]">${user.balance.toFixed(2)}</p>
                  </div>
                </div>

                <div className="flex gap-2 flex-wrap">
                  {isAdmin && sec("admin_balance") && (
                    <Button variant="outline" size="sm" onClick={() => setAdjustUserId(adjustUserId === user.user_id ? null : user.user_id)}>
                      <DollarSign className="h-3 w-3 mr-1" /> Bonus Balance
                    </Button>
                  )}
                  {sec("admin_edit") && (
                  <Button variant="outline" size="sm" onClick={() => handleEditUser(user.user_id)}>
                    <Edit className="h-3 w-3 mr-1" /> Edit
                  </Button>
                  )}
                  {isAdmin && sec("admin_roles") && (
                    <Button variant="outline" size="sm" onClick={() => setRolesUserId(rolesUserId === user.user_id ? null : user.user_id)}>
                      <Shield className="h-3 w-3 mr-1" /> Roles
                    </Button>
                  )}
                  {isAdmin && sec("admin_delete") && (
                    <Button variant="destructive" size="sm" onClick={() => setDeleteConfirmId(deleteConfirmId === user.user_id ? null : user.user_id)}>
                      <Trash2 className="h-3 w-3 mr-1" /> Delete
                    </Button>
                  )}
                </div>

                {/* Delete Confirmation */}
                {deleteConfirmId === user.user_id && (
                  <div className="mt-3 p-3 rounded-lg bg-destructive/10 border border-destructive/30 space-y-2 animate-slide-up">
                    <p className="text-sm font-semibold text-destructive">⚠️ Permanently delete {user.username || "this user"}?</p>
                    <p className="text-xs text-muted-foreground">This will remove their account, profile, roles, and all associated data. This cannot be undone.</p>
                    <div className="flex gap-2">
                      <Button variant="destructive" size="sm" onClick={() => handleDeleteUser(user.user_id)} disabled={deleting}>
                        <Trash2 className="h-3 w-3 mr-1" /> {deleting ? "Deleting..." : "Yes, Delete"}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setDeleteConfirmId(null)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                {/* Role Management */}
                {rolesUserId === user.user_id && (
                  <div className="mt-3 p-3 rounded-lg bg-secondary space-y-2 animate-slide-up">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Assign Roles</p>
                    <div className="flex flex-wrap gap-2">
                      {ALL_ROLES.map((role) => {
                        const hasRole = user.roles.includes(role);
                        const info = ROLE_LABELS[role];
                        return (
                          <Button
                            key={role}
                            variant={hasRole ? "destructive" : "casino"}
                            size="sm"
                            onClick={() => handleToggleRole(user.user_id, role, hasRole)}
                          >
                            {info.emoji} {hasRole ? `Remove ${info.label}` : `Add ${info.label}`}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Edit User Details - Admins can only change username */}
                {editUserId === user.user_id && (
                  <div className="mt-3 p-3 rounded-lg bg-secondary space-y-2 animate-slide-up">
                    <div>
                      <Label className="text-xs">Username</Label>
                      <Input value={editUsername} onChange={(e) => setEditUsername(e.target.value)} placeholder="New username" className="bg-background border-border" />
                    </div>
                    <p className="text-[10px] text-muted-foreground">📧 Email and password changes require Owner Panel access.</p>
                    <Button variant="gold" size="sm" onClick={() => handleSaveUserDetails(user.user_id)} disabled={saving}>
                      <Save className="h-3 w-3 mr-1" /> {saving ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                )}

                {/* Adjust Bonus Balance Form */}
                {adjustUserId === user.user_id && (
                  <div className="mt-3 p-3 rounded-lg bg-secondary space-y-2 animate-slide-up">
                    <p className="text-[10px] text-casino-gold font-bold">BONUS BALANCE ONLY</p>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <Label className="text-xs">Amount ($)</Label>
                        <Input type="number" step="0.01" value={adjustAmount} onChange={(e) => setAdjustAmount(e.target.value)} placeholder="100.00" className="bg-background border-border" />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs">Description (optional)</Label>
                      <Input value={adjustDescription} onChange={(e) => setAdjustDescription(e.target.value)} placeholder="Bonus credit" className="bg-background border-border" />
                    </div>
                    <div className="flex gap-2">
                      <Button variant="gold" size="sm" onClick={() => handleAdjustBalance(user.user_id, Math.abs(Number(adjustAmount)))} disabled={!adjustAmount || Number(adjustAmount) === 0}>
                        <Plus className="h-3 w-3 mr-1" /> Add
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => handleAdjustBalance(user.user_id, -Math.abs(Number(adjustAmount)))} disabled={!adjustAmount || Number(adjustAmount) === 0}>
                        <Minus className="h-3 w-3 mr-1" /> Deduct
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
