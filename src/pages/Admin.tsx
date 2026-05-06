import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useLocale } from "@/hooks/useLocale";
import { ArrowLeft, Crown, Search, UserCheck, ShoppingBag, RefreshCw, BarChart3, Users, MessageSquare, FileText, Settings, Check, Globe } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { PLAN_LIMITS, type PlanKey } from "@/lib/limits";

interface UserRow {
  user_id: string;
  display_name: string | null;
  created_at: string;
  subscription?: { plan: string; expires_at: string | null; billing_period?: string };
  usage?: { chat_count: number; assessment_count: number; deep_report_count: number };
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

// Product labels are localized via t() inside component



const Admin = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { locale } = useLocale();
  const dateLocale = locale === "zh" ? "zh-CN" : "en-US";
  const productLabel = (k: string) => t(`admin.products.${k}`, { defaultValue: k });
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"dashboard" | "users" | "purchases" | "settings">("dashboard");
  const [dashStats, setDashStats] = useState({ total: 0, premium: 0, todayActive: 0, todayChats: 0, todayAssessments: 0, totalRevenue: 0, totalAssessments: 0 });

  const [users, setUsers] = useState<UserRow[]>([]);
  const [purchases, setPurchases] = useState<PurchaseRow[]>([]);
  const [search, setSearch] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) { navigate("/auth"); return; }
    supabase.rpc("has_role", { _user_id: user.id, _role: "admin" }).then(({ data }) => {
      if (!data) { navigate("/"); toast({ title: t("admin.accessDenied"), description: t("admin.notAdmin") }); return; }
      setIsAdmin(true);
      setLoading(false);
    });
  }, [user, navigate]);

  const loadUsers = useCallback(async () => {
    const [authRes, profilesRes, subsRes, usageRes] = await Promise.all([
      supabase.functions.invoke("admin-list-users"),
      supabase.from("profiles").select("user_id, display_name, created_at"),
      supabase.from("user_subscriptions").select("user_id, plan, expires_at, billing_period"),
      supabase.from("usage_tracking").select("user_id, chat_count, assessment_count, deep_report_count").eq("track_date", new Date().toISOString().split("T")[0]),
    ]);

    const profileMap = new Map((profilesRes.data || []).map(p => [p.user_id, p]));
    const subMap = new Map((subsRes.data || []).map(s => [s.user_id, s]));
    const usageMap = new Map((usageRes.data || []).map(u => [u.user_id, u]));

    // Prefer auth-listed users (source of truth); fall back to profiles if function fails
    const authUsers = (authRes.data?.users as Array<{ user_id: string; display_name: string | null; created_at: string }> | undefined);
    const baseList = authUsers && authUsers.length
      ? authUsers
      : (profilesRes.data || []);

    setUsers(
      baseList
        .map(u => ({
          user_id: u.user_id,
          display_name: profileMap.get(u.user_id)?.display_name || u.display_name || null,
          created_at: u.created_at,
          subscription: subMap.get(u.user_id) as any,
          usage: usageMap.get(u.user_id) as any,
        }))
        .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
    );
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

  const applySubscription = async (
    userId: string,
    opts: { plan: "free" | "plus"; billingPeriod: "monthly" | "yearly"; expiresAt: string | null }
  ) => {
    setUpdatingId(userId);
    const { data: existing } = await supabase
      .from("user_subscriptions").select("id").eq("user_id", userId).maybeSingle();

    const payload = {
      plan: opts.plan,
      expires_at: opts.plan === "free" ? null : opts.expiresAt,
      billing_period: opts.billingPeriod,
    };

    if (existing) {
      await (supabase as any).from("user_subscriptions").update(payload).eq("user_id", userId);
    } else {
      await (supabase as any).from("user_subscriptions").insert({ user_id: userId, ...payload });
    }
    toast({
      title: t("admin.subUpdated"),
      description: opts.plan === "plus"
        ? t("admin.subPlusTill", { d: new Date(opts.expiresAt!).toLocaleDateString(dateLocale) })
        : t("admin.subFreeSet"),
    });
    await loadUsers();
    setUpdatingId(null);
    setEditingUserId(null);
  };

  const updatePurchaseStatus = async (id: string, status: string) => {
    await supabase.from("purchase_records").update({ status }).eq("id", id);
    toast({ title: t("admin.purchaseUpdated"), description: t("admin.purchaseStatus", { s: status === "completed" ? t("admin.completed") : status }) });
    await loadPurchases();
  };

  const filteredUsers = users.filter(u =>
    !search || (u.display_name || "").toLowerCase().includes(search.toLowerCase()) || u.user_id.includes(search)
  );

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background"><RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (!isAdmin) return null;


  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5 text-foreground" /></button>
        <h1 className="font-display text-base font-semibold text-foreground">{t("admin.title")}</h1>
      </div>

      <div className="flex border-b border-border">
        {[
          { key: "dashboard" as const, label: t("admin.tabs.dashboard"), icon: BarChart3 },
          { key: "users" as const, label: t("admin.tabs.users"), icon: UserCheck },
          { key: "purchases" as const, label: t("admin.tabs.purchases"), icon: ShoppingBag },
          { key: "settings" as const, label: t("admin.tabs.settings"), icon: Settings },
        ].map(tt => (
          <button
            key={tt.key}
            onClick={() => setTab(tt.key)}
            className={`flex-1 py-3 text-xs font-medium flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
              tab === tt.key ? "border-secondary text-secondary" : "border-transparent text-muted-foreground"
            }`}
          >
            <tt.icon className="h-3.5 w-3.5" />
            {tt.label}
          </button>
        ))}
      </div>

      {tab === "dashboard" && (
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: t("admin.stats.total"), value: String(dashStats.total), icon: Users, color: "text-secondary" },
              { label: t("admin.stats.premium"), value: String(dashStats.premium), icon: Crown, color: "text-yellow-500" },
              { label: t("admin.stats.todayActive"), value: String(dashStats.todayActive), icon: UserCheck, color: "text-accent" },
              { label: t("admin.stats.assessments"), value: String(dashStats.totalAssessments), icon: FileText, color: "text-primary" },
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
            <h4 className="text-xs font-semibold text-foreground mb-3">{t("admin.todayOverview")}</h4>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
                  <span>{t("admin.convs")}</span>
                  <span>{dashStats.todayChats}</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-golden transition-all" style={{ width: `${Math.min(100, dashStats.todayChats / 2)}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
                  <span>{t("admin.assess")}</span>
                  <span>{dashStats.todayAssessments}</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-mystic transition-all" style={{ width: `${Math.min(100, dashStats.todayAssessments * 5)}%` }} />
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-card shadow-card p-4">
            <h4 className="text-xs font-semibold text-foreground mb-1">{t("admin.totalRevenue")}</h4>
            <p className="font-display text-3xl font-bold text-foreground">${(dashStats.totalRevenue / 100).toFixed(2)}</p>
            <p className="text-[10px] text-muted-foreground mt-1">{t("admin.completedOnly")}</p>
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
              placeholder={t("admin.searchPlaceholder")}
              className="w-full rounded-xl bg-card border border-border pl-9 pr-4 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-secondary"
            />
          </div>

          <p className="text-[10px] text-muted-foreground">{t("admin.totalUsers", { n: filteredUsers.length })}</p>

          <div className="space-y-2">
            {filteredUsers.map(u => {
              const isPlus = u.subscription?.plan === "plus" && u.subscription.expires_at && new Date(u.subscription.expires_at) > new Date();
              const planKey: PlanKey = isPlus ? "plus" : "free";
              const limits = PLAN_LIMITS[planKey];
              const usage = u.usage || { chat_count: 0, assessment_count: 0, deep_report_count: 0 };
              const isEditing = editingUserId === u.user_id;

              const usageRows = [
                { label: t("admin.rows.chat"), count: usage.chat_count, limit: limits.chat },
                { label: t("admin.rows.assess"), count: usage.assessment_count, limit: limits.assessment },
                { label: t("admin.rows.deep"), count: usage.deep_report_count, limit: limits.deepReport },
              ];

              return (
                <div key={u.user_id} className="rounded-2xl bg-card shadow-card p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm ${isPlus ? "bg-gradient-golden" : "bg-muted"}`}>
                      {isPlus ? "👑" : "🌙"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{u.display_name || t("profile.traveler")}</p>
                      <p className="text-[9px] text-muted-foreground truncate">{u.user_id}</p>
                    </div>
                    {isPlus && (
                      <span className="rounded-full bg-secondary/20 px-2 py-0.5 text-[10px] font-medium text-secondary">
                        {u.subscription?.billing_period === "yearly" ? t("admin.plusYear") : t("admin.plusMonth")}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-muted-foreground mb-2">
                    <span>{t("admin.registeredAt", { d: new Date(u.created_at).toLocaleDateString(dateLocale) })}</span>
                    {isPlus && u.subscription?.expires_at && (
                      <span>{t("admin.expiryAt", { d: new Date(u.subscription.expires_at).toLocaleDateString(dateLocale) })}</span>
                    )}
                  </div>

                  <div className="space-y-1.5 mb-3 rounded-lg bg-muted/30 p-2">
                    <p className="text-[9px] font-medium text-muted-foreground uppercase tracking-wide">{t("admin.todayQuota")}</p>
                    {usageRows.map(row => {
                      const unlimited = row.limit >= 9999;
                      const pct = row.limit === 0 ? 0 : Math.min(100, (row.count / row.limit) * 100);
                      return (
                        <div key={row.label}>
                          <div className="flex justify-between text-[10px] mb-0.5">
                            <span className="text-foreground">{row.label}</span>
                            <span className="text-muted-foreground">
                              {row.count} / {unlimited ? t("admin.unlimited") : row.limit}
                            </span>
                          </div>
                          <div className="h-1 rounded-full bg-muted overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${isPlus ? "bg-gradient-golden" : "bg-secondary"}`}
                              style={{ width: `${unlimited ? 8 : pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {!isEditing ? (
                    <button
                      onClick={() => setEditingUserId(u.user_id)}
                      className="w-full rounded-lg bg-secondary/15 py-1.5 text-[10px] font-semibold text-secondary"
                    >
                      <Crown className="inline h-3 w-3 mr-0.5" />{t("admin.manageSub")}
                    </button>
                  ) : (
                    <SubscriptionEditor
                      currentPlan={planKey}
                      currentBilling={(u.subscription?.billing_period as "monthly" | "yearly") || "monthly"}
                      currentExpiresAt={u.subscription?.expires_at || null}
                      saving={updatingId === u.user_id}
                      onCancel={() => setEditingUserId(null)}
                      onSave={(opts) => applySubscription(u.user_id, opts)}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === "purchases" && (
        <div className="p-4 space-y-2">
          <p className="text-[10px] text-muted-foreground">{t("admin.purchases", { n: purchases.length })}</p>
          {purchases.map(p => (
            <div key={p.id} className="rounded-2xl bg-card shadow-card p-3">
              <div className="flex items-center justify-between mb-1.5">
                <div>
                  <p className="text-xs font-medium text-foreground">
                    {productLabel(p.product_type)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{p.profile_name || t("profile.traveler")}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold text-foreground">${(p.amount / 100).toFixed(2)}</p>
                  <p className={`text-[10px] ${p.status === "completed" ? "text-green-500" : "text-yellow-500"}`}>
                    {p.status === "completed" ? t("admin.completed") : p.status === "pending" ? t("admin.pending") : p.status}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[9px] text-muted-foreground">
                  {new Date(p.created_at).toLocaleString(dateLocale)}
                </span>
                {p.status === "pending" && (
                  <button
                    onClick={() => updatePurchaseStatus(p.id, "completed")}
                    className="rounded-lg bg-green-500/10 px-3 py-1 text-[10px] font-medium text-green-600"
                  >
                    {t("admin.markComplete")}
                  </button>
                )}
              </div>
            </div>
          ))}
          {purchases.length === 0 && (
            <p className="text-center text-xs text-muted-foreground py-8">{t("admin.noPurchases")}</p>
          )}
        </div>
      )}

      {tab === "settings" && (
        <div className="p-4 space-y-4">
          <div className="rounded-2xl bg-card shadow-card p-4">
            <h3 className="text-sm font-semibold text-foreground mb-1">{t("admin.aiTitle")}</h3>
            <p className="text-[10px] text-muted-foreground mb-4">{t("admin.aiDesc")}</p>

            <div className="relative rounded-xl border-2 border-secondary bg-secondary/5 shadow-glow p-4">
              <div className="absolute top-2 right-2 h-5 w-5 rounded-full bg-secondary flex items-center justify-center">
                <Check className="h-3 w-3 text-secondary-foreground" />
              </div>
              <Globe className="h-6 w-6 mb-2 text-secondary" />
              <p className="text-xs font-semibold text-foreground">Lovable AI</p>
              <p className="text-[10px] text-muted-foreground mt-1">Google Gemini models</p>
              <p className="text-[9px] text-muted-foreground mt-0.5">{t("admin.aiActive")}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface EditorProps {
  currentPlan: PlanKey;
  currentBilling: "monthly" | "yearly";
  currentExpiresAt: string | null;
  saving: boolean;
  onCancel: () => void;
  onSave: (opts: { plan: "free" | "plus"; billingPeriod: "monthly" | "yearly"; expiresAt: string | null }) => void;
}

const SubscriptionEditor = ({ currentPlan, currentBilling, currentExpiresAt, saving, onCancel, onSave }: EditorProps) => {
  const { t } = useTranslation();
  const defaultExpiry = (billing: "monthly" | "yearly") => {
    const d = new Date();
    d.setDate(d.getDate() + (billing === "yearly" ? 365 : 30));
    return d.toISOString().split("T")[0];
  };
  const [plan, setPlan] = useState<"free" | "plus">(currentPlan);
  const [billing, setBilling] = useState<"monthly" | "yearly">(currentBilling);
  const [expires, setExpires] = useState<string>(
    currentExpiresAt ? currentExpiresAt.split("T")[0] : defaultExpiry(currentBilling)
  );

  const handleBillingChange = (b: "monthly" | "yearly") => {
    setBilling(b);
    if (!currentExpiresAt) setExpires(defaultExpiry(b));
  };

  return (
    <div className="space-y-2 rounded-lg border border-border p-2.5">
      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="text-[9px] text-muted-foreground">{t("admin.subEditor.plan")}</span>
          <select
            value={plan}
            onChange={e => setPlan(e.target.value as "free" | "plus")}
            className="mt-0.5 w-full rounded-md bg-card border border-border px-2 py-1 text-[11px] text-foreground"
          >
            <option value="free">Free</option>
            <option value="plus">Plus</option>
          </select>
        </label>
        <label className="block">
          <span className="text-[9px] text-muted-foreground">{t("admin.subEditor.billing")}</span>
          <select
            value={billing}
            disabled={plan === "free"}
            onChange={e => handleBillingChange(e.target.value as "monthly" | "yearly")}
            className="mt-0.5 w-full rounded-md bg-card border border-border px-2 py-1 text-[11px] text-foreground disabled:opacity-50"
          >
            <option value="monthly">{t("admin.subEditor.monthly")}</option>
            <option value="yearly">{t("admin.subEditor.yearly")}</option>
          </select>
        </label>
      </div>
      <label className="block">
        <span className="text-[9px] text-muted-foreground">{t("admin.subEditor.expires")}</span>
        <input
          type="date"
          value={expires}
          disabled={plan === "free"}
          onChange={e => setExpires(e.target.value)}
          className="mt-0.5 w-full rounded-md bg-card border border-border px-2 py-1 text-[11px] text-foreground disabled:opacity-50"
        />
      </label>
      <div className="flex gap-2 pt-1">
        <button
          disabled={saving || (plan === "plus" && !expires)}
          onClick={() => onSave({
            plan,
            billingPeriod: billing,
            expiresAt: plan === "plus" ? new Date(expires).toISOString() : null,
          })}
          className="flex-1 rounded-lg bg-gradient-golden py-1.5 text-[10px] font-semibold text-primary-foreground disabled:opacity-50"
        >
          {saving ? t("admin.subEditor.saving") : t("admin.subEditor.save")}
        </button>
        <button
          onClick={onCancel}
          className="flex-1 rounded-lg bg-muted py-1.5 text-[10px] font-medium text-muted-foreground"
        >
          {t("admin.subEditor.cancel")}
        </button>
      </div>
    </div>
  );
};

export default Admin;
