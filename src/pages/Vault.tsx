import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, BookOpen, Sparkles, Gem } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { agents } from "@/data/agents";
import BottomNav from "@/components/BottomNav";
import DesktopLayout from "@/components/DesktopLayout";

interface VaultItem { id: string; agent_id: string; type: string; title: string; content: string; icon: string; unlocked_at: string; }

const TABS = [
  { key: "lore", label: "Story Fragments", icon: BookOpen },
  { key: "truth_shard", label: "Truth Shards", icon: Gem },
  { key: "quote", label: "Healing Quotes", icon: Sparkles },
];

const Vault = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tab, setTab] = useState("lore");
  const [items, setItems] = useState<VaultItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (!user) return; const load = async () => { setLoading(true); const { data } = await supabase.from("story_vault").select("*").eq("user_id", user.id).order("unlocked_at", { ascending: false }); setItems((data as VaultItem[]) || []); setLoading(false); }; load(); }, [user]);

  const filtered = items.filter((i) => i.type === tab);
  const getAgentName = (agentId: string) => agents.find((a) => a.id === agentId)?.name || agentId;
  const getAgentGradient = (agentId: string) => {
    const gradients: Record<string, string> = { barista: "from-secondary to-gold", coach: "from-teal to-indigo", mentor: "from-indigo to-lavender", bestie: "from-rose-warm to-gold" };
    return gradients[agentId] || "from-secondary to-primary";
  };

  const { promptLogin } = useAuth();

  if (!user) {
    promptLogin("登录后查看你的收藏 ✨");
    return (<div className="flex min-h-screen flex-col items-center justify-center bg-gradient-calm p-6"><p className="text-muted-foreground text-sm">正在跳转...</p></div>);
  }

  return (
    <DesktopLayout>
    <div className="min-h-screen bg-gradient-calm pb-20 md:pb-8">
      <div className="flex items-center gap-3 px-4 pt-12 pb-4"><button onClick={() => navigate(-1)} className="text-muted-foreground"><ArrowLeft className="h-5 w-5" /></button><h1 className="font-display text-lg font-bold text-foreground">Collection</h1></div>
      <div className="flex gap-2 px-4 mb-4">{TABS.map((t) => (<button key={t.key} onClick={() => setTab(t.key)} className={`flex items-center gap-1.5 rounded-2xl px-3.5 py-2 text-xs font-medium transition-all active:scale-95 ${tab === t.key ? "bg-secondary text-primary-foreground shadow-sm" : "bg-card text-muted-foreground border border-border"}`}><t.icon className="h-3.5 w-3.5" />{t.label}</button>))}</div>
      <div className="px-4 space-y-3">
        <AnimatePresence mode="wait">
          {loading ? <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-16 text-center text-sm text-muted-foreground">Loading...</motion.div>
          : filtered.length === 0 ? <motion.div key="empty" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="py-16 text-center"><div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted"><Gem className="h-6 w-6 text-muted-foreground" /></div><p className="text-sm text-muted-foreground">No fragments collected yet</p><p className="mt-1 text-xs text-muted-foreground/70">Chat deeper with characters to unlock more ✨</p></motion.div>
          : <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">
            {filtered.map((item, i) => (<motion.div key={item.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} className="rounded-2xl bg-card border border-border p-4 shadow-card">
              <div className="flex items-start gap-3">
                <div className={`shrink-0 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${getAgentGradient(item.agent_id)}`}><span className="text-lg">{item.icon}</span></div>
                <div className="flex-1 min-w-0"><div className="flex items-center gap-2"><h3 className="text-sm font-semibold text-foreground truncate">{item.title}</h3><span className="shrink-0 text-[10px] text-muted-foreground/60">{getAgentName(item.agent_id)}</span></div><p className="mt-1 text-xs text-muted-foreground leading-relaxed">{item.content}</p><p className="mt-2 text-[10px] text-muted-foreground/50">{new Date(item.unlocked_at).toLocaleDateString("en-US")}</p></div>
              </div>
            </motion.div>))}
          </motion.div>}
        </AnimatePresence>
      </div>
      <BottomNav />
    </div>
    </DesktopLayout>
  );
};

export default Vault;
