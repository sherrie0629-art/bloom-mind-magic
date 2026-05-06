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

interface QA { question: string; answer: string; dimension: string; }

const ZODIAC_SIGNS = [
  { name: "Aries", icon: "♈", element: "Fire" },
  { name: "Taurus", icon: "♉", element: "Earth" },
  { name: "Gemini", icon: "♊", element: "Air" },
  { name: "Cancer", icon: "♋", element: "Water" },
  { name: "Leo", icon: "♌", element: "Fire" },
  { name: "Virgo", icon: "♍", element: "Earth" },
  { name: "Libra", icon: "♎", element: "Air" },
  { name: "Scorpio", icon: "♏", element: "Water" },
  { name: "Sagittarius", icon: "♐", element: "Fire" },
  { name: "Capricorn", icon: "♑", element: "Earth" },
  { name: "Aquarius", icon: "♒", element: "Air" },
  { name: "Pisces", icon: "♓", element: "Water" },
];

const ZH_NAMES: Record<string, string> = {
  Aries: "白羊座", Taurus: "金牛座", Gemini: "双子座", Cancer: "巨蟹座",
  Leo: "狮子座", Virgo: "处女座", Libra: "天秤座", Scorpio: "天蝎座",
  Sagittarius: "射手座", Capricorn: "摩羯座", Aquarius: "水瓶座", Pisces: "双鱼座",
};
const ZH_ELEMENTS: Record<string, string> = { Fire: "火象", Earth: "土象", Air: "风象", Water: "水象" };
const EN_DATES: Record<string, string> = {
  Aries: "Mar 21 – Apr 19", Taurus: "Apr 20 – May 20", Gemini: "May 21 – Jun 21", Cancer: "Jun 22 – Jul 22",
  Leo: "Jul 23 – Aug 22", Virgo: "Aug 23 – Sep 22", Libra: "Sep 23 – Oct 23", Scorpio: "Oct 24 – Nov 22",
  Sagittarius: "Nov 23 – Dec 21", Capricorn: "Dec 22 – Jan 19", Aquarius: "Jan 20 – Feb 18", Pisces: "Feb 19 – Mar 20",
};
const ZH_DATES: Record<string, string> = {
  Aries: "3.21 – 4.19", Taurus: "4.20 – 5.20", Gemini: "5.21 – 6.21", Cancer: "6.22 – 7.22",
  Leo: "7.23 – 8.22", Virgo: "8.23 – 9.22", Libra: "9.23 – 10.23", Scorpio: "10.24 – 11.22",
  Sagittarius: "11.23 – 12.21", Capricorn: "12.22 – 1.19", Aquarius: "1.20 – 2.18", Pisces: "2.19 – 3.20",
};

interface ZodiacResult {
  zodiacSign: string;
  element: string;
  title: string;
  description: string;
  traits: { overall: number; love: number; career: number; fortune: number };
  luckyItems: { color: string; number: string; direction: string };
  advice: string;
  socialCaption: string;
}

const getImagePromptForSign = (signName: string, element: string) =>
  `Create a dreamy celestial illustration representing the zodiac sign ${signName} with ${element} element. Soft purple and violet cosmic tones, stars, constellation patterns. Ethereal and magical. Square format, no text.`;
const getCacheKeyForSign = (signName: string) => `zodiac_${signName.toLowerCase()}`;

