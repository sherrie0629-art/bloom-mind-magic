import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Sparkles, Heart, Brain, Lock, Unlock, Stars, Flame, Target } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
const heroBg = "/hero-bg.webp";
import AgentCard from "@/components/AgentCard";
import BottomNav from "@/components/BottomNav";
import DesktopLayout from "@/components/DesktopLayout";
import { agents as RAW_AGENTS } from "@/data/agents";
import { localizeAgent } from "@/lib/localizeAgent";
import SEO from "@/components/SEO";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const assessments = [
  { id: "mbti", icon: Brain, gradient: "from-indigo to-indigo-light", path: "/assessment/mbti" },
  { id: "enneagram", icon: Target, gradient: "from-secondary to-gold", path: "/assessment/enneagram" },
  { id: "zodiac", icon: Stars, gradient: "from-lavender to-rose-warm", path: "/assessment/zodiac" },
  { id: "emotion", icon: Flame, gradient: "from-rose-warm to-gold", path: "/assessment/emotion" },
] as const;

const Index = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
  const [bondLevels, setBondLevels] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase.from("agent_bonds").select("agent_id, bond_level").eq("user_id", user.id);
      if (data) {
        const levels: Record<string, number> = {};
        data.forEach((b) => { levels[b.agent_id] = b.bond_level; });
        setBondLevels(levels);
      }
    };
    load();
  }, [user]);

  const bondLabels = [
    t("home.bondLabels.stranger"),
    t("home.bondLabels.acquaintance"),
    t("home.bondLabels.trusted"),
    t("home.bondLabels.close"),
    t("home.bondLabels.soulbound"),
  ];

  const agents = RAW_AGENTS.map((a) => localizeAgent(a, t));

  return (
    <DesktopLayout maxWidth="4xl">
      <div className="min-h-screen bg-gradient-calm pb-20 md:pb-8">
        <SEO title="Island AI — Your AI Healing Space" description="Meet AI companions who listen without judgement. Explore personality assessments and build your soul map." />
        <div className="relative overflow-hidden">
          <img src={heroBg} alt="" loading="eager" fetchPriority="high" decoding="async" className="absolute inset-0 h-full w-full object-cover opacity-60" />
          <div className="relative px-6 pb-10 pt-14 md:pt-10 text-center md:text-left md:flex md:items-center md:gap-8 md:px-8 md:py-12">
            <div className="md:flex-1">
              <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="font-display text-2xl md:text-3xl font-bold text-foreground">
                {t("home.appName")}
              </motion.h1>
              <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mt-2 text-sm md:text-base text-muted-foreground">
                {t("home.tagline")}
              </motion.p>
            </div>
          </div>
        </div>

        <div className="px-6 md:px-8 mt-3">
          <div className="grid grid-cols-2 gap-2.5">
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} whileTap={{ scale: 0.98 }} onClick={() => navigate("/daily-tarot")} className="cursor-pointer rounded-2xl bg-card p-3 md:p-4 shadow-card border border-secondary/10">
              <div className="flex flex-col items-center gap-1.5 text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-mystic"><Sparkles className="h-5 w-5 text-primary-foreground" /></div>
                <p className="text-[11px] md:text-xs font-semibold text-foreground">{t("home.dailyTarot")}</p>
                <p className="text-[9px] md:text-[11px] text-muted-foreground leading-tight">{t("home.dailyTarotDesc")}</p>
              </div>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }} whileTap={{ scale: 0.98 }} onClick={() => navigate("/assessment/compatibility")} className="cursor-pointer rounded-2xl bg-card p-3 md:p-4 shadow-card border border-rose-warm/10">
              <div className="flex flex-col items-center gap-1.5 text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-rose-warm to-secondary"><Heart className="h-5 w-5 text-primary-foreground" /></div>
                <p className="text-[11px] md:text-xs font-semibold text-foreground">{t("home.chemistry")}</p>
                <p className="text-[9px] md:text-[11px] text-muted-foreground leading-tight">{t("home.chemistryDesc")}</p>
              </div>
            </motion.div>
          </div>
        </div>

        <div className="mt-6 px-6 md:px-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-base font-semibold text-foreground">{t("home.selfDiscovery")}</h2>
            <button onClick={() => navigate("/assessment")} className="text-xs text-secondary">{t("home.allQuizzes")}</button>
          </div>
          <div className="grid grid-cols-4 gap-2.5">
            {assessments.map((item, i) => (
              <motion.button key={item.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.05 }} whileTap={{ scale: 0.95 }} onClick={() => navigate(item.path)} className="flex flex-col items-center gap-1.5 rounded-2xl bg-card p-3 shadow-card">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${item.gradient}`}><item.icon className="h-5 w-5 text-primary-foreground" /></div>
                <span className="text-[11px] font-semibold text-foreground">{t(`home.tests.${item.id}.label`)}</span>
                <span className="text-[9px] text-muted-foreground leading-none">{t(`home.tests.${item.id}.desc`)}</span>
              </motion.button>
            ))}
          </div>
        </div>

        <div className="mt-6 px-6 md:px-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-base font-semibold text-foreground">{t("home.yourCircle")}</h2>
            <button onClick={() => navigate("/archive")} className="text-xs text-secondary">{t("home.archiveLink")}</button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {agents.map((agent, i) => (
              <motion.div key={agent.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.08 }}>
                <AgentCard {...agent} bondLevel={bondLevels[agent.id]} />
              </motion.div>
            ))}
          </div>
        </div>

        <div className="mt-4 px-6 md:px-8">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="rounded-2xl border border-secondary/20 bg-card/80 backdrop-blur-sm p-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 shrink-0 rounded-xl bg-secondary/10 p-2"><Lock className="h-4 w-4 text-secondary" /></div>
              <div>
                <p className="text-xs font-semibold text-foreground">{t("home.secretsHint")}</p>
                <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{t("home.secretsDesc")}</p>
                {Object.keys(bondLevels).length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {agents.map((a) => {
                      const lv = bondLevels[a.id] || 1;
                      return (
                        <span key={a.id} className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                          {a.name}
                          <span className="text-secondary">{bondLabels[lv - 1]}</span>
                          {lv < 5 ? <Lock className="h-2.5 w-2.5" /> : <Unlock className="h-2.5 w-2.5 text-secondary" />}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>

        <BottomNav />
      </div>
    </DesktopLayout>
  );
};

export default Index;
