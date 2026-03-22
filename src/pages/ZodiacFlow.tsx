import { useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { generateSoulFragment } from "@/hooks/useSoulFragment";
import { useSubscription } from "@/hooks/useSubscription";
import { useSharePoster } from "@/hooks/useSharePoster";
import AssessmentQuestionLayout from "@/components/AssessmentQuestionLayout";
import ResultAIImage from "@/components/ResultAIImage";
import PosterPreviewDialog from "@/components/PosterPreviewDialog";

interface QA { question: string; answer: string; dimension: string; }

const ZODIAC_SIGNS = [
  { name: "白羊座", icon: "♈", dates: "3.21-4.19" },
  { name: "金牛座", icon: "♉", dates: "4.20-5.20" },
  { name: "双子座", icon: "♊", dates: "5.21-6.21" },
  { name: "巨蟹座", icon: "♋", dates: "6.22-7.22" },
  { name: "狮子座", icon: "♌", dates: "7.23-8.22" },
  { name: "处女座", icon: "♍", dates: "8.23-9.22" },
  { name: "天秤座", icon: "♎", dates: "9.23-10.23" },
  { name: "天蝎座", icon: "♏", dates: "10.24-11.22" },
  { name: "射手座", icon: "♐", dates: "11.23-12.21" },
  { name: "摩羯座", icon: "♑", dates: "12.22-1.19" },
  { name: "水瓶座", icon: "♒", dates: "1.20-2.18" },
  { name: "双鱼座", icon: "♓", dates: "2.19-3.20" },
];

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

const getImagePrompt = (result: ZodiacResult) =>
  `Create a dreamy celestial illustration representing the zodiac sign ${result.zodiacSign} with ${result.element} element. Soft purple and violet cosmic tones, stars, constellation patterns. Ethereal and magical. Square format, no text.`;

const ZodiacFlow = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { sharePoster, fetchAIImage, posterDataUrl, showPosterPreview, closePosterPreview, downloadPoster } = useSharePoster();
  const { canAssess, assessmentCount, assessmentLimit, plan, incrementAssessment } = useSubscription(user?.id);
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

  const fetchResultImage = useCallback(async (r: ZodiacResult) => {
    setImageLoading(true);
    try {
      const img = await fetchAIImage(getImagePrompt(r));
      if (img) {
        setResultImageUrl(img.src);
        if (resultIdRef.current) {
          const { data: existing } = await supabase.from("assessment_results").select("result_data").eq("id", resultIdRef.current).single();
          if (existing) {
            await supabase.from("assessment_results").update({ result_data: { ...existing.result_data as any, imageUrl: img.src } }).eq("id", resultIdRef.current);
          }
        }
      }
    } finally {
      setImageLoading(false);
    }
  }, [fetchAIImage]);

  const fetchResult = async (finalHistory: QA[], sign: string) => {
    setLoading(true);
    setLoadingMsg("正在为你解读星座运势...");
    try {
      const { data, error } = await supabase.functions.invoke("assessment-zodiac", {
        body: { history: finalHistory, zodiacSign: sign },
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
          generateSoulFragment(user.id, "assessment", "zodiac", `星座分析：${data.data.zodiacSign} ${data.data.title}。${data.data.description}`);
        }
      }
    } catch (e: any) {
      toast.error(e.message || "加载失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSign = async (signName: string) => {
    if (!user) { toast.error("请先登录再开始测评 🌙"); navigate("/auth"); return; }
    if (!canAssess) { toast.error(`今日测评次数已用完（${assessmentLimit}次/${plan === "premium" ? "会员" : "免费"}）💫`); return; }
    await incrementAssessment();
    setSelectedSign(signName);
    setLoading(true);
    setLoadingMsg("AI 正在为你准备题目...");
    try {
      const { data, error } = await supabase.functions.invoke("assessment-zodiac", {
        body: { action: "batch-questions", zodiacSign: signName },
      });
      if (error) throw error;
      if (data.type === "batch" && data.data?.length > 0) {
        batchQuestionsRef.current = data.data.slice(1);
        setCurrentQuestion(data.data[0]);
      }
    } catch (e: any) {
      toast.error(e.message || "加载失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (option: { label: string; text: string }) => {
    if (!currentQuestion) return;
    const qa: QA = {
      question: currentQuestion.question,
      answer: `${option.label}. ${option.text}`,
      dimension: currentQuestion.dimension,
    };
    const newHistory = [...history, qa];
    setHistory(newHistory);

    if (batchQuestionsRef.current.length > 0) {
      const next = batchQuestionsRef.current[0];
      batchQuestionsRef.current = batchQuestionsRef.current.slice(1);
      setCurrentQuestion(next);
    } else {
      setCurrentQuestion(null);
      fetchResult(newHistory, selectedSign!);
    }
  };

  const handleSharePoster = () => {
    if (!result) return;
    sharePoster({
      title: result.zodiacSign,
      subtitle: `${result.element}象 · ${result.title}`,
      description: result.description,
      icon: ZODIAC_SIGNS.find(z => z.name === result.zodiacSign)?.icon || "⭐",
      caption: result.socialCaption,
      accentColor: "#8b6fcf",
      accentColorLight: "#b794f6",
      bars: [
        { label1: "综合运势", label2: "", value: result.traits.overall },
        { label1: "爱情运", label2: "", value: result.traits.love },
        { label1: "事业运", label2: "", value: result.traits.career },
        { label1: "财运", label2: "", value: result.traits.fortune },
      ],
      extraLines: [
        `🎨 幸运色：${result.luckyItems.color}`,
        `🔢 幸运数字：${result.luckyItems.number}`,
        `🧭 幸运方位：${result.luckyItems.direction}`,
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
          <button onClick={() => navigate("/assessment")} className="text-muted-foreground">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h2 className="text-sm font-semibold text-foreground">星座运势解读</h2>
        </div>
        <div className="px-6 pt-4">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-6">
            <div className="mx-auto mb-4 h-20 w-20 rounded-full bg-gradient-mystic flex items-center justify-center">
              <span className="text-4xl">⭐</span>
            </div>
            <h1 className="font-display text-xl font-bold text-foreground">选择你的星座</h1>
            <p className="mt-1 text-sm text-muted-foreground">AI 将结合你的近况精准解读运势</p>
          </motion.div>

          <div className="grid grid-cols-3 gap-3">
            {ZODIAC_SIGNS.map((sign, i) => (
              <motion.button
                key={sign.name}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.04 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleSelectSign(sign.name)}
                className="flex flex-col items-center gap-1 rounded-2xl bg-card p-4 shadow-card"
              >
                <span className="text-2xl">{sign.icon}</span>
                <span className="text-xs font-semibold text-foreground">{sign.name}</span>
                <span className="text-[10px] text-muted-foreground">{sign.dates}</span>
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
          <h2 className="text-sm font-semibold text-foreground">运势解读结果</h2>
        </div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="px-6">
          <div className="text-center mt-4 mb-6">
            <div className="mx-auto mb-4 h-20 w-20 rounded-full bg-gradient-mystic flex items-center justify-center">
              <span className="text-3xl">{signIcon}</span>
            </div>
            <h1 className="font-display text-xl font-bold text-foreground">{result.zodiacSign} · {result.title}</h1>
            <p className="mt-1 text-xs text-secondary">{result.element}象守护</p>
            <p className="mt-1 text-xs text-muted-foreground">「{result.socialCaption}」</p>
          </div>

          <ResultAIImage imageUrl={resultImageUrl} loading={imageLoading} />

          <div className="rounded-2xl bg-card p-5 shadow-card mb-4">
            <h3 className="font-display text-sm font-semibold text-foreground mb-3">运势解读</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{result.description}</p>
          </div>

          <div className="rounded-2xl bg-card p-5 shadow-card mb-4">
            <h3 className="font-display text-sm font-semibold text-foreground mb-4">运势维度</h3>
            {[
              { l: "综合运势", v: result.traits.overall },
              { l: "爱情运", v: result.traits.love },
              { l: "事业运", v: result.traits.career },
              { l: "财运", v: result.traits.fortune },
            ].map(b => (
              <div key={b.l} className="mb-3">
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>{b.l}</span><span>{b.v}%</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${b.v}%` }} transition={{ duration: 0.8 }}
                    className="h-full rounded-full bg-gradient-golden" />
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-2xl bg-card p-5 shadow-card mb-4">
            <h3 className="font-display text-sm font-semibold text-foreground mb-3">✨ 幸运指南</h3>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div><p className="text-xs text-muted-foreground">幸运色</p><p className="text-sm font-semibold text-foreground mt-1">{result.luckyItems.color}</p></div>
              <div><p className="text-xs text-muted-foreground">幸运数字</p><p className="text-sm font-semibold text-foreground mt-1">{result.luckyItems.number}</p></div>
              <div><p className="text-xs text-muted-foreground">幸运方位</p><p className="text-sm font-semibold text-foreground mt-1">{result.luckyItems.direction}</p></div>
            </div>
          </div>

          <div className="rounded-2xl bg-card p-5 shadow-card mb-4">
            <h3 className="font-display text-sm font-semibold text-foreground mb-2">💡 本周建议</h3>
            <p className="text-sm text-muted-foreground">{result.advice}</p>
          </div>

          <div className="flex gap-3">
            <button onClick={handleSharePoster}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-card py-3 text-sm font-medium text-foreground shadow-card">
              <Download className="h-4 w-4" /> 保存海报
            </button>
            <button onClick={() => navigate(`/chat?agent=astro`)}
              className="flex-1 rounded-xl bg-gradient-golden py-3 text-sm font-semibold text-primary-foreground">
              深入解读
            </button>
          </div>
        </motion.div>
        <PosterPreviewDialog open={showPosterPreview} dataUrl={posterDataUrl} onClose={closePosterPreview} onDownload={downloadPoster} />
      </div>
    );
  }

  return (
    <AssessmentQuestionLayout
      title="星座运势解读"
      backPath="/assessment"
      questionNumber={history.length + 1}
      totalQuestions={5}
      loading={loading}
      loadingMessage={loadingMsg}
      question={currentQuestion}
      onAnswer={handleAnswer}
    />
  );
};

export default ZodiacFlow;
