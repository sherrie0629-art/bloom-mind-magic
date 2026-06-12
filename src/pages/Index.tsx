import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Heart, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import BottomNav from "@/components/BottomNav";
import DesktopLayout from "@/components/DesktopLayout";
import { agents as RAW_AGENTS } from "@/data/agents";
import { localizeAgent } from "@/lib/localizeAgent";
import SEO from "@/components/SEO";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const assessments = [
  { id: "mbti", path: "/assessment/mbti" },
  { id: "enneagram", path: "/assessment/enneagram" },
  { id: "zodiac", path: "/assessment/zodiac" },
  { id: "emotion", path: "/assessment/emotion" },
] as const;

const serif = "'DM Serif Display', serif";
const sans = "'Fira Sans', 'Inter', sans-serif";

const Index = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
  const [bondLevels, setBondLevels] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("agent_bonds")
        .select("agent_id, bond_level")
        .eq("user_id", user.id);
      if (data) {
        const levels: Record<string, number> = {};
        data.forEach((b) => {
          levels[b.agent_id] = b.bond_level;
        });
        setBondLevels(levels);
      }
    })();
  }, [user]);

  const agents = RAW_AGENTS.map((a) => localizeAgent(a, t));

  return (
    <DesktopLayout maxWidth="full">
      <SEO
        title="Island AI — Your AI Healing Space"
        description="Meet AI companions who listen without judgement. Explore personality assessments and build your soul map."
      />
      <div
        className="min-h-screen bg-[#0d0d0d] text-[#f0d78c] pb-24 md:pb-12"
        style={{ fontFamily: sans }}
      >
        <div className="mx-auto max-w-6xl p-4 md:p-10">
          <div className="grid grid-cols-1 md:grid-cols-12 md:grid-rows-[auto_auto_auto] gap-3 md:gap-4">
            {/* 品牌 Hero */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="md:col-span-8 md:row-span-2 relative overflow-hidden rounded-2xl md:rounded-3xl border border-[#c9a84c]/15 bg-[#1a1a1a] p-5 md:p-10 min-h-[200px] md:min-h-[280px] flex flex-col justify-between"
            >
              <div
                className="pointer-events-none absolute -top-32 -right-32 h-[420px] w-[420px] rounded-full opacity-50"
                style={{
                  background:
                    "radial-gradient(circle, rgba(201,168,76,0.25), transparent 65%)",
                }}
              />
              <div className="relative z-10">
                <h1
                  className="text-[#c9a84c] text-3xl md:text-6xl leading-[1.05] mb-3 md:mb-4"
                  style={{ fontFamily: serif }}
                >
                  Island AI
                  <span className="block md:inline md:ml-3 text-2xl md:text-5xl italic opacity-90">
                    · {t("home.appName")}
                  </span>
                </h1>
                <p className="text-sm md:text-lg text-[#f0d78c]/70 italic max-w-md leading-relaxed">
                  {t("home.tagline")}
                </p>
              </div>
              <div className="relative z-10 mt-6">
                <span className="text-[10px] uppercase tracking-[0.35em] text-[#c9a84c]/50">
                  ISLANDAI.LIFE · EST 2024
                </span>
              </div>
            </motion.div>

            {/* 每日塔罗 */}
            <motion.button
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              whileHover={{ y: -2 }}
              onClick={() => navigate("/daily-tarot")}
              className="md:col-span-4 group text-left rounded-2xl md:rounded-3xl border border-[#c9a84c]/15 bg-[#1a1a1a] p-4 md:p-6 hover:border-[#c9a84c]/45 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <h3
                  className="text-xl md:text-2xl text-[#c9a84c]"
                  style={{ fontFamily: serif }}
                >
                  {t("home.dailyTarot")}
                </h3>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#c9a84c]/30 text-[#c9a84c] group-hover:bg-[#c9a84c] group-hover:text-[#0d0d0d] transition-colors">
                  <ArrowRight className="h-4 w-4" />
                </span>
              </div>
              <p className="mt-2 text-xs text-[#f0d78c]/55">
                {t("home.dailyTarotDesc")}
              </p>
            </motion.button>

            {/* 缘分配对 */}
            <motion.button
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              whileHover={{ y: -2 }}
              onClick={() => navigate("/assessment/compatibility")}
              className="md:col-span-4 group text-left rounded-2xl md:rounded-3xl border border-[#c9a84c]/15 bg-gradient-to-br from-[#1a1a1a] to-[#141414] p-4 md:p-6 hover:border-[#c9a84c]/45 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <h3
                  className="text-xl md:text-2xl text-[#c9a84c]"
                  style={{ fontFamily: serif }}
                >
                  {t("home.chemistry")}
                </h3>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#c9a84c]/30 text-[#c9a84c] group-hover:bg-[#c9a84c] group-hover:text-[#0d0d0d] transition-colors">
                  <Heart className="h-4 w-4" />
                </span>
              </div>
              <p className="mt-2 text-xs text-[#f0d78c]/55">
                {t("home.chemistryDesc")}
              </p>
            </motion.button>

            {/* 自我探索 */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="md:col-span-6 rounded-2xl md:rounded-3xl border border-[#c9a84c]/15 bg-[#1a1a1a] p-4 md:p-7 flex flex-col"
            >
              <div className="mb-4 md:mb-5 flex items-center justify-between">
                <h2
                  className="text-xl md:text-3xl text-[#f0d78c]"
                  style={{ fontFamily: serif }}
                >
                  {t("home.selfDiscovery")}
                </h2>
                <button
                  onClick={() => navigate("/assessment")}
                  className="text-[10px] tracking-[0.3em] uppercase text-[#c9a84c]/60 hover:text-[#c9a84c] border-b border-[#c9a84c]/20 pb-1 transition-colors"
                >
                  ASSESSMENT
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3 flex-grow">
                {assessments.map((item, i) => (
                  <motion.button
                    key={item.id}
                    whileHover={{ y: -2 }}
                    onClick={() => navigate(item.path)}
                    className="group text-left rounded-2xl border border-[#c9a84c]/10 bg-[#0d0d0d] p-4 md:p-5 hover:bg-[#c9a84c]/[0.06] hover:border-[#c9a84c]/30 transition-colors"
                  >
                    <span className="block text-[10px] font-bold tracking-widest text-[#c9a84c] opacity-40 group-hover:opacity-100 transition-opacity">
                      0{i + 1}
                    </span>
                    <h4
                      className="mt-2 text-lg text-[#f0d78c]"
                      style={{ fontFamily: serif }}
                    >
                      {t(`home.tests.${item.id}.label`)}
                    </h4>
                    <p className="mt-1 text-[11px] text-[#f0d78c]/45">
                      {t(`home.tests.${item.id}.desc`)}
                    </p>
                  </motion.button>
                ))}
              </div>
            </motion.div>

            {/* 角色四宫格 */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="md:col-span-6"
            >
              <div className="mb-4 flex items-center justify-between px-1">
                <h2
                  className="text-2xl md:text-3xl text-[#f0d78c]"
                  style={{ fontFamily: serif }}
                >
                  {t("home.yourCircle")}
                </h2>
                <button
                  onClick={() => navigate("/archive")}
                  className="text-[10px] tracking-[0.3em] uppercase text-[#c9a84c]/60 hover:text-[#c9a84c] border-b border-[#c9a84c]/20 pb-1 transition-colors"
                >
                  ARCHIVE
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {agents.map((agent) => {
                  const lv = bondLevels[agent.id] || 0;
                  return (
                    <motion.button
                      key={agent.id}
                      whileHover={{ y: -2 }}
                      onClick={() => navigate(`/chat?agent=${agent.id}`)}
                      className="group relative text-left rounded-3xl border border-[#c9a84c]/15 bg-[#1a1a1a] p-3 md:p-4 hover:border-[#c9a84c]/45 hover:bg-[#c9a84c]/[0.04] transition-all"
                    >
                      <div className="relative mb-3 aspect-square overflow-hidden rounded-2xl border border-[#c9a84c]/10">
                        <img
                          src={agent.image}
                          alt={agent.name}
                          loading="lazy"
                          className="h-full w-full object-cover transition-all duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0d0d0d]/70 via-transparent to-transparent" />
                      </div>
                      <div className="flex items-end justify-between gap-2">
                        <div>
                          <h4
                            className="text-lg text-[#c9a84c] leading-tight"
                            style={{ fontFamily: serif }}
                          >
                            {agent.name}
                          </h4>
                          <p className="mt-0.5 text-[10px] uppercase tracking-[0.2em] text-[#f0d78c]/45">
                            {agent.title}
                          </p>
                        </div>
                        {lv > 0 && (
                          <span className="shrink-0 text-[9px] tracking-widest text-[#c9a84c]/70">
                            {"·".repeat(Math.min(lv, 5))}
                          </span>
                        )}
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>

            {/* 秘密提示横幅 */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="md:col-span-12 rounded-3xl border border-[#c9a84c]/15 border-l-4 border-l-[#c9a84c] bg-gradient-to-r from-[#1a1a1a] to-[#0d0d0d] p-5 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="flex items-start md:items-center gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#c9a84c]/30 text-[#c9a84c]">
                  <Lock className="h-4 w-4" />
                </span>
                <div>
                  <p
                    className="text-base md:text-lg text-[#f0d78c]"
                    style={{ fontFamily: serif }}
                  >
                    {t("home.secretsHint")}
                  </p>
                  <p className="mt-1 text-xs text-[#f0d78c]/55 leading-relaxed max-w-2xl">
                    {t("home.secretsDesc")}
                  </p>
                </div>
              </div>
              <button
                onClick={() => navigate("/archive")}
                className="self-start md:self-auto shrink-0 px-7 py-2.5 rounded-full border border-[#c9a84c]/40 text-[#c9a84c] text-[10px] font-bold tracking-[0.3em] uppercase hover:bg-[#c9a84c] hover:text-[#0d0d0d] transition-colors"
              >
                进入档案
              </button>
            </motion.div>
          </div>
        </div>

        <BottomNav />
      </div>
    </DesktopLayout>
  );
};

export default Index;
