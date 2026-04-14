import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Header } from "@/components/casino/Header";
import { StaffUsername, type StaffRole } from "@/components/casino/StaffUsername";
import { toast } from "sonner";
import {
  ArrowLeft, Users, DollarSign, Edit, Save, Shield, Search,
  ClipboardList, Plus, CheckCircle2, Clock, AlertTriangle,
  Circle, MessageSquare, Ban, Trash2, ChevronDown, ChevronUp,
  Wrench, Flag, Calendar
} from "lucide-react";
import { getStatusColor } from "@/hooks/usePresence";

// ── Types ───────────────────────────────────────────────────────
interface UserProfile {
  user_id: string;
  username: string | null;
  balance: number;
  created_at: string;
  roles: string[];
  is_online: boolean;
  appearance_status: string;
}

interface StaffTask {
  id: string;
  title: string;
  description: string | null;
  assigned_to: string | null;
  assigned_by: string;
  priority: string;
  status: string;
  due_date: string | null;
  category: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ── Constants ───────────────────────────────────────────────────
const PRIORITY_CONFIG: Record<string, { label: string; color: string; icon: typeof Flag }> = {
  low: { label: "Low", color: "text-muted-foreground", icon: Flag },
  medium: { label: "Medium", color: "text-sky-400", icon: Flag },
  high: { label: "High", color: "text-orange-400", icon: AlertTriangle },
  urgent: { label: "Urgent", color: "text-red-400", icon: AlertTriangle },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: "Pending", color: "text-yellow-400", bg: "bg-yellow-400/10 border-yellow-400/30" },
  in_progress: { label: "In Progress", color: "text-sky-400", bg: "bg-sky-400/10 border-sky-400/30" },
  completed: { label: "Completed", color: "text-emerald-400", bg: "bg-emerald-400/10 border-emerald-400/30" },
  cancelled: { label: "Cancelled", color: "text-muted-foreground", bg: "bg-secondary border-border" },
};

const CATEGORY_OPTIONS = ["general", "moderation", "support", "review", "content", "security"];

