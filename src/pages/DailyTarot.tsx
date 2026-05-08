import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, RotateCcw, Share2, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { tarotCards, drawRandomCard } from "@/data/tarotCards";
import { useSharePoster } from "@/hooks/useSharePoster";
import ShareSheet from "@/components/ShareSheet";
import BottomNav from "@/components/BottomNav";
import DesktopLayout from "@/components/DesktopLayout";
import { toast } from "sonner";
import SEO from "@/components/SEO";
import { useLocale } from "@/hooks/useLocale";

type DrawState = "idle" | "drawing" | "result";

interface DrawResult {
  id: string;
  cardId: number;
  cardName: string;
  isReversed: boolean;
  interpretation: string;
  actionTip: string;
  energyScore: number;
  imageUrl: string | null;
  imageStatus: string;
}

const DailyTarot = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, promptLogin } = useAuth();
  const { locale } = useLocale();
  const [state, setState] = useState<DrawState>("idle");
  const [result, setResult] = useState<DrawResult | null>(null);
  const [loadingToday, setLoadingToday] = useState(true);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { generatePoster } = useSharePoster();
  const [shareOpen, setShareOpen] = useState(false);
  const [shareDataUrl, setShareDataUrl] = useState<string | null>(null);

  // Check today's existing draw on mount
  useEffect(() => {
    if (!user) { setLoadingToday(false); return; }
    const checkToday = async () => {
      try {
        const today = new Date().toISOString().split("T")[0];
        const { data } = await supabase
          .from("tarot_draws")
          .select("*")
          .eq("user_id", user.id)
          .eq("draw_date", today)
          .maybeSingle();
        if (data) {
          let imageUrl: string | null = null;
          // If image ready, get signed URL via status endpoint
          if (data.image_status === "ready" && data.image_path) {
            const { data: statusData } = await supabase.functions.invoke("tarot-draw-status", { body: { drawId: data.id } });
            imageUrl = statusData?.imageUrl || null;
          }
          setResult({
            id: data.id,
            cardId: data.card_id,
            cardName: data.card_name,
            isReversed: data.is_reversed,
            interpretation: data.interpretation || "",
            actionTip: data.action_tip || "",
            energyScore: data.energy_score || 3,
            imageUrl,
            imageStatus: data.image_status || "pending",
          });
          setState("result");
          if (data.image_status === "pending") startPolling(data.id);
        }
      } catch (e) {
        console.error("Check today error:", e);
      } finally {
        setLoadingToday(false);
      }
    };
    checkToday();
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [user]);

  const startPolling = useCallback((drawId: string) => {
    if (pollRef.current) clearInterval(pollRef.current);
    let attempts = 0;
    pollRef.current = setInterval(async () => {
      attempts++;
      if (attempts > 60) { clearInterval(pollRef.current!); pollRef.current = null; return; }
      try {
        const { data } = await supabase.functions.invoke("tarot-draw-status", { body: { drawId } });
        if (data?.imageStatus === "ready" && data?.imageUrl) {
          setResult((prev) => prev ? { ...prev, imageUrl: data.imageUrl, imageStatus: "ready" } : prev);
          clearInterval(pollRef.current!);
          pollRef.current = null;
        } else if (data?.imageStatus === "failed") {
          setResult((prev) => prev ? { ...prev, imageStatus: "failed" } : prev);
          clearInterval(pollRef.current!);
          pollRef.current = null;
        }
      } catch { /* ignore */ }
    }, 1500);
  }, []);

  const handleDraw = async () => {
    if (!user) { promptLogin(t("dailyTarot.focus")); return; }
    setState("drawing");
    try {
      const { card, isReversed } = drawRandomCard();
      const keywords = isReversed ? card.reversedKeywords : card.uprightKeywords;

      const { data, error } = await supabase.functions.invoke("tarot-draw", {
        body: { cardId: card.id, cardName: card.name, isReversed, keywords },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setResult({
        id: data.id,
        cardId: data.cardId,
        cardName: data.cardName,
        isReversed: data.isReversed,
        interpretation: data.interpretation,
        actionTip: data.actionTip,
        energyScore: data.energyScore,
        imageUrl: data.imageUrl,
        imageStatus: data.imageStatus,
      });
      setState("result");
      if (data.imageStatus === "pending") startPolling(data.id);
    } catch (e: any) {
      console.error("Draw error:", e);
      toast.error(e.message || t("dailyTarot.drawFail"));
      setState("idle");
    }
  };

  const handleShare = async () => {
    if (!result) return;
    const card = tarotCards.find((c) => c.id === result.cardId);
    try {
      toast.info(t("dailyTarot.posterIntro"), { duration: 3000 });
      const canvas = await generatePoster({
        title: result.cardName,
        subtitle: result.isReversed ? t("dailyTarot.reversed") : t("dailyTarot.upright"),
        description: result.interpretation.split("\n\n💡")[0],
        bars: [],
        accentColor: "#a78bfa",
        accentColorLight: "#c4b5fd",
        icon: card?.emoji || "🔮",
        caption: result.actionTip,
        appName: `${t("home.appName")} · ${t("dailyTarot.title")}`,
        preloadedImageUrl: result.imageUrl || undefined,
      });
      setShareDataUrl(canvas.toDataURL("image/png"));
      setShareOpen(true);
    } catch {
      toast.error(t("dailyTarot.posterFail"));
    }
  };

  const cardData = result ? tarotCards.find((c) => c.id === result.cardId) : null;

  if (loadingToday) {
    return (
      <div className="min-h-screen bg-gradient-calm flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground text-sm">{t("dailyTarot.loading")}</div>
      </div>
    );
  }

  return (
    <DesktopLayout>
    <div className="min-h-screen bg-gradient-calm pb-24 md:pb-8">
      <SEO title={`${t("dailyTarot.title")} — ${t("home.appName")}`} description={t("dailyTarot.subtitle")} />
      {/* Header */}
      <div className="px-6 pt-14 pb-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/")} className="rounded-full bg-card p-2 shadow-card">
            <ArrowLeft className="h-4 w-4 text-foreground" />
          </button>
          <div>
            <h1 className="font-display text-xl font-bold text-foreground">{t("dailyTarot.title")}</h1>
            <p className="text-xs text-muted-foreground">{t("dailyTarot.subtitle")}</p>
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {state === "idle" && (
          <motion.div key="idle" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="px-6 mt-8">
            <div className="flex flex-col items-center text-center">
              <motion.div
                animate={{ rotateY: [0, 10, -10, 0], scale: [1, 1.05, 1] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="mb-8 flex h-48 w-36 items-center justify-center rounded-2xl bg-gradient-mystic shadow-xl"
              >
                <span className="text-6xl">🔮</span>
              </motion.div>
              <p className="text-sm text-muted-foreground mb-6 max-w-[260px]">
                {t("dailyTarot.focus")}
              </p>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleDraw}
                className="flex items-center gap-2 rounded-2xl bg-gradient-golden px-8 py-3.5 text-sm font-semibold text-primary-foreground shadow-lg"
              >
                <Sparkles className="h-4 w-4" /> {t("dailyTarot.drawBtn")}
              </motion.button>
            </div>
          </motion.div>
        )}

        {state === "drawing" && (
          <motion.div key="drawing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="px-6 mt-8">
            <div className="flex flex-col items-center text-center">
              <motion.div
                animate={{ rotateY: [0, 180, 360] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                className="mb-6 flex h-48 w-36 items-center justify-center rounded-2xl bg-gradient-mystic shadow-xl"
              >
                <span className="text-5xl">✨</span>
              </motion.div>
              <p className="text-sm text-muted-foreground animate-pulse">{t("dailyTarot.drawing")}</p>
            </div>
          </motion.div>
        )}

        {state === "result" && result && (
          <motion.div key="result" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="px-6 mt-4">
            {/* Card header */}
            <div className="rounded-2xl bg-card p-5 shadow-card mb-4">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-mystic text-3xl">
                  {cardData?.emoji || "🔮"}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="font-display text-lg font-bold text-foreground">{result.cardName}</h2>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${result.isReversed ? "bg-rose-warm/20 text-rose-warm" : "bg-secondary/20 text-secondary"}`}>
                      {result.isReversed ? t("dailyTarot.reversed") : t("dailyTarot.upright")}
                    </span>
                    <span className="text-xs text-muted-foreground">{t("dailyTarot.energy", { n: result.energyScore })}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Card art */}
            <div className="rounded-2xl bg-card p-4 shadow-card mb-4">
              {result.imageStatus === "ready" && result.imageUrl ? (
                <img src={result.imageUrl} alt={result.cardName} className="w-full rounded-xl aspect-square object-cover" />
              ) : result.imageStatus === "failed" ? (
                <div className="flex h-48 items-center justify-center rounded-xl bg-muted/30">
                  <p className="text-xs text-muted-foreground">{t("dailyTarot.artFail")}</p>
                </div>
              ) : (
                <div className="flex h-48 items-center justify-center rounded-xl bg-muted/30">
                  <div className="text-center">
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}>
                      <RotateCcw className="h-5 w-5 text-secondary mx-auto" />
                    </motion.div>
                    <p className="text-xs text-muted-foreground mt-2">{t("dailyTarot.generatingArt")}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Interpretation */}
            <div className="rounded-2xl bg-card p-5 shadow-card mb-4">
              <h3 className="text-xs font-semibold text-secondary uppercase tracking-wider mb-3">{t("dailyTarot.todayReading")}</h3>
              <p className="text-sm leading-relaxed text-foreground whitespace-pre-line">
                {result.interpretation}
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleShare}
                className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-card py-3 text-sm font-medium text-foreground shadow-card"
              >
                <Share2 className="h-4 w-4" /> {t("dailyTarot.saveShare")}
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate(`/chat?agent=mystic`, {
                  state: { tarotResult: { cardName: result.cardName, isReversed: result.isReversed, energyScore: result.energyScore, interpretation: result.interpretation, actionTip: result.actionTip } },
                })}
                className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-gradient-golden py-3 text-sm font-semibold text-primary-foreground shadow-lg"
              >
                <Sparkles className="h-4 w-4" /> {t("dailyTarot.talkToLuna")}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ShareSheet
        open={shareOpen}
        onClose={() => { setShareOpen(false); setShareDataUrl(null); }}
        imageDataUrl={shareDataUrl}
        title={result?.cardName || t("dailyTarot.title")}
        text={t("dailyTarot.shareText")}
      />
      <BottomNav />
    </div>
    </DesktopLayout>
  );
};

export default DailyTarot;
