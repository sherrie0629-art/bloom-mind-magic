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
const ZODIAC_DATES: Record<string, string> = { Aries: "3.21–4.19", Taurus: "4.20–5.20", Gemini: "5.21–6.21", Cancer: "6.22–7.22", Leo: "7.23–8.22", Virgo: "8.23–9.22", Libra: "9.23–10.23", Scorpio: "10.24–11.22", Sagittarius: "11.23–12.21", Capricorn: "12.22–1.19", Aquarius: "1.20–2.18", Pisces: "2.19–3.20" };

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

  const DRAFT_KEY = "compat-draft-v1";
  const draft = (() => {
    try { return JSON.parse(localStorage.getItem(DRAFT_KEY) || "{}"); } catch { return {}; }
  })();

  const [step, setStep] = useState<"input" | "loading" | "result">("input");
  const [result, setResult] = useState<CompatibilityResult | null>(null);
  const [savedReportId, setSavedReportId] = useState<string | null>(null);
  const [loadingLineIdx, setLoadingLineIdx] = useState(0);

  const [myName, setMyName] = useState<string>(draft.myName || "");
  const [myMbti, setMyMbti] = useState<string>(draft.myMbti || "");
  const [myZodiac, setMyZodiac] = useState<string>(draft.myZodiac || "");
  const [myTraits, setMyTraits] = useState<string>(draft.myTraits || "");

  const [partnerName, setPartnerName] = useState<string>(draft.partnerName || "");
  const [partnerMbti, setPartnerMbti] = useState<string>(draft.partnerMbti || "");
  const [partnerZodiac, setPartnerZodiac] = useState<string>(draft.partnerZodiac || "");
  const [partnerTraits, setPartnerTraits] = useState<string>(draft.partnerTraits || "");

  const [stage, setStage] = useState<string>(draft.stage || "");
  const [vibe, setVibe] = useState<string>(draft.vibe || "");
  const [openMbtiSide, setOpenMbtiSide] = useState<"mine" | "them" | null>(null);
  const [openZodiacSide, setOpenZodiacSide] = useState<"mine" | "them" | null>(null);

  useEffect(() => {
    if (step !== "input") return;
    const data = { myName, myMbti, myZodiac, myTraits, partnerName, partnerMbti, partnerZodiac, partnerTraits, stage, vibe };
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(data)); } catch {}
  }, [step, myName, myMbti, myZodiac, myTraits, partnerName, partnerMbti, partnerZodiac, partnerTraits, stage, vibe]);

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
    if (!user) {
      toast.error(t("assessmentFlow.compatibility.pleaseSignIn", { defaultValue: "请先登录后再开启缘分配对，已填信息会为你保留" }));
      navigate("/auth?redirect=" + encodeURIComponent("/assessment/compatibility"));
      return;
    }
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
      const { data: inserted, error: insertError } = await (supabase as any)
        .from("compatibility_reports")
        .insert({
          user_id: user.id,
          partner_info: { name: partnerName, mbti: partnerMbti, zodiac: partnerZodiac, traits: partnerTraits, stage: stageLabel, recentVibe: vibeLabel },
          result_data: r,
        })
        .select("id")
        .single();
      if (insertError) {
        console.error("[compatibility] save failed", insertError);
        toast.error(t("assessmentFlow.compatibility.saveFail", { defaultValue: "结果未能保存，请稍后在「我的测评报告」重试" }));
      } else if (inserted?.id) {
        setSavedReportId(inserted.id);
      }
      try { localStorage.removeItem(DRAFT_KEY); } catch {}
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
          <motion.div key="input" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} className="relative px-4 md:px-6 mt-2 space-y-5">
            {/* Floating ambience */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden -z-10">
              {["💗", "✨", "🌙", "💫", "🎴", "💕"].map((e, i) => (
                <motion.span
                  key={i}
                  className="absolute text-2xl opacity-20 select-none"
                  style={{ left: `${(i * 17 + 8) % 90}%`, top: `${(i * 23 + 10) % 80}%` }}
                  animate={{ y: [0, -14, 0], rotate: [0, 8, -8, 0] }}
                  transition={{ duration: 6 + i, repeat: Infinity, ease: "easeInOut", delay: i * 0.4 }}
                >
                  {e}
                </motion.span>
              ))}
            </div>

            {/* Intro */}
            <div className="rounded-2xl bg-card/80 backdrop-blur p-4 shadow-card text-center">
              <Heart className="h-8 w-8 text-rose-warm mx-auto mb-2 animate-pulse" />
              <h3 className="font-display text-base font-bold text-foreground">{t("assessmentFlow.compatibility.introTitle")}</h3>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{t("assessmentFlow.compatibility.introDesc")}</p>
            </div>

            {/* Act 1 — dueling role cards */}
            <div className="relative grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              {/* Center heart link, only on md+ */}
              <motion.div
                aria-hidden
                className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-rose-warm to-secondary shadow-glow"
                animate={{ scale: [1, 1.18, 1] }}
                transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
              >
                <Heart className="h-5 w-5 text-white fill-white" />
              </motion.div>

              {(["mine", "them"] as const).map((side, idx) => {
                const isMine = side === "mine";
                const name = isMine ? myName : partnerName;
                const setName = isMine ? setMyName : setPartnerName;
                const mbti = isMine ? myMbti : partnerMbti;
                const setMbti = isMine ? setMyMbti : setPartnerMbti;
                const zodiac = isMine ? myZodiac : partnerZodiac;
                const setZodiac = isMine ? setMyZodiac : setPartnerZodiac;
                const traits = isMine ? myTraits : partnerTraits;
                const setTraits = isMine ? setMyTraits : setPartnerTraits;
                const headerKey = isMine ? "aboutMeFancy" : "aboutThemFancy";
                const namePh = isMine ? "codenameMinePh" : "codenameThemPh";
                const traitsPh = isMine ? "traitsMinePh" : "traitsThemPh";
                const ribbon = isMine ? "from-indigo/80 to-lavender/80" : "from-rose-warm/80 to-gold/80";
                return (
                  <motion.div
                    key={side}
                    initial={{ opacity: 0, x: isMine ? -40 : 40, rotate: isMine ? -2 : 2 }}
                    animate={{ opacity: 1, x: 0, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 110, damping: 14, delay: 0.05 + idx * 0.08 }}
                    whileHover={{ y: -3, rotate: isMine ? -0.6 : 0.6 }}
                    className="relative rounded-3xl bg-card p-5 shadow-card border-2 border-border/40 mt-3"
                  >
                    {/* Decorative blur clipped to card */}
                    <div className="pointer-events-none absolute inset-0 rounded-3xl overflow-hidden">
                      <div className="absolute -top-10 -right-10 h-28 w-28 rounded-full bg-gradient-to-br from-white/40 to-transparent blur-2xl" />
                    </div>
                    {/* Card ribbon / level sticker */}
                    <div className={`absolute -top-3 left-4 z-10 rounded-full bg-gradient-to-r ${ribbon} px-3 py-1 text-[10px] font-bold text-white tracking-widest shadow-md`}>
                      LV.??
                    </div>

                    <div className="flex items-center justify-between mb-3 pt-1">
                      <h4 className="font-display text-sm font-bold text-foreground">{t(`assessmentFlow.compatibility.${headerKey}`)}</h4>
                      <span className="text-[10px] text-muted-foreground">#{isMine ? "P1" : "P2"}</span>
                    </div>

                    {/* Codename */}
                    <div className="space-y-3">
                      <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder={t(`assessmentFlow.compatibility.${namePh}`)}
                        className="w-full rounded-xl border border-border bg-background/60 px-3 py-2.5 text-sm font-medium text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-rose-warm/40 transition"
                      />

                      {/* MBTI badge popover */}
                      <Popover open={openMbtiSide === side} onOpenChange={(o) => setOpenMbtiSide(o ? side : null)}>
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            className={`w-full rounded-xl border border-dashed px-3 py-2.5 text-sm flex items-center justify-between transition ${mbti ? "border-secondary/60 bg-secondary/10 text-foreground" : "border-border text-muted-foreground hover:border-secondary/40"}`}
                          >
                            {mbti ? (
                              <span className="flex items-center gap-2"><span className="text-base">{MBTI_EMOJI[mbti]}</span><span className="font-semibold tracking-wider">{mbti}</span></span>
                            ) : (
                              <span>🎫 {t("assessmentFlow.compatibility.mbtiBadgeEmpty")}</span>
                            )}
                            <span className="text-xs opacity-60">{mbti ? "换" : "选"}</span>
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-72 p-3">
                          <div className="grid grid-cols-4 gap-2">
                            {MBTI_TYPES.map((m) => (
                              <button
                                key={m}
                                onClick={() => {
                                  const next = mbti === m ? "" : m;
                                  setMbti(next);
                                  if (next) setOpenMbtiSide(null);
                                }}
                                className={`flex flex-col items-center gap-0.5 rounded-lg border px-1 py-2 text-[11px] font-semibold transition ${mbti === m ? "border-secondary bg-secondary/20 text-secondary scale-105" : "border-border bg-background hover:bg-muted"}`}
                              >
                                <span className="text-lg">{MBTI_EMOJI[m]}</span>
                                <span>{m}</span>
                              </button>
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>

                      {/* Zodiac picker popover */}
                      <Popover open={openZodiacSide === side} onOpenChange={(o) => setOpenZodiacSide(o ? side : null)}>
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            className={`w-full rounded-xl border border-dashed px-3 py-2.5 text-sm flex items-center justify-between transition ${zodiac ? "border-rose-warm/60 bg-rose-warm/10 text-foreground" : "border-border text-muted-foreground hover:border-rose-warm/40"}`}
                          >
                            {zodiac ? (
                              <span className="flex items-center gap-2">
                                <span className="text-base">{ZODIAC_EMOJI[zodiac]}</span>
                                <span className="font-semibold">{t(`assessmentFlow.compatibility.zodiacName_${zodiac}`)}</span>
                                <span className="text-[11px] text-muted-foreground">{ZODIAC_DATES[zodiac]}</span>
                              </span>
                            ) : (
                              <span>✨ {t("assessmentFlow.compatibility.zodiacPickerEmpty")}</span>
                            )}
                            <span className="text-xs opacity-60">{zodiac ? t("assessmentFlow.compatibility.zodiacPickerChange") : "选"}</span>
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[300px] p-3">
                          <div className="grid grid-cols-4 gap-2">
                            {ZODIAC_SIGNS.map((s) => (
                              <button
                                key={s}
                                type="button"
                                onClick={() => {
                                  const next = zodiac === s ? "" : s;
                                  setZodiac(next);
                                  if (next) setOpenZodiacSide(null);
                                }}
                                className={`flex flex-col items-center gap-0.5 rounded-lg border px-1 py-2 transition ${zodiac === s ? "border-transparent bg-gradient-to-br from-gold to-rose-warm text-white shadow-glow scale-105" : "border-border bg-background hover:bg-muted text-foreground"}`}
                              >
                                <span className="text-xl leading-none">{ZODIAC_EMOJI[s]}</span>
                                <span className="text-[11px] font-medium mt-1">{t(`assessmentFlow.compatibility.zodiacName_${s}`)}</span>
                                <span className={`text-[10px] ${zodiac === s ? "text-white/80" : "text-muted-foreground"}`}>{ZODIAC_DATES[s]}</span>
                              </button>
                            ))}
                          </div>
                          {zodiac && (
                            <button
                              type="button"
                              onClick={() => setZodiac("")}
                              className="mt-2 w-full text-[11px] text-muted-foreground hover:text-foreground py-1"
                            >
                              {t("assessmentFlow.compatibility.zodiacPickerClear")}
                            </button>
                          )}
                        </PopoverContent>
                      </Popover>



                      {/* Traits with quick chips */}
                      <textarea
                        value={traits}
                        onChange={(e) => setTraits(e.target.value)}
                        placeholder={t(`assessmentFlow.compatibility.${traitsPh}`)}
                        rows={2}
                        className="w-full rounded-xl border border-border bg-background/60 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-rose-warm/40 resize-none"
                      />
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[11px] text-muted-foreground/70 mr-0.5">
                          {t(`assessmentFlow.compatibility.${isMine ? "chipHintMine" : "chipHintThem"}`)}：
                        </span>
                        {(isMine
                          ? (["traitMine1", "traitMine2", "traitMine3", "traitMine4", "traitMine5"] as const)
                          : (["traitThem1", "traitThem2", "traitThem3", "traitThem4", "traitThem5"] as const)
                        ).map((k) => {
                          const chip = t(`assessmentFlow.compatibility.${k}`);
                          return (
                            <button
                              key={k}
                              type="button"
                              onClick={() => setTraits((traits ? traits.trim() + "、" : "") + chip)}
                              className="rounded-full bg-muted/60 hover:bg-muted px-2.5 py-1 text-[11px] text-muted-foreground hover:text-foreground transition"
                            >
                              + {chip}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Act 2 — stage story carousel */}
            <div className="rounded-2xl bg-card/80 backdrop-blur p-4 shadow-card">
              <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-1.5">
                <span>🎬</span> {t("assessmentFlow.compatibility.stageBlockTitle")}
              </h4>
              <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory">
                {STAGE_KEYS.map((k) => {
                  const active = stage === k;
                  return (
                    <motion.button
                      key={k}
                      type="button"
                      onClick={() => setStage(active ? "" : k)}
                      whileTap={{ scale: 0.95 }}
                      animate={{ scale: active ? 1.04 : 1, opacity: stage && !active ? 0.55 : 1 }}
                      className={`snap-start shrink-0 w-40 rounded-2xl p-3 text-left border-2 transition ${active ? "border-rose-warm bg-gradient-to-br from-rose-warm/15 to-gold/10 shadow-glow" : "border-border bg-background hover:border-rose-warm/40"}`}
                    >
                      <div className="text-3xl mb-1">{STAGE_EMOJI[k]}</div>
                      <div className="text-sm font-semibold text-foreground">{t(`assessmentFlow.compatibility.stages.${k}`).replace(/^[^\s]+\s/, "")}</div>
                      <div className="text-[11px] text-muted-foreground leading-snug mt-0.5">{t(`assessmentFlow.compatibility.stageSubs.${k}`)}</div>
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* Act 3 — vibe reaction grid */}
            <div className="rounded-2xl bg-card/80 backdrop-blur p-4 shadow-card">
              <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-1.5">
                <span>💫</span> {t("assessmentFlow.compatibility.vibeBlockTitle")}
              </h4>
              <div className="grid grid-cols-3 gap-2">
                {VIBE_KEYS.map((k) => {
                  const active = vibe === k;
                  return (
                    <motion.button
                      key={k}
                      type="button"
                      onClick={() => setVibe(active ? "" : k)}
                      whileTap={{ scale: 0.9 }}
                      animate={active ? { rotate: [0, -6, 6, 0] } : {}}
                      transition={{ duration: 0.4 }}
                      className={`relative flex flex-col items-center gap-1 rounded-2xl px-2 py-3 border-2 transition ${active ? "border-secondary bg-secondary/10 shadow-glow" : "border-border bg-background hover:border-secondary/40"}`}
                    >
                      <span className="text-2xl">{VIBE_EMOJI[k]}</span>
                      <span className="text-[11px] font-medium text-foreground">{t(`assessmentFlow.compatibility.vibes.${k}`).replace(/^[^\s]+\s/, "")}</span>
                      {active && (
                        <motion.span
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1.4, opacity: 0 }}
                          transition={{ duration: 0.8 }}
                          className="absolute inset-0 rounded-2xl bg-secondary/30"
                        />
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* Submit */}
            <motion.button
              whileTap={{ scale: 0.96, rotate: -1 }}
              whileHover={{ y: -2 }}
              onClick={handleSubmit}
              className="relative w-full overflow-hidden rounded-2xl bg-gradient-to-r from-rose-warm via-gold to-secondary py-4 text-base font-bold text-white flex items-center justify-center gap-2 shadow-glow"
            >
              <motion.span
                aria-hidden
                className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent"
                animate={{ x: ["-100%", "100%"] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: "linear" }}
              />
              <motion.span animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 1.2, repeat: Infinity }}>💗</motion.span>
              <span className="relative">{t("assessmentFlow.compatibility.analyzeBtnFancy")}</span>
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
