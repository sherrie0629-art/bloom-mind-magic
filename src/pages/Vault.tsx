import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, BookOpen, Gem, Lock, Sparkles, Unlock, Mirror } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { agents as RAW_AGENTS, BOND_THRESHOLDS } from "@/data/agents";
import { localizeAgent } from "@/lib/localizeAgent";
import BottomNav from "@/components/BottomNav";
import DesktopLayout from "@/components/DesktopLayout";
import SEO from "@/components/SEO";
import SoulMirrorDialog from "@/components/SoulMirrorDialog";
import { useSoulMirror } from "@/hooks/useSoulMirror";

interface BondRow { agent_id: string; bond_level: number | null; total_turns: number | null; easter_eggs_found: string[] | null; }
interface BondInfo { level: number; turns: number; eggs: string[]; }

const Vault = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, promptLogin } = useAuth();
  const [tab, setTab] = useState<"lore" | "truth_shard">("lore");
  const [bonds, setBonds] = useState<Record<string, BondInfo>>({});
  const [loading, setLoading] = useState(true);

  const agents = RAW_AGENTS.map((a) => localizeAgent(a, t));

  const bondLabels = [
    t("home.bondLabels.stranger"),
    t("home.bondLabels.acquaintance"),
    t("home.bondLabels.trusted"),
    t("home.bondLabels.close"),
    t("home.bondLabels.soulbound"),
  ];

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("agent_bonds")
        .select("agent_id, bond_level, total_turns, easter_eggs_found")
        .eq("user_id", user.id);
      const map: Record<string, BondInfo> = {};
      ((data as BondRow[]) || []).forEach((b) => {
        map[b.agent_id] = {
          level: b.bond_level || 1,
          turns: b.total_turns || 0,
          eggs: (b.easter_eggs_found as string[]) || [],
        };
      });
      setBonds(map);
      setLoading(false);
    };
    load();
  }, [user]);

  const TABS = [
    { key: "lore" as const, label: t("vault.tabs.lore"), icon: BookOpen },
    { key: "truth_shard" as const, label: t("vault.tabs.truth"), icon: Gem },
  ];

  const getAgentGradient = (agentId: string) => {
    const gradients: Record<string, string> = {
      barista: "from-secondary to-gold",
      coach: "from-teal to-indigo",
      jax: "from-amber-600 to-orange-400",
      mentor: "from-indigo to-lavender",
      mystic: "from-indigo to-lavender",
      bestie: "from-rose-warm to-gold",
    };
    return gradients[agentId] || "from-secondary to-primary";
  };

  const getAgentEmoji = (agentId: string) =>
    agentId === "barista" ? "☕" : agentId === "jax" ? "🔥" : agentId === "mystic" ? "🔮" : "💖";

  if (!user) {
    promptLogin(t("auth.promptViewVault"));
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-calm p-6">
        <p className="text-muted-foreground text-sm">{t("auth.redirecting")}</p>
      </div>
    );
  }

  const renderLore = () => {
    const totalUnlocked = agents.reduce((sum, a) => {
      const lv = bonds[a.id]?.level || 0;
      return sum + a.lore.filter((l) => l.level <= lv).length;
    }, 0);

    if (totalUnlocked === 0) {
      return (
        <div className="py-16 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
            <BookOpen className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">{t("vault.empty")}</p>
          <p className="mt-1 text-xs text-muted-foreground/70">{t("vault.emptyHint")}</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <p className="text-xs text-muted-foreground/80 px-1">{t("vault.loreHint")}</p>
        {agents.map((agent, ai) => {
          const info = bonds[agent.id];
          const currentLevel = info?.level || 0;
          const turns = info?.turns || 0;
          const unlockedCount = agent.lore.filter((l) => l.level <= currentLevel).length;
          return (
            <motion.div
              key={agent.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: ai * 0.06 }}
              className="rounded-2xl border border-border bg-card p-4 shadow-card"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className={`shrink-0 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${getAgentGradient(agent.id)}`}>
                  <span className="text-lg">{getAgentEmoji(agent.id)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-foreground truncate">{agent.name}</h3>
                  <p className="text-[11px] text-muted-foreground truncate">{agent.title}</p>
                </div>
                <span className="shrink-0 text-xs font-semibold text-secondary">
                  {unlockedCount}/{agent.lore.length}
                </span>
              </div>
              <div className="space-y-2">
                {agent.lore.map((entry) => {
                  const isUnlocked = entry.level <= currentLevel;
                  const needTurns = BOND_THRESHOLDS[entry.level - 1] || 0;
                  return (
                    <div
                      key={entry.level}
                      className={`rounded-xl border p-3 ${isUnlocked ? "border-secondary/20 bg-card" : "border-border bg-muted/30"}`}
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${isUnlocked ? "bg-secondary/10 text-secondary" : "bg-muted text-muted-foreground"}`}>
                          {isUnlocked ? <Unlock className="h-2.5 w-2.5" /> : <Lock className="h-2.5 w-2.5" />}
                          {t("archive.lvLabel", { lv: entry.level, label: bondLabels[entry.level - 1] })}
                        </div>
                        {!isUnlocked && (
                          <span className="text-[10px] text-muted-foreground">
                            {t("archive.needTurns", { n: Math.max(needTurns - turns, 1) })}
                          </span>
                        )}
                      </div>
                      {isUnlocked ? (
                        <p className="text-xs leading-relaxed text-card-foreground italic">"{entry.text}"</p>
                      ) : (
                        <p className="text-xs text-muted-foreground/50">{t("archive.lockedQuote", { name: agent.name })}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          );
        })}
      </div>
    );
  };

  const renderTruthGallery = () => {
    const totalEggs = agents.reduce((sum, a) => sum + (bonds[a.id]?.eggs.length || 0), 0);
    return (
      <div className="space-y-4">
        {totalEggs === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-secondary/30 bg-gradient-to-br from-secondary/10 to-lavender/10 p-4"
          >
            <p className="text-xs leading-relaxed text-foreground/90">{t("vault.truthHint")}</p>
          </motion.div>
        )}
        <p className="text-xs text-muted-foreground/80 px-1">{t("vault.truthGallery.subtitle")}</p>
        {agents.map((agent, ai) => {
          const unlocked = bonds[agent.id]?.eggs || [];
          const total = agent.easterEggs.length;
          const cur = agent.easterEggs.filter((e) => unlocked.includes(e.trigger)).length;
          const isComplete = cur === total && total > 0;
          return (
            <motion.div
              key={agent.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: ai * 0.06 }}
              className={`rounded-2xl border p-4 shadow-card transition-all ${isComplete ? "bg-gradient-to-br from-gold/15 to-secondary/10 border-gold/40" : "bg-card border-border"}`}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className={`shrink-0 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${getAgentGradient(agent.id)} ${isComplete ? "ring-2 ring-gold ring-offset-2 ring-offset-card" : ""}`}>
                  <span className="text-lg">{getAgentEmoji(agent.id)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-foreground truncate">{agent.name}</h3>
                  <p className="text-[11px] text-muted-foreground truncate">{agent.title}</p>
                </div>
                <span className={`shrink-0 text-xs font-semibold ${isComplete ? "text-gold" : "text-muted-foreground"}`}>
                  {t("vault.truthGallery.progress", { cur, total })}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {agent.easterEggs.map((egg, i) => {
                  const isUnlocked = unlocked.includes(egg.trigger);
                  return (
                    <motion.div
                      key={egg.trigger}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: ai * 0.06 + i * 0.04 }}
                      className={`relative aspect-square rounded-xl flex flex-col items-center justify-center p-2 text-center overflow-hidden ${isUnlocked ? "bg-gradient-to-br from-gold/30 to-secondary/20 border border-gold/50 shadow-glow" : "bg-muted/40 border border-border/50"}`}
                    >
                      {isUnlocked ? (
                        <>
                          <Gem className="h-5 w-5 text-gold mb-1" />
                          <span className="text-[10px] font-medium text-foreground line-clamp-2 leading-tight">"{egg.trigger}"</span>
                        </>
                      ) : (
                        <>
                          <Lock className="h-4 w-4 text-muted-foreground/60 mb-1" />
                          <span className="text-[10px] text-muted-foreground/70 leading-tight">{t("vault.truthGallery.locked")}</span>
                        </>
                      )}
                    </motion.div>
                  );
                })}
              </div>
              {isComplete && (
                <p className="mt-3 text-[11px] text-gold font-medium text-center">{t("vault.truthGallery.complete")}</p>
              )}
            </motion.div>
          );
        })}

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: agents.length * 0.06 }}
          className="rounded-2xl border border-dashed border-secondary/40 bg-card/60 p-4"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="shrink-0 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo to-lavender">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-foreground">{t("vault.truthGallery.universe")}</h3>
              <p className="text-[11px] text-muted-foreground">{t("vault.truthGallery.universeHint")}</p>
            </div>
          </div>
          <div className="aspect-[3/1] rounded-xl bg-muted/40 border border-border/50 flex items-center justify-center">
            <Lock className="h-4 w-4 text-muted-foreground/60 mr-2" />
            <span className="text-xs text-muted-foreground/70">{t("vault.truthGallery.locked")}</span>
          </div>
        </motion.div>
      </div>
    );
  };

  return (
    <DesktopLayout>
      <div className="min-h-screen bg-gradient-calm pb-20 md:pb-8">
        <SEO title="Story Vault — Island AI" description="Access your collected story lore, truth shards, and memorable quotes from your journey with AI companions." />
        <div className="flex items-center gap-3 px-4 pt-12 pb-4">
          <button onClick={() => navigate(-1)} className="text-muted-foreground"><ArrowLeft className="h-5 w-5" /></button>
          <h1 className="font-display text-lg font-bold text-foreground">{t("vault.title")}</h1>
        </div>
        <div className="flex gap-2 px-4 mb-4">
          {TABS.map((tt) => (
            <button
              key={tt.key}
              onClick={() => setTab(tt.key)}
              className={`flex items-center gap-1.5 rounded-2xl px-3.5 py-2 text-xs font-medium transition-all active:scale-95 ${tab === tt.key ? "bg-secondary text-primary-foreground shadow-sm" : "bg-card text-muted-foreground border border-border"}`}
            >
              <tt.icon className="h-3.5 w-3.5" />
              {tt.label}
            </button>
          ))}
        </div>
        <div className="px-4 space-y-3">
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-16 text-center text-sm text-muted-foreground">
                {t("vault.loading")}
              </motion.div>
            ) : tab === "truth_shard" ? (
              <motion.div key="truth-gallery" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                {renderTruthGallery()}
              </motion.div>
            ) : (
              <motion.div key="lore" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                {renderLore()}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <BottomNav />
      </div>
    </DesktopLayout>
  );
};

export default Vault;
