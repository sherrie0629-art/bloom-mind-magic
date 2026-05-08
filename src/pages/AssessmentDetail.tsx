import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Brain, Compass, Stars, Flame, Share2 } from "lucide-react";
import DesktopLayout from "@/components/DesktopLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "@/hooks/useSubscription";
import { useSharePoster } from "@/hooks/useSharePoster";
import ShareSheet from "@/components/ShareSheet";
import { toast } from "sonner";
import DeepReportUnlock from "@/components/DeepReportUnlock";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n";

const typeIcons: Record<string, typeof Brain> = {
  mbti: Brain, enneagram: Compass, zodiac: Stars, emotion: Flame,
};
const typeGradients: Record<string, string> = {
  mbti: "bg-gradient-to-br from-indigo to-indigo-light",
  enneagram: "bg-gradient-to-br from-secondary to-gold",
  zodiac: "bg-gradient-to-br from-lavender to-rose-warm",
  emotion: "bg-gradient-to-br from-rose-warm to-gold",
};

const AssessmentDetail = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { generatePoster: _gp } = useSharePoster();
  const [shareOpen, setShareOpen] = useState(false);
  const [shareImageUrl, setShareImageUrl] = useState<string | null>(null);

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
      const locale = (i18n.resolvedLanguage || i18n.language || "en").startsWith("zh") ? "zh" : "en";
      const { data, error } = await supabase.functions.invoke("generate-deep-report", {
        body: { assessmentId: id, locale },
      });

      if (error) {
        const errorBody = typeof error === "object" && "message" in error ? error.message : String(error);
        if (errorBody.includes("402") || errorBody.includes("upgrade")) {
          toast.error(t("assessmentDetail.needUpgrade"));
          return;
        }
        if (errorBody.includes("429") || errorBody.includes("limit")) {
          toast.error(t("assessmentDetail.dailyDeepLimit"));
          return;
        }
        throw error;
      }

      if (data?.needUpgrade) {
        toast.error(t("assessmentDetail.needUpgrade"));
        return;
      }

      if (data?.dailyLimitReached) {
        toast.error(t("assessmentDetail.dailyDeepLimit"));
        return;
      }

      if (data?.deepReport) {
        setDeepReport(data.deepReport);
        setShowDeepReport(true);
        toast.success(t("assessmentDetail.deepDone"));
      }
    } catch (e: any) {
      toast.error(e.message || t("assessmentDetail.deepFail"));
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
        <p className="text-muted-foreground">{t("common.noteFound")}</p>
        <button onClick={() => navigate(-1)} className="text-sm text-secondary underline">{t("common.goBack")}</button>
      </div>
    );
  }

  const d = report.result_data as any;
  const type = report.assessment_type as string;
  const Icon = typeIcons[type] || Brain;
  const gradient = typeGradients[type] || typeGradients.mbti;
  const typeLabel = t(`assessmentReports.labels.${type}`, { defaultValue: type });

  const handleShare = async () => {
    const iconMap: Record<string, string> = { mbti: "🧠", enneagram: "🧭", zodiac: "⭐", emotion: "🔥" };
    const bars = d.traits
      ? Object.entries(d.traits).map(([k, v]) => ({ label1: k, label2: "", value: v as number }))
      : [];
    try {
      const canvas = await generatePoster({
        title: getTitle(),
        subtitle: typeLabel,
        description: d.description || "",
        bars,
        accentColor: "#8b5cf6",
        accentColorLight: "#a78bfa",
        icon: iconMap[type] || "✨",
        caption: d.socialCaption || "Discover your inner self",
      });
      setShareImageUrl(canvas.toDataURL("image/png"));
      setShareOpen(true);
    } catch {
      toast.error(t("compatibilityDetail.posterFail"));
    }
  };

  const formatDate = (s: string) => {
    const dt = new Date(s);
    const lang = (i18n.resolvedLanguage || i18n.language || "en").startsWith("zh") ? "zh-CN" : "en-US";
    return dt.toLocaleDateString(lang, { year: "numeric", month: "short", day: "numeric" }) + " " +
      dt.getHours().toString().padStart(2, "0") + ":" + dt.getMinutes().toString().padStart(2, "0");
  };

  const renderDimensions = () => {
    if (type === "mbti" && d.traits) {
      const dims = [
        { left: t("assessmentFlow.mbti.dim.ei.0", { defaultValue: "Extrovert E" }), right: t("assessmentFlow.mbti.dim.ei.1", { defaultValue: "Introvert I" }), value: d.traits.E_I },
        { left: t("assessmentFlow.mbti.dim.sn.0", { defaultValue: "Sensing S" }), right: t("assessmentFlow.mbti.dim.sn.1", { defaultValue: "Intuition N" }), value: d.traits.S_N },
        { left: t("assessmentFlow.mbti.dim.tf.0", { defaultValue: "Thinking T" }), right: t("assessmentFlow.mbti.dim.tf.1", { defaultValue: "Feeling F" }), value: d.traits.T_F },
        { left: t("assessmentFlow.mbti.dim.jp.0", { defaultValue: "Judging J" }), right: t("assessmentFlow.mbti.dim.jp.1", { defaultValue: "Perceiving P" }), value: d.traits.J_P },
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
    const dimGradients: Record<string, string> = {
      enneagram: "bg-gradient-mystic",
      zodiac: "bg-gradient-to-r from-lavender to-rose-warm",
      emotion: "bg-gradient-to-r from-rose-warm to-gold",
    };
    if ((type === "enneagram" || type === "zodiac" || type === "emotion") && d.traits) {
      return Object.entries(d.traits).map(([k, v]) => (
        <div key={k} className="space-y-1">
          <div className="flex justify-between text-[11px] text-muted-foreground">
            <span>{t(`assessmentDetail.dim.${k}`, { defaultValue: k })}</span><span>{v as number}%</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div className={`h-full rounded-full ${dimGradients[type]}`} style={{ width: `${v as number}%` }} />
          </div>
        </div>
      ));
    }
    return null;
  };

  const getTitle = () => {
    if (type === "mbti") return `${d.mbtiType} — ${d.title}`;
    if (type === "enneagram") return `Type ${d.enneagramType} · ${d.title}`;
    if (type === "zodiac") return `${d.zodiacSign} · ${d.title}`;
    if (type === "emotion") return `${d.emoji || "🎭"} ${d.title}`;
    return d.title || type;
  };

  return (
    <DesktopLayout>
    <div className="min-h-screen bg-gradient-calm pb-12">
      <div className="flex items-center justify-between px-4 py-3 pt-14">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/assessment-reports")} className="text-muted-foreground">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h2 className="font-display text-sm font-semibold text-foreground">{typeLabel}</h2>
        </div>
        <button onClick={handleShare} className="text-muted-foreground hover:text-foreground transition-colors">
          <Share2 className="h-5 w-5" />
        </button>
      </div>

      <div className="px-6 mt-2">
        {d.imageUrl && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-4 flex justify-center"
          >
            <img
              src={d.imageUrl}
              alt="AI generated artwork"
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
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${gradient}`}>
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
          <h4 className="font-display text-sm font-semibold text-foreground mb-2">{t("assessmentDetail.dimensions")}</h4>
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
            <h4 className="font-display text-sm font-semibold text-foreground mb-3">{t("assessmentDetail.luckyGuide")}</h4>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: t("assessmentDetail.luckyColor"), value: d.luckyItems.color },
                { label: t("assessmentDetail.luckyNumber"), value: d.luckyItems.number },
                { label: t("assessmentDetail.luckyDirection"), value: d.luckyItems.direction },
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
              {type === "emotion" ? t("assessmentDetail.wellnessTips") : t("assessmentDetail.advice")}
            </h4>
            {d.advice && typeof d.advice === "string" && (
              <p className="text-sm text-foreground leading-relaxed">{d.advice}</p>
            )}
            {d.advice && typeof d.advice === "object" && (
              <div className="space-y-3 text-sm text-foreground leading-relaxed">
                {d.advice.mantra && <p className="italic text-secondary">"{d.advice.mantra}"</p>}
                {Array.isArray(d.advice.doThis) && (
                  <ul className="space-y-1">
                    {d.advice.doThis.map((s: string, i: number) => <li key={`do-${i}`}>{s}</li>)}
                  </ul>
                )}
                {Array.isArray(d.advice.avoidThis) && (
                  <ul className="space-y-1">
                    {d.advice.avoidThis.map((s: string, i: number) => <li key={`av-${i}`}>{s}</li>)}
                  </ul>
                )}
                {d.advice.luckyMoment && <p>{d.advice.luckyMoment}</p>}
                {d.advice.crystalOrRitual && <p>{d.advice.crystalOrRitual}</p>}
              </div>
            )}
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
          <DeepReportUnlock
            source="assessment"
            reportId={id!}
            typeLabel={getTitle()}
            initialDeepReport={(report.result_data as any)?.deepReport}
            createdAt={report.created_at}
          />
        </motion.div>
      </div>

      <ShareSheet
        open={shareOpen}
        onClose={() => { setShareOpen(false); setShareImageUrl(null); }}
        imageDataUrl={shareImageUrl}
        title={getTitle()}
        text={t("assessmentDetail.shareDescAI")}
      />
    </div>
    </DesktopLayout>
  );
};

export default AssessmentDetail;
