import { useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Heart, Loader2, Users, Sparkles, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useSubscription } from "@/hooks/useSubscription";
import { useSharePoster } from "@/hooks/useSharePoster";
import ReactMarkdown from "react-markdown";
import PosterPreviewDialog from "@/components/PosterPreviewDialog";

const MBTI_TYPES = ["INTJ", "INTP", "ENTJ", "ENTP", "INFJ", "INFP", "ENFJ", "ENFP", "ISTJ", "ISFJ", "ESTJ", "ESFJ", "ISTP", "ISFP", "ESTP", "ESFP"];
const ZODIAC_SIGNS = ["白羊座", "金牛座", "双子座", "巨蟹座", "狮子座", "处女座", "天秤座", "天蝎座", "射手座", "摩羯座", "水瓶座", "双鱼座"];

interface CompatibilityResult {
  overallScore: number;
  title: string;
  emoji: string;
  summary: string;
  dimensions: { emotional: number; communication: number; values: number; growth: number; chemistry: number };
  strengths: string[];
  conflicts: { issue: string; solution: string }[];
  loveLanguage: { mine: string; partner: string; tip: string };
  deepAnalysis?: string;
  socialCaption: string;
}

const DIM_LABELS: Record<string, string> = {
  emotional: "情感共鸣",
  communication: "沟通默契",
  values: "价值观契合",
  growth: "成长互助",
  chemistry: "化学反应",
};

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/assessment-compatibility`;

const CompatibilityFlow = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { canAssess, assessmentLimit, plan, incrementAssessment } = useSubscription(user?.id);
  const { sharePoster, posterDataUrl, showPosterPreview, closePosterPreview, downloadPoster } = useSharePoster();

  const [step, setStep] = useState<"input" | "loading" | "result">("input");
  const [result, setResult] = useState<CompatibilityResult | null>(null);
  const [deepAnalysis, setDeepAnalysis] = useState("");
  const [deepAnalysisDone, setDeepAnalysisDone] = useState(false);

  // My profile
  const [myName, setMyName] = useState("");
  const [myMbti, setMyMbti] = useState("");
  const [myZodiac, setMyZodiac] = useState("");
  const [myTraits, setMyTraits] = useState("");

  // Partner profile
  const [partnerName, setPartnerName] = useState("");
  const [partnerMbti, setPartnerMbti] = useState("");
  const [partnerZodiac, setPartnerZodiac] = useState("");
  const [partnerTraits, setPartnerTraits] = useState("");

  const streamDeepAnalysis = useCallback(async (myProfile: any, partnerProfile: any, quickResult: any) => {
    setDeepAnalysis("");
    setDeepAnalysisDone(false);

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ action: "deep-analysis", myProfile, partnerProfile, quickResult }),
      });

      if (!resp.ok || !resp.body) {
        setDeepAnalysisDone(true);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIdx: number;
        while ((newlineIdx = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIdx);
          buffer = buffer.slice(newlineIdx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              fullText += content;
              setDeepAnalysis(fullText);
            }
          } catch { /* partial */ }
        }
      }

      // flush remaining
      if (buffer.trim()) {
        for (let raw of buffer.split("\n")) {
          if (!raw || !raw.startsWith("data: ")) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              fullText += content;
              setDeepAnalysis(fullText);
            }
          } catch { /* ignore */ }
        }
      }

      setDeepAnalysisDone(true);

      // Update DB record with deep analysis
      if (user && fullText) {
        await supabase
          .from("compatibility_reports")
          .update({ result_data: { ...quickResult, deepAnalysis: fullText } as any })
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1);
      }
    } catch {
      setDeepAnalysisDone(true);
    }
  }, [user]);

  const handleSubmit = useCallback(async () => {
    if (!user) { toast.error("请先登录 🌙"); navigate("/auth"); return; }
    if (!canAssess) { toast.error(`今日测评次数已用完（${assessmentLimit}次）💫`); return; }
    if (!myName.trim() || !partnerName.trim()) { toast.error("请填写双方名称"); return; }
    if (!myMbti && !myZodiac && !myTraits.trim()) { toast.error("请至少填写一项你的性格信息"); return; }
    if (!partnerMbti && !partnerZodiac && !partnerTraits.trim()) { toast.error("请至少填写一项对方的性格信息"); return; }

    await incrementAssessment();
    setStep("loading");
    setDeepAnalysis("");
    setDeepAnalysisDone(false);

    const myProfile = { name: myName, mbti: myMbti || undefined, zodiac: myZodiac || undefined, traits: myTraits || undefined };
    const partnerProfile = { name: partnerName, mbti: partnerMbti || undefined, zodiac: partnerZodiac || undefined, traits: partnerTraits || undefined };

    try {
      const { data, error } = await supabase.functions.invoke("assessment-compatibility", {
        body: { myProfile, partnerProfile },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setResult(data.result);
      setStep("result");

      // Save to database (without deepAnalysis first)
      await (supabase as any).from("compatibility_reports").insert({
        user_id: user.id,
        partner_info: { name: partnerName, mbti: partnerMbti, zodiac: partnerZodiac, traits: partnerTraits },
        result_data: data.result,
        is_paid: false,
      });

      // Start streaming deep analysis in background
      streamDeepAnalysis(myProfile, partnerProfile, data.result);
    } catch (e: any) {
      toast.error(e.message || "分析失败，请重试");
      setStep("input");
    }
  }, [user, myName, myMbti, myZodiac, myTraits, partnerName, partnerMbti, partnerZodiac, partnerTraits, canAssess, streamDeepAnalysis]);

  const handleSharePoster = () => {
    if (!result) return;
    sharePoster({
      title: `${result.emoji} ${result.overallScore}%`,
      subtitle: result.title,
      description: result.summary,
      icon: "💕",
      caption: result.socialCaption,
      accentColor: "#e84393",
      accentColorLight: "#fd79a8",
      bars: Object.entries(result.dimensions).map(([key, value]) => ({
        label1: DIM_LABELS[key] || key,
        label2: `${value}%`,
        value,
      })),
    });
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-500";
    if (score >= 60) return "text-secondary";
    if (score >= 40) return "text-yellow-500";
    return "text-rose-warm";
  };

  return (
    <div className="min-h-screen bg-gradient-calm pb-12">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 pt-14">
        <button onClick={() => navigate(-1)} className="text-muted-foreground">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h2 className="font-display text-sm font-semibold text-foreground">💕 关系合盘测试</h2>
      </div>

      <AnimatePresence mode="wait">
        {step === "input" && (
          <motion.div
            key="input"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="px-6 mt-2 space-y-4"
          >
            {/* Intro */}
            <div className="rounded-2xl bg-card p-4 shadow-card text-center">
              <Heart className="h-8 w-8 text-rose-warm mx-auto mb-2" />
              <h3 className="font-display text-base font-bold text-foreground">灵魂契合度分析</h3>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                输入你和 TA 的性格信息，AI 将为你们生成一份专属的关系分析报告
              </p>
            </div>

            {/* My Profile */}
            <div className="rounded-2xl bg-card p-4 shadow-card space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-full bg-gradient-mystic flex items-center justify-center">
                  <span className="text-xs">🙋</span>
                </div>
                <h4 className="text-sm font-semibold text-foreground">我的信息</h4>
              </div>
              <input
                value={myName}
                onChange={(e) => setMyName(e.target.value)}
                placeholder="你的名字 / 昵称"
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-secondary"
              />
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={myMbti}
                  onChange={(e) => setMyMbti(e.target.value)}
                  className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-secondary"
                >
                  <option value="">MBTI（选填）</option>
                  {MBTI_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                <select
                  value={myZodiac}
                  onChange={(e) => setMyZodiac(e.target.value)}
                  className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-secondary"
                >
                  <option value="">星座（选填）</option>
                  {ZODIAC_SIGNS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <textarea
                value={myTraits}
                onChange={(e) => setMyTraits(e.target.value)}
                placeholder="描述你的性格特点（选填）"
                rows={2}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-secondary resize-none"
              />
            </div>

            {/* Partner Profile */}
            <div className="rounded-2xl bg-card p-4 shadow-card space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-full bg-gradient-golden flex items-center justify-center">
                  <span className="text-xs">💕</span>
                </div>
                <h4 className="text-sm font-semibold text-foreground">TA 的信息</h4>
              </div>
              <input
                value={partnerName}
                onChange={(e) => setPartnerName(e.target.value)}
                placeholder="TA 的名字 / 昵称"
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-secondary"
              />
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={partnerMbti}
                  onChange={(e) => setPartnerMbti(e.target.value)}
                  className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-secondary"
                >
                  <option value="">MBTI（选填）</option>
                  {MBTI_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                <select
                  value={partnerZodiac}
                  onChange={(e) => setPartnerZodiac(e.target.value)}
                  className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-secondary"
                >
                  <option value="">星座（选填）</option>
                  {ZODIAC_SIGNS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <textarea
                value={partnerTraits}
                onChange={(e) => setPartnerTraits(e.target.value)}
                placeholder="描述 TA 的性格特点（选填）"
                rows={2}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-secondary resize-none"
              />
            </div>

            <button
              onClick={handleSubmit}
              className="w-full rounded-xl bg-gradient-golden py-3 text-sm font-semibold text-white flex items-center justify-center gap-2"
            >
              <Sparkles className="h-4 w-4" />
              开始合盘分析
            </button>
          </motion.div>
        )}

        {step === "loading" && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center mt-32 gap-4"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
            >
              <Heart className="h-12 w-12 text-rose-warm" />
            </motion.div>
            <p className="text-sm text-muted-foreground">AI 正在分析你们的灵魂契合度…</p>
          </motion.div>
        )}

        {step === "result" && result && (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="px-6 mt-2 space-y-4"
          >
            {/* Score Card */}
            <div className="rounded-2xl bg-card p-5 shadow-card text-center">
              <p className="text-4xl mb-1">{result.emoji}</p>
              <motion.p
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.2 }}
                className={`font-display text-4xl font-bold ${getScoreColor(result.overallScore)}`}
              >
                {result.overallScore}%
              </motion.p>
              <h3 className="font-display text-lg font-bold text-foreground mt-1">{result.title}</h3>
              <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{result.summary}</p>
            </div>

            {/* Five Dimensions */}
            <div className="rounded-2xl bg-card p-5 shadow-card space-y-3">
              <h4 className="font-display text-sm font-semibold text-foreground mb-2">五维契合度</h4>
              {Object.entries(result.dimensions).map(([key, value]) => (
                <div key={key} className="space-y-1">
                  <div className="flex justify-between text-[11px] text-muted-foreground">
                    <span>{DIM_LABELS[key] || key}</span>
                    <span>{value}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${value}%` }}
                      transition={{ delay: 0.3, duration: 0.8 }}
                      className="h-full rounded-full bg-gradient-to-r from-rose-warm to-secondary"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Strengths */}
            <div className="rounded-2xl bg-card p-5 shadow-card">
              <h4 className="font-display text-sm font-semibold text-foreground mb-3">✨ 关系优势</h4>
              <ul className="space-y-2">
                {result.strengths.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                    <span className="text-secondary mt-0.5">•</span>
                    <span className="leading-relaxed">{s}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Conflicts & Solutions */}
            <div className="rounded-2xl bg-card p-5 shadow-card">
              <h4 className="font-display text-sm font-semibold text-foreground mb-3">⚡ 潜在冲突与化解</h4>
              <div className="space-y-3">
                {result.conflicts.map((c, i) => (
                  <div key={i} className="rounded-xl bg-muted/30 p-3">
                    <p className="text-sm font-medium text-foreground">🔸 {c.issue}</p>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">💡 {c.solution}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Love Language */}
            <div className="rounded-2xl bg-card p-5 shadow-card">
              <h4 className="font-display text-sm font-semibold text-foreground mb-3">💗 爱的语言</h4>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="rounded-xl bg-muted/30 p-3 text-center">
                  <p className="text-[10px] text-muted-foreground">{myName || "我"}</p>
                  <p className="text-sm font-semibold text-foreground mt-1">{result.loveLanguage.mine}</p>
                </div>
                <div className="rounded-xl bg-muted/30 p-3 text-center">
                  <p className="text-[10px] text-muted-foreground">{partnerName || "TA"}</p>
                  <p className="text-sm font-semibold text-foreground mt-1">{result.loveLanguage.partner}</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{result.loveLanguage.tip}</p>
            </div>

            {/* Deep Analysis - Streamed */}
            <div className="rounded-2xl bg-card p-5 shadow-card">
              <h4 className="font-display text-sm font-semibold text-foreground mb-3">📖 深度分析</h4>
              {deepAnalysis ? (
                <div className="prose prose-sm max-w-none text-foreground prose-p:text-sm prose-p:leading-relaxed">
                  <ReactMarkdown>{deepAnalysis}</ReactMarkdown>
                  {!deepAnalysisDone && (
                    <span className="inline-block w-1.5 h-4 bg-secondary animate-pulse ml-0.5 align-middle rounded-sm" />
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-xs">深度分析生成中…</span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={handleSharePoster}
                className="flex-1 rounded-xl bg-gradient-golden py-3 text-sm font-semibold text-white flex items-center justify-center gap-2"
              >
                <Download className="h-4 w-4" />
                保存海报
              </button>
              <button
                onClick={() => { setStep("input"); setResult(null); setDeepAnalysis(""); }}
                className="flex-1 rounded-xl bg-card py-3 text-sm font-semibold text-foreground shadow-card flex items-center justify-center gap-2 border border-border"
              >
                <Users className="h-4 w-4" />
                再测一次
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <PosterPreviewDialog
        open={showPosterPreview}
        onClose={closePosterPreview}
        dataUrl={posterDataUrl}
        onDownload={downloadPoster}
      />
    </div>
  );
};

export default CompatibilityFlow;
