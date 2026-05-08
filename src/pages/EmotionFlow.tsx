import { isDailyLimitError } from "@/lib/assessmentErrors";
import { useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { ArrowLeft, Download, Heart } from "lucide-react";
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

interface QA { question: string; answer: string; dimension: string; }

interface WellnessResult {
  emotionLevel: string;
  emoji: string;
  title: string;
  description: string;
  traits: { burnout: number; energy: number; boundaries: number; sleep: number };
  suggestions: string[];
  socialCaption: string;
}

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 32) || "default";
const getImagePrompt = (result: WellnessResult) =>
  `Cozy, warm editorial illustration depicting a person's emotional state titled "${result.title}". Show a relatable everyday scene that visually expresses this feeling — for example soft window light, a cup of tea, a blanket, a cat curled nearby, or a person taking a deep breath in their room. Style: gentle gouache with subtle risograph grain, hand-drawn linework, slightly playful and full of life, palette of warm rose, coral, butter yellow and soft cream, a touch of sage green. Single focused composition, square format, no text, no letters.`;
const getImageCacheKey = (result: WellnessResult) => `wellness_${slugify(result.title)}`;

const EmotionFlow = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { locale } = useLocale();
  const { user } = useAuth();
  const { sharePoster, fetchAIImage, posterDataUrl, showPosterPreview, closePosterPreview, downloadPoster } = useSharePoster();
  const { canAssess, assessmentLimit, incrementAssessment } = useSubscription(user?.id);
  const [history, setHistory] = useState<QA[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [result, setResult] = useState<WellnessResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [started, setStarted] = useState(false);
  const [resultImageUrl, setResultImageUrl] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);

  const resultIdRef = useRef<string | null>(null);
  const [savedReportId, setSavedReportId] = useState<string | null>(null);
  const batchQuestionsRef = useRef<any[]>([]);

  const fetchResultImage = useCallback(async (r: WellnessResult) => {
    setImageLoading(true);
    try {
      const img = await fetchAIImage(getImagePrompt(r), { cacheKey: getImageCacheKey(r), returnUrlOnly: true });
      if (img) {
        setResultImageUrl(img.src);
        if (resultIdRef.current) {
          const { data: existing } = await supabase.from("assessment_results").select("result_data").eq("id", resultIdRef.current).single();
          if (existing) {
            await supabase.from("assessment_results").update({ result_data: { ...existing.result_data as any, imageUrl: img.src } }).eq("id", resultIdRef.current);
          }
        }
      }
    } finally { setImageLoading(false); }
  }, [fetchAIImage]);

  const fetchResult = async (finalHistory: QA[]) => {
    setLoading(true);
    setLoadingMsg(t("assessmentFlow.common.analyzing"));
    try {
      const { data, error } = await supabase.functions.invoke("assessment-emotion", { body: { history: finalHistory, locale } });
      if (error) throw error;
      if (data.type === "result") {
        setResult(data.data);
        setCurrentQuestion(null);
        fetchResultImage(data.data);
        if (user) {
          const { data: inserted } = await supabase.from("assessment_results").insert({
            user_id: user.id, assessment_type: "emotion", result_data: data.data,
          }).select("id").single();
          if (inserted) { resultIdRef.current = inserted.id; setSavedReportId(inserted.id); }
          generateSoulFragment(user.id, "assessment", "emotion", `Wellness: ${data.data.emotionLevel} ${data.data.title}. ${data.data.description}`);
        }
      }
    } catch (e: any) {
      if (isDailyLimitError(e)) toast.error(t("assessmentFlow.common.limitReached", { n: 20 }));
      else toast.error(e.message || t("assessmentFlow.common.loadFail"));
    } finally { setLoading(false); }
  };

  const handleStart = async () => {
    if (!user) { toast.error(t("auth.signInFirst", "请先登录 🌙")); navigate("/auth"); return; }
    if (!canAssess) { toast.error(t("assessmentFlow.common.limitReached", { n: assessmentLimit })); return; }
    await incrementAssessment();
    setStarted(true);
    setLoading(true);
    setLoadingMsg(t("assessmentFlow.common.starting"));
    try {
      const { data, error } = await supabase.functions.invoke("assessment-emotion", { body: { action: "batch-questions", locale } });
      if (error) throw error;
      if (data.type === "batch" && data.data?.length > 0) {
        batchQuestionsRef.current = data.data.slice(1);
        setCurrentQuestion(data.data[0]);
      }
    } catch (e: any) {
      if (isDailyLimitError(e)) toast.error(t("assessmentFlow.common.limitReached", { n: 20 }));
      else toast.error(e.message || t("assessmentFlow.common.loadFail"));
    } finally { setLoading(false); }
  };

  const handleAnswer = (option: { label: string; text: string }) => {
    if (!currentQuestion) return;
    const qa: QA = { question: currentQuestion.question, answer: `${option.label}. ${option.text}`, dimension: currentQuestion.dimension };
    const newHistory = [...history, qa];
    setHistory(newHistory);
    if (batchQuestionsRef.current.length > 0) {
      const next = batchQuestionsRef.current[0];
      batchQuestionsRef.current = batchQuestionsRef.current.slice(1);
      setCurrentQuestion(next);
    } else { setCurrentQuestion(null); fetchResult(newHistory); }
  };

  const handleSharePoster = () => {
    if (!result) return;
    sharePoster({
      title: `${result.emoji} ${result.emotionLevel}`,
      subtitle: result.title,
      description: result.description,
      icon: result.emoji,
      caption: result.socialCaption,
      accentColor: "#e07a7a",
      accentColorLight: "#f0a0a0",
      bars: [
        { label1: t("assessmentFlow.emotion.burnout"), label2: t("assessmentFlow.emotion.lowerIsBetter"), value: result.traits.burnout },
        { label1: t("assessmentFlow.emotion.energy"), label2: "", value: result.traits.energy },
        { label1: t("assessmentFlow.emotion.boundaries"), label2: "", value: result.traits.boundaries },
        { label1: t("assessmentFlow.emotion.sleep"), label2: "", value: result.traits.sleep },
      ],
      extraLines: result.suggestions.map((s, i) => `${i + 1}. ${s}`),
      preloadedImageUrl: resultImageUrl || undefined,
      imagePrompt: !resultImageUrl ? getImagePrompt(result) : undefined,
      imageCacheKey: getImageCacheKey(result),
    });
  };

  if (!started) {
    return (
      <div className="min-h-screen bg-gradient-calm flex flex-col">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => navigate("/assessment")} className="text-muted-foreground"><ArrowLeft className="h-5 w-5" /></button>
          <h2 className="text-sm font-semibold text-foreground">{t("assessmentFlow.emotion.title")}</h2>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
            <div className="mx-auto mb-6 h-24 w-24 rounded-full bg-gradient-mystic flex items-center justify-center">
              <Heart className="h-12 w-12 text-primary-foreground" />
            </div>
            <h1 className="font-display text-2xl font-bold text-foreground">{t("assessmentFlow.emotion.introTitle")}</h1>
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{t("assessmentFlow.emotion.introDesc")}</p>
            <button onClick={handleStart} className="mt-8 rounded-xl bg-gradient-golden px-8 py-3 text-sm font-semibold text-primary-foreground shadow-glow">
              {t("assessmentFlow.emotion.start")}
            </button>
          </motion.div>
        </div>
      </div>
    );
  }

  if (result) {
    return (
      <div className="min-h-screen bg-gradient-calm pb-8">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => navigate("/assessment")} className="text-muted-foreground"><ArrowLeft className="h-5 w-5" /></button>
          <h2 className="text-sm font-semibold text-foreground">{t("assessmentFlow.emotion.resultsTitle")}</h2>
        </div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="px-6">
          <div className="text-center mt-4 mb-6">
            <div className="mx-auto mb-4 h-20 w-20 rounded-full bg-gradient-mystic flex items-center justify-center">
              <span className="text-4xl">{result.emoji}</span>
            </div>
            <h1 className="font-display text-xl font-bold text-foreground">{result.title}</h1>
            <p className="mt-1 text-xs text-secondary">{result.emotionLevel}</p>
            <p className="mt-1 text-xs text-muted-foreground">"{result.socialCaption}"</p>
          </div>
          <ResultAIImage imageUrl={resultImageUrl} loading={imageLoading} />
          <div className="rounded-2xl bg-card p-5 shadow-card mb-4">
            <h3 className="font-display text-sm font-semibold text-foreground mb-3">{t("assessmentFlow.emotion.analysis")}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{result.description}</p>
          </div>
          <div className="rounded-2xl bg-card p-5 shadow-card mb-4">
            <h3 className="font-display text-sm font-semibold text-foreground mb-4">{t("assessmentFlow.emotion.dimensions")}</h3>
            {[
              { l: t("assessmentFlow.emotion.burnout"), v: result.traits.burnout, invert: true },
              { l: t("assessmentFlow.emotion.energy"), v: result.traits.energy },
              { l: t("assessmentFlow.emotion.boundaries"), v: result.traits.boundaries },
              { l: t("assessmentFlow.emotion.sleep"), v: result.traits.sleep },
            ].map(b => (
              <div key={b.l} className="mb-3">
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>{b.l} {b.invert ? t("assessmentFlow.emotion.lowerIsBetter") : ""}</span><span>{b.v}%</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${b.v}%` }} transition={{ duration: 0.8 }} className="h-full rounded-full bg-gradient-golden" />
                </div>
              </div>
            ))}
          </div>
          <div className="rounded-2xl bg-card p-5 shadow-card mb-4">
            <h3 className="font-display text-sm font-semibold text-foreground mb-3">{t("assessmentFlow.emotion.actionPlan")}</h3>
            <div className="space-y-2">
              {result.suggestions.map((s, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-secondary/20 text-[10px] font-bold text-secondary">{i + 1}</span>
                  <p className="text-sm text-muted-foreground">{s}</p>
                </div>
              ))}
            </div>
          </div>
          {savedReportId && (
            <div className="mb-4">
              <DeepReportUnlock source="assessment" reportId={savedReportId} typeLabel={`${(result as any).emoji || "🎭"} ${result.title}`} />
            </div>
          )}
          <div className="flex gap-3">
            <button onClick={handleSharePoster} className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-card py-3 text-sm font-medium text-foreground shadow-card">
              <Download className="h-4 w-4" /> {t("assessmentFlow.common.saveAndShare")}
            </button>
            <button onClick={() => navigate(`/chat?agent=jax`, {
              state: { emotionResult: { emotionLevel: result.emotionLevel, title: result.title, description: result.description, traits: result.traits, suggestions: result.suggestions } },
            })} className="flex-1 rounded-xl bg-gradient-golden py-3 text-sm font-semibold text-primary-foreground">
              {t("assessmentFlow.emotion.talkToJax")}
            </button>
          </div>
        </motion.div>
        <PosterPreviewDialog open={showPosterPreview} dataUrl={posterDataUrl} onClose={closePosterPreview} onDownload={downloadPoster} />
      </div>
    );
  }

  return (
    <AssessmentQuestionLayout title={t("assessmentFlow.emotion.title")} backPath="/assessment" questionNumber={history.length + 1} totalQuestions={10} loading={loading} loadingMessage={loadingMsg} question={currentQuestion} onAnswer={handleAnswer} />
  );
};

export default EmotionFlow;