// ── Collapsible Section ─────────────────────────────────────────
function Section({ title, icon, children, defaultOpen = true }: {
  title: string; icon: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-5 py-3.5 bg-secondary/60 hover:bg-secondary/80 transition-colors">
        <div className="flex items-center gap-3">
          <div className="text-sky-400">{icon}</div>
          <h2 className="font-display text-base font-bold tracking-wide">{title}</h2>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>
      {open && <div className="p-5 space-y-4">{children}</div>}
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────
export default function StaffPanel() {
  const { user, isAdmin, isOwner, hasStaffAccess, loading } = useAuth();
  const navigate = useNavigate();

  // Tab state
  const [activeTab, setActiveTab] = useState<"tasks" | "users" | "moderation">("tasks");

  // User management state
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [adjustUserId, setAdjustUserId] = useState<string | null>(null);
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustDescription, setAdjustDescription] = useState("");
  const [editUserId, setEditUserId] = useState<string | null>(null);
  const [editUsername, setEditUsername] = useState("");
  const [saving, setSaving] = useState(false);

  // Task state
  const [tasks, setTasks] = useState<StaffTask[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [showNewTask, setShowNewTask] = useState(false);
  const [newTask, setNewTask] = useState({ title: "", description: "", priority: "medium", category: "general", assigned_to: "", due_date: "" });
  const [taskFilter, setTaskFilter] = useState<string>("all");
  const [staffMembers, setStaffMembers] = useState<{ user_id: string; username: string }[]>([]);

  // Moderation state
  const [chatBans, setChatBans] = useState<any[]>([]);
  const [modLogs, setModLogs] = useState<any[]>([]);

  // ── Auth guard ──────────────────────────────────────────────
  useEffect(() => {
    if (!loading && !hasStaffAccess) { navigate("/"); }
  }, [hasStaffAccess, loading]);

  // ── Fetch data ──────────────────────────────────────────────
  useEffect(() => {
    if (hasStaffAccess) {
      fetchTasks();
      fetchStaffMembers();
    }
  }, [hasStaffAccess]);

  useEffect(() => {
    if (activeTab === "users" && users.length === 0) fetchUsers();
    if (activeTab === "moderation") { fetchBans(); fetchModLogs(); }
  }, [activeTab]);

  const fetchStaffMembers = async () => {
    const { data: roles } = await supabase.from("user_roles").select("user_id, role");
    const staffIds = roles?.filter(r => ["staff", "moderator", "admin", "owner"].includes(r.role)).map(r => r.user_id) || [];
    const unique = [...new Set(staffIds)];
    if (unique.length === 0) { setStaffMembers([]); return; }
    const { data: profiles } = await supabase.from("profiles").select("user_id, username");
    setStaffMembers(profiles?.filter(p => unique.includes(p.user_id)).map(p => ({ user_id: p.user_id, username: p.username || "Unknown" })) || []);
  };

  const fetchTasks = async () => {
    setLoadingTasks(true);
    const { data } = await supabase.from("staff_tasks" as any).select("*").order("created_at", { ascending: false });
    setTasks((data as any as StaffTask[]) || []);
    setLoadingTasks(false);
  };

  const fetchUsers = async () => {
    setLoadingUsers(true);
    const { data: profiles } = await supabase.from("profiles").select("user_id, username, balance, created_at");
    const { data: roles } = await supabase.from("user_roles").select("user_id, role");
    const { data: presence } = await supabase.from("user_presence" as any).select("user_id, is_online, appearance_status, last_seen");
    if (profiles) {
      setUsers(profiles.map(p => {
        const pr = (presence as any[])?.find((x: any) => x.user_id === p.user_id);
        return {
          user_id: p.user_id,
          username: p.username,
          balance: Number(p.balance),
          created_at: p.created_at,
          roles: roles?.filter(r => r.user_id === p.user_id).map(r => r.role) || [],
          is_online: !!(pr?.is_online && pr?.last_seen && (Date.now() - new Date(pr.last_seen).getTime()) < 60000),
          appearance_status: pr?.appearance_status || "offline",
        };
      }).sort((a, b) => (a.username || "").localeCompare(b.username || "")));
    }
    setLoadingUsers(false);
  };

  const fetchBans = async () => {
    const { data } = await supabase.from("chat_bans").select("*").eq("is_active", true).order("created_at", { ascending: false }).limit(50);
    setChatBans(data || []);
  };

  const fetchModLogs = async () => {
    const { data } = await supabase.from("moderation_log").select("*").order("created_at", { ascending: false }).limit(50);
    setModLogs(data || []);
  };

  // ── Handlers ────────────────────────────────────────────────
  const handleAdjustBalance = async (userId: string, amount: number) => {
    const { error: txError } = await supabase.from("transactions").insert({
      user_id: userId, amount, type: "adjustment",
      description: adjustDescription || `Staff bonus adjustment: ${amount > 0 ? "+" : ""}${amount}`,
    });
    if (txError) { toast.error("Failed to create transaction"); return; }
    const u = users.find(u => u.user_id === userId);
    if (!u) return;
    const { error } = await supabase.from("profiles").update({ balance: u.balance + amount }).eq("user_id", userId);
    if (error) { toast.error("Failed to update balance"); return; }
    toast.success(`Bonus balance adjusted: $${Math.abs(amount).toFixed(2)}`);
    setAdjustUserId(null); setAdjustAmount(""); setAdjustDescription("");
    fetchUsers();
  };

  const handleSaveUsername = async (userId: string) => {
    setSaving(true);
    if (!editUsername.trim()) { toast.error("Username cannot be empty"); setSaving(false); return; }
    const { error } = await supabase.from("profiles").update({ username: editUsername.trim() }).eq("user_id", userId);
    if (error) { toast.error("Failed to update username"); setSaving(false); return; }
    toast.success("Username updated!");
    setEditUserId(null); setEditUsername(""); setSaving(false);
    fetchUsers();
  };

  const handleCreateTask = async () => {
    if (!newTask.title.trim()) { toast.error("Task title is required"); return; }
    const payload: any = {
      title: newTask.title.trim(),
      description: newTask.description.trim() || null,
      priority: newTask.priority,
      category: newTask.category,
      assigned_by: user!.id,
      assigned_to: newTask.assigned_to || null,
      due_date: newTask.due_date || null,
    };
    const { error } = await supabase.from("staff_tasks" as any).insert(payload);
    if (error) { toast.error("Failed to create task"); return; }
    toast.success("Task created!");
    setShowNewTask(false);
    setNewTask({ title: "", description: "", priority: "medium", category: "general", assigned_to: "", due_date: "" });
    fetchTasks();
  };

  const handleUpdateTaskStatus = async (taskId: string, newStatus: string) => {
    const { error } = await supabase.from("staff_tasks" as any).update({ status: newStatus }).eq("id", taskId);
    if (error) { toast.error("Failed to update task"); return; }
    toast.success(`Task marked as ${STATUS_CONFIG[newStatus]?.label || newStatus}`);
    fetchTasks();
  };

  const handleDeleteTask = async (taskId: string) => {
    const { error } = await supabase.from("staff_tasks" as any).delete().eq("id", taskId);
    if (error) { toast.error("Failed to delete task"); return; }
    toast.success("Task deleted");
    fetchTasks();
  };

  const handleUnban = async (banId: string) => {
    const { error } = await supabase.from("chat_bans").update({ is_active: false }).eq("id", banId);
    if (error) { toast.error("Failed to unban"); return; }
    toast.success("User unbanned");
    fetchBans();
  };

  // ── Filtered data ─────────────────────────────────────────
  const filteredUsers = users.filter(u =>
    (u.username || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredTasks = tasks.filter(t => {
    if (taskFilter === "all") return true;
    if (taskFilter === "mine") return t.assigned_to === user?.id;
    return t.status === taskFilter;
  });

  const getAssigneeName = (userId: string | null) => {
    if (!userId) return "Unassigned";
    return staffMembers.find(s => s.user_id === userId)?.username || "Unknown";
  };

  if (loading) return <div className="min-h-screen gradient-casino-bg flex items-center justify-center"><p>Loading...</p></div>;

  return (
    <div className="min-h-screen gradient-casino-bg">
      <Header />
      <div className="container max-w-4xl py-6 px-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-display text-2xl font-black text-sky-400 flex items-center gap-2">
            <Shield className="h-6 w-6" /> Staff Panel
          </h1>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {[
            { id: "tasks" as const, label: "Tasks", icon: <ClipboardList className="h-4 w-4" /> },
            { id: "users" as const, label: "User Management", icon: <Users className="h-4 w-4" /> },
            { id: "moderation" as const, label: "Moderation", icon: <Ban className="h-4 w-4" /> },
          ].map(tab => (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab(tab.id)}
              className={activeTab === tab.id ? "bg-sky-500 hover:bg-sky-600 text-white" : ""}
            >
              {tab.icon}
              <span className="ml-1.5">{tab.label}</span>
            </Button>
          ))}
        </div>

        {/* ════════════ TASKS TAB ════════════ */}
        {activeTab === "tasks" && (
          <div className="space-y-4">
            {/* Task Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Pending", count: tasks.filter(t => t.status === "pending").length, color: "text-yellow-400" },
                { label: "In Progress", count: tasks.filter(t => t.status === "in_progress").length, color: "text-sky-400" },
                { label: "Completed", count: tasks.filter(t => t.status === "completed").length, color: "text-emerald-400" },
                { label: "My Tasks", count: tasks.filter(t => t.assigned_to === user?.id).length, color: "text-purple-400" },
              ].map(s => (
                <div key={s.label} className="rounded-xl bg-card border border-border p-3 text-center">
                  <p className={`font-display text-2xl font-bold ${s.color}`}>{s.count}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Filter + Create */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex gap-1 flex-wrap">
                {["all", "mine", "pending", "in_progress", "completed"].map(f => (
                  <Button key={f} variant={taskFilter === f ? "default" : "ghost"} size="sm"
                    className={taskFilter === f ? "bg-sky-500/20 text-sky-400 hover:bg-sky-500/30" : "text-xs"}
                    onClick={() => setTaskFilter(f)}>
                    {f === "all" ? "All" : f === "mine" ? "My Tasks" : STATUS_CONFIG[f]?.label || f}
                  </Button>
                ))}
              </div>
              {(isAdmin || isOwner) && (
                <Button size="sm" className="bg-sky-500 hover:bg-sky-600 text-white" onClick={() => setShowNewTask(!showNewTask)}>
                  <Plus className="h-4 w-4 mr-1" /> New Task
                </Button>
              )}
            </div>

            {/* New Task Form */}
            {showNewTask && (isAdmin || isOwner) && (
              <div className="rounded-xl bg-card border border-sky-400/30 p-5 space-y-4 animate-slide-up">
                <h3 className="font-display font-bold text-sky-400 flex items-center gap-2">
                  <Plus className="h-4 w-4" /> Create New Task
                </h3>
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs">Title *</Label>
                    <Input value={newTask.title} onChange={e => setNewTask({ ...newTask, title: e.target.value })} placeholder="Task title..." className="bg-background" />
                  </div>
                  <div>
                    <Label className="text-xs">Description</Label>
                    <Textarea value={newTask.description} onChange={e => setNewTask({ ...newTask, description: e.target.value })} placeholder="Task details..." className="bg-background" rows={3} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Priority</Label>
                      <select value={newTask.priority} onChange={e => setNewTask({ ...newTask, priority: e.target.value })}
                        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
                        {Object.entries(PRIORITY_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <Label className="text-xs">Category</Label>
                      <select value={newTask.category} onChange={e => setNewTask({ ...newTask, category: e.target.value })}
                        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
                        {CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Assign To</Label>
                      <select value={newTask.assigned_to} onChange={e => setNewTask({ ...newTask, assigned_to: e.target.value })}
                        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
                        <option value="">Unassigned</option>
                        {staffMembers.map(s => <option key={s.user_id} value={s.user_id}>{s.username}</option>)}
                      </select>
                    </div>
                    <div>
                      <Label className="text-xs">Due Date</Label>
                      <Input type="date" value={newTask.due_date} onChange={e => setNewTask({ ...newTask, due_date: e.target.value })} className="bg-background" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button className="bg-sky-500 hover:bg-sky-600 text-white" onClick={handleCreateTask}>
                      <Save className="h-4 w-4 mr-1" /> Create Task
                    </Button>
                    <Button variant="outline" onClick={() => setShowNewTask(false)}>Cancel</Button>
                  </div>
                </div>
              </div>
            )}

            {/* Task List */}
            {loadingTasks ? <p className="text-muted-foreground text-sm">Loading tasks...</p> : filteredTasks.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <ClipboardList className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No tasks found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredTasks.map(task => {
                  const pConfig = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
                  const sConfig = STATUS_CONFIG[task.status] || STATUS_CONFIG.pending;
                  const PIcon = pConfig.icon;
                  return (
                    <div key={task.id} className={`rounded-xl border p-4 space-y-2 ${sConfig.bg}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <PIcon className={`h-4 w-4 ${pConfig.color} shrink-0`} />
                            <h4 className={`font-display font-bold text-sm ${task.status === "completed" ? "line-through opacity-60" : ""}`}>
                              {task.title}
                            </h4>
                            <span className={`text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full border ${sConfig.bg} ${sConfig.color}`}>
                              {sConfig.label}
                            </span>
                          </div>
                          {task.description && (
                            <p className="text-xs text-muted-foreground mt-1">{task.description}</p>
                          )}
                          <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" /> {getAssigneeName(task.assigned_to)}
                            </span>
                            <span className="capitalize">{task.category}</span>
                            {task.due_date && (
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" /> {new Date(task.due_date).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      {task.notes && (
                        <p className="text-xs text-muted-foreground italic border-t border-border/50 pt-2 mt-2">📝 {task.notes}</p>
                      )}
                      <div className="flex gap-1.5 flex-wrap pt-1">
                        {task.status !== "completed" && (
                          <>
                            {task.status === "pending" && (
                              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleUpdateTaskStatus(task.id, "in_progress")}>
                                <Clock className="h-3 w-3 mr-1" /> Start
                              </Button>
                            )}
                            <Button size="sm" variant="outline" className="h-7 text-xs text-emerald-400 border-emerald-400/30 hover:bg-emerald-400/10" onClick={() => handleUpdateTaskStatus(task.id, "completed")}>
                              <CheckCircle2 className="h-3 w-3 mr-1" /> Complete
                            </Button>
                          </>
                        )}
                        {(isAdmin || isOwner) && (
                          <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive" onClick={() => handleDeleteTask(task.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ════════════ USERS TAB ════════════ */}
        {activeTab === "users" && (
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search users..." className="pl-9 bg-background" />
            </div>

            <p className="text-xs text-muted-foreground">
              <Wrench className="h-3 w-3 inline mr-1" />
              Staff can adjust <strong>bonus balance</strong> and <strong>change usernames</strong> only. Email, password, and role changes require Admin access.
            </p>

            {loadingUsers ? <p className="text-muted-foreground text-sm">Loading users...</p> : (
              <div className="space-y-3">
                {filteredUsers.map(u => (
                  <div key={u.user_id} className="rounded-xl bg-card border border-border p-4">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <Circle className={`h-2.5 w-2.5 shrink-0 ${getStatusColor(u.is_online ? (u.appearance_status || "online") : "offline")}`} />
                          {u.roles.some(r => ["admin","moderator","staff"].includes(r)) ? (
                            <StaffUsername username={u.username || "No username"} role={(["admin","moderator","staff"].find(r => u.roles.includes(r)) || null) as StaffRole} size="sm" />
                          ) : (
                            <p className="font-display font-bold text-sm truncate">{u.username || "No username"}</p>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">Joined {new Date(u.created_at).toLocaleDateString()}</p>
                      </div>
                      <p className="font-display font-bold text-casino-gold text-sm shrink-0">${u.balance.toFixed(2)}</p>
                    </div>

                    <div className="flex gap-2 flex-wrap">
                      <Button variant="outline" size="sm" onClick={() => setAdjustUserId(adjustUserId === u.user_id ? null : u.user_id)}>
                        <DollarSign className="h-3 w-3 mr-1" /> Bonus
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => {
                        if (editUserId === u.user_id) { setEditUserId(null); return; }
                        setEditUserId(u.user_id); setEditUsername(u.username || "");
                      }}>
                        <Edit className="h-3 w-3 mr-1" /> Username
                      </Button>
                    </div>

                    {/* Balance Adjust */}
                    {adjustUserId === u.user_id && (
                      <div className="mt-3 p-3 rounded-lg bg-secondary space-y-2 animate-slide-up">
                        <p className="text-xs font-bold text-muted-foreground uppercase">Adjust Bonus Balance</p>
                        <Input type="number" value={adjustAmount} onChange={e => setAdjustAmount(e.target.value)} placeholder="Amount (e.g. 50 or -25)" className="bg-background" />
                        <Input value={adjustDescription} onChange={e => setAdjustDescription(e.target.value)} placeholder="Reason (optional)" className="bg-background" />
                        <div className="flex gap-2">
                          <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-white" disabled={!adjustAmount}
                            onClick={() => handleAdjustBalance(u.user_id, Math.abs(Number(adjustAmount)))}>
                            <Plus className="h-3 w-3 mr-1" /> Add
                          </Button>
                          <Button size="sm" variant="destructive" disabled={!adjustAmount}
                            onClick={() => handleAdjustBalance(u.user_id, -Math.abs(Number(adjustAmount)))}>
                            <DollarSign className="h-3 w-3 mr-1" /> Deduct
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Username Edit */}
                    {editUserId === u.user_id && (
                      <div className="mt-3 p-3 rounded-lg bg-secondary space-y-2 animate-slide-up">
                        <p className="text-xs font-bold text-muted-foreground uppercase">Change Username</p>
                        <Input value={editUsername} onChange={e => setEditUsername(e.target.value)} placeholder="New username" className="bg-background" />
                        <Button size="sm" className="bg-sky-500 hover:bg-sky-600 text-white" onClick={() => handleSaveUsername(u.user_id)} disabled={saving}>
                          <Save className="h-3 w-3 mr-1" /> {saving ? "Saving..." : "Save"}
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ════════════ MODERATION TAB ════════════ */}
        {activeTab === "moderation" && (
          <div className="space-y-4">
            <Section title="Active Chat Bans" icon={<Ban className="h-5 w-5" />}>
              {chatBans.length === 0 ? (
                <p className="text-sm text-muted-foreground">No active bans</p>
              ) : chatBans.map(ban => (
                <div key={ban.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary border border-border">
                  <div>
                    <p className="text-sm font-medium">User: <span className="font-mono text-xs">{ban.user_id.slice(0, 8)}...</span></p>
                    {ban.reason && <p className="text-xs text-muted-foreground">Reason: {ban.reason}</p>}
                    {ban.game_room && <p className="text-xs text-muted-foreground">Room: {ban.game_room}</p>}
                    <p className="text-[10px] text-muted-foreground">{new Date(ban.created_at).toLocaleString()}</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => handleUnban(ban.id)}>Unban</Button>
                </div>
              ))}
            </Section>

            <Section title="Moderation Log" icon={<MessageSquare className="h-5 w-5" />} defaultOpen={false}>
              {modLogs.length === 0 ? (
                <p className="text-sm text-muted-foreground">No moderation actions recorded</p>
              ) : modLogs.map(log => (
                <div key={log.id} className="p-3 rounded-lg bg-secondary border border-border">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase text-sky-400">{log.action_type}</span>
                    {log.game_room && <span className="text-xs text-muted-foreground">in {log.game_room}</span>}
                  </div>
                  {log.reason && <p className="text-xs text-muted-foreground mt-1">Reason: {log.reason}</p>}
                  <p className="text-[10px] text-muted-foreground mt-1">{new Date(log.created_at).toLocaleString()}</p>
                </div>
              ))}
            </Section>
          </div>
        )}
      </div>
    </div>
  );
}
