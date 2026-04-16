import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAchievements } from "@/hooks/useAchievements";
import { ACHIEVEMENTS, type AchievementDef } from "@/data/achievements";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import DesktopLayout from "@/components/DesktopLayout";
import SEO from "@/components/SEO";

interface SoulFragment { id: string; name: string; description: string | null; icon: string; color: string; source_type: string; source_id: string | null; created_at: string; }

const sourceLabels: Record<string, string> = { mbti: "MBTI", enneagram: "Enneagram", zodiac: "Horoscope", emotion: "Wellness Check", chat: "Deep Chat" };
const SOURCE_GROUPS = [
  { key: "assessment", label: "Assessment Stars", sources: ["mbti", "enneagram", "zodiac", "emotion"] },
  { key: "chat", label: "Conversation Stars", sources: ["chat"] },
];

const SoulMap = () => {
  const navigate = useNavigate();
  const { user, promptLogin } = useAuth();
  const { unlockedIds } = useAchievements(user?.id);
  const [fragments, setFragments] = useState<SoulFragment[]>([]);
  const [selectedFragment, setSelectedFragment] = useState<SoulFragment | null>(null);
  const [selectedConstellation, setSelectedConstellation] = useState<AchievementDef | null>(null);

  useEffect(() => { if (!user) { promptLogin("登录后查看灵魂星图 🌟"); navigate("/"); return; } (supabase as any).from("soul_fragments").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).then(({ data }: any) => { if (data) setFragments(data); }); }, [user, promptLogin, navigate]);

  const unlocked = ACHIEVEMENTS.filter((a) => unlockedIds.includes(a.id));
  const locked = ACHIEVEMENTS.filter((a) => !unlockedIds.includes(a.id));
  const groupedFragments = SOURCE_GROUPS.map((g) => ({ ...g, items: fragments.filter((f) => g.sources.includes(f.source_type)) }));

  return (
    <DesktopLayout maxWidth="4xl">
    <div className="min-h-screen pb-12" style={{ background: "linear-gradient(180deg, hsl(225 50% 8%), hsl(260 40% 12%), hsl(225 45% 10%))" }}>
      <SEO title="Soul Map — Soul Sanctuary" description="Your personalized soul map — a living constellation of insights from every conversation." />
      <div className="flex items-center gap-3 px-5 pt-12 pb-4">
        <button onClick={() => navigate(-1)} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white/80 active:scale-95 transition-transform"><ArrowLeft className="h-4 w-4" /></button>
        <h1 className="font-display text-lg font-semibold text-white/90">Soul Map</h1>
        <span className="ml-auto text-[11px] text-white/40">{fragments.length} stars · {unlocked.length} constellations</span>
      </div>
      {groupedFragments.map((group) => (
        <div key={group.key} className="px-5 mt-6">
          <h3 className="text-xs font-semibold text-white/50 mb-3 flex items-center gap-1.5"><span>{group.key === "assessment" ? "📐" : "💬"}</span>{group.label}<span className="text-[10px] text-white/30 ml-1">({group.items.length})</span></h3>
          {group.items.length === 0 ? (<div className="rounded-2xl border border-white/10 p-5 text-center"><p className="text-xs text-white/30">{group.key === "assessment" ? "Complete assessments to earn stars ✨" : "Have deep conversations to earn stars 💫"}</p></div>) : (
            <div className="flex flex-wrap gap-3">{group.items.map((f, i) => (
              <motion.button key={f.id} initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: i * 0.04, type: "spring", stiffness: 300, damping: 22 }} onClick={() => setSelectedFragment(f)} className="relative flex h-14 w-14 items-center justify-center rounded-full" style={{ backgroundColor: f.color + "18", boxShadow: `0 0 20px -4px ${f.color}60`, border: `1px solid ${f.color}30` }}>
                <motion.span animate={{ y: [0, -2, 0] }} transition={{ duration: 2.5 + i * 0.3, repeat: Infinity, ease: "easeInOut" }} className="text-xl">{f.icon}</motion.span>
              </motion.button>))}</div>)}
        </div>
      ))}
      <div className="px-5 mt-8">
        <h3 className="text-xs font-semibold text-white/50 mb-3 flex items-center gap-1.5"><span>⭐</span>Constellation Guide<span className="text-[10px] text-white/30 ml-1">({unlocked.length}/{ACHIEVEMENTS.length})</span></h3>
        <div className="grid grid-cols-2 gap-3">
          {unlocked.map((ach, i) => (<motion.button key={ach.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} onClick={() => setSelectedConstellation(ach)} className="rounded-2xl p-4 text-left" style={{ background: "linear-gradient(135deg, hsl(38 75% 55% / 0.12), hsl(25 85% 60% / 0.06))", border: "1px solid hsl(38 75% 55% / 0.25)" }}>
            <div className="flex items-center gap-2 mb-1.5"><span className="text-xl">{ach.icon}</span><span className="text-[10px] text-white/40">Unlocked</span></div>
            <p className="text-xs font-semibold text-white/90">{ach.constellation.name}</p><p className="text-[10px] text-white/50 mt-0.5 line-clamp-1">{ach.name}</p>
          </motion.button>))}
          {locked.map((ach, i) => (<motion.button key={ach.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: (unlocked.length + i) * 0.06 }} onClick={() => setSelectedConstellation(ach)} className="rounded-2xl p-4 text-left border border-dashed border-white/10" style={{ background: "hsl(225 40% 15% / 0.5)" }}>
            <div className="flex items-center gap-2 mb-1.5"><span className="text-xl opacity-30">🔒</span></div>
            <p className="text-xs font-medium text-white/30">{ach.constellation.name}</p><p className="text-[10px] text-white/20 mt-0.5 line-clamp-1">???</p>
          </motion.button>))}
        </div>
      </div>
      {locked.length > 0 && (<div className="px-5 mt-8"><div className="rounded-2xl p-4" style={{ background: "linear-gradient(135deg, hsl(260 35% 20% / 0.6), hsl(225 50% 18% / 0.4))", border: "1px solid hsl(260 35% 65% / 0.15)" }}>
        <h4 className="text-xs font-semibold text-white/60 mb-2">🧭 Next Goal</h4>
        {locked.slice(0, 2).map((ach) => (<div key={ach.id} className="flex items-center gap-2.5 py-1.5"><span className="text-lg">{ach.icon}</span><div className="flex-1 min-w-0"><p className="text-xs text-white/80 font-medium">{ach.constellation.name}</p><p className="text-[10px] text-white/40 truncate">{ach.description}</p></div>
          {ach.agentId && <button onClick={() => navigate(`/chat?agent=${ach.agentId}`)} className="flex-shrink-0 rounded-full px-3 py-1 text-[10px] font-medium text-white/70 border border-white/15 active:scale-95 transition-transform">Chat</button>}
        </div>))}
      </div></div>)}
      <Dialog open={!!selectedFragment} onOpenChange={() => setSelectedFragment(null)}>
        <DialogContent className="max-w-sm rounded-2xl">{selectedFragment && (<><DialogHeader className="items-center text-center"><div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-full" style={{ backgroundColor: selectedFragment.color + "20" }}><span className="text-3xl">{selectedFragment.icon}</span></div><DialogTitle className="font-display text-lg">{selectedFragment.name}</DialogTitle><DialogDescription className="text-sm leading-relaxed">{selectedFragment.description}</DialogDescription></DialogHeader><div className="flex items-center justify-between text-[11px] text-muted-foreground pt-2 border-t border-border"><span>Source: {sourceLabels[selectedFragment.source_id || selectedFragment.source_type] || selectedFragment.source_type}</span><span>{new Date(selectedFragment.created_at).toLocaleDateString("en-US")}</span></div></>)}</DialogContent>
      </Dialog>
      <Dialog open={!!selectedConstellation} onOpenChange={() => setSelectedConstellation(null)}>
        <DialogContent className="max-w-sm rounded-2xl">{selectedConstellation && (<><DialogHeader className="items-center text-center"><div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-muted"><span className="text-3xl">{unlockedIds.includes(selectedConstellation.id) ? selectedConstellation.icon : "🔒"}</span></div><DialogTitle className="font-display text-lg">{selectedConstellation.constellation.name}</DialogTitle><DialogDescription className="text-sm leading-relaxed">{unlockedIds.includes(selectedConstellation.id) ? selectedConstellation.description : `Requirement: ${selectedConstellation.description}`}</DialogDescription></DialogHeader>
          {!unlockedIds.includes(selectedConstellation.id) && selectedConstellation.agentId && (<div className="pt-2 text-center"><button onClick={() => { setSelectedConstellation(null); navigate(`/chat?agent=${selectedConstellation.agentId}`); }} className="rounded-2xl bg-gradient-golden px-6 py-2.5 text-sm font-medium text-primary-foreground active:scale-95 transition-transform">Chat ✨</button></div>)}</>)}</DialogContent>
      </Dialog>
    </div>
    </DesktopLayout>
  );
};

export default SoulMap;
