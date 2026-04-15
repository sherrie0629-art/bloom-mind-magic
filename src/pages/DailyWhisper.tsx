import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Download, Share2, Sparkles, X, BookOpen, RotateCcw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import BottomNav from "@/components/BottomNav";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";
import { tarotCards, drawRandomCard, type TarotCard } from "@/data/tarotCards";

interface WhisperRecord {
  id: string;
  whisper: string;
  image_url: string | null;
  input_text: string | null;
  created_at: string;
  mood_emoji: string | null;
  mood_word: string | null;
  mood_score: number | null;
  content: string;
}

const DailyWhisper = () => {
  const navigate = useNavigate();
  const { user, promptLogin } = useAuth();

  // Tarot state
  const [drawnCard, setDrawnCard] = useState<{ card: TarotCard; isReversed: boolean } | null>(null);
  const [isFlipping, setIsFlipping] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<{ whisper: string; actionTip: string; imageUrl: string | null; whisperId: string | null; card: TarotCard; isReversed: boolean } | null>(null);

  // History & report
  const [history, setHistory] = useState<WhisperRecord[]>([]);
  const [todayWhisper, setTodayWhisper] = useState<WhisperRecord | null>(null);
  const [selectedNode, setSelectedNode] = useState<WhisperRecord | null>(null);
  const [monthlyReport, setMonthlyReport] = useState<string | null>(null);
  const [isReportLoading, setIsReportLoading] = useState(false);
  const imagePollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!user) { promptLogin("登录后开启每日塔罗 🔮"); navigate("/"); return; }
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
    const { data } = await supabase.from("daily_whispers").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(100);
    if (data && data.length > 0) {
      const resolved = await Promise.all(data.map(async (r: any) => ({ ...r, image_url: await resolveImageUrl(r.image_url) })));
      setHistory(resolved as WhisperRecord[]);
      const today = new Date().toDateString();
      const todayRecord = resolved.find((r: any) => new Date(r.created_at).toDateString() === today);
      if (todayRecord) {
        setTodayWhisper(todayRecord as WhisperRecord);
        // Restore today's result
        const rec = todayRecord as WhisperRecord;
        const cardInfo = parseCardInfo(rec.input_text || "");
        const card = cardInfo ? tarotCards.find(c => c.id === cardInfo.cardId) : null;
        if (card) {
          setDrawnCard({ card, isReversed: cardInfo!.isReversed });
          setIsFlipped(true);
          const parts = (rec.whisper || "").split("\n\n💡 ");
          setResult({
            whisper: parts[0] || rec.whisper || "",
            actionTip: parts[1] || "",
            imageUrl: rec.image_url,
            whisperId: rec.id,
            card,
            isReversed: cardInfo!.isReversed,
          });
        }
      }
    }
  };

  const parseCardInfo = (inputText: string): { cardId: number; isReversed: boolean } | null => {
    const match = inputText.match(/card:(\d+),reversed:(true|false)/);
    if (!match) return null;
    return { cardId: parseInt(match[1]), isReversed: match[2] === "true" };
  };

  const chartData = useMemo(() => {
    const days: { date: string; label: string; score: number | null; record: WhisperRecord | null }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const dateStr = d.toDateString();
      const label = `${d.getMonth() + 1}/${d.getDate()}`;
      const rec = history.find((r) => new Date(r.created_at).toDateString() === dateStr);
      days.push({ date: dateStr, label, score: rec?.mood_score ?? null, record: rec || null });
    }
    return days;
  }, [history]);

  const thisMonthCount = useMemo(() => {
    const now = new Date();
    return history.filter((r) => { const d = new Date(r.created_at); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); }).length;
  }, [history]);

  const handleDrawCard = useCallback(() => {
    if (todayWhisper) return;
    const draw = drawRandomCard();
    setDrawnCard(draw);
    setIsFlipping(true);
    // Start flip animation
    setTimeout(() => {
      setIsFlipped(true);
      setIsFlipping(false);
      // Auto-generate after flip
      handleGenerate(draw);
    }, 1200);
  }, [todayWhisper]);

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
        whisperId: data.whisperId,
        card: draw.card,
        isReversed: draw.isReversed,
      });
      if (!data.imageUrl && data.whisperId) startImagePolling(data.whisperId);
      loadHistory();
    } catch (e: any) {
      console.error(e);
      toast.error("解读生成失败，请重试");
    } finally {
      setIsGenerating(false);
    }
  };

  const startImagePolling = (whisperId: string) => {
    if (imagePollingRef.current) clearInterval(imagePollingRef.current);
    let attempts = 0;
    imagePollingRef.current = setInterval(async () => {
      attempts++;
      if (attempts > 20) { if (imagePollingRef.current) clearInterval(imagePollingRef.current); return; }
      try {
        const { data } = await supabase.functions.invoke("daily-whisper", { body: { action: "check-image", whisper_id: whisperId } });
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
      // Card name
      ctx.fillStyle = "#c4a7ff"; ctx.font = "bold 42px sans-serif"; ctx.textAlign = "center";
      const posLabel = result.isReversed ? "（逆位）" : "（正位）";
      ctx.fillText(`${result.card.emoji} ${result.card.nameCn} ${posLabel}`, canvas.width / 2, yPos);
      yPos += 50;
      ctx.fillStyle = "rgba(255,255,255,0.4)"; ctx.font = "20px sans-serif";
      ctx.fillText(result.card.name, canvas.width / 2, yPos);
      yPos += 60;

      // Image
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

      // Whisper text
      ctx.fillStyle = "rgba(255,255,255,0.9)"; ctx.font = "24px sans-serif"; ctx.textAlign = "center";
      const lines = wrapText(ctx, result.whisper, 600);
      lines.forEach((line, i) => { ctx.fillText(line, canvas.width / 2, yPos + i * 36); });
      yPos += lines.length * 36 + 30;

      // Action tip
      if (result.actionTip) {
        ctx.fillStyle = "#fbbf24"; ctx.font = "20px sans-serif";
        ctx.fillText(`💡 ${result.actionTip}`, canvas.width / 2, yPos);
        yPos += 40;
      }

      ctx.fillStyle = "rgba(255,255,255,0.3)"; ctx.font = "18px sans-serif";
      ctx.fillText("心灵密语 · 每日塔罗", canvas.width / 2, Math.max(yPos + 20, canvas.height - 40));

      const blobResult = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!blobResult) { toast.error("生成图片失败"); return; }
      const url = URL.createObjectURL(blobResult);
      const a = document.createElement("a");
      a.href = url; a.download = `塔罗牌-${result.card.nameCn}-${new Date().toLocaleDateString("zh-CN")}.png`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
      toast.success("图片已保存 ✨");
    } catch { toast.error("保存失败，请重试"); }
  };

  const handleShareAction = async () => {
    if (!result) return;
    const text = `🔮 今日塔罗：${result.card.nameCn}（${result.isReversed ? "逆位" : "正位"}）\n\n${result.whisper}\n\n💡 ${result.actionTip}\n\n— 心灵密语`;
    if (navigator.share) {
      try { await navigator.share({ text }); } catch {}
    } else {
      await navigator.clipboard.writeText(text);
      toast.success("已复制到剪贴板");
    }
  };

  const handleGenerateReport = async () => {
    if (thisMonthCount < 3) { toast.error("本月至少签到 3 次才能生成报告"); return; }
    setIsReportLoading(true);
    setMonthlyReport("");
    try {
      const session = (await supabase.auth.getSession()).data.session;
      if (!session) throw new Error("未登录");
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/daily-whisper`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}`, apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
        body: JSON.stringify({ action: "monthly-report" }),
      });
      if (!resp.ok) { const errData = await resp.json().catch(() => ({})); toast.error(errData.error || "报告生成失败"); setMonthlyReport(null); return; }
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
            try { const p = JSON.parse(jsonStr); const c = p.choices?.[0]?.delta?.content; if (c) { fullText += c; setMonthlyReport(fullText); } } catch { buffer = line + "\n" + buffer; break; }
          }
        }
        if (!fullText) setMonthlyReport(null);
      } else {
        const data = await resp.json();
        if (data?.error) { toast.error(data.error); setMonthlyReport(null); return; }
        setMonthlyReport(data.report || null);
      }
    } catch { toast.error("报告生成失败"); setMonthlyReport(null); } finally { setIsReportLoading(false); }
  };

  const getCardEmoji = (rec: WhisperRecord) => {
    const info = parseCardInfo(rec.input_text || "");
    if (info) {
      const card = tarotCards.find(c => c.id === info.cardId);
      if (card) return card.emoji;
    }
    return rec.mood_emoji || "🔮";
  };

  const getCardLabel = (rec: WhisperRecord) => {
    const info = parseCardInfo(rec.input_text || "");
    if (info) {
      const card = tarotCards.find(c => c.id === info.cardId);
      if (card) return `${card.nameCn}${info.isReversed ? "（逆位）" : ""}`;
    }
    return rec.mood_word || rec.content || "";
  };

  const ChartTooltipContent = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    if (!d.record) return <div className="rounded-lg bg-card p-2 text-xs text-muted-foreground shadow-card">暂无记录</div>;
    return (
      <div className="rounded-lg bg-card p-3 shadow-card max-w-[200px]">
        <p className="text-lg">{getCardEmoji(d.record)}</p>
        <p className="text-xs font-medium text-foreground">{getCardLabel(d.record)}</p>
        <p className="mt-1 text-[10px] text-muted-foreground line-clamp-2">"{d.record.whisper}"</p>
      </div>
    );
  };

  // ===== RENDER =====

  const renderDrawInterface = () => (
    <motion.div key="draw" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="px-6 py-8 flex flex-col items-center">
      <p className="text-sm text-muted-foreground mb-2">静下心来，聆听内心的声音</p>
      <p className="text-xs text-muted-foreground/60 mb-8">点击牌面，抽取你的今日塔罗牌</p>

      {/* Card back */}
      <div className="perspective-1000" style={{ perspective: "1000px" }}>
        <motion.div
          className="relative cursor-pointer"
          style={{ transformStyle: "preserve-3d" }}
          animate={isFlipping ? { rotateY: 180 } : { rotateY: 0 }}
          transition={{ duration: 1.2, ease: "easeInOut" }}
          onClick={handleDrawCard}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
        >
          {/* Front (back of card) */}
          <div
            className="w-52 h-80 rounded-2xl overflow-hidden shadow-2xl"
            style={{ backfaceVisibility: "hidden" }}
          >
            <div className="w-full h-full bg-gradient-to-br from-indigo-900 via-purple-800 to-violet-900 flex flex-col items-center justify-center border-2 border-amber-500/30 rounded-2xl">
              <div className="w-40 h-64 border border-amber-500/20 rounded-xl flex flex-col items-center justify-center gap-4">
                <motion.span
                  className="text-5xl"
                  animate={{ rotate: [0, 5, -5, 0], scale: [1, 1.05, 1] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                >
                  🔮
                </motion.span>
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

      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={handleDrawCard}
        className="mt-8 flex items-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg"
      >
        <Sparkles className="h-5 w-5" /> 抽取今日塔罗牌
      </motion.button>
    </motion.div>
  );

  const renderLoading = () => (
    <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center px-6 py-20">
      <div className="relative">
        <motion.div className="h-24 w-24 rounded-full bg-gradient-to-br from-violet-500/40 to-indigo-500/40" animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0.7, 0.4] }} transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }} />
        <span className="absolute inset-0 m-auto flex items-center justify-center text-4xl">{drawnCard?.card.emoji}</span>
      </div>
      <p className="mt-6 text-sm text-muted-foreground">正在解读 {drawnCard?.card.nameCn}…</p>
      <p className="mt-1 text-xs text-muted-foreground/50">以心理学视角为你揭示今日启示</p>
    </motion.div>
  );

  const renderResult = () => {
    if (!result) return null;
    return (
      <motion.div key="result" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="px-6 py-6">
        {/* Card header */}
        <div className="text-center mb-4">
          <span className="text-4xl">{result.card.emoji}</span>
          <h2 className="mt-2 font-display text-2xl font-bold text-foreground">{result.card.nameCn}</h2>
          <div className="flex items-center justify-center gap-2 mt-1">
            <span className="text-sm text-muted-foreground">{result.card.name}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${result.isReversed ? "bg-amber-500/20 text-amber-400" : "bg-violet-500/20 text-violet-400"}`}>
              {result.isReversed ? "逆位" : "正位"}
            </span>
          </div>
          <div className="flex flex-wrap justify-center gap-1.5 mt-3">
            {(result.isReversed ? result.card.reversedKeywords : result.card.uprightKeywords).map((kw, i) => (
              <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-muted/50 text-muted-foreground">{kw}</span>
            ))}
          </div>
        </div>

        {/* AI Image */}
        <div className="relative overflow-hidden rounded-2xl shadow-soft mb-4">
          {result.imageUrl ? (
            <img src={result.imageUrl} alt={result.card.nameCn} className="h-72 w-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
          ) : result.whisperId ? (
            <div className="h-72 w-full bg-gradient-to-br from-violet-900/50 to-indigo-900/50 flex flex-col items-center justify-center gap-3 rounded-2xl">
              <motion.div className="h-12 w-12 rounded-full border-2 border-white/20 border-t-white/60" animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }} />
              <p className="text-xs text-white/50">牌面插图生成中…</p>
            </div>
          ) : null}
        </div>

        {/* Interpretation */}
        <div className="rounded-2xl bg-card p-5 shadow-card mb-4">
          <h3 className="font-display text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-violet-400" /> 心理学解读
          </h3>
          <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">{result.whisper}</p>
        </div>

        {/* Action tip */}
        {result.actionTip && (
          <div className="rounded-2xl bg-amber-500/10 border border-amber-500/20 p-4 mb-4">
            <p className="text-sm text-amber-300 flex items-start gap-2">
              <span className="shrink-0">💡</span>
              <span>{result.actionTip}</span>
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-center gap-3">
          <button onClick={handleSave} className="flex items-center gap-2 rounded-full bg-card/80 px-5 py-2.5 text-sm font-medium text-foreground shadow-card backdrop-blur-sm">
            <Download className="h-4 w-4" /> 保存
          </button>
          <button onClick={handleShareAction} className="flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-2.5 text-sm font-medium text-white shadow-soft">
            <Share2 className="h-4 w-4" /> 分享
          </button>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-calm pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center gap-3 bg-background/80 backdrop-blur-md px-4 py-3">
        <button onClick={() => navigate(-1)} className="p-1.5"><ArrowLeft className="h-5 w-5 text-foreground" /></button>
        <h1 className="font-display text-lg font-semibold text-foreground">🔮 每日塔罗</h1>
      </div>

      <AnimatePresence mode="wait">
        {isGenerating ? renderLoading()
          : result ? renderResult()
          : renderDrawInterface()}
      </AnimatePresence>

      {/* 14-Day Mood Curve */}
      {!isGenerating && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="px-6 mt-2">
          <div className="rounded-2xl bg-card p-4 shadow-card">
            <h3 className="mb-1 font-display text-sm font-semibold text-foreground">📈 14 天情绪曲线</h3>
            <p className="mb-3 text-[10px] text-muted-foreground">每日塔罗牌自动记录情绪能量</p>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} onClick={(e: any) => { if (e?.activePayload?.[0]?.payload?.record) setSelectedNode(e.activePayload[0].payload.record); }}>
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 6]} hide />
                  <RechartsTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="score" stroke="hsl(var(--secondary))" strokeWidth={2.5}
                    dot={(props: any) => {
                      const { cx, cy, payload } = props;
                      if (payload.score === null) return <circle key={`dot-${props.index}`} cx={cx} cy={cy} r={0} />;
                      return <circle key={`dot-${props.index}`} cx={cx} cy={cy} r={5} fill={payload.record ? "hsl(var(--secondary))" : "transparent"} stroke="hsl(var(--secondary))" strokeWidth={2} className="cursor-pointer" />;
                    }} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <AnimatePresence>
              {selectedNode && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                  <div className="mt-3 pt-3 border-t border-border/30 flex items-start gap-3">
                    <span className="text-2xl">{getCardEmoji(selectedNode)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground">
                        {getCardLabel(selectedNode)}
                        <span className="ml-2 text-muted-foreground font-normal">{new Date(selectedNode.created_at).toLocaleDateString("zh-CN", { month: "short", day: "numeric" })}</span>
                      </p>
                      <p className="mt-1 text-[11px] text-muted-foreground line-clamp-2">"{selectedNode.whisper}"</p>
                    </div>
                    <button onClick={() => setSelectedNode(null)} className="text-muted-foreground/50"><X className="h-4 w-4" /></button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}

      {/* Monthly Report */}
      {!isGenerating && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="px-6 mt-4">
          <div className="rounded-2xl bg-card p-5 shadow-card">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-500"><BookOpen className="h-5 w-5 text-white" /></div>
              <div>
                <h3 className="font-display text-sm font-semibold text-foreground">月度情绪报告</h3>
                <p className="text-[10px] text-muted-foreground">
                  本月 {thisMonthCount} 次签到 {thisMonthCount < 3 ? "· 再签几次即可解锁" : "· 可生成报告！"}
                </p>
              </div>
            </div>
            {monthlyReport !== null ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-xl bg-muted/30 p-4 border border-border/30">
                <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                  {monthlyReport}
                  {isReportLoading && <span className="inline-block w-1 h-4 ml-0.5 bg-foreground/60 animate-pulse align-text-bottom" />}
                </p>
                {!isReportLoading && monthlyReport && (
                  <div className="mt-3 flex gap-2">
                    <button onClick={async () => { if (navigator.share) { await navigator.share({ text: monthlyReport }); } else { await navigator.clipboard.writeText(monthlyReport); toast.success("已复制到剪贴板"); } }}
                      className="rounded-full bg-card px-3 py-1.5 text-xs text-muted-foreground border border-border/40">
                      <Share2 className="inline h-3 w-3 mr-1" /> 分享
                    </button>
                  </div>
                )}
              </motion.div>
            ) : (
              <button onClick={handleGenerateReport} disabled={isReportLoading || thisMonthCount < 3} className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 py-3 text-sm font-semibold text-white shadow-soft disabled:opacity-40 transition-opacity">
                {isReportLoading ? "正在生成报告…" : "生成月度报告"}
              </button>
            )}
          </div>
        </motion.div>
      )}

      {/* History */}
      {!isGenerating && history.length > 0 && (
        <div className="px-6 mt-4 pb-4">
          <h3 className="mb-3 font-display text-sm font-semibold text-foreground flex items-center gap-2">
            📜 历史记录 <span className="text-[10px] font-normal text-muted-foreground">{history.length} 条</span>
          </h3>
          <div className="space-y-2.5">
            {history.slice(0, 10).map((record, i) => (
              <motion.div key={record.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                className="flex items-start gap-3 rounded-2xl bg-card/70 p-3 shadow-card backdrop-blur-sm cursor-pointer active:scale-[0.98] transition-transform"
                onClick={() => {
                  const info = parseCardInfo(record.input_text || "");
                  const card = info ? tarotCards.find(c => c.id === info.cardId) : null;
                  if (card && info) {
                    const parts = (record.whisper || "").split("\n\n💡 ");
                    setDrawnCard({ card, isReversed: info.isReversed });
                    setIsFlipped(true);
                    setResult({ whisper: parts[0] || record.whisper || "", actionTip: parts[1] || "", imageUrl: record.image_url, whisperId: record.id, card, isReversed: info.isReversed });
                  }
                }}>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted/40 text-xl">{getCardEmoji(record)}</div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground line-clamp-1 leading-relaxed">{getCardLabel(record)}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {new Date(record.created_at).toLocaleDateString("zh-CN", { month: "short", day: "numeric" })}
                    <span className="ml-1.5 text-muted-foreground/60">· 能量 {record.mood_score || "?"}/5</span>
                  </p>
                </div>
              </motion.div>
            ))}
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
