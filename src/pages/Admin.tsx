import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Header } from "@/components/casino/Header";
import { ArrowLeft, Users, DollarSign, Plus, Minus, Edit, Save, Shield } from "lucide-react";
import { toast } from "sonner";

interface UserProfile {
  user_id: string;
  username: string | null;
  balance: number;
  created_at: string;
  roles: string[];
}

const ALL_ROLES = ["admin", "moderator", "staff", "active_user", "user"] as const;
const ROLE_LABELS: Record<string, { label: string; emoji: string; color: string }> = {
  admin: { label: "Admin", emoji: "👑", color: "text-casino-gold" },
  moderator: { label: "Moderator", emoji: "🛡️", color: "text-blue-400" },
  staff: { label: "Staff", emoji: "🔧", color: "text-purple-400" },
  active_user: { label: "Active User", emoji: "⭐", color: "text-green-400" },
  user: { label: "User", emoji: "👤", color: "text-muted-foreground" },
};

export default function Admin() {
  const { isAdmin, hasStaffAccess, loading } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [adjustUserId, setAdjustUserId] = useState<string | null>(null);
  const [editUserId, setEditUserId] = useState<string | null>(null);
  const [rolesUserId, setRolesUserId] = useState<string | null>(null);
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustDescription, setAdjustDescription] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !hasStaffAccess) { navigate("/"); return; }
    if (hasStaffAccess) fetchUsers();
  }, [hasStaffAccess, loading]);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    const { data: profiles } = await supabase.from("profiles").select("*");
    const { data: roles } = await supabase.from("user_roles").select("*");
    if (profiles) {
      const usersWithRoles = profiles.map((p) => ({
        user_id: p.user_id,
        username: p.username,
        balance: Number(p.balance),
        created_at: p.created_at,
        roles: roles?.filter((r) => r.user_id === p.user_id).map((r) => r.role) || [],
      }));
      setUsers(usersWithRoles);
    }
    setLoadingUsers(false);
  };

  const handleAdjustBalance = async (userId: string, amount: number) => {
    const { error: txError } = await supabase.from("transactions").insert({
      user_id: userId, amount, type: "adjustment",
      description: adjustDescription || `Admin balance adjustment: ${amount > 0 ? "+" : ""}${amount}`,
    });
    if (txError) { toast.error("Failed to create transaction"); return; }
    const user = users.find((u) => u.user_id === userId);
    if (!user) return;
    const { error } = await supabase.from("profiles").update({ balance: user.balance + amount }).eq("user_id", userId);
    if (error) { toast.error("Failed to update balance"); return; }
    toast.success(`Balance ${amount > 0 ? "added" : "deducted"}: $${Math.abs(amount).toFixed(2)}`);
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
    setEditEmail("");
    setEditPassword("");
    const u = users.find((u) => u.user_id === userId);
    setEditUsername(u?.username || "");
  };

  const handleSaveUserDetails = async (userId: string) => {
    setSaving(true);
    if (editUsername.trim()) {
      const { error } = await supabase.from("profiles").update({ username: editUsername.trim() }).eq("user_id", userId);
      if (error) { toast.error("Failed to update username"); setSaving(false); return; }
    }
    if (editEmail.trim() || editPassword.trim()) {
      const { data, error } = await supabase.functions.invoke("admin-update-user", {
        body: {
          target_user_id: userId,
          ...(editEmail.trim() && { email: editEmail.trim() }),
          ...(editPassword.trim() && { password: editPassword.trim() }),
        },
      });
      if (error) { toast.error("Failed to update login details"); setSaving(false); return; }
      if (data?.error) { toast.error(data.error); setSaving(false); return; }
    }
    toast.success("User details updated!");
    setEditUserId(null); setEditEmail(""); setEditPassword(""); setEditUsername("");
    setSaving(false);
    fetchUsers();
  };

  if (loading) return <div className="min-h-screen gradient-casino-bg flex items-center justify-center"><p>Loading...</p></div>;

  return (
    <div className="min-h-screen gradient-casino-bg">
      <Header />
      <div className="container max-w-4xl py-6 px-4">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-display text-2xl font-black text-gold flex items-center gap-2">
            <Users className="h-6 w-6" /> Admin Panel
          </h1>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="rounded-xl bg-card p-4 border border-border">
            <p className="text-sm text-muted-foreground">Total Users</p>
            <p className="font-display text-2xl font-bold text-casino-gold">{users.length}</p>
          </div>
          <div className="rounded-xl bg-card p-4 border border-border">
            <p className="text-sm text-muted-foreground">Total Balance</p>
            <p className="font-display text-2xl font-bold text-casino-green">
              ${users.reduce((sum, u) => sum + u.balance, 0).toFixed(2)}
            </p>
          </div>
        </div>

        {/* User List */}
        <div className="space-y-3">
          <h2 className="font-display text-lg font-bold">User Management</h2>
          {loadingUsers ? (
            <p className="text-muted-foreground">Loading users...</p>
          ) : (
            users.map((user) => (
              <div key={user.user_id} className="rounded-xl bg-card border border-border p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-display font-bold">{user.username || "No username"}</p>
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
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-display font-bold text-casino-gold">${user.balance.toFixed(2)}</p>
                  </div>
                </div>

                <div className="flex gap-2 flex-wrap">
                  {isAdmin && (
                    <Button variant="outline" size="sm" onClick={() => setAdjustUserId(adjustUserId === user.user_id ? null : user.user_id)}>
                      <DollarSign className="h-3 w-3 mr-1" /> Balance
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={() => handleEditUser(user.user_id)}>
                    <Edit className="h-3 w-3 mr-1" /> Edit
                  </Button>
                  {isAdmin && (
                    <Button variant="outline" size="sm" onClick={() => setRolesUserId(rolesUserId === user.user_id ? null : user.user_id)}>
                      <Shield className="h-3 w-3 mr-1" /> Roles
                    </Button>
                  )}
                </div>

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

                {/* Edit User Details */}
                {editUserId === user.user_id && (
                  <div className="mt-3 p-3 rounded-lg bg-secondary space-y-2 animate-slide-up">
                    <div>
                      <Label className="text-xs">Username</Label>
                      <Input value={editUsername} onChange={(e) => setEditUsername(e.target.value)} placeholder="New username" className="bg-background border-border" />
                    </div>
                    <div>
                      <Label className="text-xs">Email</Label>
                      <Input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} placeholder="New email (leave empty to keep)" className="bg-background border-border" />
                    </div>
                    <div>
                      <Label className="text-xs">Password</Label>
                      <Input type="password" value={editPassword} onChange={(e) => setEditPassword(e.target.value)} placeholder="New password (leave empty to keep)" className="bg-background border-border" />
                    </div>
                    <Button variant="gold" size="sm" onClick={() => handleSaveUserDetails(user.user_id)} disabled={saving}>
                      <Save className="h-3 w-3 mr-1" /> {saving ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                )}

                {/* Adjust Balance Form */}
                {adjustUserId === user.user_id && (
                  <div className="mt-3 p-3 rounded-lg bg-secondary space-y-2 animate-slide-up">
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
