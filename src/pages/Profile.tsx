import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Settings, ChevronRight, BookOpen, Star, Bell, LogOut, Crown, Heart, Sparkles, FileText, ShoppingBag, Shield, Gem } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import DesktopLayout from "@/components/DesktopLayout";
import SoulUniverse from "@/components/SoulUniverse";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "@/hooks/useSubscription";
import { useAchievements } from "@/hooks/useAchievements";
import { toast } from "sonner";
import SEO from "@/components/SEO";

// TODO: Replace with your actual Lemon Squeezy checkout URLs
const LS_MONTHLY_URL = "https://sherrie.lemonsqueezy.com/checkout/buy/3d9841b4-e58e-43c1-a0a7-31608ef980fd";
const LS_YEARLY_URL = "https://sherrie.lemonsqueezy.com/checkout/buy/cea09e6c-699d-43be-aad0-6561f6624654";

const Profile = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<{ display_name: string | null } | null>(null);
  const [stats, setStats] = useState({ conversations: 0, assessments: 0, days: 0 });
  const [fragments, setFragments] = useState<Array<{ id: string; name: string; icon: string; color: string }>>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [billingToggle, setBillingToggle] = useState<"monthly" | "yearly">("monthly");
  const { plan, chatCount, chatLimit, assessmentCount, assessmentLimit, deepReportCount, deepReportLimit, expiresAt, freeTrialExpired, freeTrialDaysLeft, isLoading: subLoading, refresh } = useSubscription(user?.id, user?.created_at);
  const { unlockedIds } = useAchievements(user?.id);

  // Initialize Lemon Squeezy + listen for checkout success
  useEffect(() => {
    if (typeof window !== "undefined" && window.createLemonSqueezy) {
      window.createLemonSqueezy();
    }

    const handler = (event: any) => {
      if (event?.event === "Checkout.Success") {
        toast.success("Upgrade successful! 🎉");
        // Give webhook a moment to process, then refresh
        setTimeout(() => refresh(), 3000);
      }
    };

    if (window.LemonSqueezy) {
      window.LemonSqueezy.Setup({ eventHandler: handler });
    }
  }, [refresh]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [profileRes, convRes, assessRes, fragRes] = await Promise.all([
        supabase.from("profiles").select("display_name").eq("user_id", user.id).single(),
        supabase.from("conversations").select("*", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("assessment_results").select("*", { count: "exact", head: true }).eq("user_id", user.id),
        (supabase as any).from("soul_fragments").select("id, name, icon, color").eq("user_id", user.id).order("created_at", { ascending: false }),
      ]);
      setProfile(profileRes.data);
      const daysSinceJoin = Math.max(1, Math.ceil((Date.now() - new Date(user.created_at).getTime()) / 86400000));
      setStats({ conversations: convRes.count || 0, assessments: assessRes.count || 0, days: daysSinceJoin });
      setFragments(fragRes.data || []);
      supabase.rpc("has_role", { _user_id: user.id, _role: "admin" }).then(({ data }) => { if (data) setIsAdmin(true); });
    };
    load();
  }, [user]);

  const openCheckout = useCallback(() => {
    if (!user) return;
    const baseUrl = billingToggle === "yearly" ? LS_YEARLY_URL : LS_MONTHLY_URL;
    const url = `${baseUrl}?checkout[custom][user_id]=${user.id}&checkout[email]=${encodeURIComponent(user.email || "")}`;
    
    if (window.LemonSqueezy) {
      window.LemonSqueezy.Url.Open(url);
    } else {
      // Fallback: open in new tab
      window.open(url, "_blank");
    }
  }, [user, billingToggle]);

  const menuItems = [
    { icon: Star, label: "Reports", count: stats.assessments, action: () => navigate("/assessment-reports") },
    { icon: Gem, label: "Vault", action: () => navigate("/vault") },
    { icon: Heart, label: "Chemistry", action: () => navigate("/compatibility-reports") },
    { icon: Bell, label: "Notifications", action: () => {} },
    { icon: Settings, label: "Settings", action: () => {} },
    ...(isAdmin ? [{ icon: Shield, label: "Admin", action: () => navigate("/admin") }] : []),
  ];

  const handleLogout = async () => { await signOut(); navigate("/"); };

  const plusBenefits = [
    { label: "Daily Chats", free: "20", plus: "Unlimited" },
    { label: "Daily Quizzes", free: "5", plus: "Unlimited" },
    { label: "Deep Reports", free: "—", plus: "1/day" },
  ];

  return (
    <DesktopLayout>
      <div className="min-h-screen bg-gradient-calm pb-24 md:pb-8">
        <SEO title="Profile — Soul Sanctuary" description="Manage your Soul Sanctuary profile and preferences." />
        <div className="px-6 pt-14 md:pt-10 text-center">
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="mx-auto h-20 w-20 rounded-full bg-gradient-mystic p-0.5">
            <div className="flex h-full w-full items-center justify-center rounded-full bg-card">
              <span className="font-display text-2xl text-foreground">{subLoading ? "🌙" : plan === "plus" ? "👑" : "🌙"}</span>
            </div>
          </motion.div>
          <motion.h2 initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mt-3 font-display text-lg font-semibold text-foreground">
            {profile?.display_name || (user ? user.email?.split("@")[0] : "Traveler")}
          </motion.h2>
          <p className="text-xs text-muted-foreground">
            {user ? `Day ${stats.days} of your inner journey ✨` : "Sign in to begin your journey"}
          </p>
        </div>

        {!user ? (
          <div className="mt-8 px-6">
            <button onClick={() => navigate("/auth")} className="w-full rounded-xl bg-gradient-golden py-3 text-sm font-semibold text-primary-foreground">
              Sign In / Sign Up
            </button>
          </div>
        ) : (
          <>
            {!subLoading && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                className={`mt-6 mx-6 rounded-2xl shadow-card p-4 transition-colors duration-300 ${plan === "plus" ? "bg-gradient-to-br from-secondary/10 to-gold/10 border border-secondary/20" : "bg-card"}`}>
                <div className="flex items-center gap-2 mb-3">
                  <Crown className={`h-5 w-5 ${plan === "plus" ? "text-yellow-500" : "text-muted-foreground"}`} />
                  <span className="text-sm font-semibold text-foreground">{plan === "plus" ? "✨ Plus" : "Free Plan"}</span>
                  {plan === "plus" && expiresAt && <span className="text-[10px] text-muted-foreground ml-auto">Expires: {new Date(expiresAt).toLocaleDateString()}</span>}
                </div>
                {plan === "free" && (
                  freeTrialExpired ? (
                    <div className="mb-3 rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-xs text-destructive font-medium text-center">
                      🚫 Free trial ended. Upgrade to Plus to continue.
                    </div>
                  ) : (
                    <div className="mb-3 rounded-lg bg-secondary/10 border border-secondary/20 px-3 py-2 text-xs text-secondary font-medium text-center">
                      🎁 Free trial: {freeTrialDaysLeft} days left
                    </div>
                  )
                )}
                <div className="space-y-2.5 mb-3">
                  <div>
                    <div className="flex justify-between text-[11px] text-muted-foreground mb-1"><span>Today's Chats</span><span>{chatCount}/{plan === "plus" ? "∞" : chatLimit}</span></div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full bg-gradient-golden transition-all duration-500" style={{ width: plan === "plus" ? "100%" : `${Math.min(100, (chatCount / chatLimit) * 100)}%` }} /></div>
                  </div>
                  <div>
                    <div className="flex justify-between text-[11px] text-muted-foreground mb-1"><span>Today's Quizzes</span><span>{assessmentCount}/{plan === "plus" ? "∞" : assessmentLimit}</span></div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full bg-gradient-mystic transition-all duration-500" style={{ width: plan === "plus" ? "100%" : `${Math.min(100, (assessmentCount / assessmentLimit) * 100)}%` }} /></div>
                  </div>
                  {plan === "plus" && (
                    <div>
                      <div className="flex justify-between text-[11px] text-muted-foreground mb-1"><span>Today's Deep Reports</span><span>{deepReportCount}/{deepReportLimit}</span></div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-secondary to-gold transition-all duration-500" style={{ width: `${Math.min(100, (deepReportCount / deepReportLimit) * 100)}%` }} /></div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {!subLoading && plan !== "plus" && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mt-3 mx-6 rounded-2xl bg-card shadow-card p-4">
                <h4 className="text-xs font-semibold text-foreground mb-2.5 flex items-center gap-1.5"><Crown className="h-3.5 w-3.5 text-secondary" /> Why Plus?</h4>
                
                <div className="space-y-0">
                  <div className="grid grid-cols-3 text-[10px] text-muted-foreground pb-1.5 border-b border-border"><span>Benefit</span><span className="text-center">Free</span><span className="text-center text-secondary font-semibold">Plus</span></div>
                  {plusBenefits.map((b) => (
                    <div key={b.label} className="grid grid-cols-3 text-[11px] py-1.5 border-b border-border/50 last:border-0">
                      <span className="text-foreground">{b.label}</span><span className="text-center text-muted-foreground">{b.free}</span><span className="text-center text-secondary font-medium">{b.plus}</span>
                    </div>
                  ))}
                </div>

                {/* Billing toggle */}
                <div className="flex items-center justify-center gap-2 mt-4 mb-2">
                  <button
                    onClick={() => setBillingToggle("monthly")}
                    className={`rounded-full px-3 py-1 text-[11px] font-medium transition-colors ${billingToggle === "monthly" ? "bg-secondary text-secondary-foreground" : "bg-muted text-muted-foreground"}`}
                  >
                    Monthly
                  </button>
                  <button
                    onClick={() => setBillingToggle("yearly")}
                    className={`rounded-full px-3 py-1 text-[11px] font-medium transition-colors ${billingToggle === "yearly" ? "bg-secondary text-secondary-foreground" : "bg-muted text-muted-foreground"}`}
                  >
                    Yearly · Save 20%
                  </button>
                </div>

                <button onClick={openCheckout} className="w-full rounded-xl bg-gradient-golden py-2.5 text-xs font-semibold text-primary-foreground flex items-center justify-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" />
                  {billingToggle === "monthly" ? "Get Plus · $4.99/mo" : "Get Plus · $47.99/yr"}
                </button>
              </motion.div>
            )}

            <SoulUniverse fragments={fragments} unlockedIds={unlockedIds} />

            <div className="mt-8 px-6">
              <div className="grid grid-cols-4 md:grid-cols-6 gap-3">
                {menuItems.map((item, i) => (
                  <motion.button key={item.label} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.15 + i * 0.05 }}
                    onClick={item.action} className="relative flex flex-col items-center gap-1.5 rounded-2xl bg-card p-3.5 shadow-card transition-colors active:scale-95">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted/50"><item.icon className="h-5 w-5 text-foreground/70" /></div>
                    <span className="text-[11px] text-foreground/80">{item.label}</span>
                    {item.count !== undefined && item.count > 0 && (
                      <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-secondary px-1 text-[9px] font-bold text-secondary-foreground">{item.count}</span>
                    )}
                  </motion.button>
                ))}
              </div>
            </div>

            <div className="mt-4 px-6">
              <button onClick={handleLogout} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-card py-3 text-sm text-destructive shadow-card">
                <LogOut className="h-4 w-4" /> Sign Out
              </button>
            </div>
          </>
        )}
        <BottomNav />
      </div>
    </DesktopLayout>
  );
};

export default Profile;
