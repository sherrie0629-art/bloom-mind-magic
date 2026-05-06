import { useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Heart, Loader2, Users, Sparkles, Download } from "lucide-react";
import DesktopLayout from "@/components/DesktopLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useSubscription } from "@/hooks/useSubscription";
import { useSharePoster } from "@/hooks/useSharePoster";
import { useLocale } from "@/hooks/useLocale";
import { useTranslation } from "react-i18next";
import ReactMarkdown from "react-markdown";
import PosterPreviewDialog from "@/components/PosterPreviewDialog";

const MBTI_TYPES = ["INTJ", "INTP", "ENTJ", "ENTP", "INFJ", "INFP", "ENFJ", "ENFP", "ISTJ", "ISFJ", "ESTJ", "ESFJ", "ISTP", "ISFP", "ESTP", "ESFP"];
const ZODIAC_SIGNS = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];

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


const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/assessment-compatibility`;

const CompatibilityFlow = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { locale } = useLocale();
  const DIM_LABELS: Record<string, string> = {
    emotional: t("assessmentFlow.compatibility.dim.emotional"),
    communication: t("assessmentFlow.compatibility.dim.communication"),
    values: t("assessmentFlow.compatibility.dim.values"),
    growth: t("assessmentFlow.compatibility.dim.growth"),
    chemistry: t("assessmentFlow.compatibility.dim.chemistry"),
  };
  const { user } = useAuth();
  const { canAssess, assessmentLimit, plan, incrementAssessment } = useSubscription(user?.id);
  const { sharePoster, posterDataUrl, showPosterPreview, closePosterPreview, downloadPoster } = useSharePoster();

  const [step, setStep] = useState<"input" | "loading" | "result">("input");
  const [result, setResult] = useState<CompatibilityResult | null>(null);
  const [deepAnalysis, setDeepAnalysis] = useState("");
  const [deepAnalysisDone, setDeepAnalysisDone] = useState(false);

  const [myName, setMyName] = useState("");
  const [myMbti, setMyMbti] = useState("");
  const [myZodiac, setMyZodiac] = useState("");
  const [myTraits, setMyTraits] = useState("");

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
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({ action: "deep-analysis", myProfile, partnerProfile, quickResult, locale }),
      });
      if (!resp.ok || !resp.body) { setDeepAnalysisDone(true); return; }
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
          try { const p = JSON.parse(jsonStr); const c = p.choices?.[0]?.delta?.content; if (c) { fullText += c; setDeepAnalysis(fullText); } } catch {}
        }
      }
      if (buffer.trim()) {
        for (let raw of buffer.split("\n")) {
          if (!raw?.startsWith("data: ")) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try { const p = JSON.parse(jsonStr); const c = p.choices?.[0]?.delta?.content; if (c) { fullText += c; setDeepAnalysis(fullText); } } catch {}
        }
      }
      setDeepAnalysisDone(true);
      if (user && fullText) {
        await supabase.from("compatibility_reports").update({ result_data: { ...quickResult, deepAnalysis: fullText } as any }).eq("user_id", user.id).order("created_at", { ascending: false }).limit(1);
      }
    } catch { setDeepAnalysisDone(true); }
  }, [user]);

  const handleSubmit = useCallback(async () => {
    if (!user) { toast.error(t("assessmentFlow.compatibility.pleaseSignIn")); navigate("/auth"); return; }
    if (!canAssess) { toast.error(t("assessmentFlow.compatibility.dailyLimitReached", { n: assessmentLimit })); return; }
    if (!myName.trim() || !partnerName.trim()) { toast.error(t("assessmentFlow.compatibility.needBothNames")); return; }
    if (!myMbti && !myZodiac && !myTraits.trim()) { toast.error(t("assessmentFlow.compatibility.needMyInfo")); return; }
    if (!partnerMbti && !partnerZodiac && !partnerTraits.trim()) { toast.error(t("assessmentFlow.compatibility.needTheirInfo")); return; }
    await incrementAssessment();
    setStep("loading");
    setDeepAnalysis("");
    setDeepAnalysisDone(false);
    const myProfile = { name: myName, mbti: myMbti || undefined, zodiac: myZodiac || undefined, traits: myTraits || undefined };
    const partnerProfile = { name: partnerName, mbti: partnerMbti || undefined, zodiac: partnerZodiac || undefined, traits: partnerTraits || undefined };
    try {
      const { data, error } = await supabase.functions.invoke("assessment-compatibility", { body: { myProfile, partnerProfile, locale } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setResult(data.result);
      setStep("result");
      await (supabase as any).from("compatibility_reports").insert({ user_id: user.id, partner_info: { name: partnerName, mbti: partnerMbti, zodiac: partnerZodiac, traits: partnerTraits }, result_data: data.result, is_paid: false });
      streamDeepAnalysis(myProfile, partnerProfile, data.result);
    } catch (e: any) { toast.error(e.message || t("assessmentFlow.compatibility.analyzeFail")); setStep("input"); }
  }, [user, myName, myMbti, myZodiac, myTraits, partnerName, partnerMbti, partnerZodiac, partnerTraits, canAssess, streamDeepAnalysis, locale, t, assessmentLimit, incrementAssessment, navigate]);

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
      bars: Object.entries(result.dimensions).map(([key, value]) => ({ label1: DIM_LABELS[key] || key, label2: `${value}%`, value })),
    });
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-500";
    if (score >= 60) return "text-secondary";
    if (score >= 40) return "text-yellow-500";
    return "text-rose-warm";
  };

  return (
    <DesktopLayout>
    <div className="min-h-screen bg-gradient-calm pb-12">
      <div className="flex items-center gap-3 px-4 py-3 pt-14">
        <button onClick={() => navigate(-1)} className="text-muted-foreground"><ArrowLeft className="h-5 w-5" /></button>
        <h2 className="font-display text-sm font-semibold text-foreground">{t("assessmentFlow.compatibility.title")}</h2>
      </div>
      <AnimatePresence mode="wait">
        {step === "input" && (
          <motion.div key="input" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} className="px-6 mt-2 space-y-4">
            <div className="rounded-2xl bg-card p-4 shadow-card text-center">
              <Heart className="h-8 w-8 text-rose-warm mx-auto mb-2" />
              <h3 className="font-display text-base font-bold text-foreground">{t("assessmentFlow.compatibility.introTitle")}</h3>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{t("assessmentFlow.compatibility.introDesc")}</p>
            </div>
            <div className="rounded-2xl bg-card p-4 shadow-card space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-full bg-gradient-mystic flex items-center justify-center"><span className="text-xs">🙋</span></div>
                <h4 className="text-sm font-semibold text-foreground">{t("assessmentFlow.compatibility.aboutMe")}</h4>
              </div>
              <input value={myName} onChange={(e) => setMyName(e.target.value)} placeholder={t("assessmentFlow.compatibility.yourName")} className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-secondary" />
              <div className="grid grid-cols-2 gap-2">
                <select value={myMbti} onChange={(e) => setMyMbti(e.target.value)} className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-secondary">
                  <option value="">{t("assessmentFlow.compatibility.mbtiOptional")}</option>
                  {MBTI_TYPES.map((t2) => <option key={t2} value={t2}>{t2}</option>)}
                </select>
                <select value={myZodiac} onChange={(e) => setMyZodiac(e.target.value)} className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-secondary">
                  <option value="">{t("assessmentFlow.compatibility.signOptional")}</option>
                  {ZODIAC_SIGNS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <textarea value={myTraits} onChange={(e) => setMyTraits(e.target.value)} placeholder={t("assessmentFlow.compatibility.describeMe")} rows={2} className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-secondary resize-none" />
            </div>
            <div className="rounded-2xl bg-card p-4 shadow-card space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-full bg-gradient-golden flex items-center justify-center"><span className="text-xs">💕</span></div>
                <h4 className="text-sm font-semibold text-foreground">{t("assessmentFlow.compatibility.aboutThem")}</h4>
              </div>
              <input value={partnerName} onChange={(e) => setPartnerName(e.target.value)} placeholder={t("assessmentFlow.compatibility.theirName")} className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-secondary" />
              <div className="grid grid-cols-2 gap-2">
                <select value={partnerMbti} onChange={(e) => setPartnerMbti(e.target.value)} className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-secondary">
                  <option value="">{t("assessmentFlow.compatibility.mbtiOptional")}</option>
                  {MBTI_TYPES.map((t2) => <option key={t2} value={t2}>{t2}</option>)}
                </select>
                <select value={partnerZodiac} onChange={(e) => setPartnerZodiac(e.target.value)} className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-secondary">
                  <option value="">{t("assessmentFlow.compatibility.signOptional")}</option>
                  {ZODIAC_SIGNS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <textarea value={partnerTraits} onChange={(e) => setPartnerTraits(e.target.value)} placeholder={t("assessmentFlow.compatibility.describeThem")} rows={2} className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-secondary resize-none" />
            </div>
            <button onClick={handleSubmit} className="w-full rounded-xl bg-gradient-golden py-3 text-sm font-semibold text-white flex items-center justify-center gap-2">
              <Sparkles className="h-4 w-4" /> {t("assessmentFlow.compatibility.analyzeBtn")}
            </button>
          </motion.div>
        )}
        {step === "loading" && (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center mt-32 gap-4">
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }}>
              <Heart className="h-12 w-12 text-rose-warm" />
            </motion.div>
            <p className="text-sm text-muted-foreground">{t("assessmentFlow.compatibility.analyzing")}</p>
          </motion.div>
        )}
        {step === "result" && result && (
          <motion.div key="result" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="px-6 mt-2 space-y-4">
            <div className="rounded-2xl bg-card p-5 shadow-card text-center">
              <p className="text-4xl mb-1">{result.emoji}</p>
              <motion.p initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.2 }} className={`font-display text-4xl font-bold ${getScoreColor(result.overallScore)}`}>{result.overallScore}%</motion.p>
              <h3 className="font-display text-lg font-bold text-foreground mt-1">{result.title}</h3>
              <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{result.summary}</p>
            </div>
            <div className="rounded-2xl bg-card p-5 shadow-card space-y-3">
              <h4 className="font-display text-sm font-semibold text-foreground mb-2">{t("assessmentFlow.compatibility.fiveDimensions")}</h4>
              {Object.entries(result.dimensions).map(([key, value]) => (
                <div key={key} className="space-y-1">
                  <div className="flex justify-between text-[11px] text-muted-foreground"><span>{DIM_LABELS[key] || key}</span><span>{value}%</span></div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${value}%` }} transition={{ delay: 0.3, duration: 0.8 }} className="h-full rounded-full bg-gradient-to-r from-rose-warm to-secondary" />
                  </div>
                </div>
              ))}
            </div>
            <div className="rounded-2xl bg-card p-5 shadow-card">
              <h4 className="font-display text-sm font-semibold text-foreground mb-3">{t("assessmentFlow.compatibility.strengths")}</h4>
              <ul className="space-y-2">
                {result.strengths.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-foreground"><span className="text-secondary mt-0.5">•</span><span className="leading-relaxed">{s}</span></li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl bg-card p-5 shadow-card">
              <h4 className="font-display text-sm font-semibold text-foreground mb-3">{t("assessmentFlow.compatibility.conflicts")}</h4>
              <div className="space-y-3">
                {result.conflicts.map((c, i) => (
                  <div key={i} className="rounded-xl bg-muted/30 p-3">
                    <p className="text-sm font-medium text-foreground">🔸 {c.issue}</p>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">💡 {c.solution}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl bg-card p-5 shadow-card">
              <h4 className="font-display text-sm font-semibold text-foreground mb-3">💗 Love Languages</h4>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="rounded-xl bg-muted/30 p-3 text-center">
                  <p className="text-[10px] text-muted-foreground">{myName || "Me"}</p>
                  <p className="text-sm font-semibold text-foreground mt-1">{result.loveLanguage.mine}</p>
                </div>
                <div className="rounded-xl bg-muted/30 p-3 text-center">
                  <p className="text-[10px] text-muted-foreground">{partnerName || "Them"}</p>
                  <p className="text-sm font-semibold text-foreground mt-1">{result.loveLanguage.partner}</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{result.loveLanguage.tip}</p>
            </div>
            <div className="rounded-2xl bg-card p-5 shadow-card">
              <h4 className="font-display text-sm font-semibold text-foreground mb-3">📖 Deep Analysis</h4>
              {deepAnalysis ? (
                <div className="prose prose-sm max-w-none text-foreground prose-p:text-sm prose-p:leading-relaxed">
                  <ReactMarkdown>{deepAnalysis}</ReactMarkdown>
                  {!deepAnalysisDone && <span className="inline-block w-1.5 h-4 bg-secondary animate-pulse ml-0.5 align-middle rounded-sm" />}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /><span className="text-xs">Generating deep analysis…</span></div>
              )}
            </div>
            <div className="flex gap-3">
              <button onClick={handleSharePoster} className="flex-1 rounded-xl bg-gradient-golden py-3 text-sm font-semibold text-white flex items-center justify-center gap-2"><Download className="h-4 w-4" /> Save Poster</button>
              <button onClick={() => { setStep("input"); setResult(null); setDeepAnalysis(""); }} className="flex-1 rounded-xl bg-card py-3 text-sm font-semibold text-foreground shadow-card flex items-center justify-center gap-2 border border-border"><Users className="h-4 w-4" /> Try Again</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <PosterPreviewDialog open={showPosterPreview} onClose={closePosterPreview} dataUrl={posterDataUrl} onDownload={downloadPoster} />
    </div>
    </DesktopLayout>
  );
};

export default CompatibilityFlow;
