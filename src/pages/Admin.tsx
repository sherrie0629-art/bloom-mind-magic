import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Crown, Search, UserCheck, ShoppingBag, RefreshCw, BarChart3, Users, MessageSquare, FileText, Settings, Check, Globe, Zap } from "lucide-react";
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
  deep_report: "深度报告",
  compatibility: "合盘测试",
  subscription: "会员订阅",
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

  // Settings state
  const [aiProvider, setAiProvider] = useState<string>("lovable");
  const [providerLoading, setProviderLoading] = useState(false);

  // Check admin role
  useEffect(() => {
    if (!user) { navigate("/auth"); return; }
    supabase.rpc("has_role", { _user_id: user.id, _role: "admin" }).then(({ data }) => {
      if (!data) { navigate("/"); toast({ title: "无权限", description: "你不是管理员" }); return; }
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
    const premiumCount = subs.filter(s => s.plan === "premium" && s.expires_at && new Date(s.expires_at) > new Date()).length;
    const usages = usageRes.data || [];
    const todayChats = usages.reduce((s, u) => s + u.chat_count, 0);
    const todayAssessments = usages.reduce((s, u) => s + u.assessment_count, 0);
    const totalRevenue = (purchaseRes.data || []).reduce((s, p) => s + p.amount, 0);
    setDashStats({
      total: users.length,
      premium: premiumCount,
      todayActive: usages.length,
      todayChats,
      todayAssessments,
      totalRevenue,
      totalAssessments: assessRes.count || 0,
    });
  }, [users.length]);

  const loadAIProvider = useCallback(async () => {
    const { data } = await supabase.from("app_settings").select("value").eq("key", "ai_provider").single();
    if (data) setAiProvider(data.value);
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    loadUsers();
    loadPurchases();
    loadAIProvider();
  }, [isAdmin, loadUsers, loadPurchases, loadAIProvider]);

  useEffect(() => {
    if (!isAdmin || users.length === 0) return;
    loadDashboard();
  }, [isAdmin, users.length, loadDashboard]);

  const setPremium = async (userId: string, months: number) => {
    setUpdatingId(userId);
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + months);

    const { data: existing } = await supabase
      .from("user_subscriptions").select("id").eq("user_id", userId).single();

    if (existing) {
      await supabase.from("user_subscriptions").update({
        plan: "premium", expires_at: expiresAt.toISOString(),
      }).eq("user_id", userId);
    } else {
      await supabase.from("user_subscriptions").insert({
        user_id: userId, plan: "premium", expires_at: expiresAt.toISOString(),
      });
    }
    toast({ title: "已设置", description: `会员有效期至 ${expiresAt.toLocaleDateString("zh-CN")}` });
    await loadUsers();
    setUpdatingId(null);
  };

  const removePremium = async (userId: string) => {
    setUpdatingId(userId);
    await supabase.from("user_subscriptions").update({ plan: "free", expires_at: null }).eq("user_id", userId);
    toast({ title: "已取消", description: "已恢复为免费用户" });
    await loadUsers();
    setUpdatingId(null);
  };

  const updatePurchaseStatus = async (id: string, status: string) => {
    await supabase.from("purchase_records").update({ status }).eq("id", id);
    toast({ title: "已更新", description: `状态已设为${status === "completed" ? "已完成" : status}` });
    await loadPurchases();
  };

  const switchProvider = async (provider: string) => {
    if (provider === aiProvider) return;
    setProviderLoading(true);
    const { error } = await supabase.from("app_settings").update({ value: provider, updated_at: new Date().toISOString() }).eq("key", "ai_provider");
    if (error) {
      toast({ title: "切换失败", description: error.message, variant: "destructive" });
    } else {
      setAiProvider(provider);
      toast({ title: "已切换", description: `AI 服务已切换为${provider === "doubao" ? "豆包 2.0 Pro" : "Lovable AI"}` });
    }
    setProviderLoading(false);
  };

  const filteredUsers = users.filter(u =>
    !search || (u.display_name || "").includes(search) || u.user_id.includes(search)
  );

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background"><RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5 text-foreground" /></button>
        <h1 className="font-display text-base font-semibold text-foreground">管理后台</h1>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        {[
          { key: "dashboard" as const, label: "数据看板", icon: BarChart3 },
          { key: "users" as const, label: "用户管理", icon: UserCheck },
          { key: "purchases" as const, label: "购买记录", icon: ShoppingBag },
          { key: "settings" as const, label: "设置", icon: Settings },
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
              { label: "总用户", value: String(dashStats.total), icon: Users, color: "text-secondary" },
              { label: "活跃会员", value: String(dashStats.premium), icon: Crown, color: "text-yellow-500" },
              { label: "今日活跃", value: String(dashStats.todayActive), icon: UserCheck, color: "text-accent" },
              { label: "总测评数", value: String(dashStats.totalAssessments), icon: FileText, color: "text-primary" },
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
            <h4 className="text-xs font-semibold text-foreground mb-3">今日概览</h4>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
                  <span>对话次数</span>
                  <span>{dashStats.todayChats}</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-golden transition-all" style={{ width: `${Math.min(100, dashStats.todayChats / 2)}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
                  <span>测评次数</span>
                  <span>{dashStats.todayAssessments}</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-mystic transition-all" style={{ width: `${Math.min(100, dashStats.todayAssessments * 5)}%` }} />
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-card shadow-card p-4">
            <h4 className="text-xs font-semibold text-foreground mb-1">累计收入</h4>
            <p className="font-display text-3xl font-bold text-foreground">¥{(dashStats.totalRevenue / 100).toFixed(2)}</p>
            <p className="text-[10px] text-muted-foreground mt-1">仅统计已完成订单</p>
          </div>
        </div>
      )}

      {tab === "users" && (
        <div className="p-4 space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="搜索用户名或ID..."
              className="w-full rounded-xl bg-card border border-border pl-9 pr-4 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-secondary"
            />
          </div>

          <p className="text-[10px] text-muted-foreground">共 {filteredUsers.length} 位用户</p>

          {/* User list */}
          <div className="space-y-2">
            {filteredUsers.map(u => {
              const isPremium = u.subscription?.plan === "premium" && u.subscription.expires_at && new Date(u.subscription.expires_at) > new Date();
              return (
                <div key={u.user_id} className="rounded-2xl bg-card shadow-card p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm ${isPremium ? "bg-gradient-golden" : "bg-muted"}`}>
                      {isPremium ? "👑" : "🌙"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{u.display_name || "旅行者"}</p>
                      <p className="text-[9px] text-muted-foreground truncate">{u.user_id}</p>
                    </div>
                    {isPremium && (
                      <span className="rounded-full bg-secondary/20 px-2 py-0.5 text-[10px] font-medium text-secondary">
                        会员
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground mb-2">
                    <span>注册: {new Date(u.created_at).toLocaleDateString("zh-CN")}</span>
                    {u.usage && <span>· 今日对话{u.usage.chat_count} 测评{u.usage.assessment_count}</span>}
                    {isPremium && u.subscription?.expires_at && (
                      <span>· 到期: {new Date(u.subscription.expires_at).toLocaleDateString("zh-CN")}</span>
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
                          <Crown className="inline h-3 w-3 mr-0.5" />开通1月
                        </button>
                        <button
                          disabled={updatingId === u.user_id}
                          onClick={() => setPremium(u.user_id, 12)}
                          className="flex-1 rounded-lg bg-secondary/20 py-1.5 text-[10px] font-semibold text-secondary disabled:opacity-50"
                        >
                          开通1年
                        </button>
                      </>
                    ) : (
                      <button
                        disabled={updatingId === u.user_id}
                        onClick={() => removePremium(u.user_id)}
                        className="flex-1 rounded-lg bg-destructive/10 py-1.5 text-[10px] font-medium text-destructive disabled:opacity-50"
                      >
                        取消会员
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
          <p className="text-[10px] text-muted-foreground">最近 {purchases.length} 条记录</p>
          {purchases.map(p => (
            <div key={p.id} className="rounded-2xl bg-card shadow-card p-3">
              <div className="flex items-center justify-between mb-1.5">
                <div>
                  <p className="text-xs font-medium text-foreground">
                    {PRODUCT_LABELS[p.product_type] || p.product_type}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{p.profile_name || "旅行者"}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold text-foreground">¥{(p.amount / 100).toFixed(2)}</p>
                  <p className={`text-[10px] ${p.status === "completed" ? "text-green-500" : "text-yellow-500"}`}>
                    {p.status === "completed" ? "已完成" : p.status === "pending" ? "待支付" : p.status}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[9px] text-muted-foreground">
                  {new Date(p.created_at).toLocaleString("zh-CN")}
                </span>
                {p.status === "pending" && (
                  <button
                    onClick={() => updatePurchaseStatus(p.id, "completed")}
                    className="rounded-lg bg-green-500/10 px-3 py-1 text-[10px] font-medium text-green-600"
                  >
                    标记完成
                  </button>
                )}
              </div>
            </div>
          ))}
          {purchases.length === 0 && (
            <p className="text-center text-xs text-muted-foreground py-8">暂无购买记录</p>
          )}
        </div>
      )}

      {tab === "settings" && (
        <div className="p-4 space-y-4">
          <div className="rounded-2xl bg-card shadow-card p-4">
            <h3 className="text-sm font-semibold text-foreground mb-1">AI 模型服务</h3>
            <p className="text-[10px] text-muted-foreground mb-4">选择后端 AI 推理服务商，切换后立即生效</p>

            <div className="grid grid-cols-2 gap-3">
              {/* Lovable AI Card */}
              <button
                disabled={providerLoading}
                onClick={() => switchProvider("lovable")}
                className={`relative rounded-xl border-2 p-4 text-left transition-all ${
                  aiProvider === "lovable"
                    ? "border-secondary bg-secondary/5 shadow-glow"
                    : "border-border bg-card hover:border-muted-foreground/30"
                } disabled:opacity-60`}
              >
                {aiProvider === "lovable" && (
                  <div className="absolute top-2 right-2 h-5 w-5 rounded-full bg-secondary flex items-center justify-center">
                    <Check className="h-3 w-3 text-secondary-foreground" />
                  </div>
                )}
                <Globe className={`h-6 w-6 mb-2 ${aiProvider === "lovable" ? "text-secondary" : "text-muted-foreground"}`} />
                <p className="text-xs font-semibold text-foreground">Lovable AI</p>
                <p className="text-[10px] text-muted-foreground mt-1">Google Gemini</p>
                <p className="text-[9px] text-muted-foreground mt-0.5">适合海外用户</p>
              </button>

              {/* Doubao Card */}
              <button
                disabled={providerLoading}
                onClick={() => switchProvider("doubao")}
                className={`relative rounded-xl border-2 p-4 text-left transition-all ${
                  aiProvider === "doubao"
                    ? "border-secondary bg-secondary/5 shadow-glow"
                    : "border-border bg-card hover:border-muted-foreground/30"
                } disabled:opacity-60`}
              >
                {aiProvider === "doubao" && (
                  <div className="absolute top-2 right-2 h-5 w-5 rounded-full bg-secondary flex items-center justify-center">
                    <Check className="h-3 w-3 text-secondary-foreground" />
                  </div>
                )}
                <Zap className={`h-6 w-6 mb-2 ${aiProvider === "doubao" ? "text-secondary" : "text-muted-foreground"}`} />
                <p className="text-xs font-semibold text-foreground">豆包 2.0 Pro</p>
                <p className="text-[10px] text-muted-foreground mt-1">字节跳动·火山引擎</p>
                <p className="text-[9px] text-muted-foreground mt-0.5">适合中国大陆用户</p>
              </button>
            </div>

            {aiProvider === "doubao" && (
              <div className="mt-3 rounded-lg bg-muted/50 p-3">
                <p className="text-[10px] text-muted-foreground">
                  ⚡ 当前使用豆包 2.0 Pro。图片生成功能仍使用 Lovable AI（豆包暂不支持图片生成）。
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin;
