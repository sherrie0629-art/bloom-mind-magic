import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Crown, Search, UserCheck, ShoppingBag, RefreshCw, BarChart3, Users, MessageSquare, FileText, Settings, Check, Globe } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

interface UserRow {
  user_id: string;
  display_name: string | null;
  created_at: string;
  subscription?: { plan: string; expires_at: string | null };
  usage?: { chat_count: number; assessment_count: number };
}

interface PurchaseRow {
  id: string;
  user_id: string;
  product_type: string;
  product_id: string | null;
  amount: number;
  status: string;
  created_at: string;
  profile_name?: string;
}

const PRODUCT_LABELS: Record<string, string> = {
  deep_report: "Deep Report",
  compatibility: "Compatibility Test",
  subscription: "Membership",
};

const Admin = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"dashboard" | "users" | "purchases" | "settings">("dashboard");
  const [dashStats, setDashStats] = useState({ total: 0, premium: 0, todayActive: 0, todayChats: 0, todayAssessments: 0, totalRevenue: 0, totalAssessments: 0 });

  const [users, setUsers] = useState<UserRow[]>([]);
  const [purchases, setPurchases] = useState<PurchaseRow[]>([]);
  const [search, setSearch] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) { navigate("/auth"); return; }
    supabase.rpc("has_role", { _user_id: user.id, _role: "admin" }).then(({ data }) => {
      if (!data) { navigate("/"); toast({ title: "Access Denied", description: "You are not an admin" }); return; }
      setIsAdmin(true);
      setLoading(false);
    });
  }, [user, navigate]);

  const loadUsers = useCallback(async () => {
    const [profilesRes, subsRes, usageRes] = await Promise.all([
      supabase.from("profiles").select("user_id, display_name, created_at").order("created_at", { ascending: false }),
      supabase.from("user_subscriptions").select("user_id, plan, expires_at"),
      supabase.from("usage_tracking").select("user_id, chat_count, assessment_count").eq("track_date", new Date().toISOString().split("T")[0]),
    ]);

    const subMap = new Map((subsRes.data || []).map(s => [s.user_id, s]));
    const usageMap = new Map((usageRes.data || []).map(u => [u.user_id, u]));

    setUsers((profilesRes.data || []).map(p => ({
      ...p,
      subscription: subMap.get(p.user_id) as any,
      usage: usageMap.get(p.user_id) as any,
    })));
  }, []);

  const loadPurchases = useCallback(async () => {
    const [purchaseRes, profilesRes] = await Promise.all([
      supabase.from("purchase_records").select("*").order("created_at", { ascending: false }).limit(50),
      supabase.from("profiles").select("user_id, display_name"),
    ]);
    const nameMap = new Map((profilesRes.data || []).map(p => [p.user_id, p.display_name]));
    setPurchases((purchaseRes.data || []).map(p => ({ ...p, profile_name: nameMap.get(p.user_id) || undefined })));
  }, []);

  const loadDashboard = useCallback(async () => {
    const today = new Date().toISOString().split("T")[0];
    const [subsRes, usageRes, purchaseRes, assessRes] = await Promise.all([
      supabase.from("user_subscriptions").select("plan, expires_at"),
      supabase.from("usage_tracking").select("user_id, chat_count, assessment_count").eq("track_date", today),
      supabase.from("purchase_records").select("amount, status").eq("status", "completed"),
      supabase.from("assessment_results").select("*", { count: "exact", head: true }),
    ]);
    const subs = subsRes.data || [];
    const plusCount = subs.filter(s => s.plan === "plus" && s.expires_at && new Date(s.expires_at) > new Date()).length;
    const usages = usageRes.data || [];
    const todayChats = usages.reduce((s, u) => s + u.chat_count, 0);
    const todayAssessments = usages.reduce((s, u) => s + u.assessment_count, 0);
    const totalRevenue = (purchaseRes.data || []).reduce((s, p) => s + p.amount, 0);
    setDashStats({
      total: users.length,
      premium: plusCount,
      todayActive: usages.length,
      todayChats,
      todayAssessments,
      totalRevenue,
      totalAssessments: assessRes.count || 0,
    });
  }, [users.length]);

  useEffect(() => {
    if (!isAdmin) return;
    loadUsers();
    loadPurchases();
  }, [isAdmin, loadUsers, loadPurchases]);

  useEffect(() => {
    if (!isAdmin || users.length === 0) return;
    loadDashboard();
  }, [isAdmin, users.length, loadDashboard]);

  const setPlus = async (userId: string, months: number) => {
    setUpdatingId(userId);
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + months);
    const billingPeriod = months >= 12 ? "yearly" : "monthly";

    const { data: existing } = await supabase
      .from("user_subscriptions").select("id").eq("user_id", userId).single();

    if (existing) {
      await (supabase as any).from("user_subscriptions").update({
        plan: "plus", expires_at: expiresAt.toISOString(), billing_period: billingPeriod,
      }).eq("user_id", userId);
    } else {
      await (supabase as any).from("user_subscriptions").insert({
        user_id: userId, plan: "plus", expires_at: expiresAt.toISOString(), billing_period: billingPeriod,
      });
    }
    toast({ title: "Updated", description: `Plus membership valid until ${expiresAt.toLocaleDateString("en-US")}` });
    await loadUsers();
    setUpdatingId(null);
  };

  const removePlus = async (userId: string) => {
    setUpdatingId(userId);
    await supabase.from("user_subscriptions").update({ plan: "free", expires_at: null }).eq("user_id", userId);
    toast({ title: "Removed", description: "Reverted to free user" });
    await loadUsers();
    setUpdatingId(null);
  };

  const updatePurchaseStatus = async (id: string, status: string) => {
    await supabase.from("purchase_records").update({ status }).eq("id", id);
    toast({ title: "Updated", description: `Status set to ${status === "completed" ? "Completed" : status}` });
    await loadPurchases();
  };

  const filteredUsers = users.filter(u =>
    !search || (u.display_name || "").toLowerCase().includes(search.toLowerCase()) || u.user_id.includes(search)
  );

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background"><RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5 text-foreground" /></button>
        <h1 className="font-display text-base font-semibold text-foreground">Admin Dashboard</h1>
      </div>

      <div className="flex border-b border-border">
        {[
          { key: "dashboard" as const, label: "Overview", icon: BarChart3 },
          { key: "users" as const, label: "Users", icon: UserCheck },
          { key: "purchases" as const, label: "Purchases", icon: ShoppingBag },
          { key: "settings" as const, label: "Settings", icon: Settings },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-3 text-xs font-medium flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
              tab === t.key ? "border-secondary text-secondary" : "border-transparent text-muted-foreground"
            }`}
          >
            <t.icon className="h-3.5 w-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === "dashboard" && (
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Total Users", value: String(dashStats.total), icon: Users, color: "text-secondary" },
              { label: "Plus Members", value: String(dashStats.premium), icon: Crown, color: "text-yellow-500" },
              { label: "Active Today", value: String(dashStats.todayActive), icon: UserCheck, color: "text-accent" },
              { label: "Assessments", value: String(dashStats.totalAssessments), icon: FileText, color: "text-primary" },
            ].map(s => (
              <div key={s.label} className="rounded-2xl bg-card shadow-card p-4">
                <div className="flex items-center gap-2 mb-2">
                  <s.icon className={`h-4 w-4 ${s.color}`} />
                  <span className="text-[10px] text-muted-foreground">{s.label}</span>
                </div>
                <p className="font-display text-2xl font-bold text-foreground">{s.value}</p>
              </div>
            ))}
          </div>

          <div className="rounded-2xl bg-card shadow-card p-4">
            <h4 className="text-xs font-semibold text-foreground mb-3">Today's Overview</h4>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
                  <span>Conversations</span>
                  <span>{dashStats.todayChats}</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-golden transition-all" style={{ width: `${Math.min(100, dashStats.todayChats / 2)}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
                  <span>Assessments</span>
                  <span>{dashStats.todayAssessments}</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-mystic transition-all" style={{ width: `${Math.min(100, dashStats.todayAssessments * 5)}%` }} />
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-card shadow-card p-4">
            <h4 className="text-xs font-semibold text-foreground mb-1">Total Revenue</h4>
            <p className="font-display text-3xl font-bold text-foreground">${(dashStats.totalRevenue / 100).toFixed(2)}</p>
            <p className="text-[10px] text-muted-foreground mt-1">Completed orders only</p>
          </div>
        </div>
      )}

      {tab === "users" && (
        <div className="p-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or ID..."
              className="w-full rounded-xl bg-card border border-border pl-9 pr-4 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-secondary"
            />
          </div>

          <p className="text-[10px] text-muted-foreground">{filteredUsers.length} users total</p>

          <div className="space-y-2">
            {filteredUsers.map(u => {
              const isPlus = u.subscription?.plan === "plus" && u.subscription.expires_at && new Date(u.subscription.expires_at) > new Date();
              return (
                <div key={u.user_id} className="rounded-2xl bg-card shadow-card p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm ${isPlus ? "bg-gradient-golden" : "bg-muted"}`}>
                      {isPlus ? "👑" : "🌙"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{u.display_name || "Traveler"}</p>
                      <p className="text-[9px] text-muted-foreground truncate">{u.user_id}</p>
                    </div>
                    {isPlus && (
                      <span className="rounded-full bg-secondary/20 px-2 py-0.5 text-[10px] font-medium text-secondary">
                        Plus
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground mb-2">
                    <span>Joined: {new Date(u.created_at).toLocaleDateString("en-US")}</span>
                    {u.usage && <span>· Today: {u.usage.chat_count} chats, {u.usage.assessment_count} assessments</span>}
                    {isPl && u.subscription?.expires_at && (
                      <span>· Expires: {new Date(u.subscription.expires_at).toLocaleDateString("en-US")}</span>
                    )}
                  </div>

                  <div className="flex gap-2">
                    {!isPremium ? (
                      <>
                        <button
                          disabled={updatingId === u.user_id}
                          onClick={() => setPremium(u.user_id, 1)}
                          className="flex-1 rounded-lg bg-gradient-golden py-1.5 text-[10px] font-semibold text-primary-foreground disabled:opacity-50"
                        >
                          <Crown className="inline h-3 w-3 mr-0.5" />1 Month
                        </button>
                        <button
                          disabled={updatingId === u.user_id}
                          onClick={() => setPremium(u.user_id, 12)}
                          className="flex-1 rounded-lg bg-secondary/20 py-1.5 text-[10px] font-semibold text-secondary disabled:opacity-50"
                        >
                          1 Year
                        </button>
                      </>
                    ) : (
                      <button
                        disabled={updatingId === u.user_id}
                        onClick={() => removePremium(u.user_id)}
                        className="flex-1 rounded-lg bg-destructive/10 py-1.5 text-[10px] font-medium text-destructive disabled:opacity-50"
                      >
                        Remove Membership
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === "purchases" && (
        <div className="p-4 space-y-2">
          <p className="text-[10px] text-muted-foreground">Latest {purchases.length} records</p>
          {purchases.map(p => (
            <div key={p.id} className="rounded-2xl bg-card shadow-card p-3">
              <div className="flex items-center justify-between mb-1.5">
                <div>
                  <p className="text-xs font-medium text-foreground">
                    {PRODUCT_LABELS[p.product_type] || p.product_type}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{p.profile_name || "Traveler"}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold text-foreground">${(p.amount / 100).toFixed(2)}</p>
                  <p className={`text-[10px] ${p.status === "completed" ? "text-green-500" : "text-yellow-500"}`}>
                    {p.status === "completed" ? "Completed" : p.status === "pending" ? "Pending" : p.status}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[9px] text-muted-foreground">
                  {new Date(p.created_at).toLocaleString("en-US")}
                </span>
                {p.status === "pending" && (
                  <button
                    onClick={() => updatePurchaseStatus(p.id, "completed")}
                    className="rounded-lg bg-green-500/10 px-3 py-1 text-[10px] font-medium text-green-600"
                  >
                    Mark Complete
                  </button>
                )}
              </div>
            </div>
          ))}
          {purchases.length === 0 && (
            <p className="text-center text-xs text-muted-foreground py-8">No purchase records yet</p>
          )}
        </div>
      )}

      {tab === "settings" && (
        <div className="p-4 space-y-4">
          <div className="rounded-2xl bg-card shadow-card p-4">
            <h3 className="text-sm font-semibold text-foreground mb-1">AI Model Service</h3>
            <p className="text-[10px] text-muted-foreground mb-4">Currently using Lovable AI (Google Gemini)</p>

            <div className="relative rounded-xl border-2 border-secondary bg-secondary/5 shadow-glow p-4">
              <div className="absolute top-2 right-2 h-5 w-5 rounded-full bg-secondary flex items-center justify-center">
                <Check className="h-3 w-3 text-secondary-foreground" />
              </div>
              <Globe className="h-6 w-6 mb-2 text-secondary" />
              <p className="text-xs font-semibold text-foreground">Lovable AI</p>
              <p className="text-[10px] text-muted-foreground mt-1">Google Gemini models</p>
              <p className="text-[9px] text-muted-foreground mt-0.5">Active · Available globally</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin;
