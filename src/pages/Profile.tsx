import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Settings, ChevronRight, BookOpen, Star, Bell, LogOut, Crown, Heart, Sparkles, FileText, ShoppingBag, Shield, Gem } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import SoulUniverse from "@/components/SoulUniverse";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "@/hooks/useSubscription";
import { useAchievements } from "@/hooks/useAchievements";

interface PurchaseRecord {
  id: string;
  product_type: string;
  product_id: string | null;
  amount: number;
  status: string;
  created_at: string;
}


const PRODUCT_LABELS: Record<string, string> = {
  deep_report: "深度报告",
  compatibility: "合盘测试",
};

const Profile = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<{ display_name: string | null } | null>(null);
  const [stats, setStats] = useState({ conversations: 0, assessments: 0, days: 0 });
  const [fragments, setFragments] = useState<Array<{ id: string; name: string; icon: string; color: string }>>([]);
  const [purchases, setPurchases] = useState<PurchaseRecord[]>([]);
  
  const [isAdmin, setIsAdmin] = useState(false);
  const { plan, chatCount, chatLimit, assessmentCount, assessmentLimit, expiresAt, isLoading: subLoading } = useSubscription(user?.id);
  const { unlockedIds } = useAchievements(user?.id);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [profileRes, convRes, assessRes, fragRes, purchaseRes] = await Promise.all([
        supabase.from("profiles").select("display_name").eq("user_id", user.id).single(),
        supabase.from("conversations").select("*", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("assessment_results").select("*", { count: "exact", head: true }).eq("user_id", user.id),
        (supabase as any).from("soul_fragments").select("id, name, icon, color").eq("user_id", user.id).order("created_at", { ascending: false }),
        (supabase as any).from("purchase_records").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10),
      ]);

      setProfile(profileRes.data);
      const daysSinceJoin = Math.max(1, Math.ceil((Date.now() - new Date(user.created_at).getTime()) / 86400000));
      setStats({
        conversations: convRes.count || 0,
        assessments: assessRes.count || 0,
        days: daysSinceJoin,
      });
      setFragments(fragRes.data || []);
      setPurchases(purchaseRes.data || []);

      supabase.rpc("has_role", { _user_id: user.id, _role: "admin" }).then(({ data }) => {
        if (data) setIsAdmin(true);
      });
    };
    load();
  }, [user]);

  const menuItems = [
    { icon: Star, label: "测评报告", count: stats.assessments, action: () => navigate("/assessment-reports") },
    { icon: Gem, label: "故事收藏", action: () => navigate("/vault") },
    { icon: Heart, label: "合盘报告", action: () => navigate("/compatibility-reports") },
    { icon: Bell, label: "消息通知", action: () => {} },
    { icon: Settings, label: "设置", action: () => {} },
    ...(isAdmin ? [{ icon: Shield, label: "管理后台", action: () => navigate("/admin") }] : []),
  ];

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  const formatDate = (s: string) => {
    const d = new Date(s);
    return `${d.getMonth() + 1}月${d.getDate()}日 ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  };

  const premiumBenefits = [
    { label: "每日对话", free: "20次", premium: "1000次" },
    { label: "每日测评", free: "5次", premium: "30次" },
    { label: "AI记忆", free: "最近5条", premium: "无限记忆" },
    { label: "深度报告", free: "¥9.9/份", premium: "每月含2份" },
    { label: "合盘测试", free: "¥9.9/份", premium: "每月含1份" },
  ];

  return (
    <div className="min-h-screen bg-gradient-calm pb-24">
      {/* Avatar & Name */}
      <div className="px-6 pt-14 text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="mx-auto h-20 w-20 rounded-full bg-gradient-mystic p-0.5"
        >
          <div className="flex h-full w-full items-center justify-center rounded-full bg-card">
            <span className="font-display text-2xl text-foreground">
              {subLoading ? "🌙" : plan === "premium" ? "👑" : "🌙"}
            </span>
          </div>
        </motion.div>
        <motion.h2
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mt-3 font-display text-lg font-semibold text-foreground"
        >
          {profile?.display_name || (user ? user.email?.split("@")[0] : "旅行者")}
        </motion.h2>
        <p className="text-xs text-muted-foreground">
          {user ? `探索内心的第 ${stats.days} 天 ✨` : "登录以开始你的心灵旅程"}
        </p>
      </div>

      {!user ? (
        <div className="mt-8 px-6">
          <button
            onClick={() => navigate("/auth")}
            className="w-full rounded-xl bg-gradient-golden py-3 text-sm font-semibold text-primary-foreground"
          >
            登录 / 注册
          </button>
        </div>
      ) : (
        <>
          {/* Subscription Card */}
          {!subLoading && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className={`mt-6 mx-6 rounded-2xl shadow-card p-4 transition-colors duration-300 ${
                plan === "premium"
                  ? "bg-gradient-to-br from-secondary/10 to-gold/10 border border-secondary/20"
                  : "bg-card"
              }`}
            >
              <div className="flex items-center gap-2 mb-3">
                <Crown className={`h-5 w-5 ${plan === "premium" ? "text-yellow-500" : "text-muted-foreground"}`} />
                <span className="text-sm font-semibold text-foreground">
                  {plan === "premium" ? "✨ 尊享会员" : "免费用户"}
                </span>
                {plan === "premium" && expiresAt && (
                  <span className="text-[10px] text-muted-foreground ml-auto">
                    到期：{new Date(expiresAt).toLocaleDateString("zh-CN")}
                  </span>
                )}
              </div>

              {/* Usage bars */}
              <div className="space-y-2.5 mb-3">
                <div>
                  <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
                    <span>今日对话</span>
                    <span>{chatCount}/{chatLimit}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-golden transition-all duration-500"
                      style={{ width: `${Math.min(100, (chatCount / chatLimit) * 100)}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
                    <span>今日测评</span>
                    <span>{assessmentCount}/{assessmentLimit}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-mystic transition-all duration-500"
                      style={{ width: `${Math.min(100, (assessmentCount / assessmentLimit) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              {plan !== "premium" && (
                <button
                  onClick={() => {/* TODO: payment integration */}}
                  className="w-full rounded-xl bg-gradient-golden py-2.5 text-xs font-semibold text-primary-foreground flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  升级为会员 · ¥19.9/月
                </button>
              )}
            </motion.div>
          )}

          {/* Premium Benefits Comparison (for free users) */}
          {!subLoading && plan !== "premium" && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-3 mx-6 rounded-2xl bg-card shadow-card p-4"
            >
              <h4 className="text-xs font-semibold text-foreground mb-2.5 flex items-center gap-1.5">
                <Crown className="h-3.5 w-3.5 text-secondary" />
                会员权益对比
              </h4>
              <div className="space-y-0">
                <div className="grid grid-cols-3 text-[10px] text-muted-foreground pb-1.5 border-b border-border">
                  <span>权益</span>
                  <span className="text-center">免费</span>
                  <span className="text-center text-secondary font-semibold">会员</span>
                </div>
                {premiumBenefits.map((b) => (
                  <div key={b.label} className="grid grid-cols-3 text-[11px] py-1.5 border-b border-border/50 last:border-0">
                    <span className="text-foreground">{b.label}</span>
                    <span className="text-center text-muted-foreground">{b.free}</span>
                    <span className="text-center text-secondary font-medium">{b.premium}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}


          <SoulUniverse fragments={fragments} unlockedIds={unlockedIds} />

          {/* Menu Grid */}
          <div className="mt-8 px-6">
            <div className="grid grid-cols-4 gap-3">
              {menuItems.map((item, i) => (
                <motion.button
                  key={item.label}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.15 + i * 0.05 }}
                  onClick={item.action}
                  className="relative flex flex-col items-center gap-1.5 rounded-2xl bg-card p-3.5 shadow-card transition-colors active:scale-95"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted/50">
                    <item.icon className="h-5 w-5 text-foreground/70" />
                  </div>
                  <span className="text-[11px] text-foreground/80">{item.label}</span>
                  {item.count !== undefined && item.count > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-secondary px-1 text-[9px] font-bold text-secondary-foreground">
                      {item.count}
                    </span>
                  )}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Purchase History */}
          {purchases.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mt-4 px-6"
            >
              <div className="rounded-2xl bg-card shadow-card p-4">
                <h4 className="text-xs font-semibold text-foreground mb-3 flex items-center gap-1.5">
                  <ShoppingBag className="h-3.5 w-3.5 text-muted-foreground" />
                  购买记录
                </h4>
                <div className="space-y-2">
                  {purchases.map((p) => (
                    <div key={p.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                      <div>
                        <p className="text-xs font-medium text-foreground">
                          {PRODUCT_LABELS[p.product_type] || p.product_type}
                        </p>
                        <p className="text-[10px] text-muted-foreground">{formatDate(p.created_at)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-semibold text-foreground">¥{(p.amount / 100).toFixed(2)}</p>
                        <p className={`text-[10px] ${p.status === "completed" ? "text-green-500" : "text-muted-foreground"}`}>
                          {p.status === "completed" ? "已完成" : p.status === "pending" ? "待支付" : p.status}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}


          {/* Logout */}
          <div className="mt-4 px-6">
            <button
              onClick={handleLogout}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-card py-3 text-sm text-destructive shadow-card"
            >
              <LogOut className="h-4 w-4" />
              退出登录
            </button>
          </div>
        </>
      )}

      <BottomNav />
    </div>
  );
};

export default Profile;
