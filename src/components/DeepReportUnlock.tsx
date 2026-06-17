import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Crown, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import DeepReportRenderer from "@/components/DeepReportRenderer";

interface Props {
  source?: "assessment" | "compatibility";
  reportId: string;
  typeLabel: string;
  initialDeepReport?: string | null;
  createdAt?: string;
}

export default function DeepReportUnlock({
  source = "assessment",
  reportId,
  typeLabel,
  initialDeepReport,
  createdAt,
}: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, promptLogin } = useAuth();
  const { plan, canDeepReport } = useSubscription(user?.id);

  const [deepReport, setDeepReport] = useState<string | null>(initialDeepReport || null);
  const [showDeepReport, setShowDeepReport] = useState(!!initialDeepReport);
  const [loading, setLoading] = useState(false);

  const isPlus = plan === "plus";

  const handleClick = async () => {
    if (!user) {
      promptLogin(t("auth.signInToUnlockDeep", { defaultValue: "登录后即可解锁这份深度报告 ✨" }));
      return;
    }
    if (!canDeepReport) {
      toast.error(t("assessmentDetail.dailyDeepLimit"));
      return;
    }
    if (!user || !reportId) return;
    setLoading(true);
    try {
      const locale = (i18n.resolvedLanguage || i18n.language || "en").startsWith("zh") ? "zh" : "en";
      const { data, error } = await supabase.functions.invoke("generate-deep-report", {
        body: source === "compatibility"
          ? { source, reportId, locale }
          : { assessmentId: reportId, locale },
      });
      if (error) {
        const msg = typeof error === "object" && "message" in error ? (error as any).message : String(error);
        if (msg.includes("402") || msg.includes("upgrade")) { toast.error(t("assessmentDetail.needUpgrade")); return; }
        if (msg.includes("429") || msg.includes("limit")) { toast.error(t("assessmentDetail.dailyDeepLimit")); return; }
        throw error;
      }
      if (data?.needUpgrade) { toast.error(t("assessmentDetail.needUpgrade")); return; }
      if (data?.dailyLimitReached) { toast.error(t("assessmentDetail.dailyDeepLimit")); return; }
      if (data?.deepReport) {
        setDeepReport(data.deepReport);
        setShowDeepReport(true);
        toast.success(t("assessmentDetail.deepDone"));
      }
    } catch (e: any) {
      toast.error(e?.message || t("assessmentDetail.deepFail"));
    } finally {
      setLoading(false);
    }
  };

  if (showDeepReport && deepReport) {
    return <DeepReportRenderer markdown={deepReport} typeLabel={typeLabel} generatedAt={createdAt || new Date().toISOString()} />;
  }

  const showLockedTeaser = !isPlus;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="rounded-2xl bg-card p-5 shadow-card border border-secondary/20"
    >
      <div className="flex items-center gap-2 mb-3">
        <Crown className="h-5 w-5 text-secondary" />
        <h4 className="font-display text-sm font-semibold text-foreground">{t("assessmentDetail.deepTitle")}</h4>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed mb-1">{t("assessmentDetail.deepIntroLine")}</p>
      <ul className="text-xs text-muted-foreground space-y-1 mb-4">
        {(t("assessmentDetail.deepBullets", { returnObjects: true, defaultValue: [] }) as string[]).map((b, i) => (
          <li key={i} className="flex items-center gap-1.5">
            <Sparkles className="h-3 w-3 text-secondary" /> {b}
          </li>
        ))}
      </ul>

      {showLockedTeaser && (
        <div className="relative mb-4 overflow-hidden rounded-xl">
          <div className="blur-sm select-none pointer-events-none p-3 bg-muted/30 text-xs text-muted-foreground leading-relaxed">
            {t("assessmentDetail.deepTeaser")}
          </div>
          <div className="absolute inset-0 flex items-center justify-center bg-card/40">
            <span className="text-[11px] text-muted-foreground font-medium">{t("assessmentDetail.unlockToRead")}</span>
          </div>
        </div>
      )}

      <button
        onClick={handleClick}
        disabled={loading}
        className="w-full rounded-xl bg-gradient-golden py-3 text-sm font-semibold text-primary-foreground flex items-center justify-center gap-2 disabled:opacity-60"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("assessmentDetail.generating")}
          </>
        ) : (
          <>
            <Crown className="h-4 w-4" />
            {isPlus ? t("assessmentDetail.generatePlus") : t("assessmentDetail.upgradeUnlock")}
          </>
        )}
      </button>
      {!isPlus && (
        <p className="text-[10px] text-muted-foreground text-center mt-2">{t("assessmentDetail.plusPerk")}</p>
      )}
    </motion.div>
  );
}
