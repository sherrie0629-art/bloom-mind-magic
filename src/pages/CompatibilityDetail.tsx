import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Share2 } from "lucide-react";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from "recharts";
import DesktopLayout from "@/components/DesktopLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useSharePoster } from "@/hooks/useSharePoster";
import ShareSheet from "@/components/ShareSheet";
import { toast } from "sonner";
import DeepReportUnlock from "@/components/DeepReportUnlock";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n";
import { normalizeTraitScores } from "@/lib/scoreNormalize";

type Rarity = "SSR" | "SR" | "R" | "N";

const RARITY_THEME: Record<Rarity, { from: string; to: string; glow: string }> = {
  SSR: { from: "from-amber-300", to: "to-rose-400", glow: "shadow-[0_0_40px_rgba(251,191,36,0.45)]" },
  SR:  { from: "from-fuchsia-400", to: "to-violet-500", glow: "shadow-[0_0_30px_rgba(217,70,239,0.35)]" },
  R:   { from: "from-sky-400", to: "to-indigo-500", glow: "shadow-[0_0_24px_rgba(56,189,248,0.3)]" },
  N:   { from: "from-slate-300", to: "to-slate-500", glow: "" },
};

const deriveRarity = (score: number): Rarity => (score >= 88 ? "SSR" : score >= 72 ? "SR" : score >= 55 ? "R" : "N");

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
  const myName = partner?.myName || t("assessmentFlow.compatibility.me", { defaultValue: "我" });
  const cpName = d?.cpName || `${myName} & ${partnerName}`;
  const overallScore = d?.overallScore || 0;
  const rarity: Rarity = (d?.rarity as Rarity) || deriveRarity(overallScore);
  const theme = RARITY_THEME[rarity];

  const DIM_LABELS: Record<string, string> = {
    emotional: t("assessmentFlow.compatibility.dim.emotional"),
    communication: t("assessmentFlow.compatibility.dim.communication"),
    values: t("assessmentFlow.compatibility.dim.values"),
    growth: t("assessmentFlow.compatibility.dim.growth"),
    chemistry: t("assessmentFlow.compatibility.dim.chemistry"),
  };

  const dimensionsNormalized = d?.dimensions
    ? normalizeTraitScores(d.dimensions as Record<string, number>)
    : null;

  const radarData = dimensionsNormalized
    ? Object.entries(dimensionsNormalized).map(([key, value]) => ({ dim: DIM_LABELS[key] || key, value: value as number }))
    : [];

  const formatDate = (s: string) => {
    const dt = new Date(s);
    const lang = (i18n.resolvedLanguage || i18n.language || "en").startsWith("zh") ? "zh-CN" : "en-US";
    return dt.toLocaleDateString(lang, { year: "numeric", month: "short", day: "numeric" }) + " " +
      dt.getHours().toString().padStart(2, "0") + ":" + dt.getMinutes().toString().padStart(2, "0");
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
                    label1: DIM_LABELS[k] || k,
                    label2: "",
                    value: v as number,
                  }))
                : [];
              const canvas = await generatePoster({
                title: d?.title || t("compatibilityDetail.compatibilityFallback"),
                subtitle: t("compatibilityDetail.matchSuffix", { n: overallScore }),
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
        {/* Card 1 — Destiny Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92, rotateY: -8 }}
          animate={{ opacity: 1, scale: 1, rotateY: 0 }}
          transition={{ type: "spring", stiffness: 120, damping: 14 }}
          className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${theme.from} ${theme.to} p-6 text-center text-white ${theme.glow}`}
        >
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 30% 20%, rgba(255,255,255,0.6), transparent 40%), radial-gradient(circle at 70% 80%, rgba(255,255,255,0.4), transparent 40%)" }} />
          <div className="relative">
            <div className="flex justify-between items-start mb-2">
              <span className="text-[10px] uppercase tracking-widest opacity-80">{t("assessmentFlow.compatibility.destinyCard")}</span>
              <span className="rounded-full bg-white/25 backdrop-blur px-2.5 py-0.5 text-[11px] font-bold">{t(`assessmentFlow.compatibility.rarity.${rarity}`)}</span>
            </div>
            <p className="text-5xl mb-1">{d?.emoji || "💕"}</p>
            <h3 className="font-display text-2xl font-bold leading-tight">{cpName}</h3>
            <p className="text-xs opacity-85 mt-1">{d?.title || t("compatibilityDetail.compatibilityFallback")}</p>
            <motion.p initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.25 }} className="font-display text-5xl font-extrabold mt-3 drop-shadow">
              {overallScore}%
            </motion.p>
            {d?.tags && d.tags.length > 0 && (
              <div className="flex flex-wrap justify-center gap-1.5 mt-3">
                {d.tags.slice(0, 3).map((tag: string, i: number) => (
                  <span key={i} className="rounded-full bg-white/25 backdrop-blur px-2.5 py-1 text-[11px]">#{tag}</span>
                ))}
              </div>
            )}
            <p className="text-xs opacity-90 mt-3 leading-relaxed">{d?.summary}</p>
            <p className="text-[10px] opacity-70 mt-3">{formatDate(report.created_at)}</p>
          </div>
        </motion.div>

        {/* Card 2 — Traffic Light */}
        {d?.trafficLight && (
          <div className="rounded-2xl bg-card p-5 shadow-card space-y-3">
            <h4 className="font-display text-sm font-semibold text-foreground">{t("assessmentFlow.compatibility.trafficLightTitle")}</h4>
            {(["green", "yellow", "red"] as const).map((k) => {
              const lines: string[] = d.trafficLight?.[k] || [];
              if (lines.length === 0) return null;
              const tone = k === "green" ? "bg-green-500/10 border-green-500/30" : k === "yellow" ? "bg-amber-500/10 border-amber-500/30" : "bg-rose-500/10 border-rose-500/30";
              return (
                <div key={k} className={`rounded-xl border p-3 ${tone}`}>
                  <p className="text-xs font-semibold text-foreground mb-1.5">{t(`assessmentFlow.compatibility.trafficLight.${k}`)}</p>
                  <ul className="space-y-1">
                    {lines.map((l, i) => <li key={i} className="text-sm text-foreground leading-relaxed">{l}</li>)}
                  </ul>
                </div>
              );
            })}
          </div>
        )}

        {/* Card 3 — Radar */}
        {radarData.length > 0 && (
          <div className="rounded-2xl bg-card p-5 shadow-card">
            <h4 className="font-display text-sm font-semibold text-foreground mb-1">{t("assessmentFlow.compatibility.fiveDimensions")}</h4>
            {d?.radarOneLiner && <p className="text-xs text-muted-foreground mb-2 italic">「{d.radarOneLiner}」</p>}
            <div className="h-56 -mx-2">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData} outerRadius="75%">
                  <PolarGrid stroke="hsl(var(--border))" />
                  <PolarAngleAxis dataKey="dim" tick={{ fill: "hsl(var(--foreground))", fontSize: 10 }} />
                  <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar dataKey="value" stroke="hsl(var(--secondary))" fill="hsl(var(--secondary))" fillOpacity={0.45} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Card 4 — Drama Scene */}
        {d?.dramaScene && (
          <div className="rounded-2xl bg-gradient-to-br from-rose-50 to-amber-50 dark:from-rose-950/30 dark:to-amber-950/30 p-5 shadow-card border border-rose-200/50">
            <h4 className="font-display text-sm font-semibold text-foreground mb-2">{t("assessmentFlow.compatibility.dramaTitle")}</h4>
            <p className="text-sm text-foreground leading-relaxed italic">{d.dramaScene}</p>
          </div>
        )}

        {/* Card 5 — Strengths + Conflicts */}
        {(d?.strengths?.length || d?.conflicts?.length) && (
          <div className="rounded-2xl bg-card p-5 shadow-card space-y-3">
            {d?.strengths?.length > 0 && (
              <>
                <h4 className="font-display text-sm font-semibold text-foreground">{t("assessmentFlow.compatibility.strengths")}</h4>
                <ul className="space-y-1.5">
                  {d.strengths.map((s: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-foreground"><span className="text-secondary mt-0.5">•</span><span className="leading-relaxed">{s}</span></li>
                  ))}
                </ul>
              </>
            )}
            {d?.conflicts?.length > 0 && (
              <>
                <h4 className="font-display text-sm font-semibold text-foreground pt-2">{t("assessmentFlow.compatibility.conflicts")}</h4>
                <div className="space-y-2">
                  {d.conflicts.map((c: any, i: number) => (
                    <div key={i} className="rounded-xl bg-muted/30 p-3">
                      <p className="text-sm font-medium text-foreground">🔸 {c.issue}</p>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">💡 {c.solution}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Card 6 — Love Language */}
        {d?.loveLanguage && (
          <div className="rounded-2xl bg-card p-5 shadow-card space-y-3">
            <h4 className="font-display text-sm font-semibold text-foreground">{t("assessmentFlow.compatibility.loveLanguages")}</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-muted/30 p-3 text-center">
                <p className="text-[10px] text-muted-foreground">{myName}</p>
                <p className="text-sm font-semibold text-foreground mt-1">{d.loveLanguage.mine}</p>
              </div>
              <div className="rounded-xl bg-muted/30 p-3 text-center">
                <p className="text-[10px] text-muted-foreground">{partnerName}</p>
                <p className="text-sm font-semibold text-foreground mt-1">{d.loveLanguage.partner}</p>
              </div>
            </div>
            {d.loveLanguage.actionForThem && (
              <div className="rounded-xl bg-green-500/10 border border-green-500/20 p-3">
                <p className="text-[11px] font-semibold text-foreground mb-0.5">{t("assessmentFlow.compatibility.loveActionTitle")}</p>
                <p className="text-sm text-foreground">{d.loveLanguage.actionForThem}</p>
              </div>
            )}
            {d.loveLanguage.phraseTheyWant && (
              <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3">
                <p className="text-[11px] font-semibold text-foreground mb-0.5">{t("assessmentFlow.compatibility.lovePhraseTitle")}</p>
                <p className="text-sm text-foreground italic">「{d.loveLanguage.phraseTheyWant}」</p>
              </div>
            )}
            {d.loveLanguage.tip && (
              <p className="text-xs text-muted-foreground leading-relaxed">{d.loveLanguage.tip}</p>
            )}
          </div>
        )}

        {/* Card 7 — Keywords + Prophecy */}
        {(d?.keywords?.length || d?.prophecy) && (
          <div className="rounded-2xl bg-gradient-to-br from-violet-100 to-fuchsia-100 dark:from-violet-950/30 dark:to-fuchsia-950/30 p-5 shadow-card border border-violet-200/40">
            {d?.keywords?.length > 0 && (
              <>
                <h4 className="font-display text-sm font-semibold text-foreground mb-2">{t("assessmentFlow.compatibility.keywordsTitle")}</h4>
                <div className="flex flex-wrap gap-2 mb-3">
                  {d.keywords.map((k: string, i: number) => (
                    <span key={i} className="rounded-lg bg-white/60 dark:bg-white/10 px-3 py-1 text-xs font-medium text-foreground">{k}</span>
                  ))}
                </div>
              </>
            )}
            {d?.prophecy && (
              <>
                <h4 className="font-display text-sm font-semibold text-foreground mb-1">{t("assessmentFlow.compatibility.prophecyTitle")}</h4>
                <p className="text-sm text-foreground leading-relaxed">{d.prophecy}</p>
              </>
            )}
          </div>
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
        text={t("compatibilityDetail.scoreMatch", { n: overallScore })}
      />
    </div>
    </DesktopLayout>
  );
};

export default CompatibilityDetail;
