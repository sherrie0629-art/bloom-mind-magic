import { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { ArrowLeft, Download, Sparkles } from "lucide-react";
import DesktopLayout from "@/components/DesktopLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { generateSoulFragment } from "@/hooks/useSoulFragment";
import { useSubscription } from "@/hooks/useSubscription";
import { useSharePoster } from "@/hooks/useSharePoster";
import { useLocale } from "@/hooks/useLocale";
import AssessmentQuestionLayout from "@/components/AssessmentQuestionLayout";
import ResultAIImage from "@/components/ResultAIImage";
import PosterPreviewDialog from "@/components/PosterPreviewDialog";
import DeepReportUnlock from "@/components/DeepReportUnlock";
import { Skeleton } from "@/components/ui/skeleton";
import { pickQuestionSet } from "@/data/mbtiQuestionPool";
import { getNextVariant } from "@/lib/assessmentVariant";

interface QA { question: string; answer: string; dimension: string; }
interface MBTIResult { mbtiType: string; title: string; description: string; traits: { E_I: number; S_N: number; T_F: number; J_P: number }; socialCaption: string; }

const MBTI_MOTIF: Record<string, string> = {
  INTJ: "a chess king on a starry strategic board with subtle architectural blueprint lines",
  INTP: "floating equations, a half-open book and a curious magnifying glass orbiting a small planet",
  ENTJ: "a tall castle silhouette with rising arrows and a bold compass pointing forward",
  ENTP: "a brain-shaped lightbulb sparking ideas, surrounded by paper airplanes",
  INFJ: "a single candle flame in a quiet temple, a gentle moon and rippling water",
  INFP: "floating poetry pages and pressed flowers around a crescent moon",
  ENFJ: "a warm hand guiding glowing little stars upward like a teacher and students",
  ENFP: "a vibrant burst of confetti, balloons and a sketchbook full of wild ideas",
  ISTJ: "an open pocket watch with precise gears and a stack of neatly tied scrolls",
  ISFJ: "a cozy knitted blanket, a teapot and a warmly lit window at dusk",
  ESTJ: "a strong oak tree with a banner, organized files and a clear horizon",
  ESFJ: "a long dinner table with candles, flowers and gifts being shared",
  ISTP: "a half-disassembled motorcycle engine with floating tools and a small spark",
  ISFP: "a painter's palette, drifting petals and a soft watercolor wash",
  ESTP: "a skateboard mid-air with motion lines, neon sparks and city lights",
  ESFP: "a microphone, party streamers and a disco ball raining colorful light",
};
const getImagePrompt = (result: MBTIResult) => {
  const motif = MBTI_MOTIF[result.mbtiType] || "abstract symbolic shapes";
  return `Modern editorial illustration for MBTI ${result.mbtiType} "${result.title}", featuring ${motif}. Deep indigo and violet palette with one warm accent color (gold or coral), mix of geometric and organic shapes, intellectual yet poetic mood, hand-drawn linework with subtle paper texture. Square format, no text, no letters.`;
};

const AssessmentFlow = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { locale } = useLocale();
  const { user } = useAuth();
  const { sharePoster, fetchAIImage, posterDataUrl, showPosterPreview, closePosterPreview, downloadPoster } = useSharePoster();
  const { canAssess, assessmentLimit, incrementAssessment } = useSubscription(user?.id);
  const [history, setHistory] = useState<QA[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [result, setResult] = useState<MBTIResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [started, setStarted] = useState(false);
  const [resultImageUrl, setResultImageUrl] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [parallelData, setParallelData] = useState<{ magic: { role: string; description: string }; cyberpunk: { role: string; description: string } } | null>(null);
  const [parallelLoading, setParallelLoading] = useState(false);
  const resultIdRef = useRef<string | null>(null);
  const [savedReportId, setSavedReportId] = useState<string | null>(null);
  const batchQuestionsRef = useRef<any[]>([]);

  const fetchResultImage = useCallback(async (r: MBTIResult) => {
    setImageLoading(true);
    // Safety timeout: never block the result UI on the image
    const timeoutId = setTimeout(() => setImageLoading(false), 30000);
    try {
      const img = await fetchAIImage(getImagePrompt(r), { cacheKey: `mbti-${r.mbtiType}`, returnUrlOnly: true });
      if (img) { setResultImageUrl(img.src); if (resultIdRef.current) { const { data: existing } = await supabase.from("assessment_results").select("result_data").eq("id", resultIdRef.current).single(); if (existing) { await supabase.from("assessment_results").update({ result_data: { ...existing.result_data as any, imageUrl: img.src } }).eq("id", resultIdRef.current); } } }
    } finally { clearTimeout(timeoutId); setImageLoading(false); }
  }, [fetchAIImage]);

  const fetchParallelUniverse = useCallback(async (mbtiType: string) => {
    setParallelLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("assessment", { body: { action: "parallel-universe", mbtiType, locale } });
      if (!error && data) { setParallelData(data); if (resultIdRef.current) { const { data: existing } = await supabase.from("assessment_results").select("result_data").eq("id", resultIdRef.current).single(); if (existing) { await supabase.from("assessment_results").update({ result_data: { ...existing.result_data as any, parallelUniverse: data } }).eq("id", resultIdRef.current); } } }
    } catch {} finally { setParallelLoading(false); }
  }, [locale]);

  const fetchResult = async (finalHistory: QA[]) => {
    setLoading(true); setLoadingMsg(t("assessmentFlow.common.analyzing"));
    try {
      const { data, error } = await supabase.functions.invoke("assessment", { body: { history: finalHistory, locale } });
      if (error) throw error;
      if (data.type === "result") {
        setResult(data.data); setCurrentQuestion(null); fetchResultImage(data.data); fetchParallelUniverse(data.data.mbtiType);
        if (user) { const { data: inserted } = await supabase.from("assessment_results").insert({ user_id: user.id, assessment_type: "mbti", result_data: data.data }).select("id").single(); if (inserted) { resultIdRef.current = inserted.id; setSavedReportId(inserted.id); } generateSoulFragment(user.id, "assessment", "mbti", `MBTI result: ${data.data.mbtiType} ${data.data.title}. ${data.data.description}`); }
      }
    } catch (e: any) { toast.error(e.message || t("assessmentFlow.common.loadFail")); } finally { setLoading(false); }
  };

  // Prefetch a fresh AI-generated batch in the background while user reads the intro.
  // Pick a variant up front so prefetch + fallback share the same one (advances once per session).
  const variantRef = useRef<number | null>(null);
  const prefetchedRef = useRef<Promise<any[] | null> | null>(null);
  useEffect(() => {
    if (started || prefetchedRef.current) return;
    if (variantRef.current === null) variantRef.current = getNextVariant("mbti", locale);
    prefetchedRef.current = supabase.functions
      .invoke("assessment", { body: { action: "batch-questions", locale, variant: variantRef.current } })
      .then(({ data, error }) => (!error && data?.type === "batch" && Array.isArray(data.data) && data.data.length >= 10 ? data.data : null))
      .catch(() => null);
  }, [started, locale]);

  const handleStart = async () => {
    if (!user) { toast.error(t("auth.signInFirst", "请先登录 🌙")); navigate("/auth"); return; }
    if (!canAssess) { toast.error(t("assessmentFlow.common.limitReached", { n: assessmentLimit })); return; }
    await incrementAssessment();
    setStarted(true);

    // 1) Try to use already-prefetched AI batch (often ready by the time user clicks Start).
    let batch: any[] | null = null;
    if (prefetchedRef.current) {
      batch = await Promise.race([
        prefetchedRef.current,
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 400)),
      ]);
    }

    // 2) Fallback to the local curated pool — instant, no network.
    if (!batch || batch.length < 10) {
      batch = pickQuestionSet(locale);
      // Keep the prefetch running so a later session can use it; also kick a new one for next time.
      if (!prefetchedRef.current) {
        const v = variantRef.current ?? getNextVariant("mbti", locale);
        supabase.functions.invoke("assessment", { body: { action: "batch-questions", locale, variant: v } }).catch(() => {});
      }
    }

    batchQuestionsRef.current = batch.slice(1);
    setCurrentQuestion(batch[0]);
    setLoading(false);
  };

  const handleAnswer = (option: { label: string; text: string }) => {
    if (!currentQuestion) return;
    const qa: QA = { question: currentQuestion.question, answer: `${option.label}. ${option.text}`, dimension: currentQuestion.dimension };
    const newHistory = [...history, qa]; setHistory(newHistory);
    if (batchQuestionsRef.current.length > 0) { const next = batchQuestionsRef.current[0]; batchQuestionsRef.current = batchQuestionsRef.current.slice(1); setCurrentQuestion(next); }
    else { setCurrentQuestion(null); fetchResult(newHistory); }
  };

  const dimEI = t("assessmentFlow.mbti.dim.ei", { returnObjects: true }) as string[];
  const dimSN = t("assessmentFlow.mbti.dim.sn", { returnObjects: true }) as string[];
  const dimTF = t("assessmentFlow.mbti.dim.tf", { returnObjects: true }) as string[];
  const dimJP = t("assessmentFlow.mbti.dim.jp", { returnObjects: true }) as string[];

  const handleSharePoster = () => {
    if (!result) return;
    sharePoster({
      title: result.mbtiType, subtitle: result.title, description: result.description, icon: "🧠", caption: result.socialCaption,
      accentColor: "#6366f1", accentColorLight: "#818cf8",
      bars: [
        { label1: dimEI[0], label2: dimEI[1], value: result.traits.E_I },
        { label1: dimSN[0], label2: dimSN[1], value: result.traits.S_N },
        { label1: dimTF[0], label2: dimTF[1], value: result.traits.T_F },
        { label1: dimJP[0], label2: dimJP[1], value: result.traits.J_P },
      ],
      extraLines: parallelData ? [`${t("assessmentFlow.mbti.fantasyWorld")}: ${parallelData.magic.role}`, `${t("assessmentFlow.mbti.cyberpunk")}: ${parallelData.cyberpunk.role}`] : undefined,
      preloadedImageUrl: resultImageUrl || undefined, imagePrompt: !resultImageUrl ? getImagePrompt(result) : undefined,
    });
  };

  if (!started) {
    return (
      <DesktopLayout>
      <div className="min-h-screen bg-gradient-calm flex flex-col">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => navigate("/assessment")} className="text-muted-foreground"><ArrowLeft className="h-5 w-5" /></button>
          <h2 className="text-sm font-semibold text-foreground">{t("assessmentFlow.mbti.title")}</h2>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
            <div className="mx-auto mb-6 h-24 w-24 rounded-full bg-gradient-mystic flex items-center justify-center"><span className="text-4xl">🧠</span></div>
            <h1 className="font-display text-2xl font-bold text-foreground">{t("assessmentFlow.mbti.introTitle")}</h1>
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{t("assessmentFlow.mbti.introDesc")}</p>
            <button onClick={handleStart} className="mt-8 rounded-xl bg-gradient-golden px-8 py-3 text-sm font-semibold text-primary-foreground shadow-glow">{t("assessmentFlow.mbti.start")}</button>
          </motion.div>
        </div>
      </div>
      </DesktopLayout>
    );
  }

  if (result) {
    return (
      <DesktopLayout>
      <div className="min-h-screen bg-gradient-calm pb-8">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => navigate("/assessment")} className="text-muted-foreground"><ArrowLeft className="h-5 w-5" /></button>
          <h2 className="text-sm font-semibold text-foreground">{t("assessmentFlow.mbti.resultsTitle")}</h2>
        </div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="px-6">
          <div className="text-center mt-4 mb-6">
            <div className="mx-auto mb-4 h-20 w-20 rounded-full bg-gradient-mystic flex items-center justify-center"><span className="font-display text-2xl font-bold text-primary-foreground">{result.mbtiType}</span></div>
            <h1 className="font-display text-xl font-bold text-foreground">{result.mbtiType} — {result.title}</h1>
            <p className="mt-1 text-xs text-secondary">"{result.socialCaption}"</p>
          </div>
          <ResultAIImage imageUrl={resultImageUrl} loading={imageLoading} />
          <div className="rounded-2xl bg-card p-5 shadow-card mb-4"><h3 className="font-display text-sm font-semibold text-foreground mb-3">{t("assessmentFlow.mbti.personalityAnalysis")}</h3><p className="text-sm text-muted-foreground leading-relaxed">{result.description}</p></div>
          <div className="rounded-2xl bg-card p-5 shadow-card mb-4">
            <h3 className="font-display text-sm font-semibold text-foreground mb-4">{t("assessmentFlow.mbti.dimensionAnalysis")}</h3>
            {[
              { l1: dimEI[0], l2: dimEI[1], v: result.traits.E_I },
              { l1: dimSN[0], l2: dimSN[1], v: result.traits.S_N },
              { l1: dimTF[0], l2: dimTF[1], v: result.traits.T_F },
              { l1: dimJP[0], l2: dimJP[1], v: result.traits.J_P },
            ].map(b => (
              <div key={b.l1} className="mb-3">
                <div className="flex justify-between text-xs text-muted-foreground mb-1"><span>{b.l1}</span><span>{b.l2}</span></div>
                <div className="h-2 rounded-full bg-muted overflow-hidden"><motion.div initial={{ width: 0 }} animate={{ width: `${b.v}%` }} transition={{ duration: 0.8 }} className="h-full rounded-full bg-gradient-golden" /></div>
                <div className="text-right text-[10px] text-muted-foreground mt-0.5">{b.v}%</div>
              </div>
            ))}
          </div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="rounded-2xl bg-card p-5 shadow-card mb-4">
            <h3 className="font-display text-sm font-semibold text-foreground mb-3 flex items-center gap-1.5"><Sparkles className="h-4 w-4 text-accent" /> {t("assessmentFlow.mbti.parallelUniverse")}</h3>
            {parallelLoading ? (<div className="space-y-3"><Skeleton className="h-16 rounded-xl" /><Skeleton className="h-16 rounded-xl" /></div>) : parallelData ? (
              <div className="space-y-3">
                <div className="rounded-xl bg-muted/50 p-3"><p className="text-xs font-semibold text-foreground mb-1">{t("assessmentFlow.mbti.fantasyWorld")} · {parallelData.magic.role}</p><p className="text-xs text-muted-foreground leading-relaxed">{parallelData.magic.description}</p></div>
                <div className="rounded-xl bg-muted/50 p-3"><p className="text-xs font-semibold text-foreground mb-1">{t("assessmentFlow.mbti.cyberpunk")} · {parallelData.cyberpunk.role}</p><p className="text-xs text-muted-foreground leading-relaxed">{parallelData.cyberpunk.description}</p></div>
              </div>
            ) : null}
          </motion.div>
          {savedReportId && (
            <div className="mb-4">
              <DeepReportUnlock source="assessment" reportId={savedReportId} typeLabel={`${result.mbtiType} — ${result.title}`} />
            </div>
          )}
          <div className="flex gap-3">
            <button onClick={handleSharePoster} className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-card py-3 text-sm font-medium text-foreground shadow-card"><Download className="h-4 w-4" /> {t("assessmentFlow.common.saveAndShare")}</button>
            <button onClick={() => navigate(`/chat?agent=barista`, { state: { mbtiResult: { mbtiType: result.mbtiType, title: result.title, description: result.description, parallelUniverse: parallelData || undefined } } })}
              className="flex-1 rounded-xl bg-gradient-golden py-3 text-sm font-semibold text-primary-foreground">{t("assessmentFlow.common.talkAboutIt")}</button>
          </div>
        </motion.div>
        <PosterPreviewDialog open={showPosterPreview} dataUrl={posterDataUrl} onClose={closePosterPreview} onDownload={downloadPoster} />
      </div>
      </DesktopLayout>
    );
  }

  return <AssessmentQuestionLayout title={t("assessmentFlow.mbti.title")} backPath="/assessment" questionNumber={history.length + 1} totalQuestions={10} loading={loading} loadingMessage={loadingMsg} question={currentQuestion} onAnswer={handleAnswer} />;
};

export default AssessmentFlow;
