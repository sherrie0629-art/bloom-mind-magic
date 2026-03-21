import { useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Download, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { generateSoulFragment } from "@/hooks/useSoulFragment";
import { useSubscription } from "@/hooks/useSubscription";
import { useSharePoster } from "@/hooks/useSharePoster";
import AssessmentQuestionLayout from "@/components/AssessmentQuestionLayout";
import ResultAIImage from "@/components/ResultAIImage";
import PosterPreviewDialog from "@/components/PosterPreviewDialog";
import { Skeleton } from "@/components/ui/skeleton";

interface QA { question: string; answer: string; dimension: string; }

interface MBTIResult {
  mbtiType: string;
  title: string;
  description: string;
  traits: { E_I: number; S_N: number; T_F: number; J_P: number };
  socialCaption: string;
}

const getImagePrompt = (result: MBTIResult) =>
  `Create an abstract artistic illustration representing the MBTI personality type ${result.mbtiType} "${result.title}". Use deep indigo and violet tones with geometric and organic shapes. Intellectual and introspective mood. Square format, no text.`;

const AssessmentFlow = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { sharePoster, fetchAIImage, posterDataUrl, showPosterPreview, closePosterPreview, downloadPoster } = useSharePoster();
  const { canAssess, assessmentCount, assessmentLimit, plan, incrementAssessment } = useSubscription(user?.id);
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
  const batchQuestionsRef = useRef<any[]>([]);

  const fetchResultImage = useCallback(async (r: MBTIResult) => {
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

  const fetchParallelUniverse = useCallback(async (mbtiType: string) => {
    setParallelLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("assessment", {
        body: { action: "parallel-universe", mbtiType },
      });
      if (!error && data) {
        setParallelData(data);
        if (resultIdRef.current) {
          const { data: existing } = await supabase.from("assessment_results").select("result_data").eq("id", resultIdRef.current).single();
          if (existing) {
            await supabase.from("assessment_results").update({ result_data: { ...existing.result_data as any, parallelUniverse: data } }).eq("id", resultIdRef.current);
          }
        }
      }
    } catch { /* silent */ } finally {
      setParallelLoading(false);
    }
  }, []);

  const fetchResult = async (finalHistory: QA[]) => {
    setLoading(true);
    setLoadingMsg("正在分析你的人格类型...");
    try {
      const { data, error } = await supabase.functions.invoke("assessment", {
        body: { history: finalHistory },
      });
      if (error) throw error;
      if (data.type === "result") {
        setResult(data.data);
        setCurrentQuestion(null);
        fetchResultImage(data.data);
        fetchParallelUniverse(data.data.mbtiType);
        if (user) {
          const { data: inserted } = await supabase.from("assessment_results").insert({
            user_id: user.id, type: "mbti", result_data: data.data,
          }).select("id").single();
          if (inserted) resultIdRef.current = inserted.id;
          generateSoulFragment(user.id, "assessment", "mbti", `MBTI结果：${data.data.mbtiType} ${data.data.title}。${data.data.description}`);
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
    setStarted(true);
    setLoading(true);
    setLoadingMsg("AI 正在为你准备题目...");
    try {
      const { data, error } = await supabase.functions.invoke("assessment", {
        body: { action: "batch-questions" },
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
      title: result.mbtiType,
      subtitle: result.title,
      description: result.description,
      icon: "🧠",
      caption: result.socialCaption,
      accentColor: "#6366f1",
      accentColorLight: "#818cf8",
      bars: [
        { label1: "外向 E", label2: "内向 I", value: result.traits.E_I },
        { label1: "实感 S", label2: "直觉 N", value: result.traits.S_N },
        { label1: "思考 T", label2: "情感 F", value: result.traits.T_F },
        { label1: "判断 J", label2: "感知 P", value: result.traits.J_P },
      ],
      extraLines: parallelData ? [
        `🧙 魔法世界：${parallelData.magic.role}`,
        `🤖 赛博朋克：${parallelData.cyberpunk.role}`,
      ] : undefined,
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
          <h2 className="text-sm font-semibold text-foreground">MBTI 人格测评</h2>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
            <div className="mx-auto mb-6 h-24 w-24 rounded-full bg-gradient-mystic flex items-center justify-center">
              <span className="text-4xl">🧠</span>
            </div>
            <h1 className="font-display text-2xl font-bold text-foreground">探索你的人格密码</h1>
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
              AI 会根据你的回答动态调整问题，
              <br />
              约 5 道题即可精准分析你的 MBTI 类型
            </p>
            <button onClick={handleStart}
              className="mt-8 rounded-xl bg-gradient-golden px-8 py-3 text-sm font-semibold text-primary-foreground shadow-glow">
              开始测评 ✨
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
          <h2 className="text-sm font-semibold text-foreground">测评结果</h2>
        </div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="px-6">
          <div className="text-center mt-4 mb-6">
            <div className="mx-auto mb-4 h-20 w-20 rounded-full bg-gradient-mystic flex items-center justify-center">
              <span className="font-display text-2xl font-bold text-primary-foreground">{result.mbtiType}</span>
            </div>
            <h1 className="font-display text-xl font-bold text-foreground">{result.mbtiType} — {result.title}</h1>
            <p className="mt-1 text-xs text-secondary">「{result.socialCaption}」</p>
          </div>

          <ResultAIImage imageUrl={resultImageUrl} loading={imageLoading} />

          <div className="rounded-2xl bg-card p-5 shadow-card mb-4">
            <h3 className="font-display text-sm font-semibold text-foreground mb-3">性格分析</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{result.description}</p>
          </div>

          <div className="rounded-2xl bg-card p-5 shadow-card mb-4">
            <h3 className="font-display text-sm font-semibold text-foreground mb-4">维度分析</h3>
            {[
              { l1: "外向 E", l2: "内向 I", v: result.traits.E_I },
              { l1: "实感 S", l2: "直觉 N", v: result.traits.S_N },
              { l1: "思考 T", l2: "情感 F", v: result.traits.T_F },
              { l1: "判断 J", l2: "感知 P", v: result.traits.J_P },
            ].map(b => (
              <div key={b.l1} className="mb-3">
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>{b.l1}</span><span>{b.l2}</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${b.v}%` }} transition={{ duration: 0.8 }}
                    className="h-full rounded-full bg-gradient-golden" />
                </div>
                <div className="text-right text-[10px] text-muted-foreground mt-0.5">{b.v}%</div>
              </div>
            ))}
          </div>

          {/* Parallel Universe */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="rounded-2xl bg-card p-5 shadow-card mb-4">
            <h3 className="font-display text-sm font-semibold text-foreground mb-3 flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-accent" /> 平行宇宙中的你
            </h3>
            {parallelLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-16 rounded-xl" />
                <Skeleton className="h-16 rounded-xl" />
              </div>
            ) : parallelData ? (
              <div className="space-y-3">
                <div className="rounded-xl bg-muted/50 p-3">
                  <p className="text-xs font-semibold text-foreground mb-1">🧙 魔法世界 · {parallelData.magic.role}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{parallelData.magic.description}</p>
                </div>
                <div className="rounded-xl bg-muted/50 p-3">
                  <p className="text-xs font-semibold text-foreground mb-1">🤖 赛博朋克 · {parallelData.cyberpunk.role}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{parallelData.cyberpunk.description}</p>
                </div>
              </div>
            ) : null}
          </motion.div>

          <div className="flex gap-3">
            <button onClick={handleSharePoster}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-card py-3 text-sm font-medium text-foreground shadow-card">
              <Download className="h-4 w-4" /> 保存海报
            </button>
            <button onClick={() => navigate(`/chat?agent=healer`, {
              state: {
                mbtiResult: {
                  mbtiType: result.mbtiType,
                  title: result.title,
                  description: result.description,
                  parallelUniverse: parallelData || undefined,
                },
              },
            })}
              className="flex-1 rounded-xl bg-gradient-golden py-3 text-sm font-semibold text-primary-foreground">
              聊聊我的性格
            </button>
          </div>
        </motion.div>
        <PosterPreviewDialog open={showPosterPreview} dataUrl={posterDataUrl} onClose={closePosterPreview} onDownload={downloadPoster} />
      </div>
    );
  }

  return (
    <AssessmentQuestionLayout
      title="MBTI 测评"
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

export default AssessmentFlow;
