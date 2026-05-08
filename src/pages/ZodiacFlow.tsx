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
import { getNextVariant } from "@/lib/assessmentVariant";

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
  advice: string | {
    mantra: string;
    doThis: string[];
    avoidThis: string[];
    luckyMoment: string;
    crystalOrRitual: string;
  };
  socialCaption: string;
}

const ZODIAC_MOTIF: Record<string, string> = {
  Aries: "a bold ram with curling horns and a streak of fiery comet trails",
  Taurus: "a strong bull resting in a blooming flower field at golden hour",
  Gemini: "two mirrored figures holding hands among floating playing cards and feathers",
  Cancer: "a delicate crab beside ocean waves under a glowing crescent moon",
  Leo: "a regal lion with a mane shaped like a sunburst, surrounded by gold sparks",
  Virgo: "a graceful figure holding wheat sheaves with falling petals and tiny stars",
  Libra: "a balanced golden scale floating between two soft clouds and rose petals",
  Scorpio: "a mysterious scorpion silhouette with a glowing tail under deep night sky",
  Sagittarius: "a centaur archer drawing a bow toward a distant constellation",
  Capricorn: "a sea-goat climbing a rocky mountain peak under starry sky",
  Aquarius: "a figure pouring a stream of stars and water from a celestial vase",
  Pisces: "two koi-like fish swimming in a circle through cosmic bubbles",
  白羊座: "a bold ram with curling horns and a streak of fiery comet trails",
  金牛座: "a strong bull resting in a blooming flower field at golden hour",
  双子座: "two mirrored figures holding hands among floating playing cards and feathers",
  巨蟹座: "a delicate crab beside ocean waves under a glowing crescent moon",
  狮子座: "a regal lion with a mane shaped like a sunburst, surrounded by gold sparks",
  处女座: "a graceful figure holding wheat sheaves with falling petals and tiny stars",
  天秤座: "a balanced golden scale floating between two soft clouds and rose petals",
  天蝎座: "a mysterious scorpion silhouette with a glowing tail under deep night sky",
  射手座: "a centaur archer drawing a bow toward a distant constellation",
  摩羯座: "a sea-goat climbing a rocky mountain peak under starry sky",
  水瓶座: "a figure pouring a stream of stars and water from a celestial vase",
  双鱼座: "two koi-like fish swimming in a circle through cosmic bubbles",
};
const ELEMENT_PARTICLES: Record<string, string> = {
  Fire: "drifting embers and warm sparks", 火: "drifting embers and warm sparks",
  Earth: "floating crystals and small stones", 土: "floating crystals and small stones",
  Air: "soft wind swirls and feathers", 风: "soft wind swirls and feathers", 气: "soft wind swirls and feathers",
  Water: "rippling water droplets and bubbles", 水: "rippling water droplets and bubbles",
};
const getImagePromptForSign = (signName: string, element: string) => {
  const motif = ZODIAC_MOTIF[signName] || "an iconic celestial creature";
  const particles = ELEMENT_PARTICLES[element] || "twinkling starlight";
  return `Dreamy celestial illustration of the ${signName} zodiac, featuring ${motif} surrounded by ${particles}. Cosmic violet and indigo palette with starlight gold highlights, magical art-nouveau line accents, slightly playful and full of life. Square format, no text, no letters.`;
};
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
  const [savedReportId, setSavedReportId] = useState<string | null>(null);
  const batchQuestionsRef = useRef<any[]>([]);
  const imagePromiseRef = useRef<Promise<string | null> | null>(null);

  const isZh = locale === "zh";
  const localizeName = (n: string) => isZh ? (ZH_NAMES[n] || n) : n;
  const localizeElement = (e: string) => isZh ? (ZH_ELEMENTS[e] || e) : e;
  const localizeDate = (n: string) => isZh ? ZH_DATES[n] : EN_DATES[n];

  const startImageFetch = useCallback((signName: string, element: string) => {
    setImageLoading(true);
    setResultImageUrl(null);
    const p = (async () => {
      try {
        const img = await fetchAIImage(getImagePromptForSign(signName, element), { cacheKey: getCacheKeyForSign(signName), returnUrlOnly: true });
        return img?.src || null;
      } catch { return null; }
    })();
    imagePromiseRef.current = p;
    return p;
  }, [fetchAIImage]);

  const awaitResultImage = useCallback(async () => {
    try {
      const url = imagePromiseRef.current ? await imagePromiseRef.current : null;
      if (url) {
        setResultImageUrl(url);
        if (resultIdRef.current) {
          const { data: existing } = await supabase.from("assessment_results").select("result_data").eq("id", resultIdRef.current).single();
          if (existing) { await supabase.from("assessment_results").update({ result_data: { ...existing.result_data as any, imageUrl: url } }).eq("id", resultIdRef.current); }
        }
      }
    } finally { setImageLoading(false); }
  }, []);

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
        awaitResultImage();
        if (user) {
          const { data: inserted } = await supabase.from("assessment_results").insert({
            user_id: user.id, assessment_type: "zodiac", result_data: data.data,
          }).select("id").single();
          if (inserted) { resultIdRef.current = inserted.id; setSavedReportId(inserted.id); }
          generateSoulFragment(user.id, "assessment", "zodiac", `Horoscope: ${data.data.zodiacSign} ${data.data.title}. ${data.data.description}`);
        }
      }
    } catch (e: any) {
      if (isDailyLimitError(e)) toast.error(t("assessmentFlow.common.limitReached", { n: 20 }));
      else toast.error(e.message || t("assessmentFlow.common.loadFail"));
    } finally { setLoading(false); }
  };

  const handleSelectSign = async (signName: string) => {
    if (!user) { toast.error(t("auth.signInFirst", "请先登录 🌙")); navigate("/auth"); return; }
    if (!canAssess) { toast.error(t("assessmentFlow.common.limitReached", { n: assessmentLimit })); return; }
    await incrementAssessment();
    setSelectedSign(signName);
    const signMeta = ZODIAC_SIGNS.find(z => z.name === signName);
    if (signMeta) startImageFetch(signName, signMeta.element);
    setLoading(true);
    setLoadingMsg(t("assessmentFlow.common.starting"));
    try {
      const variant = getNextVariant(`zodiac:${signName}`, locale);
      const { data, error } = await supabase.functions.invoke("assessment-zodiac", {
        body: { action: "batch-questions", zodiacSign: signName, locale, variant },
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
        `💡 ${typeof result.advice === "string" ? result.advice : result.advice.mantra}`,
      ],
      preloadedImageUrl: resultImageUrl || undefined,
      imagePrompt: !resultImageUrl ? getImagePromptForSign(result.zodiacSign, result.element) : undefined,
      imageCacheKey: getCacheKeyForSign(result.zodiacSign),
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
            <h3 className="font-display text-sm font-semibold text-foreground mb-3">{t("assessmentFlow.zodiac.thisWeek")}</h3>
            {typeof result.advice === "string" ? (
              <p className="text-sm text-muted-foreground leading-relaxed">{result.advice}</p>
            ) : (
              <div className="space-y-4">
                {/* Mantra */}
                <div className="relative rounded-xl bg-gradient-mystic/10 border border-primary/15 px-4 py-4 text-center">
                  <p className="text-[10px] uppercase tracking-widest text-secondary mb-1">{t("assessmentFlow.zodiac.mantraTitle")}</p>
                  <p className="font-display text-base text-gradient-golden leading-snug font-semibold">
                    "{result.advice.mantra}"
                  </p>
                </div>

                {/* Do This */}
                <div>
                  <p className="text-xs font-semibold text-foreground mb-2">{t("assessmentFlow.zodiac.doThis")}</p>
                  <ul className="space-y-2">
                    {result.advice.doThis.map((item, i) => (
                      <motion.li
                        key={i}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.05 * i }}
                        className="rounded-lg bg-muted/40 px-3 py-2 text-sm text-foreground/90 leading-relaxed"
                      >
                        {item}
                      </motion.li>
                    ))}
                  </ul>
                </div>

                {/* Avoid This */}
                <div>
                  <p className="text-xs font-semibold text-foreground mb-2">{t("assessmentFlow.zodiac.avoidThis")}</p>
                  <ul className="space-y-2">
                    {result.advice.avoidThis.map((item, i) => (
                      <li
                        key={i}
                        className="rounded-lg bg-destructive/5 border border-destructive/10 px-3 py-2 text-sm text-foreground/80 leading-relaxed"
                      >
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Lucky moment + Ritual */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="rounded-xl bg-secondary/10 border border-secondary/20 px-3 py-3">
                    <p className="text-[10px] uppercase tracking-wider text-secondary mb-1">⏰ {t("assessmentFlow.zodiac.luckyMoment")}</p>
                    <p className="text-xs text-foreground/90 leading-relaxed">{result.advice.luckyMoment}</p>
                  </div>
                  <div className="rounded-xl bg-primary/5 border border-primary/15 px-3 py-3">
                    <p className="text-[10px] uppercase tracking-wider text-primary mb-1">🔮 {t("assessmentFlow.zodiac.ritualTitle")}</p>
                    <p className="text-xs text-foreground/90 leading-relaxed">{result.advice.crystalOrRitual}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
          {savedReportId && (
            <div className="mb-4">
              <DeepReportUnlock source="assessment" reportId={savedReportId} typeLabel={`${result.zodiacSign} · ${result.title}`} />
            </div>
          )}
          <div className="flex gap-3">
            <button onClick={handleSharePoster} className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-card py-3 text-sm font-medium text-foreground shadow-card">
              <Download className="h-4 w-4" /> {t("assessmentFlow.common.saveAndShare")}
            </button>
            <button onClick={() => navigate(`/chat?agent=mystic`, {
              state: { zodiacResult: { zodiacSign: result.zodiacSign, element: result.element, title: result.title, description: result.description, traits: result.traits, luckyItems: result.luckyItems, advice: result.advice } },
            })} className="flex-1 rounded-xl bg-gradient-golden py-3 text-sm font-semibold text-primary-foreground">
              {t("assessmentFlow.zodiac.talkToLuna")}
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
