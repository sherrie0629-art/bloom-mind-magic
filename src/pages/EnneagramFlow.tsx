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

interface EnneagramResult {
  type: number;
  wing: string;
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

const getImagePrompt = (result: EnneagramResult) =>
  `Create an elegant, modern illustration representing Enneagram Type ${result.type} "${result.title}". Use soft geometric shapes, warm gradients of amber and teal, symbolizing inner growth and self-discovery. Abstract and artistic. Square format, no text.`;

const EnneagramFlow = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { sharePoster, fetchAIImage, posterDataUrl, showPosterPreview, closePosterPreview, downloadPoster } = useSharePoster();
  const { canAssess, assessmentLimit, plan, incrementAssessment } = useSubscription(user?.id);
  const [history, setHistory] = useState<QA[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [result, setResult] = useState<EnneagramResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [started, setStarted] = useState(false);
  const [resultImageUrl, setResultImageUrl] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);

  const resultIdRef = useRef<string | null>(null);
  const batchQuestionsRef = useRef<any[]>([]);

  const fetchResultImage = useCallback(async (r: EnneagramResult) => {
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
    setLoadingMsg("Analyzing your inner world...");
    try {
      const { data, error } = await supabase.functions.invoke("assessment-bazi", {
        body: { history: finalHistory },
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
          if (inserted) resultIdRef.current = inserted.id;
          generateSoulFragment(user.id, "assessment", "enneagram", `Enneagram Type ${data.data.type}: ${data.data.title}. ${data.data.description}`);
        }
      }
    } catch (e: any) {
      toast.error(e.message || "Something went wrong, please try again");
    } finally {
      setLoading(false);
    }
  };

  const handleStart = async () => {
    if (!user) { toast.error("Please sign in first 🌙"); navigate("/auth"); return; }
    if (!canAssess) { toast.error(`Daily assessment limit reached (${assessmentLimit}) 💫`); return; }
    await incrementAssessment();
    setStarted(true);
    setLoading(true);
    setLoadingMsg("AI is preparing your questions...");
    try {
      const { data, error } = await supabase.functions.invoke("assessment-bazi", {
        body: { action: "batch-questions" },
      });
      if (error) throw error;
      if (data.type === "batch" && data.data?.length > 0) {
        batchQuestionsRef.current = data.data.slice(1);
        setCurrentQuestion(data.data[0]);
      }
    } catch (e: any) {
      toast.error(e.message || "Something went wrong, please try again");
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
      title: `Type ${result.type}`,
      subtitle: result.title,
      description: result.description,
      icon: "🎯",
      caption: result.socialCaption,
      accentColor: "#2dd4bf",
      accentColorLight: "#5eead4",
      bars: [
        { label1: "Self-Awareness", label2: "", value: result.traits.selfAwareness },
        { label1: "Empathy", label2: "", value: result.traits.empathy },
        { label1: "Resilience", label2: "", value: result.traits.resilience },
        { label1: "Growth", label2: "", value: result.traits.growth },
      ],
      extraLines: [
        `🎯 Wing: ${result.wing}`,
        `💡 Growth Path: ${result.growthPath}`,
        `⚡ Under Stress: ${result.stressArrow}`,
        `🌱 ${result.advice}`,
      ],
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
          <h2 className="text-sm font-semibold text-foreground">Enneagram Assessment</h2>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-8">
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-sm text-center">
            <div className="mx-auto mb-6 h-24 w-24 rounded-full bg-gradient-mystic flex items-center justify-center">
              <span className="text-4xl">🎯</span>
            </div>
            <h1 className="font-display text-2xl font-bold text-foreground">Discover Your Enneagram Type</h1>
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
              MBTI shows <em>how</em> you act — Enneagram reveals <em>why</em>.
              <br />
              Uncover your core fears, desires, and growth path.
            </p>
            <button onClick={handleStart}
              className="mt-8 w-full rounded-xl bg-gradient-golden px-8 py-3 text-sm font-semibold text-primary-foreground shadow-glow">
              Start Assessment 🎯
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
          <h2 className="text-sm font-semibold text-foreground">Your Enneagram Result</h2>
        </div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="px-6">
          <div className="text-center mt-4 mb-6">
            <div className="mx-auto mb-4 h-20 w-20 rounded-full bg-gradient-mystic flex items-center justify-center">
              <span className="text-3xl">🎯</span>
            </div>
            <h1 className="font-display text-xl font-bold text-foreground">Type {result.type} · {result.title}</h1>
            <p className="mt-1 text-xs text-secondary">Wing: {result.wing}</p>
            <p className="mt-1 text-xs text-muted-foreground">"{result.socialCaption}"</p>
          </div>

          <ResultAIImage imageUrl={resultImageUrl} loading={imageLoading} />

          <div className="rounded-2xl bg-card p-5 shadow-card mb-4">
            <h3 className="font-display text-sm font-semibold text-foreground mb-3">Your Inner World</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{result.description}</p>
          </div>

          <div className="rounded-2xl bg-card p-5 shadow-card mb-4">
            <h3 className="font-display text-sm font-semibold text-foreground mb-3">Core Motivations</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-muted/30 p-3">
                <p className="text-[10px] text-muted-foreground">Core Fear</p>
                <p className="text-sm font-semibold text-foreground mt-1">{result.coreFear}</p>
              </div>
              <div className="rounded-xl bg-muted/30 p-3">
                <p className="text-[10px] text-muted-foreground">Core Desire</p>
                <p className="text-sm font-semibold text-foreground mt-1">{result.coreDesire}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-card p-5 shadow-card mb-4">
            <h3 className="font-display text-sm font-semibold text-foreground mb-4">Dimensions</h3>
            {[
              { l: "Self-Awareness", v: result.traits.selfAwareness },
              { l: "Empathy", v: result.traits.empathy },
              { l: "Resilience", v: result.traits.resilience },
              { l: "Growth", v: result.traits.growth },
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
            <h3 className="font-display text-sm font-semibold text-foreground mb-2">🌱 Growth & Stress</h3>
            <p className="text-sm text-muted-foreground mb-2"><strong>Growth:</strong> {result.growthPath}</p>
            <p className="text-sm text-muted-foreground"><strong>Under Stress:</strong> {result.stressArrow}</p>
          </div>

          <div className="rounded-2xl bg-card p-5 shadow-card mb-4">
            <h3 className="font-display text-sm font-semibold text-foreground mb-2">💡 Advice</h3>
            <p className="text-sm text-muted-foreground">{result.advice}</p>
          </div>

          <div className="flex gap-3">
            <button onClick={handleSharePoster}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-card py-3 text-sm font-medium text-foreground shadow-card">
              <Download className="h-4 w-4" /> Save Poster
            </button>
            <button onClick={() => navigate(`/chat?agent=mentor`)}
              className="flex-1 rounded-xl bg-gradient-golden py-3 text-sm font-semibold text-primary-foreground">
              Discuss with Arthur
            </button>
          </div>
        </motion.div>
        <PosterPreviewDialog open={showPosterPreview} dataUrl={posterDataUrl} onClose={closePosterPreview} onDownload={downloadPoster} />
      </div>
    );
  }

  return (
    <AssessmentQuestionLayout
      title="Enneagram Assessment"
      backPath="/assessment"
      questionNumber={history.length + 1}
      totalQuestions={10}
      loading={loading}
      loadingMessage={loadingMsg}
      question={currentQuestion}
      onAnswer={handleAnswer}
    />
  );
};

export default EnneagramFlow;
