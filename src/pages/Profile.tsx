import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Settings, Star, Bell, LogOut, Heart, Shield, Gem } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import DesktopLayout from "@/components/DesktopLayout";
import SoulUniverse from "@/components/SoulUniverse";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "@/hooks/useSubscription";
import { useAchievements } from "@/hooks/useAchievements";
import SEO from "@/components/SEO";

const Profile = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<{ display_name: string | null } | null>(null);
  const [stats, setStats] = useState({ conversations: 0, assessments: 0, days: 0 });
  const [fragments, setFragments] = useState<Array<{ id: string; name: string; icon: string; color: string }>>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const { chatCount, assessmentCount } = useSubscription(user?.id, user?.created_at);
  const { unlockedIds } = useAchievements(user?.id);

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

  const menuItems = [
    { icon: Star, label: t("profile.menu.reports"), count: stats.assessments, action: () => navigate("/assessment-reports") },
    { icon: Gem, label: t("profile.menu.vault"), action: () => navigate("/vault") },
    { icon: Heart, label: t("profile.menu.chemistry"), action: () => navigate("/compatibility-reports") },
    { icon: Bell, label: t("profile.menu.notifications"), action: () => {} },
    { icon: Settings, label: t("profile.menu.settings"), action: () => navigate("/settings") },
    ...(isAdmin ? [{ icon: Shield, label: t("profile.menu.admin"), action: () => navigate("/admin") }] : []),
  ];

  const handleLogout = async () => { await signOut(); navigate("/"); };

  return (
    <DesktopLayout>
      <div className="min-h-screen bg-gradient-calm pb-24 md:pb-8">
        <SEO title="Profile — Island AI" description="View your Island AI profile, chat stats, achievements, and collected soul fragments." />
        <div className="px-6 pt-14 md:pt-10 text-center">
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="mx-auto h-20 w-20 rounded-full bg-gradient-mystic p-0.5">
            <div className="flex h-full w-full items-center justify-center rounded-full bg-card">
              <span className="font-display text-2xl text-foreground">🌙</span>
            </div>
          </motion.div>
          <motion.h2 initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mt-3 font-display text-lg font-semibold text-foreground">
            {profile?.display_name || (user ? user.email?.split("@")[0] : t("profile.traveler"))}
          </motion.h2>
          <p className="text-xs text-muted-foreground">
            {user ? t("profile.dayOf", { n: stats.days }) : t("auth.signInToBegin")}
          </p>
        </div>

        {!user ? (
          <div className="mt-8 px-6">
            <button onClick={() => navigate("/auth")} className="w-full rounded-xl bg-gradient-golden py-3 text-sm font-semibold text-primary-foreground">
              {t("auth.signInUp")}
            </button>
          </div>
        ) : (
          <>
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mt-6 mx-6 rounded-2xl bg-card shadow-card p-4">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <div className="text-lg font-display font-semibold text-foreground">{stats.conversations}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">{t("profile.menu.reports")}</div>
                </div>
                <div>
                  <div className="text-lg font-display font-semibold text-foreground">{chatCount}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">{t("profile.todaysChats")}</div>
                </div>
                <div>
                  <div className="text-lg font-display font-semibold text-foreground">{assessmentCount}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">{t("profile.todaysQuizzes")}</div>
                </div>
              </div>
            </motion.div>

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
                <LogOut className="h-4 w-4" /> {t("auth.signOut")}
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
