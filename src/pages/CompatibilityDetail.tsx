import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Heart } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";

const DIM_LABELS: Record<string, string> = {
  emotional: "情感共鸣",
  communication: "沟通默契",
  values: "价值观契合",
  growth: "成长互助",
  chemistry: "化学反应",
};

const CompatibilityDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !id) return;
    supabase
      .from("compatibility_reports")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        setReport(data);
        setLoading(false);
      });
  }, [user, id]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-calm">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-secondary border-t-transparent" />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-calm gap-3">
        <p className="text-muted-foreground">报告不存在</p>
        <button onClick={() => navigate(-1)} className="text-sm text-secondary underline">返回</button>
      </div>
    );
  }

  const d = report.result_data as any;
  const partner = report.partner_info as any;

  const formatDate = (s: string) => {
    const dt = new Date(s);
    return `${dt.getFullYear()}年${dt.getMonth() + 1}月${dt.getDate()}日 ${dt.getHours().toString().padStart(2, "0")}:${dt.getMinutes().toString().padStart(2, "0")}`;
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-secondary";
    if (score >= 60) return "text-gold";
    return "text-rose-warm";
  };

  return (
    <div className="min-h-screen bg-gradient-calm pb-12">
      <div className="flex items-center gap-3 px-4 py-3 pt-14">
        <button onClick={() => navigate("/compatibility-reports")} className="text-muted-foreground">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h2 className="font-display text-sm font-semibold text-foreground">💕 合盘详情</h2>
      </div>

      <div className="px-6 mt-2 space-y-4">
        {/* Score Card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-card p-5 shadow-card text-center"
        >
          <p className="text-4xl mb-1">{d?.emoji || "💕"}</p>
          <p className={`font-display text-4xl font-bold ${getScoreColor(d?.overallScore || 0)}`}>
            {d?.overallScore || 0}%
          </p>
          <h3 className="font-display text-lg font-bold text-foreground mt-1">{d?.title || "合盘分析"}</h3>
          <p className="text-[11px] text-muted-foreground/60 mt-1">
            与 {partner?.name || "对方"} · {formatDate(report.created_at)}
          </p>
          <p className="text-xs text-muted-foreground mt-3 leading-relaxed">{d?.summary}</p>
        </motion.div>

        {/* Five Dimensions */}
        {d?.dimensions && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl bg-card p-5 shadow-card space-y-3"
          >
            <h4 className="font-display text-sm font-semibold text-foreground mb-2">五维契合度</h4>
            {Object.entries(d.dimensions).map(([key, value]) => (
              <div key={key} className="space-y-1">
                <div className="flex justify-between text-[11px] text-muted-foreground">
                  <span>{DIM_LABELS[key] || key}</span>
                  <span>{value as number}%</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${value as number}%` }}
                    transition={{ delay: 0.3, duration: 0.8 }}
                    className="h-full rounded-full bg-gradient-to-r from-rose-warm to-secondary"
                  />
                </div>
              </div>
            ))}
          </motion.div>
        )}

        {/* Strengths */}
        {d?.strengths && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="rounded-2xl bg-card p-5 shadow-card"
          >
            <h4 className="font-display text-sm font-semibold text-foreground mb-3">✨ 关系优势</h4>
            <ul className="space-y-2">
              {d.strengths.map((s: string, i: number) => (
                <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                  <span className="text-secondary mt-0.5">•</span>
                  <span className="leading-relaxed">{s}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        )}

        {/* Conflicts & Solutions */}
        {d?.conflicts && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-2xl bg-card p-5 shadow-card"
          >
            <h4 className="font-display text-sm font-semibold text-foreground mb-3">⚡ 潜在冲突与化解</h4>
            <div className="space-y-3">
              {d.conflicts.map((c: any, i: number) => (
                <div key={i} className="rounded-xl bg-muted/30 p-3">
                  <p className="text-sm font-medium text-foreground">🔸 {c.issue}</p>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">💡 {c.solution}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Love Language */}
        {d?.loveLanguage && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="rounded-2xl bg-card p-5 shadow-card"
          >
            <h4 className="font-display text-sm font-semibold text-foreground mb-3">💗 爱的语言</h4>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="rounded-xl bg-muted/30 p-3 text-center">
                <p className="text-[10px] text-muted-foreground">我</p>
                <p className="text-sm font-semibold text-foreground mt-1">{d.loveLanguage.mine}</p>
              </div>
              <div className="rounded-xl bg-muted/30 p-3 text-center">
                <p className="text-[10px] text-muted-foreground">{partner?.name || "TA"}</p>
                <p className="text-sm font-semibold text-foreground mt-1">{d.loveLanguage.partner}</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">{d.loveLanguage.tip}</p>
          </motion.div>
        )}

        {/* Deep Analysis */}
        {d?.deepAnalysis && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="rounded-2xl bg-card p-5 shadow-card"
          >
            <h4 className="font-display text-sm font-semibold text-foreground mb-3">📖 深度分析</h4>
            <div className="prose prose-sm max-w-none text-foreground prose-p:text-sm prose-p:leading-relaxed">
              <ReactMarkdown>{d.deepAnalysis}</ReactMarkdown>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default CompatibilityDetail;
