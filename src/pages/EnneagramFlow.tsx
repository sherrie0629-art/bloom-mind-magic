import { isDailyLimitError } from "@/lib/assessmentErrors";
import { useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { ArrowLeft, Download } from "lucide-react";
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

interface EnneagramResult {
  type: number;
  wing: string;
  wingExplanation?: string;
  title: string;
  coreFear: string;
  coreDesire: string;
  description: string;
  traits: { selfAwareness: number; empathy: number; resilience: number; growth: number };
  growthPath: string;
  stressArrow: string;
  advice: string;
  socialCaption: string;
}

const ENNEA_SCENE: Record<number, { scene: string; colors: string }> = {
  1: { scene: "a young girl at a tidy desk with perfectly aligned pencils, a small ruler, and a single neat stack of paper, soft focused smile", colors: "ivory, slate blue and a touch of sage" },
  2: { scene: "a young girl with a soft warm smile holding a steaming mug of cocoa with little hearts floating above her hands", colors: "peach, rose pink and cream" },
  3: { scene: "a stylish young girl in a cute blazer climbing stacked golden trophies and medals toward a glowing star, confident bright expression", colors: "champagne gold, tangerine and warm beige" },
  4: { scene: "a dreamy young girl artist painting under moonlight with floating colorful brushstrokes and stars, gentle wistful smile", colors: "deep violet, dusk blue and lilac" },
  5: { scene: "a curious young girl with oversized headphones surrounded by floating books, telescopes and tiny equations, bright eyes", colors: "olive green, charcoal and parchment" },
  6: { scene: "a small lighthouse guiding a tiny boat through gentle waves under a starry sky, with a young girl waving cheerfully from the shore", colors: "sea blue, amber lantern glow and ivory" },
  7: { scene: "a joyful young girl riding a hot air balloon through candy-colored clouds and confetti, laughing freely", colors: "coral, lemon yellow and sky blue" },
  8: { scene: "a confident young girl in a cool jacket standing on a rocky cliff with a small lion cub beside her, subtle ember and lava textures, brave but fresh-faced", colors: "brick red, burnt orange and obsidian" },
  9: { scene: "a peaceful young girl napping on a fluffy cloud above soft hot-spring ripples, cozy and serene", colors: "matcha green, cream and powder pink" },
};
const getImagePrompt = (result: EnneagramResult) => {
  const meta = ENNEA_SCENE[result.type] || ENNEA_SCENE[9];
  return `Cute, bright, modern editorial illustration in a contemporary Xiaohongshu × Apple memoji art style for Enneagram Type ${result.type} "${result.title}". Feature ${meta.scene}. Use a warm lively palette of ${meta.colors}, soft paper textures, hand-drawn linework, youthful fresh atmosphere. STRICT character rule: any human figure MUST be a bright, fresh young girl in her late teens to early twenties, soft cheerful expression, dewy light makeup vibe, casual modern outfit. Absolutely NO middle-aged women, NO mothers, NO mature or stern adult characters, NO heavy or somber moods. Square format, no text, no letters.`;
};

const EnneagramFlow = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { locale } = useLocale();
  const { user } = useAuth();
  const { sharePoster, fetchAIImage, posterDataUrl, showPosterPreview, closePosterPreview, downloadPoster } = useSharePoster();
  const { canAssess, assessmentLimit, incrementAssessment } = useSubscription(user?.id);
  const [history, setHistory] = useState<QA[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [result, setResult] = useState<EnneagramResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [started, setStarted] = useState(false);
  const [resultImageUrl, setResultImageUrl] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);

  const resultIdRef = useRef<string | null>(null);
  const [savedReportId, setSavedReportId] = useState<string | null>(null);
  const batchQuestionsRef = useRef<any[]>([]);

  const fetchResultImage = useCallback(async (r: EnneagramResult) => {
    setImageLoading(true);
    try {
      const img = await fetchAIImage(getImagePrompt(r), { cacheKey: `enneagram-${r.type}` });
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
      const { data, error } = await supabase.functions.invoke("assessment-enneagram", {
        body: { history: finalHistory, locale },
      });
      if (error) throw error;
      if (data.type === "result") {
        setResult(data.data);
        setCurrentQuestion(null);
        fetchResultImage(data.data);
        if (user) {
          const { data: inserted } = await supabase.from("assessment_results").insert({
            user_id: user.id, assessment_type: "enneagram", result_data: data.data,
          }).select("id").single();
          if (inserted) { resultIdRef.current = inserted.id; setSavedReportId(inserted.id); }
          generateSoulFragment(user.id, "assessment", "enneagram", `Enneagram Type ${data.data.type}: ${data.data.title}. ${data.data.description}`);
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
      const { data, error } = await supabase.functions.invoke("assessment-enneagram", {
        body: { action: "batch-questions", locale },
      });
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
      title: `Type ${result.type}`,
      subtitle: result.title,
      description: result.description,
      icon: "🎯",
      caption: result.socialCaption,
      accentColor: "#2dd4bf",
      accentColorLight: "#5eead4",
      bars: [
        { label1: t("assessmentDetail.dim.thinking"), label2: "", value: result.traits.selfAwareness },
        { label1: t("assessmentDetail.dim.feeling"), label2: "", value: result.traits.empathy },
        { label1: t("assessmentDetail.dim.instinct"), label2: "", value: result.traits.resilience },
        { label1: t("assessmentDetail.dim.growth"), label2: "", value: result.traits.growth },
      ],
      extraLines: [
        `🎯 ${t("assessmentFlow.enneagram.wing")}: ${result.wing}`,
        `💡 ${t("assessmentFlow.enneagram.growth")}: ${result.growthPath}`,
        `⚡ ${t("assessmentFlow.enneagram.underStress")}: ${result.stressArrow}`,
        `🌱 ${result.advice}`,
      ],
      preloadedImageUrl: resultImageUrl || undefined,
      imagePrompt: !resultImageUrl ? getImagePrompt(result) : undefined,
      imageCacheKey: `enneagram-${result.type}`,
    });
  };

  if (!started) {
    return (
      <div className="min-h-screen bg-gradient-calm flex flex-col">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => navigate("/assessment")} className="text-muted-foreground"><ArrowLeft className="h-5 w-5" /></button>
          <h2 className="text-sm font-semibold text-foreground">{t("assessmentFlow.enneagram.title")}</h2>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-8">
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-sm text-center">
            <div className="mx-auto mb-6 h-24 w-24 rounded-full bg-gradient-mystic flex items-center justify-center"><span className="text-4xl">🎯</span></div>
            <h1 className="font-display text-2xl font-bold text-foreground">{t("assessmentFlow.enneagram.introTitle")}</h1>
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed whitespace-pre-line" dangerouslySetInnerHTML={{ __html: t("assessmentFlow.enneagram.introDesc") }} />
            <button onClick={handleStart} className="mt-8 w-full rounded-xl bg-gradient-golden px-8 py-3 text-sm font-semibold text-primary-foreground shadow-glow">{t("assessmentFlow.enneagram.start")}</button>
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
          <h2 className="text-sm font-semibold text-foreground">{t("assessmentFlow.enneagram.resultsTitle")}</h2>
        </div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="px-6">
          <div className="text-center mt-4 mb-6">
            <div className="mx-auto mb-4 h-20 w-20 rounded-full bg-gradient-mystic flex items-center justify-center"><span className="text-3xl">🎯</span></div>
            <h1 className="font-display text-xl font-bold text-foreground">Type {result.type} · {result.title}</h1>
            <p className="mt-1 text-xs text-secondary">{t("assessmentFlow.enneagram.wing")}: {result.wing}</p>
            <p className="mt-1 text-xs text-muted-foreground">"{result.socialCaption}"</p>
          </div>
          <ResultAIImage imageUrl={resultImageUrl} loading={imageLoading} />
          <div className="rounded-2xl bg-card p-5 shadow-card mb-4">
            <h3 className="font-display text-sm font-semibold text-foreground mb-3">{t("assessmentFlow.enneagram.innerWorld")}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{result.description}</p>
          </div>
          <div className="rounded-2xl bg-card p-5 shadow-card mb-4">
            <h3 className="font-display text-sm font-semibold text-foreground mb-3">{t("assessmentFlow.enneagram.coreMotivations")}</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-muted/30 p-3">
                <p className="text-[10px] text-muted-foreground">{t("assessmentFlow.enneagram.coreFear")}</p>
                <p className="text-sm font-semibold text-foreground mt-1">{result.coreFear}</p>
              </div>
              <div className="rounded-xl bg-muted/30 p-3">
                <p className="text-[10px] text-muted-foreground">{t("assessmentFlow.enneagram.coreDesire")}</p>
                <p className="text-sm font-semibold text-foreground mt-1">{result.coreDesire}</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl bg-card p-5 shadow-card mb-4">
            <h3 className="font-display text-sm font-semibold text-foreground mb-2">{t("assessmentFlow.enneagram.growthStress")}</h3>
            <p className="text-sm text-muted-foreground mb-2"><strong>{t("assessmentFlow.enneagram.growth")}:</strong> {result.growthPath}</p>
            <p className="text-sm text-muted-foreground"><strong>{t("assessmentFlow.enneagram.underStress")}:</strong> {result.stressArrow}</p>
          </div>
          <div className="rounded-2xl bg-card p-5 shadow-card mb-4">
            <h3 className="font-display text-sm font-semibold text-foreground mb-2">{t("assessmentFlow.enneagram.advice")}</h3>
            <p className="text-sm text-muted-foreground">{result.advice}</p>
          </div>
          {savedReportId && (
            <div className="mb-4">
              <DeepReportUnlock source="assessment" reportId={savedReportId} typeLabel={`Type ${result.type} · ${result.title}`} />
            </div>
          )}
          <div className="flex gap-3">
            <button onClick={handleSharePoster} className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-card py-3 text-sm font-medium text-foreground shadow-card">
              <Download className="h-4 w-4" /> {t("assessmentFlow.common.saveAndShare")}
            </button>
            <button onClick={() => navigate(`/chat?agent=bestie`, {
              state: { enneagramResult: { type: result.type, wing: result.wing, title: result.title, description: result.description, coreFear: result.coreFear, coreDesire: result.coreDesire, growthPath: result.growthPath, stressArrow: result.stressArrow, advice: result.advice } },
            })} className="flex-1 rounded-xl bg-gradient-golden py-3 text-sm font-semibold text-primary-foreground">
              {t("assessmentFlow.enneagram.talkToBestie")}
            </button>
          </div>
        </motion.div>
        <PosterPreviewDialog open={showPosterPreview} dataUrl={posterDataUrl} onClose={closePosterPreview} onDownload={downloadPoster} />
      </div>
    );
  }

  return (
    <AssessmentQuestionLayout title={t("assessmentFlow.enneagram.title")} backPath="/assessment" questionNumber={history.length + 1} totalQuestions={10} loading={loading} loadingMessage={loadingMsg} question={currentQuestion} onAnswer={handleAnswer} />
  );
};

export default EnneagramFlow;
