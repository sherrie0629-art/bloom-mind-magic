import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, BookOpen, Sparkles, Gem, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { agents } from "@/data/agents";
import BottomNav from "@/components/BottomNav";
import DesktopLayout from "@/components/DesktopLayout";
import SEO from "@/components/SEO";

interface VaultItem { id: string; agent_id: string; type: string; title: string; content: string; icon: string; unlocked_at: string; }
interface BondRow { agent_id: string; easter_eggs_found: string[] | null; }

const Vault = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, promptLogin } = useAuth();
  const [tab, setTab] = useState("lore");
  const [items, setItems] = useState<VaultItem[]>([]);
  const [bonds, setBonds] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);
      const [vaultRes, bondRes] = await Promise.all([
        supabase.from("story_vault").select("*").eq("user_id", user.id).order("unlocked_at", { ascending: false }),
        supabase.from("agent_bonds").select("agent_id, easter_eggs_found").eq("user_id", user.id),
      ]);
      setItems((vaultRes.data as VaultItem[]) || []);
      const map: Record<string, string[]> = {};
      ((bondRes.data as BondRow[]) || []).forEach((b) => {
        map[b.agent_id] = (b.easter_eggs_found as string[]) || [];
      });
      setBonds(map);
      setLoading(false);
    };
    load();
  }, [user]);

  const TABS = [
    { key: "lore", label: t("vault.tabs.lore"), icon: BookOpen },
    { key: "truth_shard", label: t("vault.tabs.truth"), icon: Gem },
    { key: "quote", label: t("vault.tabs.quote"), icon: Sparkles },
  ];

  const filtered = items.filter((i) => i.type === tab);
  const getAgentName = (agentId: string) => agents.find((a) => a.id === agentId)?.name || agentId;
  const getAgentGradient = (agentId: string) => {
    const gradients: Record<string, string> = { barista: "from-secondary to-gold", coach: "from-teal to-indigo", jax: "from-amber-600 to-orange-400", mentor: "from-indigo to-lavender", mystic: "from-indigo to-lavender", bestie: "from-rose-warm to-gold" };
    return gradients[agentId] || "from-secondary to-primary";
  };

  if (!user) {
    promptLogin(t("auth.promptViewVault"));
    return (<div className="flex min-h-screen flex-col items-center justify-center bg-gradient-calm p-6"><p className="text-muted-foreground text-sm">{t("auth.redirecting")}</p></div>);
  }

  const renderTruthGallery = () => (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground/80 px-1">{t("vault.truthGallery.subtitle")}</p>
      {agents.map((agent, ai) => {
        const unlocked = bonds[agent.id] || [];
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
                <span className="text-lg">{agent.id === "barista" ? "☕" : agent.id === "jax" ? "🔥" : agent.id === "mystic" ? "🔮" : "💖"}</span>
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

      {/* Universe slot */}
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

  return (
    <DesktopLayout>
    <div className="min-h-screen bg-gradient-calm pb-20 md:pb-8">
      <div className="flex items-center gap-3 px-4 pt-12 pb-4"><button onClick={() => navigate(-1)} className="text-muted-foreground"><ArrowLeft className="h-5 w-5" /></button><h1 className="font-display text-lg font-bold text-foreground">{t("vault.title")}</h1></div>
      <div className="flex gap-2 px-4 mb-4">{TABS.map((tt) => (<button key={tt.key} onClick={() => setTab(tt.key)} className={`flex items-center gap-1.5 rounded-2xl px-3.5 py-2 text-xs font-medium transition-all active:scale-95 ${tab === tt.key ? "bg-secondary text-primary-foreground shadow-sm" : "bg-card text-muted-foreground border border-border"}`}><tt.icon className="h-3.5 w-3.5" />{tt.label}</button>))}</div>
      <div className="px-4 space-y-3">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-16 text-center text-sm text-muted-foreground">{t("vault.loading")}</motion.div>
          ) : tab === "truth_shard" ? (
            <motion.div key="truth-gallery" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {renderTruthGallery()}
            </motion.div>
          ) : filtered.length === 0 ? (
            <motion.div key="empty" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="py-16 text-center"><div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted"><Gem className="h-6 w-6 text-muted-foreground" /></div><p className="text-sm text-muted-foreground">{t("vault.empty")}</p><p className="mt-1 text-xs text-muted-foreground/70">{t("vault.emptyHint")}</p></motion.div>
          ) : (
            <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">
              {filtered.map((item, i) => (<motion.div key={item.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} className="rounded-2xl bg-card border border-border p-4 shadow-card">
                <div className="flex items-start gap-3">
                  <div className={`shrink-0 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${getAgentGradient(item.agent_id)}`}><span className="text-lg">{item.icon}</span></div>
                  <div className="flex-1 min-w-0"><div className="flex items-center gap-2"><h3 className="text-sm font-semibold text-foreground truncate">{item.title}</h3><span className="shrink-0 text-[10px] text-muted-foreground/60">{getAgentName(item.agent_id)}</span></div><p className="mt-1 text-xs text-muted-foreground leading-relaxed">{item.content}</p><p className="mt-2 text-[10px] text-muted-foreground/50">{new Date(item.unlocked_at).toLocaleDateString()}</p></div>
                </div>
              </motion.div>))}
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
