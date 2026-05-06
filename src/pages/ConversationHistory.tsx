import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { MessageCircle, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import BottomNav from "@/components/BottomNav";
import DesktopLayout from "@/components/DesktopLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { agents } from "@/data/agents";

interface Conversation { id: string; agent_id: string; title: string | null; updated_at: string; }

const ConversationHistory = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, promptLogin } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { promptLogin(t("auth.promptViewHistory")); navigate("/"); return; }
    const load = async () => {
      const { data } = await supabase.from("conversations").select("*").eq("user_id", user.id).order("updated_at", { ascending: false });
      setConversations(data || []); setLoading(false);
    };
    load();
  }, [user, navigate, promptLogin, t]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await supabase.from("conversations").delete().eq("id", id);
    setConversations((prev) => prev.filter((c) => c.id !== id));
  };

  return (
    <DesktopLayout>
    <div className="min-h-screen bg-gradient-calm pb-24 md:pb-8">
      <div className="px-6 pt-14"><h1 className="font-display text-2xl font-bold text-foreground">{t("conversations.title")}</h1><p className="mt-1 text-sm text-muted-foreground">{t("conversations.subtitle")}</p></div>
      <div className="mt-6 px-6 space-y-3">
        {loading ? <p className="text-center text-sm text-muted-foreground py-8">{t("conversations.loading")}</p>
        : conversations.length === 0 ? (<div className="text-center py-16"><MessageCircle className="mx-auto h-12 w-12 text-muted-foreground/30" /><p className="mt-3 text-sm text-muted-foreground">{t("conversations.empty")}</p><button onClick={() => navigate("/")} className="mt-4 rounded-xl bg-gradient-golden px-6 py-2 text-sm font-medium text-primary-foreground">{t("conversations.startFirst")}</button></div>)
        : conversations.map((conv, i) => { const agent = agents.find((a) => a.id === conv.agent_id); return (
          <motion.button key={conv.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} onClick={() => navigate(`/chat?agent=${conv.agent_id}`)} className="flex w-full items-center gap-3 rounded-2xl bg-card p-4 shadow-card text-left">
            {agent && <img src={agent.image} alt={agent.name} className="h-10 w-10 rounded-xl object-cover" />}
            <div className="flex-1 min-w-0"><h3 className="text-sm font-semibold text-foreground truncate">{conv.title || t("conversations.fallbackTitle", { name: agent?.name || "AI" })}</h3><p className="text-[11px] text-muted-foreground">{new Date(conv.updated_at).toLocaleDateString()}</p></div>
            <button onClick={(e) => handleDelete(conv.id, e)} className="shrink-0 rounded-lg p-1.5 text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="h-4 w-4" /></button>
          </motion.button>);
        })}
      </div>
      <BottomNav />
    </div>
    </DesktopLayout>
  );
};

export default ConversationHistory;
