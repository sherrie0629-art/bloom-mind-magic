import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Heart, Share2 } from "lucide-react";
import DesktopLayout from "@/components/DesktopLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useSharePoster } from "@/hooks/useSharePoster";
import ShareSheet from "@/components/ShareSheet";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import DeepReportUnlock from "@/components/DeepReportUnlock";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n";
import { normalizeTraitScores } from "@/lib/scoreNormalize";

const CompatibilityDetail = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { generatePoster } = useSharePoster();
  const [shareOpen, setShareOpen] = useState(false);
  const [shareDataUrl, setShareDataUrl] = useState<string | null>(null);

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
        <p className="text-muted-foreground">{t("compatibilityDetail.notFound")}</p>
        <button onClick={() => navigate(-1)} className="text-sm text-secondary underline">{t("compatibilityDetail.goBack")}</button>
      </div>
    );
  }

  const d = report.result_data as any;
  const partner = report.partner_info as any;
  const partnerName = partner?.name || t("compatibilityDetail.partnerDefault");
  const dimensionsNormalized = d?.dimensions
    ? normalizeTraitScores(d.dimensions as Record<string, number>)
    : null;

  const formatDate = (s: string) => {
    const dt = new Date(s);
    const lang = (i18n.resolvedLanguage || i18n.language || "en").startsWith("zh") ? "zh-CN" : "en-US";
    return dt.toLocaleDateString(lang, { year: "numeric", month: "short", day: "numeric" }) + " " +
      dt.getHours().toString().padStart(2, "0") + ":" + dt.getMinutes().toString().padStart(2, "0");
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-secondary";
    if (score >= 60) return "text-gold";
    return "text-rose-warm";
  };

  return (
    <DesktopLayout>
    <div className="min-h-screen bg-gradient-calm pb-12">
      <div className="flex items-center justify-between px-4 py-3 pt-14">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/compatibility-reports")} className="text-muted-foreground">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h2 className="font-display text-sm font-semibold text-foreground">{t("compatibilityDetail.title")}</h2>
        </div>
        <button
          onClick={async () => {
            try {
              toast.info(t("compatibilityDetail.generatingPoster"), { duration: 3000 });
              const bars = dimensionsNormalized
                ? Object.entries(dimensionsNormalized).map(([k, v]) => ({
                    label1: t(`assessmentDetail.dim.${k}`, { defaultValue: k }),
                    label2: "",
                    value: v as number,
                  }))
                : [];
              const canvas = await generatePoster({
                title: d?.title || t("compatibilityDetail.compatibilityFallback"),
                subtitle: t("compatibilityDetail.matchSuffix", { n: d?.overallScore || 0 }),
                description: d?.summary || "",
                bars,
                accentColor: "#f472b6",
                accentColorLight: "#fb7185",
                icon: d?.emoji || "💕",
                caption: t("compatibilityDetail.withPartner", { name: partnerName }),
                appName: "Soul Sanctuary · Compatibility",
              });
              setShareDataUrl(canvas.toDataURL("image/png"));
              setShareOpen(true);
            } catch {
              toast.error(t("compatibilityDetail.posterFail"));
            }
          }}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <Share2 className="h-5 w-5" />
        </button>
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
          <h3 className="font-display text-lg font-bold text-foreground mt-1">{d?.title || t("compatibilityDetail.compatibilityFallback")}</h3>
          <p className="text-[11px] text-muted-foreground/60 mt-1">
            {t("compatibilityDetail.withPartner", { name: partnerName })} · {formatDate(report.created_at)}
          </p>
          <p className="text-xs text-muted-foreground mt-3 leading-relaxed">{d?.summary}</p>
        </motion.div>

        {/* Five Dimensions */}
        {dimensionsNormalized && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl bg-card p-5 shadow-card space-y-3"
          >
            <h4 className="font-display text-sm font-semibold text-foreground mb-2">{t("compatibilityDetail.fiveDimensions")}</h4>
            {Object.entries(dimensionsNormalized).map(([key, value]) => (
              <div key={key} className="space-y-1">
                <div className="flex justify-between text-[11px] text-muted-foreground">
                  <span>{t(`assessmentDetail.dim.${key}`, { defaultValue: key })}</span>
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
            <h4 className="font-display text-sm font-semibold text-foreground mb-3">{t("compatibilityDetail.strengths")}</h4>
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
            <h4 className="font-display text-sm font-semibold text-foreground mb-3">{t("compatibilityDetail.conflicts")}</h4>
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
            <h4 className="font-display text-sm font-semibold text-foreground mb-3">{t("compatibilityDetail.loveLanguages")}</h4>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="rounded-xl bg-muted/30 p-3 text-center">
                <p className="text-[10px] text-muted-foreground">{t("compatibilityDetail.you")}</p>
                <p className="text-sm font-semibold text-foreground mt-1">{d.loveLanguage.mine}</p>
              </div>
              <div className="rounded-xl bg-muted/30 p-3 text-center">
                <p className="text-[10px] text-muted-foreground">{partnerName}</p>
                <p className="text-sm font-semibold text-foreground mt-1">{d.loveLanguage.partner}</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">{d.loveLanguage.tip}</p>
          </motion.div>
        )}




        {report?.id && (
          <DeepReportUnlock
            source="compatibility"
            reportId={report.id}
            typeLabel={t("assessmentFlow.compatibility.deepReportLabel", { defaultValue: "Compatibility" })}
            initialDeepReport={d?.deepReport}
            createdAt={report.created_at}
          />
        )}
      </div>

      <ShareSheet
        open={shareOpen}
        onClose={() => { setShareOpen(false); setShareDataUrl(null); }}
        imageDataUrl={shareDataUrl}
        title={d?.title || t("compatibilityDetail.compatibilityFallback")}
        text={t("compatibilityDetail.scoreMatch", { n: d?.overallScore || 0 })}
      />
    </div>
    </DesktopLayout>
  );
};

export default CompatibilityDetail;
