import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Brain, Compass, Stars, Flame, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import DesktopLayout from "@/components/DesktopLayout";

const typeIcons: Record<string, { icon: typeof Brain; gradient: string }> = {
  mbti: { icon: Brain, gradient: "bg-gradient-to-br from-indigo to-indigo-light" },
  enneagram: { icon: Compass, gradient: "bg-gradient-to-br from-secondary to-gold" },
  zodiac: { icon: Stars, gradient: "bg-gradient-to-br from-lavender to-rose-warm" },
  emotion: { icon: Flame, gradient: "bg-gradient-to-br from-rose-warm to-gold" },
  
};

interface Report { id: string; assessment_type: string; type?: string; result_data: any; created_at: string; }

const AssessmentReports = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase.from("assessment_results").select("*").eq("user_id", user.id).order("created_at", { ascending: false })
      .then(({ data }) => { setReports((data || []).map((d: any) => ({ ...d, type: d.assessment_type }))); setLoading(false); });
  }, [user]);

  const getTitle = (r: Report) => {
    const d = r.result_data as any;
    const tp = r.assessment_type || r.type;
    if (tp === "mbti") return `${d.mbtiType} — ${d.title}`;
    if (tp === "enneagram") return `Type ${d.type ?? d.enneagramType ?? "?"} · ${d.title}`;
    if (tp === "zodiac") return `${d.zodiacSign} · ${d.title}`;
    if (tp === "emotion") return `${d.emoji || "🎭"} ${d.title}`;
    return d.title || tp;
  };
  const getDesc = (r: Report) => { const d = r.result_data as any; return (d.description?.slice(0, 60) || "") + ((d.description?.length || 0) > 60 ? "…" : ""); };
  const formatDate = (s: string) => {
    const d = new Date(s);
    return d.toLocaleDateString() + " " + d.getHours().toString().padStart(2, "0") + ":" + d.getMinutes().toString().padStart(2, "0");
  };

  return (
    <DesktopLayout>
    <div className="min-h-screen bg-gradient-calm pb-24 md:pb-8">
      <div className="flex items-center gap-3 px-4 py-3 pt-14">
        <button onClick={() => navigate("/profile")} className="text-muted-foreground"><ArrowLeft className="h-5 w-5" /></button>
        <h2 className="font-display text-lg font-semibold text-foreground">{t("assessmentReports.title")}</h2>
      </div>

      <div className="mt-2 space-y-3 px-6">
        {loading ? (
          <div className="flex justify-center py-16"><div className="h-6 w-6 animate-spin rounded-full border-2 border-secondary border-t-transparent" /></div>
        ) : reports.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-4xl">📋</p>
            <p className="mt-3 text-sm text-muted-foreground">{t("assessmentReports.empty")}</p>
            <button onClick={() => navigate("/assessment")} className="mt-4 rounded-xl bg-gradient-golden px-6 py-2.5 text-sm font-semibold text-primary-foreground">{t("assessmentReports.takeOne")}</button>
          </div>
        ) : (
          reports.map((r, i) => {
            const cfg = typeIcons[r.assessment_type || r.type || "mbti"] || typeIcons.mbti;
            const Icon = cfg.icon;
            return (
              <motion.div key={r.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} onClick={() => navigate(`/assessment-reports/${r.id}`)} className="rounded-2xl bg-card p-4 shadow-card cursor-pointer active:scale-[0.98] transition-transform">
                <div className="flex items-start gap-3">
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${cfg.gradient}`}><Icon className="h-5 w-5 text-primary-foreground" /></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2"><h3 className="font-display text-sm font-semibold text-foreground truncate">{getTitle(r)}</h3></div>
                    <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">{getDesc(r)}</p>
                    <p className="mt-1.5 text-[10px] text-muted-foreground/60">{formatDate(r.created_at)}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/40 self-center" />
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
    </DesktopLayout>
  );
};

export default AssessmentReports;
