import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Sparkles, Moon, Heart, Brain, Lock, Unlock, Stars, Flame, ChevronRight, Users, Target } from "lucide-react";
import { useNavigate } from "react-router-dom";
import heroBg from "@/assets/hero-bg.jpg";
import AgentCard from "@/components/AgentCard";
import BottomNav from "@/components/BottomNav";
import { agents, BOND_LABELS } from "@/data/agents";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const assessments = [
  {
    id: "mbti",
    icon: Brain,
    label: "MBTI",
    desc: "Personality",
    gradient: "from-indigo to-indigo-light",
    path: "/assessment/mbti",
  },
  {
    id: "enneagram",
    icon: Target,
    label: "Enneagram",
    desc: "Core Motives",
    gradient: "from-secondary to-gold",
    path: "/assessment/enneagram",
  },
  {
    id: "zodiac",
    icon: Stars,
    label: "Horoscope",
    desc: "Cosmic Vibes",
    gradient: "from-lavender to-rose-warm",
    path: "/assessment/zodiac",
  },
  {
    id: "emotion",
    icon: Flame,
    label: "Wellness",
    desc: "Burnout Check",
    gradient: "from-rose-warm to-gold",
    path: "/assessment/emotion",
  },
];

const Index = () => {
  const navigate = useNavigate();
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

  return (
    <div className="min-h-screen bg-gradient-calm pb-20">
      {/* Hero */}
      <div className="relative overflow-hidden">
        <img src={heroBg} alt="" className="absolute inset-0 h-full w-full object-cover opacity-60" />
        <div className="relative px-6 pb-10 pt-14 text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-display text-2xl font-bold text-foreground"
          >
            MindGarden AI
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mt-2 text-sm text-muted-foreground"
          >
            In a noisy world, find the soul that gets you
          </motion.p>
        </div>
      </div>

      {/* Daily Check-in + Compatibility CTA row */}
      <div className="px-6 mt-3">
        <div className="grid grid-cols-2 gap-2.5">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate("/daily-whisper")}
            className="cursor-pointer rounded-2xl bg-card p-3 shadow-card border border-secondary/10"
          >
            <div className="flex flex-col items-center gap-1.5 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-mystic">
                <Sparkles className="h-5 w-5 text-primary-foreground" />
              </div>
              <p className="text-[11px] font-semibold text-foreground">Daily Tarot</p>
              <p className="text-[9px] text-muted-foreground leading-tight">Draw a card · Get your insight 🔮</p>
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate("/assessment/compatibility")}
            className="cursor-pointer rounded-2xl bg-card p-3 shadow-card border border-rose-warm/10"
          >
            <div className="flex flex-col items-center gap-1.5 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-rose-warm to-secondary">
                <Heart className="h-5 w-5 text-primary-foreground" />
              </div>
              <p className="text-[11px] font-semibold text-foreground">Relationship Chemistry</p>
              <p className="text-[9px] text-muted-foreground leading-tight">Compatibility report 💕</p>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="mt-6 px-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-base font-semibold text-foreground">Self-Discovery</h2>
          <button onClick={() => navigate("/assessment")} className="text-xs text-secondary">
            All quizzes →
          </button>
        </div>
        <div className="grid grid-cols-4 gap-2.5">
          {assessments.map((item, i) => (
            <motion.button
              key={item.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate(item.path)}
              className="flex flex-col items-center gap-1.5 rounded-2xl bg-card p-3 shadow-card"
            >
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${item.gradient}`}>
                <item.icon className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-[11px] font-semibold text-foreground">{item.label}</span>
              <span className="text-[9px] text-muted-foreground leading-none">{item.desc}</span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Agent Gallery */}
      <div className="mt-6 px-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-base font-semibold text-foreground">Your Circle</h2>
          <button onClick={() => navigate("/archive")} className="text-xs text-secondary">
            Archive →
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {agents.map((agent, i) => (
            <motion.div key={agent.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.08 }}>
              <AgentCard {...agent} bondLevel={bondLevels[agent.id]} />
            </motion.div>
          ))}
        </div>
      </div>

      {/* Narrative exploration hint */}
      <div className="mt-4 px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="rounded-2xl border border-secondary/20 bg-card/80 backdrop-blur-sm p-4"
        >
          <div className="flex items-start gap-3">
            <div className="mt-0.5 shrink-0 rounded-xl bg-secondary/10 p-2">
              <Lock className="h-4 w-4 text-secondary" />
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground">🔮 Each character holds untold secrets</p>
              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                Share your story sincerely. As conversations deepen, characters will open up and unlock exclusive lore fragments.
              </p>
              {Object.keys(bondLevels).length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {agents.map((a) => {
                    const lv = bondLevels[a.id] || 1;
                    return (
                      <span key={a.id} className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                        {a.name}
                        <span className="text-secondary">{BOND_LABELS[lv - 1]}</span>
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
  );
};

export default Index;
