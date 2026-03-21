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

interface BirthInfo {
  year: string;
  month: string;
  day: string;
  hour: string;
  gender: string;
}

interface BaziResult {
  dayMaster: string;
  fiveElements: string;
  title: string;
  description: string;
  traits: { career: number; wealth: number; love: number; health: number };
  advice: string;
  socialCaption: string;
}

const getImagePrompt = (result: BaziResult) =>
  `Create an elegant mystical Chinese ink painting style illustration representing the concept of "${result.title}" and "${result.dayMaster}" in Bazi fortune telling. Use warm golden tones, abstract cosmic elements, and traditional Chinese aesthetics. Square format, no text.`;

const BaziFlow = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { sharePoster, fetchAIImage, posterDataUrl, showPosterPreview, closePosterPreview, downloadPoster } = useSharePoster();
  const { canAssess, assessmentCount, assessmentLimit, plan, incrementAssessment } = useSubscription(user?.id);
  const [history, setHistory] = useState<QA[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [result, setResult] = useState<BaziResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [started, setStarted] = useState(false);
  const [birthInfo, setBirthInfo] = useState<BirthInfo>({
    year: "1995", month: "6", day: "15", hour: "午时", gender: "女",
  });
  const [resultImageUrl, setResultImageUrl] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);

  const resultIdRef = useRef<string | null>(null);
  const batchQuestionsRef = useRef<any[]>([]);
  const birthInfoRef = useRef<BirthInfo>(birthInfo);

  const fetchResultImage = useCallback(async (r: BaziResult) => {
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

  const fetchResult = async (finalHistory: QA[]) => {
    setLoading(true);
    setLoadingMsg("正在为你解读命盘...");
    try {
      const { data, error } = await supabase.functions.invoke("assessment-bazi", {
        body: { history: finalHistory, birthInfo: birthInfoRef.current },
      });
      if (error) throw error;
      if (data.type === "result") {
        setResult(data.data);
        setCurrentQuestion(null);
        fetchResultImage(data.data);
        if (user) {
          const { data: inserted } = await supabase.from("assessment_results").insert({
            user_id: user.id, type: "bazi", result_data: data.data,
          }).select("id").single();
          if (inserted) resultIdRef.current = inserted.id;
          generateSoulFragment(user.id, "assessment", "bazi", `八字分析结果：${data.data.title || ""}。${data.data.description || ""}`);
        }
      }
    } catch (e: any) {
      toast.error(e.message || "加载失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  const handleStart = async () => {
    if (!user) { toast.error("请先登录再开始测评 🌙"); navigate("/auth"); return; }
    if (!canAssess) { toast.error(`今日测评次数已用完（${assessmentLimit}次/${plan === "premium" ? "会员" : "免费"}）💫`); return; }
    await incrementAssessment();
    birthInfoRef.current = birthInfo;
    setStarted(true);
    setLoading(true);
    setLoadingMsg("AI 正在为你准备题目...");
    try {
      const { data, error } = await supabase.functions.invoke("assessment-bazi", {
        body: { action: "batch-questions", birthInfo },
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
      fetchResult(newHistory);
    }
  };

  const handleSharePoster = () => {
    if (!result) return;
    sharePoster({
      title: result.dayMaster,
      subtitle: result.title,
      description: result.description,
      icon: "🏮",
      caption: result.socialCaption,
      accentColor: "#e8a735",
      accentColorLight: "#f0c060",
      bars: [
        { label1: "事业运", label2: "", value: result.traits.career },
        { label1: "财运", label2: "", value: result.traits.wealth },
        { label1: "感情运", label2: "", value: result.traits.love },
        { label1: "健康运", label2: "", value: result.traits.health },
      ],
      extraLines: [`💡 开运建议：${result.advice}`],
      preloadedImageUrl: resultImageUrl || undefined,
      imagePrompt: !resultImageUrl ? getImagePrompt(result) : undefined,
    });
  };

  if (!started) {
    return (
      <div className="min-h-screen bg-gradient-calm flex flex-col">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => navigate("/assessment")} className="text-muted-foreground">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h2 className="text-sm font-semibold text-foreground">八字命理分析</h2>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-8">
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-sm">
            <div className="mx-auto mb-6 h-24 w-24 rounded-full bg-gradient-mystic flex items-center justify-center">
              <span className="text-4xl">🏮</span>
            </div>
            <h1 className="font-display text-2xl font-bold text-foreground text-center">解锁你的先天命盘</h1>
            <p className="mt-2 text-sm text-muted-foreground text-center">请输入你的出生信息</p>

            <div className="mt-6 space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">出生年</label>
                  <input type="number" value={birthInfo.year} onChange={e => setBirthInfo(p => ({ ...p, year: e.target.value }))}
                    className="w-full rounded-lg bg-card border border-border px-3 py-2 text-sm text-foreground" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">月</label>
                  <input type="number" value={birthInfo.month} min={1} max={12} onChange={e => setBirthInfo(p => ({ ...p, month: e.target.value }))}
                    className="w-full rounded-lg bg-card border border-border px-3 py-2 text-sm text-foreground" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">日</label>
                  <input type="number" value={birthInfo.day} min={1} max={31} onChange={e => setBirthInfo(p => ({ ...p, day: e.target.value }))}
                    className="w-full rounded-lg bg-card border border-border px-3 py-2 text-sm text-foreground" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">时辰</label>
                  <select value={birthInfo.hour} onChange={e => setBirthInfo(p => ({ ...p, hour: e.target.value }))}
                    className="w-full rounded-lg bg-card border border-border px-3 py-2 text-sm text-foreground">
                    {["子时(23-1)", "丑时(1-3)", "寅时(3-5)", "卯时(5-7)", "辰时(7-9)", "巳时(9-11)",
                      "午时(11-13)", "未时(13-15)", "申时(15-17)", "酉时(17-19)", "戌时(19-21)", "亥时(21-23)", "不确定"]
                      .map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">性别</label>
                  <select value={birthInfo.gender} onChange={e => setBirthInfo(p => ({ ...p, gender: e.target.value }))}
                    className="w-full rounded-lg bg-card border border-border px-3 py-2 text-sm text-foreground">
                    <option value="男">男</option>
                    <option value="女">女</option>
                  </select>
                </div>
              </div>
            </div>

            <button onClick={handleStart}
              className="mt-8 w-full rounded-xl bg-gradient-golden px-8 py-3 text-sm font-semibold text-primary-foreground shadow-glow">
              开始分析 🏮
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
          <h2 className="text-sm font-semibold text-foreground">命理分析结果</h2>
        </div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="px-6">
          <div className="text-center mt-4 mb-6">
            <div className="mx-auto mb-4 h-20 w-20 rounded-full bg-gradient-mystic flex items-center justify-center">
              <span className="text-3xl">🏮</span>
            </div>
            <h1 className="font-display text-xl font-bold text-foreground">{result.dayMaster} · {result.title}</h1>
            <p className="mt-1 text-xs text-secondary">{result.fiveElements}</p>
            <p className="mt-1 text-xs text-muted-foreground">「{result.socialCaption}」</p>
          </div>

          <ResultAIImage imageUrl={resultImageUrl} loading={imageLoading} />

          <div className="rounded-2xl bg-card p-5 shadow-card mb-4">
            <h3 className="font-display text-sm font-semibold text-foreground mb-3">命理解析</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{result.description}</p>
          </div>

          <div className="rounded-2xl bg-card p-5 shadow-card mb-4">
            <h3 className="font-display text-sm font-semibold text-foreground mb-4">运势维度</h3>
            {[
              { l: "事业运", v: result.traits.career },
              { l: "财运", v: result.traits.wealth },
              { l: "感情运", v: result.traits.love },
              { l: "健康运", v: result.traits.health },
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
            <h3 className="font-display text-sm font-semibold text-foreground mb-2">💡 开运建议</h3>
            <p className="text-sm text-muted-foreground">{result.advice}</p>
          </div>

          <div className="flex gap-3">
            <button onClick={handleSharePoster}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-card py-3 text-sm font-medium text-foreground shadow-card">
              <Download className="h-4 w-4" /> 保存海报
            </button>
            <button onClick={() => navigate(`/chat?agent=tree`)}
              className="flex-1 rounded-xl bg-gradient-golden py-3 text-sm font-semibold text-primary-foreground">
              聊聊命运
            </button>
          </div>
        </motion.div>
        <PosterPreviewDialog open={showPosterPreview} dataUrl={posterDataUrl} onClose={closePosterPreview} onDownload={downloadPoster} />
      </div>
    );
  }

  return (
    <AssessmentQuestionLayout
      title="八字命理分析"
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

export default BaziFlow;