const ZodiacFlow = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { locale } = useLocale();
  const { user } = useAuth();
  const { sharePoster, fetchAIImage, posterDataUrl, showPosterPreview, closePosterPreview, downloadPoster } = useSharePoster();
  const { canAssess, assessmentLimit, incrementAssessment } = useSubscription(user?.id);
  const [history, setHistory] = useState<QA[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [result, setResult] = useState<ZodiacResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [selectedSign, setSelectedSign] = useState<string | null>(null);
  const [resultImageUrl, setResultImageUrl] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);

  const resultIdRef = useRef<string | null>(null);
  const batchQuestionsRef = useRef<any[]>([]);

  const isZh = locale === "zh";
  const localizeName = (n: string) => isZh ? (ZH_NAMES[n] || n) : n;
  const localizeElement = (e: string) => isZh ? (ZH_ELEMENTS[e] || e) : e;
  const localizeDate = (n: string) => isZh ? ZH_DATES[n] : EN_DATES[n];

  const fetchResultImage = useCallback(async (r: ZodiacResult) => {
    setImageLoading(true);
    try {
      const img = await fetchAIImage(getImagePrompt(r));
      if (img) {
        setResultImageUrl(img.src);
        if (resultIdRef.current) {
          const { data: existing } = await supabase.from("assessment_results").select("result_data").eq("id", resultIdRef.current).single();
          if (existing) { await supabase.from("assessment_results").update({ result_data: { ...existing.result_data as any, imageUrl: img.src } }).eq("id", resultIdRef.current); }
        }
      }
    } finally { setImageLoading(false); }
  }, [fetchAIImage]);

  const fetchResult = async (finalHistory: QA[], sign: string) => {
    setLoading(true);
    setLoadingMsg(t("assessmentFlow.common.analyzing"));
    try {
      const { data, error } = await supabase.functions.invoke("assessment-zodiac", {
        body: { history: finalHistory, zodiacSign: sign, locale },
      });
      if (error) throw error;
      if (data.type === "result") {
        setResult(data.data);
        setCurrentQuestion(null);
        fetchResultImage(data.data);
        if (user) {
          const { data: inserted } = await supabase.from("assessment_results").insert({
            user_id: user.id, assessment_type: "zodiac", result_data: data.data,
          }).select("id").single();
          if (inserted) resultIdRef.current = inserted.id;
          generateSoulFragment(user.id, "assessment", "zodiac", `Horoscope: ${data.data.zodiacSign} ${data.data.title}. ${data.data.description}`);
        }
      }
    } catch (e: any) { toast.error(e.message || t("assessmentFlow.common.loadFail")); } finally { setLoading(false); }
  };

  const handleSelectSign = async (signName: string) => {
    if (!user) { toast.error(t("auth.signInFirst", "请先登录 🌙")); navigate("/auth"); return; }
    if (!canAssess) { toast.error(t("assessmentFlow.common.limitReached", { n: assessmentLimit })); return; }
    await incrementAssessment();
    setSelectedSign(signName);
    setLoading(true);
    setLoadingMsg(t("assessmentFlow.common.starting"));
    try {
      const { data, error } = await supabase.functions.invoke("assessment-zodiac", {
        body: { action: "batch-questions", zodiacSign: signName, locale },
      });
      if (error) throw error;
      if (data.type === "batch" && data.data?.length > 0) {
        batchQuestionsRef.current = data.data.slice(1);
        setCurrentQuestion(data.data[0]);
      }
    } catch (e: any) { toast.error(e.message || t("assessmentFlow.common.loadFail")); } finally { setLoading(false); }
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
    } else { setCurrentQuestion(null); fetchResult(newHistory, selectedSign!); }
  };

  const handleSharePoster = () => {
    if (!result) return;
    const signData = ZODIAC_SIGNS.find(z => z.name === result.zodiacSign);
    sharePoster({
      title: localizeName(result.zodiacSign),
      subtitle: `${localizeElement(result.element)} · ${result.title}`,
      description: result.description,
      icon: signData?.icon || "⭐",
      caption: result.socialCaption,
      accentColor: "#8b6fcf",
      accentColorLight: "#b794f6",
      bars: [
        { label1: t("assessmentDetail.dim.overall"), label2: "", value: result.traits.overall },
        { label1: t("assessmentDetail.dim.love"), label2: "", value: result.traits.love },
        { label1: t("assessmentDetail.dim.career"), label2: "", value: result.traits.career },
        { label1: t("assessmentDetail.dim.fortune"), label2: "", value: result.traits.fortune },
      ],
      extraLines: [
        `🎨 ${t("assessmentFlow.zodiac.luckyColor")}: ${result.luckyItems.color}`,
        `🔢 ${t("assessmentFlow.zodiac.luckyNumber")}: ${result.luckyItems.number}`,
        `🧭 ${t("assessmentFlow.zodiac.luckyDirection")}: ${result.luckyItems.direction}`,
        `💡 ${result.advice}`,
      ],
      preloadedImageUrl: resultImageUrl || undefined,
      imagePrompt: !resultImageUrl ? getImagePrompt(result) : undefined,
    });
  };

  if (!selectedSign) {
    return (
      <div className="min-h-screen bg-gradient-calm flex flex-col">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => navigate("/assessment")} className="text-muted-foreground"><ArrowLeft className="h-5 w-5" /></button>
          <h2 className="text-sm font-semibold text-foreground">{t("assessmentFlow.zodiac.title")}</h2>
        </div>
        <div className="px-6 pt-4">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-6">
            <div className="mx-auto mb-4 h-20 w-20 rounded-full bg-gradient-mystic flex items-center justify-center"><span className="text-4xl">⭐</span></div>
            <h1 className="font-display text-xl font-bold text-foreground">{t("assessmentFlow.zodiac.introTitle")}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{t("assessmentFlow.zodiac.introDesc")}</p>
          </motion.div>
          <div className="grid grid-cols-3 gap-3">
            {ZODIAC_SIGNS.map((sign, i) => (
              <motion.button key={sign.name} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.04 }} whileTap={{ scale: 0.95 }}
                onClick={() => handleSelectSign(sign.name)}
                className="flex flex-col items-center gap-1 rounded-2xl bg-card p-4 shadow-card">
                <span className="text-2xl">{sign.icon}</span>
                <span className="text-xs font-semibold text-foreground">{localizeName(sign.name)}</span>
                <span className="text-[10px] text-muted-foreground">{localizeDate(sign.name)}</span>
              </motion.button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (result) {
    const signIcon = ZODIAC_SIGNS.find(z => z.name === result.zodiacSign)?.icon || "⭐";
    return (
      <div className="min-h-screen bg-gradient-calm pb-8">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => navigate("/assessment")} className="text-muted-foreground"><ArrowLeft className="h-5 w-5" /></button>
          <h2 className="text-sm font-semibold text-foreground">{t("assessmentFlow.zodiac.resultsTitle")}</h2>
        </div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="px-6">
          <div className="text-center mt-4 mb-6">
            <div className="mx-auto mb-4 h-20 w-20 rounded-full bg-gradient-mystic flex items-center justify-center"><span className="text-3xl">{signIcon}</span></div>
            <h1 className="font-display text-xl font-bold text-foreground">{localizeName(result.zodiacSign)} · {result.title}</h1>
            <p className="mt-1 text-xs text-secondary">{localizeElement(result.element)}{t("assessmentFlow.zodiac.elementSuffix")}</p>
            <p className="mt-1 text-xs text-muted-foreground">"{result.socialCaption}"</p>
          </div>
          <ResultAIImage imageUrl={resultImageUrl} loading={imageLoading} />
          <div className="rounded-2xl bg-card p-5 shadow-card mb-4">
            <h3 className="font-display text-sm font-semibold text-foreground mb-3">{t("assessmentFlow.zodiac.reading")}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{result.description}</p>
          </div>
          <div className="rounded-2xl bg-card p-5 shadow-card mb-4">
            <h3 className="font-display text-sm font-semibold text-foreground mb-4">{t("assessmentDetail.dimensions")}</h3>
            {[
              { l: t("assessmentDetail.dim.overall"), v: result.traits.overall },
              { l: t("assessmentDetail.dim.love"), v: result.traits.love },
              { l: t("assessmentDetail.dim.career"), v: result.traits.career },
              { l: t("assessmentDetail.dim.fortune"), v: result.traits.fortune },
            ].map(b => (
              <div key={b.l} className="mb-3">
                <div className="flex justify-between text-xs text-muted-foreground mb-1"><span>{b.l}</span><span>{b.v}%</span></div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${b.v}%` }} transition={{ duration: 0.8 }} className="h-full rounded-full bg-gradient-golden" />
                </div>
              </div>
            ))}
          </div>
          <div className="rounded-2xl bg-card p-5 shadow-card mb-4">
            <h3 className="font-display text-sm font-semibold text-foreground mb-3">{t("assessmentFlow.zodiac.luckyGuide")}</h3>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div><p className="text-xs text-muted-foreground">{t("assessmentFlow.zodiac.luckyColor")}</p><p className="text-sm font-semibold text-foreground mt-1">{result.luckyItems.color}</p></div>
              <div><p className="text-xs text-muted-foreground">{t("assessmentFlow.zodiac.luckyNumber")}</p><p className="text-sm font-semibold text-foreground mt-1">{result.luckyItems.number}</p></div>
              <div><p className="text-xs text-muted-foreground">{t("assessmentFlow.zodiac.luckyDirection")}</p><p className="text-sm font-semibold text-foreground mt-1">{result.luckyItems.direction}</p></div>
            </div>
          </div>
          <div className="rounded-2xl bg-card p-5 shadow-card mb-4">
            <h3 className="font-display text-sm font-semibold text-foreground mb-2">{t("assessmentFlow.zodiac.thisWeek")}</h3>
            <p className="text-sm text-muted-foreground">{result.advice}</p>
          </div>
          <div className="flex gap-3">
            <button onClick={handleSharePoster} className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-card py-3 text-sm font-medium text-foreground shadow-card">
              <Download className="h-4 w-4" /> {t("assessmentFlow.common.saveAndShare")}
            </button>
            <button onClick={() => navigate(`/chat?agent=barista`)} className="flex-1 rounded-xl bg-gradient-golden py-3 text-sm font-semibold text-primary-foreground">
              {t("assessmentFlow.zodiac.discussMore")}
            </button>
          </div>
        </motion.div>
        <PosterPreviewDialog open={showPosterPreview} dataUrl={posterDataUrl} onClose={closePosterPreview} onDownload={downloadPoster} />
      </div>
    );
  }

  return (
    <AssessmentQuestionLayout title={t("assessmentFlow.zodiac.title")} backPath="/assessment" questionNumber={history.length + 1} totalQuestions={10} loading={loading} loadingMessage={loadingMsg} question={currentQuestion} onAnswer={handleAnswer} />
  );
};

export default ZodiacFlow;
