import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Lock, Unlock, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import BottomNav from "@/components/BottomNav";
import DesktopLayout from "@/components/DesktopLayout";
import { agents, BOND_THRESHOLDS } from "@/data/agents";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface BondData { agent_id: string; bond_level: number; total_turns: number; easter_eggs_found: string[]; }

const AgentArchive = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
  const [bonds, setBonds] = useState<Record<string, BondData>>({});
  const [selectedAgent, setSelectedAgent] = useState<string>(agents[0].id);

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
      const { data } = await supabase.from("agent_bonds").select("agent_id, bond_level, total_turns, easter_eggs_found").eq("user_id", user.id);
      if (data) { const map: Record<string, BondData> = {}; data.forEach((b) => { map[b.agent_id] = { agent_id: b.agent_id, bond_level: b.bond_level, total_turns: b.total_turns, easter_eggs_found: (b.easter_eggs_found as string[]) || [] }; }); setBonds(map); }
    };
    load();
  }, [user]);

  const agent = agents.find((a) => a.id === selectedAgent) || agents[0];
  const bond = bonds[selectedAgent];
  const currentLevel = bond?.bond_level || 1;
  const totalTurns = bond?.total_turns || 0;
  const eggsFound = bond?.easter_eggs_found || [];
  const nextThreshold = BOND_THRESHOLDS[currentLevel] || null;
  const prevThreshold = BOND_THRESHOLDS[currentLevel - 1] || 0;
  const progressInLevel = nextThreshold ? ((totalTurns - prevThreshold) / (nextThreshold - prevThreshold)) * 100 : 100;

  if (!user) {
    return (<DesktopLayout><div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 pb-20">
      <p className="text-muted-foreground text-sm">{t("archive.needSignIn")}</p>
      <button onClick={() => navigate("/auth")} className="mt-3 text-sm text-secondary underline">{t("archive.signInBtn")}</button>
      <BottomNav />
    </div></DesktopLayout>);
  }

  return (
    <DesktopLayout>
    <div className="min-h-screen bg-background pb-20 md:pb-8">
      <div className="flex items-center gap-3 border-b border-border bg-card/80 backdrop-blur-xl px-4 py-3">
        <button onClick={() => navigate(-1)} className="text-muted-foreground"><ArrowLeft className="h-5 w-5" /></button>
        <h1 className="font-display text-base font-semibold text-foreground">{t("archive.title")}</h1>
      </div>
      <div className="flex gap-2 overflow-x-auto px-4 py-4 scrollbar-hide">
        {agents.map((a) => { const isSelected = a.id === selectedAgent; const lv = bonds[a.id]?.bond_level || 1; return (
          <button key={a.id} onClick={() => setSelectedAgent(a.id)} className={`flex shrink-0 flex-col items-center gap-1.5 rounded-2xl p-3 transition-all ${isSelected ? "bg-primary/10 ring-1 ring-primary/30" : "bg-card shadow-card"}`}>
            <div className={`h-14 w-14 overflow-hidden rounded-xl ${a.gradient} p-0.5`}><img src={a.image} alt={a.name} className="h-full w-full rounded-[10px] object-cover bg-card" /></div>
            <span className="text-[11px] font-medium text-foreground">{a.name}</span>
            <span className="text-[9px] text-secondary">{"⭐".repeat(Math.min(lv, 5))}</span>
          </button>);
        })}
      </div>
      <div className="px-4">
        <div className="rounded-2xl bg-card p-4 shadow-card">
          <div className="flex items-center justify-between">
            <div><h2 className="font-display text-lg font-semibold text-foreground">{agent.name}</h2><p className="text-xs text-muted-foreground">{agent.title}</p></div>
            <div className="text-right"><p className="text-sm font-semibold text-secondary">{bondLabels[currentLevel - 1]}</p><p className="text-[10px] text-muted-foreground">{t("archive.conversations", { n: totalTurns })}</p></div>
          </div>
          {nextThreshold && (<div className="mt-3">
            <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1"><span>{bondLabels[currentLevel - 1]}</span><span>{t("archive.next", { label: bondLabels[currentLevel], n: nextThreshold })}</span></div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden"><motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(progressInLevel, 100)}%` }} transition={{ duration: 0.8, ease: "easeOut" }} className="h-full rounded-full bg-gradient-golden" /></div>
          </div>)}
          {!nextThreshold && currentLevel >= 5 && (<p className="mt-3 text-[11px] text-secondary flex items-center gap-1"><Sparkles className="h-3 w-3" /> {t("archive.maxBond")}</p>)}
        </div>
      </div>
      <div className="mt-6 px-4">
        <h3 className="mb-3 font-display text-sm font-semibold text-foreground flex items-center gap-2">{t("archive.storyFragments")} <span className="text-[10px] font-normal text-muted-foreground">{t("archive.unlocked", { cur: currentLevel, total: 5 })}</span></h3>
        <div className="space-y-3">
          {agent.lore.map((loreEntry, index) => { const isUnlocked = index + 1 <= currentLevel; return (
            <motion.div key={loreEntry.level} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.08 }} className={`rounded-2xl border p-4 transition-all ${isUnlocked ? "border-secondary/20 bg-card shadow-card" : "border-border bg-muted/30"}`}>
              <div className="flex items-center gap-2 mb-2">
                <div className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${isUnlocked ? "bg-secondary/10 text-secondary" : "bg-muted text-muted-foreground"}`}>
                  {isUnlocked ? <Unlock className="h-2.5 w-2.5" /> : <Lock className="h-2.5 w-2.5" />} {t("archive.lvLabel", { lv: loreEntry.level, label: bondLabels[loreEntry.level - 1] })}
                </div>
                {!isUnlocked && <span className="text-[10px] text-muted-foreground">{t("archive.needTurns", { n: BOND_THRESHOLDS[loreEntry.level - 1] })}</span>}
              </div>
              {isUnlocked ? <p className="text-sm leading-relaxed text-card-foreground italic">"{loreEntry.text}"</p> : <p className="text-sm text-muted-foreground/50">{t("archive.lockedQuote", { name: agent.name })}</p>}
            </motion.div>);
          })}
        </div>
      </div>
      <div className="mt-6 px-4 pb-6">
        <h3 className="mb-3 font-display text-sm font-semibold text-foreground flex items-center gap-2">{t("archive.easterEggs")} <span className="text-[10px] font-normal text-muted-foreground">{t("archive.found", { cur: eggsFound.length, total: agent.easterEggs.length })}</span></h3>
        <div className="space-y-3">
          {agent.easterEggs.map((egg, index) => { const isFound = eggsFound.includes(egg.trigger); return (
            <motion.div key={index} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 + index * 0.1 }} className={`rounded-2xl border p-4 ${isFound ? "border-secondary/20 bg-card shadow-card" : "border-border bg-muted/30"}`}>
              {isFound ? (<><div className="flex items-center gap-2 mb-2"><span className="rounded-full bg-secondary/10 px-2 py-0.5 text-[10px] font-medium text-secondary flex items-center gap-1"><Sparkles className="h-2.5 w-2.5" /> {t("archive.unlockedTag")}</span><span className="text-[10px] text-muted-foreground">{t("archive.trigger", { t: egg.trigger })}</span></div><p className="text-[11px] leading-relaxed text-muted-foreground line-clamp-3 italic">{egg.response.replace("【🔮 隐藏记忆解锁】", "").trim().slice(0, 120)}…</p></>) : (
                <div className="flex items-center gap-3"><div className="shrink-0 rounded-xl bg-muted p-2"><Lock className="h-4 w-4 text-muted-foreground/40" /></div><div><p className="text-sm font-medium text-muted-foreground/50">{t("archive.undiscovered")}</p><p className="text-[10px] text-muted-foreground/40 mt-0.5">{t("archive.undiscoveredHint")}</p></div></div>
              )}
            </motion.div>);
          })}
        </div>
      </div>
      <BottomNav />
    </div>
    </DesktopLayout>
  );
};

export default AgentArchive;
