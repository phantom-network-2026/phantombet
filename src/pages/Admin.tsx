import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Header } from "@/components/casino/Header";
import { ArrowLeft, Users, DollarSign, Trash2, Plus, Minus } from "lucide-react";
import { toast } from "sonner";

interface UserProfile {
  user_id: string;
  username: string | null;
  balance: number;
  created_at: string;
  roles: string[];
}

export default function Admin() {
  const { isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [adjustUserId, setAdjustUserId] = useState<string | null>(null);
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustDescription, setAdjustDescription] = useState("");

  useEffect(() => {
    if (!loading && !isAdmin) {
      navigate("/");
      return;
    }
    if (isAdmin) fetchUsers();
  }, [isAdmin, loading]);

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
    // Insert transaction
    const { error: txError } = await supabase.from("transactions").insert({
      user_id: userId,
      amount,
      type: "adjustment",
      description: adjustDescription || `Admin balance adjustment: ${amount > 0 ? "+" : ""}${amount}`,
    });
    if (txError) { toast.error("Failed to create transaction"); return; }

    // Update profile balance
    const user = users.find((u) => u.user_id === userId);
    if (!user) return;
    const newBalance = user.balance + amount;

    const { error } = await supabase
      .from("profiles")
      .update({ balance: newBalance })
      .eq("user_id", userId);

    if (error) { toast.error("Failed to update balance"); return; }

    toast.success(`Balance ${amount > 0 ? "added" : "deducted"}: $${Math.abs(amount).toFixed(2)}`);
    setAdjustUserId(null);
    setAdjustAmount("");
    setAdjustDescription("");
    fetchUsers();
  };

  const handleToggleAdmin = async (userId: string, currentlyAdmin: boolean) => {
    if (currentlyAdmin) {
      await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", "admin");
      toast.success("Admin role removed");
    } else {
      await supabase.from("user_roles").insert({ user_id: userId, role: "admin" });
      toast.success("Admin role granted");
    }
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
                    <p className="text-xs text-muted-foreground">
                      {user.roles.includes("admin") ? "👑 Admin" : "👤 User"} · Joined {new Date(user.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-display font-bold text-casino-gold">${user.balance.toFixed(2)}</p>
                  </div>
                </div>

                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAdjustUserId(adjustUserId === user.user_id ? null : user.user_id)}
                  >
                    <DollarSign className="h-3 w-3 mr-1" /> Adjust Balance
                  </Button>
                  <Button
                    variant={user.roles.includes("admin") ? "destructive" : "casino"}
                    size="sm"
                    onClick={() => handleToggleAdmin(user.user_id, user.roles.includes("admin"))}
                  >
                    {user.roles.includes("admin") ? "Remove Admin" : "Make Admin"}
                  </Button>
                </div>

                {/* Adjust Balance Form */}
                {adjustUserId === user.user_id && (
                  <div className="mt-3 p-3 rounded-lg bg-secondary space-y-2 animate-slide-up">
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <Label className="text-xs">Amount ($)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={adjustAmount}
                          onChange={(e) => setAdjustAmount(e.target.value)}
                          placeholder="100.00"
                          className="bg-background border-border"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs">Description (optional)</Label>
                      <Input
                        value={adjustDescription}
                        onChange={(e) => setAdjustDescription(e.target.value)}
                        placeholder="Bonus credit"
                        className="bg-background border-border"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="gold"
                        size="sm"
                        onClick={() => handleAdjustBalance(user.user_id, Math.abs(Number(adjustAmount)))}
                        disabled={!adjustAmount || Number(adjustAmount) === 0}
                      >
                        <Plus className="h-3 w-3 mr-1" /> Add
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleAdjustBalance(user.user_id, -Math.abs(Number(adjustAmount)))}
                        disabled={!adjustAmount || Number(adjustAmount) === 0}
                      >
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
