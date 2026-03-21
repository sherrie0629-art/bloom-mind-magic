import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Brain, Compass, Stars, Flame, Share2, Crown, Sparkles, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "@/hooks/useSubscription";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

const typeConfig: Record<string, { icon: typeof Brain; label: string; gradient: string }> = {
  mbti: { icon: Brain, label: "MBTI 人格测评", gradient: "bg-gradient-to-br from-indigo to-indigo-light" },
  bazi: { icon: Compass, label: "八字命理分析", gradient: "bg-gradient-to-br from-secondary to-gold" },
  zodiac: { icon: Stars, label: "星座运势解读", gradient: "bg-gradient-to-br from-lavender to-rose-warm" },
  emotion: { icon: Flame, label: "情绪状态评估", gradient: "bg-gradient-to-br from-rose-warm to-gold" },
};

const AssessmentDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [deepReport, setDeepReport] = useState<string | null>(null);
  const [deepLoading, setDeepLoading] = useState(false);
  const [showDeepReport, setShowDeepReport] = useState(false);
  const { plan } = useSubscription(user?.id);

  useEffect(() => {
    if (!user || !id) return;
    supabase
      .from("assessment_results")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        setReport(data);
        if (data?.result_data && (data.result_data as any).deepReport) {
          setDeepReport((data.result_data as any).deepReport);
          setShowDeepReport(true);
        }
        setLoading(false);
      });
  }, [user, id]);

  const handleUnlockDeepReport = async () => {
    if (!id || !user) return;
    setDeepLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("generate-deep-report", {
        body: { assessmentId: id },
      });

      if (error) {
        // Check if it's a payment required error
        const errorBody = typeof error === "object" && "message" in error ? error.message : String(error);
        if (errorBody.includes("402") || errorBody.includes("需要付费")) {
          toast.error("需要付费解锁深度报告（9.9元/次）或成为会员 💫");
          return;
        }
        throw error;
      }

      if (data?.needPayment) {
        toast.error("需要付费解锁深度报告（9.9元/次）或成为会员 💫");
        return;
      }

      if (data?.deepReport) {
        setDeepReport(data.deepReport);
        setShowDeepReport(true);
        toast.success("深度报告生成成功！✨");
      }
    } catch (e: any) {
      toast.error(e.message || "生成失败，请重试");
    } finally {
      setDeepLoading(false);
    }
  };

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
  const type = report.type as string;
  const cfg = typeConfig[type] || typeConfig.mbti;
  const Icon = cfg.icon;

  const formatDate = (s: string) => {
    const dt = new Date(s);
    return `${dt.getFullYear()}年${dt.getMonth() + 1}月${dt.getDate()}日 ${dt.getHours().toString().padStart(2, "0")}:${dt.getMinutes().toString().padStart(2, "0")}`;
  };

  const renderDimensions = () => {
    if (type === "mbti" && d.traits) {
      const dims = [
        { left: "外向 E", right: "内向 I", value: d.traits.E_I },
        { left: "实感 S", right: "直觉 N", value: d.traits.S_N },
        { left: "思考 T", right: "情感 F", value: d.traits.T_F },
        { left: "判断 J", right: "感知 P", value: d.traits.J_P },
      ];
      return dims.map((dim) => (
        <div key={dim.left} className="space-y-1">
          <div className="flex justify-between text-[11px] text-muted-foreground">
            <span>{dim.left}</span><span>{dim.right}</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full bg-gradient-golden" style={{ width: `${dim.value}%` }} />
          </div>
        </div>
      ));
    }
    if (type === "bazi" && d.traits) {
      return Object.entries(d.traits).map(([k, v]) => {
        const labels: Record<string, string> = { career: "事业", wealth: "财运", love: "感情", health: "健康" };
        return (
          <div key={k} className="space-y-1">
            <div className="flex justify-between text-[11px] text-muted-foreground">
              <span>{labels[k] || k}</span><span>{v as number}%</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full bg-gradient-mystic" style={{ width: `${v as number}%` }} />
            </div>
          </div>
        );
      });
    }
    if (type === "zodiac" && d.traits) {
      return Object.entries(d.traits).map(([k, v]) => {
        const labels: Record<string, string> = { overall: "综合", love: "爱情", career: "事业", fortune: "财运" };
        return (
          <div key={k} className="space-y-1">
            <div className="flex justify-between text-[11px] text-muted-foreground">
              <span>{labels[k] || k}</span><span>{v as number}%</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-lavender to-rose-warm" style={{ width: `${v as number}%` }} />
            </div>
          </div>
        );
      });
    }
    if (type === "emotion" && d.traits) {
      return Object.entries(d.traits).map(([k, v]) => {
        const labels: Record<string, string> = { stress: "压力", energy: "能量", social: "社交", sleep: "睡眠" };
        return (
          <div key={k} className="space-y-1">
            <div className="flex justify-between text-[11px] text-muted-foreground">
              <span>{labels[k] || k}</span><span>{v as number}%</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-rose-warm to-gold" style={{ width: `${v as number}%` }} />
            </div>
          </div>
        );
      });
    }
    return null;
  };

  const getTitle = () => {
    if (type === "mbti") return `${d.mbtiType} — ${d.title}`;
    if (type === "bazi") return `${d.dayMaster} · ${d.title}`;
    if (type === "zodiac") return `${d.zodiacSign} · ${d.title}`;
    if (type === "emotion") return `${d.emoji || "🎭"} ${d.title}`;
    return d.title || type;
  };

  return (
    <div className="min-h-screen bg-gradient-calm pb-12">
      <div className="flex items-center gap-3 px-4 py-3 pt-14">
        <button onClick={() => navigate("/assessment-reports")} className="text-muted-foreground">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h2 className="font-display text-sm font-semibold text-foreground">{cfg.label}</h2>
      </div>

      <div className="px-6 mt-2">
        {/* AI Generated Image */}
        {d.imageUrl && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-4 flex justify-center"
          >
            <img
              src={d.imageUrl}
              alt="AI 生成插画"
              className="h-48 w-48 rounded-2xl object-cover shadow-card"
            />
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-card p-5 shadow-card"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${cfg.gradient}`}>
              <Icon className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h3 className="font-display text-lg font-bold text-foreground">{getTitle()}</h3>
              <p className="text-[11px] text-muted-foreground/60">{formatDate(report.created_at)}</p>
            </div>
          </div>

          {d.socialCaption && (
            <p className="mb-4 text-xs text-secondary italic">"{d.socialCaption}"</p>
          )}

          <p className="text-sm text-foreground leading-relaxed">{d.description}</p>
        </motion.div>

        {/* Dimensions */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mt-4 rounded-2xl bg-card p-5 shadow-card space-y-3"
        >
          <h4 className="font-display text-sm font-semibold text-foreground mb-2">维度分析</h4>
          {renderDimensions()}
        </motion.div>

        {/* Zodiac lucky items */}
        {type === "zodiac" && d.luckyItems && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mt-4 rounded-2xl bg-card p-5 shadow-card"
          >
            <h4 className="font-display text-sm font-semibold text-foreground mb-3">幸运指南</h4>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "幸运色", value: d.luckyItems.color },
                { label: "幸运数字", value: d.luckyItems.number },
                { label: "幸运方位", value: d.luckyItems.direction },
              ].map((item) => (
                <div key={item.label} className="text-center rounded-xl bg-muted/50 py-3">
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className="mt-1 font-display text-sm font-semibold text-foreground">{item.value}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Advice */}
        {(d.advice || (type === "emotion" && d.suggestions)) && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-4 rounded-2xl bg-card p-5 shadow-card"
          >
            <h4 className="font-display text-sm font-semibold text-foreground mb-2">
              {type === "emotion" ? "调节建议" : "建议"}
            </h4>
            {d.advice && <p className="text-sm text-foreground leading-relaxed">{d.advice}</p>}
            {type === "emotion" && d.suggestions && (
              <ul className="space-y-2 mt-1">
                {(d.suggestions as string[]).map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                    <span className="text-secondary mt-0.5">•</span>
                    <span className="leading-relaxed">{s}</span>
                  </li>
                ))}
              </ul>
            )}
          </motion.div>
        )}

        {/* Deep Report Section */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="mt-6"
        >
          {!showDeepReport ? (
            <div className="rounded-2xl bg-card p-5 shadow-card border border-secondary/20">
              <div className="flex items-center gap-2 mb-3">
                <Crown className="h-5 w-5 text-secondary" />
                <h4 className="font-display text-sm font-semibold text-foreground">深度心理分析报告</h4>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed mb-1">
                包含 3000-5000 字深度解析：
              </p>
              <ul className="text-xs text-muted-foreground space-y-1 mb-4">
                <li className="flex items-center gap-1.5">
                  <Sparkles className="h-3 w-3 text-secondary" /> 童年依恋模式分析
                </li>
                <li className="flex items-center gap-1.5">
                  <Sparkles className="h-3 w-3 text-secondary" /> 亲密关系避坑指南
                </li>
                <li className="flex items-center gap-1.5">
                  <Sparkles className="h-3 w-3 text-secondary" /> 核心心理防御机制
                </li>
                <li className="flex items-center gap-1.5">
                  <Sparkles className="h-3 w-3 text-secondary" /> 职业发展深度建议
                </li>
                <li className="flex items-center gap-1.5">
                  <Sparkles className="h-3 w-3 text-secondary" /> 个人成长路径
                </li>
              </ul>

              {/* Blurred preview teaser */}
              <div className="relative mb-4 overflow-hidden rounded-xl">
                <div className="blur-sm select-none pointer-events-none p-3 bg-muted/30 text-xs text-muted-foreground leading-relaxed">
                  根据你的测评结果，你的核心人格特质呈现出一种独特的内在张力。在外在表现上，你倾向于……然而在内心深处，你对亲密关系有着更深层的渴望。这种矛盾源于童年时期形成的依恋模式……
                </div>
                <div className="absolute inset-0 flex items-center justify-center bg-card/40">
                  <span className="text-[11px] text-muted-foreground font-medium">🔒 解锁查看完整报告</span>
                </div>
              </div>

              <button
                onClick={handleUnlockDeepReport}
                disabled={deepLoading}
                className="w-full rounded-xl bg-gradient-golden py-3 text-sm font-semibold text-primary-foreground flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {deepLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    AI 正在生成深度报告…
                  </>
                ) : (
                  <>
                    <Crown className="h-4 w-4" />
                    {plan === "premium" ? "会员免费解锁" : "解锁深度报告（¥9.9）"}
                  </>
                )}
              </button>
              {plan !== "premium" && (
                <p className="text-[10px] text-muted-foreground text-center mt-2">
                  成为会员每月含2份免费深度报告
                </p>
              )}
            </div>
          ) : (
            <div className="rounded-2xl bg-card p-5 shadow-card">
              <div className="flex items-center gap-2 mb-4">
                <Crown className="h-5 w-5 text-secondary" />
                <h4 className="font-display text-sm font-semibold text-foreground">深度心理分析报告</h4>
              </div>
              <div className="prose prose-sm max-w-none text-foreground prose-headings:text-foreground prose-headings:font-display prose-h2:text-base prose-h2:mt-6 prose-h2:mb-3 prose-p:text-sm prose-p:leading-relaxed prose-li:text-sm prose-strong:text-foreground">
                <ReactMarkdown>{deepReport || ""}</ReactMarkdown>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default AssessmentDetail;
