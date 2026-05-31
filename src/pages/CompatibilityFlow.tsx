import { isDailyLimitError } from "@/lib/assessmentErrors";
import { useState, useCallback, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Heart, Loader2, Users, Sparkles, Download, Share2, Copy } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
import DeepReportUnlock from "@/components/DeepReportUnlock";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";

const MBTI_TYPES = ["INTJ", "INTP", "ENTJ", "ENTP", "INFJ", "INFP", "ENFJ", "ENFP", "ISTJ", "ISFJ", "ESTJ", "ESFJ", "ISTP", "ISFP", "ESTP", "ESFP"];
const ZODIAC_SIGNS = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];
const MBTI_EMOJI: Record<string, string> = { INTJ: "🏛️", INTP: "🔭", ENTJ: "👑", ENTP: "⚡", INFJ: "🌙", INFP: "🌸", ENFJ: "🌻", ENFP: "🎈", ISTJ: "📋", ISFJ: "🧸", ESTJ: "🏗️", ESFJ: "🍰", ISTP: "🔧", ISFP: "🎨", ESTP: "🛹", ESFP: "🎤" };
const ZODIAC_EMOJI: Record<string, string> = { Aries: "♈", Taurus: "♉", Gemini: "♊", Cancer: "♋", Leo: "♌", Virgo: "♍", Libra: "♎", Scorpio: "♏", Sagittarius: "♐", Capricorn: "♑", Aquarius: "♒", Pisces: "♓" };

const STAGE_KEYS = ["crush", "talking", "dating", "longterm", "complicated"] as const;
const STAGE_EMOJI: Record<string, string> = { crush: "👀", talking: "💬", dating: "🔥", longterm: "🌿", complicated: "🌀" };
const VIBE_KEYS = ["deepTalk", "ghosted", "memes", "meal", "silence", "fight"] as const;
const VIBE_EMOJI: Record<string, string> = { deepTalk: "💭", ghosted: "👻", memes: "😂", meal: "🍜", silence: "🧊", fight: "💥" };

type Rarity = "SSR" | "SR" | "R" | "N";

interface CompatibilityResult {
  overallScore: number;
  title: string;
  emoji: string;
  summary: string;
  cpName?: string;
  rarity?: Rarity;
  tags?: string[];
  dimensions: { emotional: number; communication: number; values: number; growth: number; chemistry: number };
  radarOneLiner?: string;
  strengths: string[];
  conflicts: { issue: string; solution: string }[];
  trafficLight?: { green: string[]; yellow: string[]; red: string[] };
  dramaScene?: string;
  loveLanguage: { mine: string; partner: string; tip: string; actionForThem?: string; phraseTheyWant?: string };
  keywords?: string[];
  prophecy?: string;
  deepAnalysis?: string;
  socialCaption: string;
}

const RARITY_THEME: Record<Rarity, { from: string; to: string; ring: string; text: string; glow: string }> = {
  SSR: { from: "from-amber-300", to: "to-rose-400", ring: "ring-amber-300", text: "text-amber-500", glow: "shadow-[0_0_40px_rgba(251,191,36,0.45)]" },
  SR:  { from: "from-fuchsia-400", to: "to-violet-500", ring: "ring-fuchsia-400", text: "text-fuchsia-500", glow: "shadow-[0_0_30px_rgba(217,70,239,0.35)]" },
  R:   { from: "from-sky-400", to: "to-indigo-500", ring: "ring-sky-400", text: "text-sky-500", glow: "shadow-[0_0_24px_rgba(56,189,248,0.3)]" },
  N:   { from: "from-slate-300", to: "to-slate-500", ring: "ring-slate-400", text: "text-slate-500", glow: "" },
};

