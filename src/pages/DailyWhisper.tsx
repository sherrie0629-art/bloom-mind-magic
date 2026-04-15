import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Download, Share2, Sparkles, BookOpen } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import BottomNav from "@/components/BottomNav";
import { tarotCards, drawRandomCard, type TarotCard } from "@/data/tarotCards";

interface TarotRecord {
  id: string;
  card_id: number;
  card_name: string;
  is_reversed: boolean;
  interpretation: string | null;
  action_tip: string | null;
  energy_score: number | null;
  image_url: string | null;
  draw_date: string;
  created_at: string;
}

const DailyWhisper = () => {
  const navigate = useNavigate();
  const { user, promptLogin } = useAuth();

  const [drawnCard, setDrawnCard] = useState<{ card: TarotCard; isReversed: boolean } | null>(null);
  const [isFlipping, setIsFlipping] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<{ whisper: string; actionTip: string; imageUrl: string | null; drawId: string | null; card: TarotCard; isReversed: boolean } | null>(null);

  const [history, setHistory] = useState<TarotRecord[]>([]);
  const [todayDraw, setTodayDraw] = useState<TarotRecord | null>(null);
  const [deepReading, setDeepReading] = useState<string | null>(null);
  const [isReadingLoading, setIsReadingLoading] = useState(false);
  const imagePollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!user) { promptLogin("Sign in to access Daily Tarot 🔮"); navigate("/"); return; }
    loadHistory();
  }, [user]);

  useEffect(() => { return () => { if (imagePollingRef.current) clearInterval(imagePollingRef.current); }; }, []);

  const resolveImageUrl = async (imageUrl: string | null): Promise<string | null> => {
    if (!imageUrl) return null;
    if (imageUrl.startsWith("http")) return imageUrl;
    const { data } = await supabase.storage.from("whisper-images").createSignedUrl(imageUrl, 3600);
    return data?.signedUrl || null;
  };

  const loadHistory = async () => {
    if (!user) return;
    const { data } = await supabase.from("daily_tarot_draws").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(100);
    if (data && data.length > 0) {
      const resolved = await Promise.all(data.map(async (r: any) => ({ ...r, image_url: await resolveImageUrl(r.image_url) })));
      setHistory(resolved as TarotRecord[]);
      const today = new Date().toISOString().slice(0, 10);
      const todayRecord = resolved.find((r: any) => r.draw_date === today);
      if (todayRecord) {
        setTodayDraw(todayRecord as TarotRecord);
        const rec = todayRecord as TarotRecord;
        const card = tarotCards.find(c => c.id === rec.card_id);
        if (card) {
          setDrawnCard({ card, isReversed: rec.is_reversed });
          setIsFlipped(true);
          setResult({
            whisper: rec.interpretation || "",
            actionTip: rec.action_tip || "",
            imageUrl: rec.image_url,
            drawId: rec.id,
            card,
            isReversed: rec.is_reversed,
          });
        }
      }
    }
  };

  const thisMonthCount = useMemo(() => {
    const now = new Date();
    return history.filter((r) => { const d = new Date(r.created_at); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); }).length;
  }, [history]);

  const handleDrawCard = useCallback(() => {
    if (todayDraw) return;
    const draw = drawRandomCard();
    setDrawnCard(draw);
    setIsFlipping(true);
    setTimeout(() => {
      setIsFlipped(true);
      setIsFlipping(false);
      handleGenerate(draw);
    }, 1200);
  }, [todayDraw]);

  const handleGenerate = async (draw: { card: TarotCard; isReversed: boolean }) => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("daily-whisper", {
        body: {
          cardId: draw.card.id,
          cardName: draw.card.nameCn,
          cardNameEn: draw.card.name,
          isReversed: draw.isReversed,
          keywords: draw.isReversed ? draw.card.reversedKeywords : draw.card.uprightKeywords,
        },
      });
      if (error) throw error;
      if (data?.error) { toast.error(data.error); return; }
      setResult({
        whisper: data.whisper,
        actionTip: data.actionTip || "",
        imageUrl: data.imageUrl,
        drawId: data.drawId,
        card: draw.card,
        isReversed: draw.isReversed,
      });
      if (!data.imageUrl && data.drawId) startImagePolling(data.drawId);
      loadHistory();
    } catch (e: any) {
      console.error(e);
      toast.error("Failed to generate reading. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const startImagePolling = (drawId: string) => {
    if (imagePollingRef.current) clearInterval(imagePollingRef.current);
    let attempts = 0;
    imagePollingRef.current = setInterval(async () => {
      attempts++;
      if (attempts > 20) { if (imagePollingRef.current) clearInterval(imagePollingRef.current); return; }
      try {
        const { data } = await supabase.functions.invoke("daily-whisper", { body: { action: "check-image", draw_id: drawId } });
        if (data?.imageUrl) {
          setResult(prev => prev ? { ...prev, imageUrl: data.imageUrl } : prev);
          if (imagePollingRef.current) clearInterval(imagePollingRef.current);
          loadHistory();
        }
      } catch {}
    }, 2000);
  };

  const handleSave = async () => {
    if (!result) return;
    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d")!;
      canvas.width = 750; canvas.height = 1100;
      const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
      grad.addColorStop(0, "#0f0a1e"); grad.addColorStop(0.5, "#1a1040"); grad.addColorStop(1, "#0f0a1e");
      ctx.fillStyle = grad; ctx.fillRect(0, 0, canvas.width, canvas.height);

      let yPos = 80;
      ctx.fillStyle = "#c4a7ff"; ctx.font = "bold 42px sans-serif"; ctx.textAlign = "center";
      const posLabel = result.isReversed ? "Reversed" : "Upright";
      ctx.fillText(`${result.card.emoji} ${result.card.name}`, canvas.width / 2, yPos);
      yPos += 40;
      ctx.fillStyle = "rgba(255,255,255,0.4)"; ctx.font = "20px sans-serif";
      ctx.fillText(posLabel, canvas.width / 2, yPos);
      yPos += 60;

      if (result.imageUrl) {
        try {
          const resp = await fetch(result.imageUrl);
          const blob = await resp.blob();
          const bitmapUrl = URL.createObjectURL(blob);
          const img = await loadImage(bitmapUrl);
          const imgSize = 400;
          const x = (canvas.width - imgSize) / 2;
          ctx.save();
          roundedClip(ctx, x, yPos, imgSize, imgSize, 20);
          ctx.drawImage(img, x, yPos, imgSize, imgSize);
          ctx.restore();
          URL.revokeObjectURL(bitmapUrl);
          yPos += imgSize + 40;
        } catch {}
      }

      ctx.fillStyle = "rgba(255,255,255,0.9)"; ctx.font = "24px sans-serif"; ctx.textAlign = "center";
      const lines = wrapText(ctx, result.whisper, 600);
      lines.forEach((line, i) => { ctx.fillText(line, canvas.width / 2, yPos + i * 36); });
      yPos += lines.length * 36 + 30;

      if (result.actionTip) {
        ctx.fillStyle = "#fbbf24"; ctx.font = "20px sans-serif";
        ctx.fillText(`💡 ${result.actionTip}`, canvas.width / 2, yPos);
        yPos += 40;
      }

      ctx.fillStyle = "rgba(255,255,255,0.3)"; ctx.font = "18px sans-serif";
      ctx.fillText("MindGarden AI · Daily Tarot", canvas.width / 2, Math.max(yPos + 20, canvas.height - 40));

      const blobResult = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!blobResult) { toast.error("Failed to generate image"); return; }
      const url = URL.createObjectURL(blobResult);
      const a = document.createElement("a");
      a.href = url; a.download = `tarot-${result.card.name.replace(/\s+/g, "-")}-${new Date().toISOString().slice(0, 10)}.png`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
      toast.success("Image saved ✨");
    } catch { toast.error("Save failed. Please try again."); }
  };

  const handleShareAction = async () => {
    if (!result) return;
    const text = `🔮 Daily Tarot: ${result.card.name} (${result.isReversed ? "Reversed" : "Upright"})\n\n${result.whisper}\n\n💡 ${result.actionTip}\n\n— MindGarden AI`;
    if (navigator.share) {
      try { await navigator.share({ text }); } catch {}
    } else {
      await navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard");
    }
  };

  const handleGenerateDeepReading = async () => {
    if (thisMonthCount < 5) { toast.error("Draw at least 5 cards this month to unlock Deep Reading"); return; }
    setIsReadingLoading(true);
    setDeepReading("");
    try {
      const session = (await supabase.auth.getSession()).data.session;
      if (!session) throw new Error("Not signed in");
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/daily-whisper`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}`, apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
        body: JSON.stringify({ action: "deep-reading" }),
      });
      if (!resp.ok) { const errData = await resp.json().catch(() => ({})); toast.error(errData.error || "Failed to generate reading"); setDeepReading(null); return; }
      const contentType = resp.headers.get("content-type") || "";
      if (contentType.includes("text/event-stream") && resp.body) {
        const reader = resp.body.getReader(); const decoder = new TextDecoder(); let buffer = ""; let fullText = "";
        while (true) {
          const { done, value } = await reader.read(); if (done) break;
          buffer += decoder.decode(value, { stream: true });
          let newlineIdx: number;
          while ((newlineIdx = buffer.indexOf("\n")) !== -1) {
            let line = buffer.slice(0, newlineIdx); buffer = buffer.slice(newlineIdx + 1);
            if (line.endsWith("\r")) line = line.slice(0, -1);
            if (!line.startsWith("data: ")) continue;
            const jsonStr = line.slice(6).trim(); if (jsonStr === "[DONE]") break;
            try { const p = JSON.parse(jsonStr); const c = p.choices?.[0]?.delta?.content; if (c) { fullText += c; setDeepReading(fullText); } } catch { buffer = line + "\n" + buffer; break; }
          }
        }
        if (!fullText) setDeepReading(null);
      } else {
        const data = await resp.json();
        if (data?.error) { toast.error(data.error); setDeepReading(null); return; }
        setDeepReading(data.report || null);
      }
    } catch { toast.error("Failed to generate reading"); setDeepReading(null); } finally { setIsReadingLoading(false); }
  };

  const getCardForRecord = (rec: TarotRecord) => tarotCards.find(c => c.id === rec.card_id);

  // ===== RENDER =====

  const renderDrawInterface = () => (
    <motion.div key="draw" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="px-6 py-8 flex flex-col items-center">
      <p className="text-sm text-muted-foreground mb-2">Clear your mind, listen to your inner voice</p>
      <p className="text-xs text-muted-foreground/60 mb-8">Tap the card to draw your daily tarot</p>

      <div style={{ perspective: "1000px" }}>
        <motion.div
          className="relative cursor-pointer"
          style={{ transformStyle: "preserve-3d" }}
          animate={isFlipping ? { rotateY: 180 } : { rotateY: 0 }}
          transition={{ duration: 1.2, ease: "easeInOut" }}
          onClick={handleDrawCard}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
        >
          <div className="w-52 h-80 rounded-2xl overflow-hidden shadow-2xl" style={{ backfaceVisibility: "hidden" }}>
            <div className="w-full h-full bg-gradient-to-br from-indigo-900 via-purple-800 to-violet-900 flex flex-col items-center justify-center border-2 border-amber-500/30 rounded-2xl">
              <div className="w-40 h-64 border border-amber-500/20 rounded-xl flex flex-col items-center justify-center gap-4">
                <motion.span className="text-5xl" animate={{ rotate: [0, 5, -5, 0], scale: [1, 1.05, 1] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}>🔮</motion.span>
                <div className="text-amber-300/60 text-xs tracking-[0.3em]">TAROT</div>
                <div className="flex gap-1">
                  {["✦", "✧", "✦"].map((s, i) => (
                    <motion.span key={i} className="text-amber-400/40 text-sm" animate={{ opacity: [0.3, 0.8, 0.3] }} transition={{ duration: 2, repeat: Infinity, delay: i * 0.5 }}>{s}</motion.span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      <motion.button whileTap={{ scale: 0.95 }} onClick={handleDrawCard} className="mt-8 flex items-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg">
        <Sparkles className="h-5 w-5" /> Draw Today's Card
      </motion.button>
    </motion.div>
  );

  const renderLoading = () => (
    <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center px-6 py-20">
      <div className="relative">
        <motion.div className="h-24 w-24 rounded-full bg-gradient-to-br from-violet-500/40 to-indigo-500/40" animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0.7, 0.4] }} transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }} />
        <span className="absolute inset-0 m-auto flex items-center justify-center text-4xl">{drawnCard?.card.emoji}</span>
      </div>
      <p className="mt-6 text-sm text-muted-foreground">Reading {drawnCard?.card.name}…</p>
      <p className="mt-1 text-xs text-muted-foreground/50">Revealing today's psychological insight</p>
    </motion.div>
  );

  const renderResult = () => {
    if (!result) return null;
    return (
      <motion.div key="result" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="px-6 py-6">
        <div className="text-center mb-4">
          <span className="text-4xl">{result.card.emoji}</span>
          <h2 className="mt-2 font-display text-2xl font-bold text-foreground">{result.card.name}</h2>
          <div className="flex items-center justify-center gap-2 mt-1">
            <span className={`text-xs px-2 py-0.5 rounded-full ${result.isReversed ? "bg-amber-500/20 text-amber-400" : "bg-violet-500/20 text-violet-400"}`}>
              {result.isReversed ? "Reversed" : "Upright"}
            </span>
          </div>
          <div className="flex flex-wrap justify-center gap-1.5 mt-3">
            {(result.isReversed ? result.card.reversedKeywords : result.card.uprightKeywords).map((kw, i) => (
              <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-muted/50 text-muted-foreground">{kw}</span>
            ))}
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl shadow-soft mb-4">
          {result.imageUrl ? (
            <img src={result.imageUrl} alt={result.card.name} className="h-72 w-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
          ) : result.drawId ? (
            <div className="h-72 w-full bg-gradient-to-br from-violet-900/50 to-indigo-900/50 flex flex-col items-center justify-center gap-3 rounded-2xl">
              <motion.div className="h-12 w-12 rounded-full border-2 border-white/20 border-t-white/60" animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }} />
              <p className="text-xs text-white/50">Generating card art…</p>
            </div>
          ) : null}
        </div>

        <div className="rounded-2xl bg-card p-5 shadow-card mb-4">
          <h3 className="font-display text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-violet-400" /> Psychological Insight
          </h3>
          <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">{result.whisper}</p>
        </div>

        {result.actionTip && (
          <div className="rounded-2xl bg-amber-500/10 border border-amber-500/20 p-4 mb-4">
            <p className="text-sm text-amber-300 flex items-start gap-2">
              <span className="shrink-0">💡</span>
              <span>{result.actionTip}</span>
            </p>
          </div>
        )}

        <div className="flex justify-center gap-3">
          <button onClick={handleSave} className="flex items-center gap-2 rounded-full bg-card/80 px-5 py-2.5 text-sm font-medium text-foreground shadow-card backdrop-blur-sm">
            <Download className="h-4 w-4" /> Save
          </button>
          <button onClick={handleShareAction} className="flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-2.5 text-sm font-medium text-white shadow-soft">
            <Share2 className="h-4 w-4" /> Share
          </button>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-calm pb-24">
      <div className="sticky top-0 z-10 flex items-center gap-3 bg-background/80 backdrop-blur-md px-4 py-3">
        <button onClick={() => navigate(-1)} className="p-1.5"><ArrowLeft className="h-5 w-5 text-foreground" /></button>
        <h1 className="font-display text-lg font-semibold text-foreground">🔮 Daily Tarot</h1>
      </div>

      <AnimatePresence mode="wait">
        {isGenerating ? renderLoading() : result ? renderResult() : renderDrawInterface()}
      </AnimatePresence>

      {/* Tarot Deep Reading */}
      {!isGenerating && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="px-6 mt-4">
          <div className="rounded-2xl bg-card p-5 shadow-card">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-500"><BookOpen className="h-5 w-5 text-white" /></div>
              <div>
                <h3 className="font-display text-sm font-semibold text-foreground">Tarot Deep Reading</h3>
                <p className="text-[10px] text-muted-foreground">
                  {thisMonthCount} readings this month {thisMonthCount < 5 ? "· Draw more cards to unlock" : "· Generate your personalized analysis"}
                </p>
              </div>
            </div>
            {deepReading !== null ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-xl bg-muted/30 p-4 border border-border/30">
                <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                  {deepReading}
                  {isReadingLoading && <span className="inline-block w-1 h-4 ml-0.5 bg-foreground/60 animate-pulse align-text-bottom" />}
                </p>
                {!isReadingLoading && deepReading && (
                  <div className="mt-3 flex gap-2">
                    <button onClick={async () => { if (navigator.share) { await navigator.share({ text: deepReading }); } else { await navigator.clipboard.writeText(deepReading); toast.success("Copied to clipboard"); } }}
                      className="rounded-full bg-card px-3 py-1.5 text-xs text-muted-foreground border border-border/40">
                      <Share2 className="inline h-3 w-3 mr-1" /> Share
                    </button>
                  </div>
                )}
              </motion.div>
            ) : (
              <button onClick={handleGenerateDeepReading} disabled={isReadingLoading || thisMonthCount < 5} className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 py-3 text-sm font-semibold text-white shadow-soft disabled:opacity-40 transition-opacity">
                {isReadingLoading ? "Generating Deep Reading…" : "Generate Deep Reading"}
              </button>
            )}
          </div>
        </motion.div>
      )}

      {/* History */}
      {!isGenerating && history.length > 0 && (
        <div className="px-6 mt-4 pb-4">
          <h3 className="mb-3 font-display text-sm font-semibold text-foreground flex items-center gap-2">
            📜 History <span className="text-[10px] font-normal text-muted-foreground">{history.length} draws</span>
          </h3>
          <div className="space-y-2.5">
            {history.slice(0, 10).map((record, i) => {
              const card = getCardForRecord(record);
              return (
                <motion.div key={record.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                  className="flex items-start gap-3 rounded-2xl bg-card/70 p-3 shadow-card backdrop-blur-sm cursor-pointer active:scale-[0.98] transition-transform"
                  onClick={() => {
                    if (card) {
                      setDrawnCard({ card, isReversed: record.is_reversed });
                      setIsFlipped(true);
                      setResult({ whisper: record.interpretation || "", actionTip: record.action_tip || "", imageUrl: record.image_url, drawId: record.id, card, isReversed: record.is_reversed });
                    }
                  }}>
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted/40 text-xl">{card?.emoji || "🔮"}</div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-foreground line-clamp-1 leading-relaxed">
                      {card?.name || record.card_name} {record.is_reversed ? "(Reversed)" : ""}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {new Date(record.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      <span className="ml-1.5 text-muted-foreground/60">· Energy {record.energy_score || "?"}/5</span>
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => { const img = new Image(); img.crossOrigin = "anonymous"; img.onload = () => resolve(img); img.onerror = reject; img.src = src; });
}

function roundedClip(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r); ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h); ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r); ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath(); ctx.clip();
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = []; let currentLine = "";
  for (const char of text) { const testLine = currentLine + char; if (ctx.measureText(testLine).width > maxWidth && currentLine) { lines.push(currentLine); currentLine = char; } else { currentLine = testLine; } }
  if (currentLine) lines.push(currentLine); return lines;
}

export default DailyWhisper;