const deriveRarity = (score: number): Rarity => (score >= 88 ? "SSR" : score >= 72 ? "SR" : score >= 55 ? "R" : "N");

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
  const { canAssess, assessmentLimit, incrementAssessment } = useSubscription(user?.id);
  const { sharePoster, posterDataUrl, showPosterPreview, closePosterPreview, downloadPoster } = useSharePoster();

  const [step, setStep] = useState<"input" | "loading" | "result">("input");
  const [result, setResult] = useState<CompatibilityResult | null>(null);
  const [savedReportId, setSavedReportId] = useState<string | null>(null);
  const [loadingLineIdx, setLoadingLineIdx] = useState(0);

  const [myName, setMyName] = useState("");
  const [myMbti, setMyMbti] = useState("");
  const [myZodiac, setMyZodiac] = useState("");
  const [myTraits, setMyTraits] = useState("");

  const [partnerName, setPartnerName] = useState("");
  const [partnerMbti, setPartnerMbti] = useState("");
  const [partnerZodiac, setPartnerZodiac] = useState("");
  const [partnerTraits, setPartnerTraits] = useState("");

  const [stage, setStage] = useState<string>("");
  const [vibe, setVibe] = useState<string>("");

  const loadingLines = (t("assessmentFlow.compatibility.loadingLines", { returnObjects: true, defaultValue: [] }) as string[]) || [];

  useEffect(() => {
    if (step !== "loading" || loadingLines.length === 0) return;
    setLoadingLineIdx(0);
    const id = setInterval(() => {
      setLoadingLineIdx((i) => (i + 1) % loadingLines.length);
    }, 1400);
    return () => clearInterval(id);
  }, [step, loadingLines.length]);



  const handleSubmit = useCallback(async () => {
    if (!user) { toast.error(t("assessmentFlow.compatibility.pleaseSignIn")); navigate("/auth"); return; }
    if (!canAssess) { toast.error(t("assessmentFlow.compatibility.dailyLimitReached", { n: assessmentLimit })); return; }
    if (!myName.trim() || !partnerName.trim()) { toast.error(t("assessmentFlow.compatibility.needBothNames")); return; }
    if (!myMbti && !myZodiac && !myTraits.trim()) { toast.error(t("assessmentFlow.compatibility.needMyInfo")); return; }
    if (!partnerMbti && !partnerZodiac && !partnerTraits.trim()) { toast.error(t("assessmentFlow.compatibility.needTheirInfo")); return; }
    await incrementAssessment();
    setStep("loading");
    const stageLabel = stage ? t(`assessmentFlow.compatibility.stages.${stage}`) : undefined;
    const vibeLabel = vibe ? t(`assessmentFlow.compatibility.vibes.${vibe}`) : undefined;
    const myProfile = { name: myName, mbti: myMbti || undefined, zodiac: myZodiac || undefined, traits: myTraits || undefined, stage: stageLabel, recentVibe: vibeLabel };
    const partnerProfile = { name: partnerName, mbti: partnerMbti || undefined, zodiac: partnerZodiac || undefined, traits: partnerTraits || undefined };
    try {
      const { data, error } = await supabase.functions.invoke("assessment-compatibility", { body: { myProfile, partnerProfile, locale } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const r: CompatibilityResult = data.result;
      if (!r.rarity) r.rarity = deriveRarity(r.overallScore);
      setResult(r);
      setStep("result");
      const { data: inserted } = await (supabase as any).from("compatibility_reports").insert({ user_id: user.id, partner_info: { name: partnerName, mbti: partnerMbti, zodiac: partnerZodiac, traits: partnerTraits, stage: stageLabel, recentVibe: vibeLabel }, result_data: r, is_paid: false }).select("id").single();
      if (inserted?.id) setSavedReportId(inserted.id);
    } catch (e: any) {
      if (isDailyLimitError(e)) toast.error(t("assessmentFlow.compatibility.dailyLimitReached", { n: 20 }));
      else toast.error(e.message || t("assessmentFlow.compatibility.analyzeFail"));
      setStep("input");
    }
  }, [user, myName, myMbti, myZodiac, myTraits, partnerName, partnerMbti, partnerZodiac, partnerTraits, stage, vibe, canAssess, locale, t, assessmentLimit, incrementAssessment, navigate]);

  const rarity: Rarity = (result?.rarity as Rarity) || (result ? deriveRarity(result.overallScore) : "N");
  const theme = RARITY_THEME[rarity];
  const cpName = result?.cpName || `${myName} & ${partnerName}`;

  const handleSharePoster = () => {
    if (!result) return;
    sharePoster({
      title: `${result.emoji} ${result.overallScore}%`,
      subtitle: `${cpName} · ${t(`assessmentFlow.compatibility.rarity.${rarity}`)}`,
      description: result.summary,
      icon: "💕",
      caption: result.socialCaption || t("assessmentFlow.compatibility.shareCaptionFallback", { cp: cpName }),
      accentColor: rarity === "SSR" ? "#f59e0b" : rarity === "SR" ? "#a855f7" : rarity === "R" ? "#0ea5e9" : "#94a3b8",
      accentColorLight: rarity === "SSR" ? "#fcd34d" : rarity === "SR" ? "#d8b4fe" : rarity === "R" ? "#7dd3fc" : "#cbd5e1",
      bars: Object.entries(result.dimensions).map(([key, value]) => ({ label1: DIM_LABELS[key] || key, label2: `${value}%`, value })),
      extraLines: [
        ...(result.tags?.slice(0, 3) || []),
        ...(result.prophecy ? [`🔮 ${result.prophecy}`] : []),
      ],
    });
  };

  const handleCopyInvite = async () => {
    if (!result) return;
    const url = typeof window !== "undefined" ? window.location.origin + "/assessment/compatibility" : "";
    const text = t("assessmentFlow.compatibility.inviteText", {
      cp: cpName,
      rarity: t(`assessmentFlow.compatibility.rarity.${rarity}`),
      score: result.overallScore,
      url,
    });
    try {
      await navigator.clipboard.writeText(text);
      toast.success(t("assessmentFlow.compatibility.inviteCopied"));
    } catch {
      toast.error(t("assessmentFlow.compatibility.analyzeFail"));
    }
  };

  const radarData = useMemo(() => {
    if (!result) return [];
    return Object.entries(result.dimensions).map(([key, value]) => ({ dim: DIM_LABELS[key] || key, value }));
  }, [result, locale]);

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

            <div className="rounded-2xl bg-card p-4 shadow-card space-y-3">
              <h4 className="text-sm font-semibold text-foreground">{t("assessmentFlow.compatibility.stageLabel")}</h4>
              <div className="flex flex-wrap gap-2">
                {STAGE_KEYS.map((k) => (
                  <button
                    key={k}
                    onClick={() => setStage(stage === k ? "" : k)}
                    className={`rounded-full px-3 py-1.5 text-xs border transition ${stage === k ? "bg-rose-warm text-white border-rose-warm" : "bg-background border-border text-foreground"}`}
                  >
                    {t(`assessmentFlow.compatibility.stages.${k}`)}
                  </button>
                ))}
              </div>
              <h4 className="text-sm font-semibold text-foreground pt-1">{t("assessmentFlow.compatibility.vibeLabel")}</h4>
              <div className="flex flex-wrap gap-2">
                {VIBE_KEYS.map((k) => (
                  <button
                    key={k}
                    onClick={() => setVibe(vibe === k ? "" : k)}
                    className={`rounded-full px-3 py-1.5 text-xs border transition ${vibe === k ? "bg-secondary text-white border-secondary" : "bg-background border-border text-foreground"}`}
                  >
                    {t(`assessmentFlow.compatibility.vibes.${k}`)}
                  </button>
                ))}
              </div>
            </div>

            <motion.button
              whileTap={{ scale: 0.97, rotate: -1 }}
              onClick={handleSubmit}
              className="w-full rounded-xl bg-gradient-golden py-3.5 text-sm font-semibold text-white flex items-center justify-center gap-2 shadow-lg"
            >
              <Sparkles className="h-4 w-4" /> {t("assessmentFlow.compatibility.analyzeBtn")}
            </motion.button>
          </motion.div>
        )}

        {step === "loading" && (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center mt-24 gap-6 px-6">
            <motion.div
              animate={{ rotate: [0, 12, -12, 0], scale: [1, 1.1, 1] }}
              transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }}
              className="text-6xl"
            >
              🎲
            </motion.div>
            <div className="h-12 overflow-hidden text-center">
              <AnimatePresence mode="wait">
                <motion.p
                  key={loadingLineIdx}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.35 }}
                  className="text-sm text-foreground"
                >
                  {loadingLines[loadingLineIdx]}
                </motion.p>
              </AnimatePresence>
            </div>
            <p className="text-xs text-muted-foreground">{t("assessmentFlow.compatibility.rollingDice")}</p>
          </motion.div>
        )}

        {step === "result" && result && (
          <motion.div key="result" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="px-6 mt-2 space-y-4">
            {/* Card 1 — Destiny Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.92, rotateY: -8 }}
              animate={{ opacity: 1, scale: 1, rotateY: 0 }}
              transition={{ type: "spring", stiffness: 120, damping: 14 }}
              className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${theme.from} ${theme.to} p-6 text-center text-white ${theme.glow}`}
            >
              <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 30% 20%, rgba(255,255,255,0.6), transparent 40%), radial-gradient(circle at 70% 80%, rgba(255,255,255,0.4), transparent 40%)" }} />
              <div className="relative">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[10px] uppercase tracking-widest opacity-80">{t("assessmentFlow.compatibility.destinyCard")}</span>
                  <span className="rounded-full bg-white/25 backdrop-blur px-2.5 py-0.5 text-[11px] font-bold">{t(`assessmentFlow.compatibility.rarity.${rarity}`)}</span>
                </div>
                <p className="text-5xl mb-1">{result.emoji}</p>
                <h3 className="font-display text-2xl font-bold leading-tight">{cpName}</h3>
                <p className="text-xs opacity-85 mt-1">{result.title}</p>
                <motion.p initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.25 }} className="font-display text-5xl font-extrabold mt-3 drop-shadow">
                  {result.overallScore}%
                </motion.p>
                {result.tags && result.tags.length > 0 && (
                  <div className="flex flex-wrap justify-center gap-1.5 mt-3">
                    {result.tags.slice(0, 3).map((tag, i) => (
                      <span key={i} className="rounded-full bg-white/25 backdrop-blur px-2.5 py-1 text-[11px]">#{tag}</span>
                    ))}
                  </div>
                )}
                <p className="text-xs opacity-90 mt-3 leading-relaxed">{result.summary}</p>
              </div>
            </motion.div>

            {/* Card 2 — Traffic Light */}
            {result.trafficLight && (
              <div className="rounded-2xl bg-card p-5 shadow-card space-y-3">
                <h4 className="font-display text-sm font-semibold text-foreground">{t("assessmentFlow.compatibility.trafficLightTitle")}</h4>
                {(["green", "yellow", "red"] as const).map((k) => {
                  const lines = result.trafficLight?.[k] || [];
                  if (lines.length === 0) return null;
                  const tone = k === "green" ? "bg-green-500/10 border-green-500/30" : k === "yellow" ? "bg-amber-500/10 border-amber-500/30" : "bg-rose-500/10 border-rose-500/30";
                  return (
                    <div key={k} className={`rounded-xl border p-3 ${tone}`}>
                      <p className="text-xs font-semibold text-foreground mb-1.5">{t(`assessmentFlow.compatibility.trafficLight.${k}`)}</p>
                      <ul className="space-y-1">
                        {lines.map((l, i) => <li key={i} className="text-sm text-foreground leading-relaxed">{l}</li>)}
                      </ul>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Card 3 — Radar */}
            <div className="rounded-2xl bg-card p-5 shadow-card">
              <h4 className="font-display text-sm font-semibold text-foreground mb-1">{t("assessmentFlow.compatibility.fiveDimensions")}</h4>
              {result.radarOneLiner && <p className="text-xs text-muted-foreground mb-2 italic">「{result.radarOneLiner}」</p>}
              <div className="h-56 -mx-2">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData} outerRadius="75%">
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis dataKey="dim" tick={{ fill: "hsl(var(--foreground))", fontSize: 10 }} />
                    <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar dataKey="value" stroke="hsl(var(--secondary))" fill="hsl(var(--secondary))" fillOpacity={0.45} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Card 4 — Drama Scene */}
            {result.dramaScene && (
              <div className="rounded-2xl bg-gradient-to-br from-rose-50 to-amber-50 dark:from-rose-950/30 dark:to-amber-950/30 p-5 shadow-card border border-rose-200/50">
                <h4 className="font-display text-sm font-semibold text-foreground mb-2">{t("assessmentFlow.compatibility.dramaTitle")}</h4>
                <p className="text-sm text-foreground leading-relaxed italic">{result.dramaScene}</p>
              </div>
            )}

            {/* Card 5 — Strengths + Conflicts (compact) */}
            <div className="rounded-2xl bg-card p-5 shadow-card space-y-3">
              <h4 className="font-display text-sm font-semibold text-foreground">{t("assessmentFlow.compatibility.strengths")}</h4>
              <ul className="space-y-1.5">
                {result.strengths.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-foreground"><span className="text-secondary mt-0.5">•</span><span className="leading-relaxed">{s}</span></li>
                ))}
              </ul>
              {result.conflicts.length > 0 && (
                <>
                  <h4 className="font-display text-sm font-semibold text-foreground pt-2">{t("assessmentFlow.compatibility.conflicts")}</h4>
                  <div className="space-y-2">
                    {result.conflicts.map((c, i) => (
                      <div key={i} className="rounded-xl bg-muted/30 p-3">
                        <p className="text-sm font-medium text-foreground">🔸 {c.issue}</p>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">💡 {c.solution}</p>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Card 6 — Love Language Action */}
            <div className="rounded-2xl bg-card p-5 shadow-card space-y-3">
              <h4 className="font-display text-sm font-semibold text-foreground">{t("assessmentFlow.compatibility.loveLanguages")}</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-muted/30 p-3 text-center">
                  <p className="text-[10px] text-muted-foreground">{myName || t("assessmentFlow.compatibility.me")}</p>
                  <p className="text-sm font-semibold text-foreground mt-1">{result.loveLanguage.mine}</p>
                </div>
                <div className="rounded-xl bg-muted/30 p-3 text-center">
                  <p className="text-[10px] text-muted-foreground">{partnerName || t("assessmentFlow.compatibility.them")}</p>
                  <p className="text-sm font-semibold text-foreground mt-1">{result.loveLanguage.partner}</p>
                </div>
              </div>
              {result.loveLanguage.actionForThem && (
                <div className="rounded-xl bg-green-500/10 border border-green-500/20 p-3">
                  <p className="text-[11px] font-semibold text-foreground mb-0.5">{t("assessmentFlow.compatibility.loveActionTitle")}</p>
                  <p className="text-sm text-foreground">{result.loveLanguage.actionForThem}</p>
                </div>
              )}
              {result.loveLanguage.phraseTheyWant && (
                <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3">
                  <p className="text-[11px] font-semibold text-foreground mb-0.5">{t("assessmentFlow.compatibility.lovePhraseTitle")}</p>
                  <p className="text-sm text-foreground italic">「{result.loveLanguage.phraseTheyWant}」</p>
                </div>
              )}
              <p className="text-xs text-muted-foreground leading-relaxed">{result.loveLanguage.tip}</p>
            </div>

            {/* Card 7 — Keywords + Prophecy */}
            {(result.keywords?.length || result.prophecy) && (
              <div className="rounded-2xl bg-gradient-to-br from-violet-100 to-fuchsia-100 dark:from-violet-950/30 dark:to-fuchsia-950/30 p-5 shadow-card border border-violet-200/40">
                {result.keywords && result.keywords.length > 0 && (
                  <>
                    <h4 className="font-display text-sm font-semibold text-foreground mb-2">{t("assessmentFlow.compatibility.keywordsTitle")}</h4>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {result.keywords.map((k, i) => (
                        <span key={i} className="rounded-lg bg-white/60 dark:bg-white/10 px-3 py-1 text-xs font-medium text-foreground">{k}</span>
                      ))}
                    </div>
                  </>
                )}
                {result.prophecy && (
                  <>
                    <h4 className="font-display text-sm font-semibold text-foreground mb-1">{t("assessmentFlow.compatibility.prophecyTitle")}</h4>
                    <p className="text-sm text-foreground leading-relaxed">{result.prophecy}</p>
                  </>
                )}
              </div>
            )}



            {/* Invite CTA */}
            <button
              onClick={handleCopyInvite}
              className="w-full rounded-2xl bg-gradient-to-r from-rose-warm/15 to-secondary/15 border border-rose-warm/30 p-4 text-left flex items-center justify-between"
            >
              <div>
                <p className="text-sm font-semibold text-foreground">{t("assessmentFlow.compatibility.inviteTitle")}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{t("assessmentFlow.compatibility.inviteHint")}</p>
              </div>
              <Copy className="h-4 w-4 text-foreground" />
            </button>

            <div className="flex gap-3">
              <button onClick={handleSharePoster} className="flex-1 rounded-xl bg-gradient-golden py-3 text-sm font-semibold text-white flex items-center justify-center gap-2"><Share2 className="h-4 w-4" /> {t("assessmentFlow.compatibility.savePoster")}</button>
              <button onClick={() => { setStep("input"); setResult(null); }} className="flex-1 rounded-xl bg-card py-3 text-sm font-semibold text-foreground shadow-card flex items-center justify-center gap-2 border border-border"><Users className="h-4 w-4" /> {t("assessmentFlow.compatibility.tryAgain")}</button>
            </div>
            <button
              onClick={() => navigate(`/chat?agent=bestie`, {
                state: { compatibilityResult: { partnerName, partnerMbti, partnerZodiac, overallScore: result.overallScore, title: result.title, summary: result.summary, dimensions: result.dimensions, strengths: result.strengths, conflicts: result.conflicts, loveLanguage: result.loveLanguage } },
              })}
              className="w-full rounded-xl bg-card py-3 text-sm font-semibold text-foreground shadow-card border border-border flex items-center justify-center gap-2"
            >
              <Sparkles className="h-4 w-4" /> {t("assessmentFlow.compatibility.talkToBestie")}
            </button>
            {savedReportId && (
              <DeepReportUnlock
                source="compatibility"
                reportId={savedReportId}
                typeLabel={t("assessmentFlow.compatibility.deepReportLabel", { defaultValue: "Compatibility" })}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
      <PosterPreviewDialog open={showPosterPreview} onClose={closePosterPreview} dataUrl={posterDataUrl} onDownload={downloadPoster} />
    </div>
    </DesktopLayout>
  );
};

export default CompatibilityFlow;
