import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Camera, Download, Share2, Sparkles, X, PenLine, RefreshCw, ImagePlus, BookOpen } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import BottomNav from "@/components/BottomNav";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";

interface WhisperRecord {
  id: string;
  whisper: string;
  image_url: string | null;
  input_text: string | null;
  created_at: string;
  mood_emoji: string | null;
  mood_word: string | null;
  mood_score: number | null;
}

const MOODS = [
  { emoji: "😭", label: "Awful", score: 1 },
  { emoji: "😔", label: "Low", score: 2 },
  { emoji: "😐", label: "Meh", score: 3 },
  { emoji: "🙂", label: "Good", score: 4 },
  { emoji: "😄", label: "Great", score: 5 },
];

const QUICK_WORDS = ["Exhausted", "Anxious", "Calm", "Happy", "Excited", "Lonely", "Grateful", "Lost"];

const DailyWhisper = () => {
  const navigate = useNavigate();
  const { user, promptLogin } = useAuth();
  const [selectedMood, setSelectedMood] = useState<number | null>(null);
  const [moodWord, setMoodWord] = useState("");
  const [inputText, setInputText] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<{ whisper: string; imageUrl: string | null; whisperId: string | null } | null>(null);
  const imagePollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [history, setHistory] = useState<WhisperRecord[]>([]);
  const [todayWhisper, setTodayWhisper] = useState<WhisperRecord | null>(null);
  const [selectedNode, setSelectedNode] = useState<WhisperRecord | null>(null);
  const [monthlyReport, setMonthlyReport] = useState<string | null>(null);
  const [isReportLoading, setIsReportLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) { promptLogin("登录后记录每日心语 🌙"); navigate("/"); return; }
    loadHistory();
  }, [user]);

  const loadHistory = async () => {
    if (!user) return;
    const { data } = await supabase.from("daily_whispers").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(100);
    if (data && data.length > 0) {
      setHistory(data as WhisperRecord[]);
      const today = new Date().toDateString();
      const todayRecord = data.find((r: any) => new Date(r.created_at).toDateString() === today);
      if (todayRecord) setTodayWhisper(todayRecord as WhisperRecord);
    }
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

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be under 5MB"); return; }
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleGenerate = async () => {
    if (selectedMood === null && !inputText.trim() && !imagePreview) { toast.error("Select a mood or enter something"); return; }
    setIsGenerating(true);
    try {
      const mood = selectedMood !== null ? MOODS[selectedMood] : null;
      const { data, error } = await supabase.functions.invoke("daily-whisper", {
        body: { inputText: inputText.trim() || moodWord || null, inputImageBase64: imagePreview || null, moodEmoji: mood?.emoji || null, moodWord: moodWord || mood?.label || null, moodScore: mood?.score || null },
      });
      if (error) throw error;
      if (data?.error) { toast.error(data.error); return; }
      setResult({ whisper: data.whisper, imageUrl: data.imageUrl, whisperId: data.whisperId });
      setInputText(""); setImagePreview(null); setSelectedMood(null); setMoodWord("");
      if (!data.imageUrl && data.whisperId) startImagePolling(data.whisperId);
      loadHistory();
    } catch (e: any) { console.error(e); toast.error("Generation failed, please try again"); } finally { setIsGenerating(false); }
  };

  const startImagePolling = (whisperId: string) => {
    if (imagePollingRef.current) clearInterval(imagePollingRef.current);
    let attempts = 0;
    imagePollingRef.current = setInterval(async () => {
      attempts++;
      if (attempts > 20) { if (imagePollingRef.current) clearInterval(imagePollingRef.current); return; }
      try {
        const { data } = await supabase.functions.invoke("daily-whisper", { body: { action: "check-image", whisper_id: whisperId } });
        if (data?.imageUrl) { setResult(prev => prev ? { ...prev, imageUrl: data.imageUrl } : prev); if (imagePollingRef.current) clearInterval(imagePollingRef.current); loadHistory(); }
      } catch {}
    }, 2000);
  };

  useEffect(() => { return () => { if (imagePollingRef.current) clearInterval(imagePollingRef.current); }; }, []);

  const handleGenerateReport = async () => {
    if (thisMonthCount < 3) { toast.error("Check in at least 3 times this month to generate a report"); return; }
    setIsReportLoading(true);
    setMonthlyReport("");
    try {
      const session = (await supabase.auth.getSession()).data.session;
      if (!session) throw new Error("Not signed in");
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/daily-whisper`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}`, apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
        body: JSON.stringify({ action: "monthly-report" }),
      });
      if (!resp.ok) { const errData = await resp.json().catch(() => ({})); toast.error(errData.error || "Report generation failed"); setMonthlyReport(null); return; }
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
        if (buffer.trim()) {
          for (let raw of buffer.split("\n")) {
            if (!raw?.startsWith("data: ")) continue; const jsonStr = raw.slice(6).trim(); if (jsonStr === "[DONE]") continue;
            try { const p = JSON.parse(jsonStr); const c = p.choices?.[0]?.delta?.content; if (c) { fullText += c; setMonthlyReport(fullText); } } catch {}
          }
        }
        if (!fullText) setMonthlyReport(null);
      } else {
        const data = await resp.json();
        if (data?.error) { toast.error(data.error); setMonthlyReport(null); return; }
        setMonthlyReport(data.report || null);
      }
    } catch (e: any) { console.error(e); toast.error("Report generation failed"); setMonthlyReport(null); } finally { setIsReportLoading(false); }
  };

  const handleSave = async () => {
    if (!result) return;
    try {
      const canvas = document.createElement("canvas"); const ctx = canvas.getContext("2d")!;
      canvas.width = 750; canvas.height = 1000;
      const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
      grad.addColorStop(0, "#1a1035"); grad.addColorStop(0.5, "#2d1b69"); grad.addColorStop(1, "#1a1035");
      ctx.fillStyle = grad; ctx.fillRect(0, 0, canvas.width, canvas.height);
      let yPos = 80; let hasImage = false;
      if (result.imageUrl) {
        try {
          const resp = await fetch(result.imageUrl); const blob = await resp.blob(); const bitmapUrl = URL.createObjectURL(blob);
          const img = await loadImage(bitmapUrl); const imgSize = 500; const x = (canvas.width - imgSize) / 2;
          ctx.save(); roundedClip(ctx, x, yPos, imgSize, imgSize, 20); ctx.drawImage(img, x, yPos, imgSize, imgSize); ctx.restore();
          URL.revokeObjectURL(bitmapUrl); yPos += imgSize + 50; hasImage = true;
        } catch (e) { console.error("Image load error:", e); }
      }
      if (!hasImage) {
        const cardW = 500, cardH = 300; const x = (canvas.width - cardW) / 2;
        const cardGrad = ctx.createLinearGradient(x, yPos, x + cardW, yPos + cardH);
        cardGrad.addColorStop(0, "#4a2c8a"); cardGrad.addColorStop(0.5, "#6b3fa0"); cardGrad.addColorStop(1, "#3d6098");
        ctx.save(); roundedClip(ctx, x, yPos, cardW, cardH, 24); ctx.fillStyle = cardGrad; ctx.fillRect(x, yPos, cardW, cardH);
        ctx.globalAlpha = 0.15; ctx.fillStyle = "#fff";
        ctx.beginPath(); ctx.arc(x + 100, yPos + 80, 60, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(x + cardW - 80, yPos + cardH - 60, 45, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1; ctx.restore(); yPos += cardH + 50;
      }
      ctx.fillStyle = "rgba(255,255,255,0.95)"; ctx.font = "bold 36px 'DM Serif Display', serif"; ctx.textAlign = "center";
      const lines = wrapText(ctx, `"${result.whisper}"`, 600);
      lines.forEach((line, i) => { ctx.fillText(line, canvas.width / 2, yPos + i * 50); }); yPos += lines.length * 50 + 40;
      ctx.fillStyle = "rgba(255,255,255,0.4)"; ctx.font = "22px 'Inter', sans-serif";
      ctx.fillText("MindGarden · Daily Check-in", canvas.width / 2, yPos);
      const blobResult = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!blobResult) { toast.error("Failed to generate image"); return; }
      const url = URL.createObjectURL(blobResult); const a = document.createElement("a");
      a.href = url; a.download = `MindGarden-${new Date().toLocaleDateString("en-US")}.png`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
      toast.success("Image saved");
    } catch (e) { console.error("Save error:", e); toast.error("Save failed, please try again"); }
  };

  const handleShareAction = async () => {
    if (!result) return;
    if (navigator.share) {
      try { await navigator.share({ text: `"${result.whisper}" — MindGarden` }); } catch {}
    } else {
      await navigator.clipboard.writeText(`"${result.whisper}" — MindGarden`);
      toast.success("Copied to clipboard");
    }
  };

  const ChartTooltipContent = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    if (!d.record) return <div className="rounded-lg bg-card p-2 text-xs text-muted-foreground shadow-card">No record</div>;
    return (
      <div className="rounded-lg bg-card p-3 shadow-card max-w-[200px]">
        <p className="text-lg">{d.record.mood_emoji}</p>
        <p className="text-xs font-medium text-foreground">{d.record.mood_word || d.record.input_text?.slice(0, 20)}</p>
        <p className="mt-1 text-[10px] text-muted-foreground line-clamp-2">"{d.record.whisper}"</p>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-calm pb-24">
      <div className="sticky top-0 z-10 flex items-center gap-3 bg-background/80 backdrop-blur-md px-4 py-3">
        <button onClick={() => navigate(-1)} className="p-1.5"><ArrowLeft className="h-5 w-5 text-foreground" /></button>
        <h1 className="font-display text-lg font-semibold text-foreground">Daily Check-in</h1>
      </div>
      <AnimatePresence mode="wait">
        {isGenerating ? (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center px-6 py-20">
            <div className="relative">
              <motion.div className="h-24 w-24 rounded-full bg-gradient-mystic opacity-60" animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0.7, 0.4] }} transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }} />
              <Sparkles className="absolute inset-0 m-auto h-8 w-8 text-secondary" />
            </div>
            <p className="mt-6 text-sm text-muted-foreground">Crafting your personal whisper…</p>
          </motion.div>
        ) : result ? (
          <motion.div key="result" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="px-6 py-6">
            <div className="relative overflow-hidden rounded-3xl shadow-soft">
              {result.imageUrl ? (
                <img src={result.imageUrl} alt="Whisper art" className="h-80 w-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden'); }} />
              ) : null}
              <div className={`relative h-80 w-full bg-gradient-mystic ${result.imageUrl ? 'hidden' : ''}`}>
                {!result.imageUrl && result.whisperId && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                    <motion.div className="h-12 w-12 rounded-full border-2 border-white/20 border-t-white/60" animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }} />
                    <p className="text-xs text-white/50">Creating artwork…</p>
                  </div>
                )}
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <p className="font-display text-xl leading-relaxed text-white drop-shadow-lg">"{result.whisper}"</p>
                <p className="mt-3 text-xs text-white/50">
                  {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric" })} · MindGarden
                </p>
              </div>
            </div>
            <div className="mt-4 flex justify-center gap-3">
              <button onClick={handleSave} className="flex items-center gap-2 rounded-full bg-card/80 px-5 py-2.5 text-sm font-medium text-foreground shadow-card backdrop-blur-sm">
                <Download className="h-4 w-4" /> Save
              </button>
              <button onClick={handleShareAction} className="flex items-center gap-2 rounded-full bg-gradient-mystic px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-soft">
                <Share2 className="h-4 w-4" /> Share
              </button>
            </div>
            {!todayWhisper && (
              <button onClick={() => setResult(null)} className="mx-auto mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
                <RefreshCw className="h-3 w-3" /> Regenerate
              </button>
            )}
          </motion.div>
        ) : (
          <motion.div key="input" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="px-6 py-6 space-y-5">
            <div className="rounded-2xl bg-card p-5 shadow-card">
              <h2 className="mb-1 font-display text-sm font-semibold text-foreground">How are you feeling right now?</h2>
              <p className="mb-4 text-[11px] text-muted-foreground">Pick an emoji to log today's mood</p>
              <div className="flex justify-between px-2">
                {MOODS.map((m, i) => (
                  <button key={i} onClick={() => setSelectedMood(i)} className="flex flex-col items-center gap-1 transition-transform">
                    <motion.span animate={selectedMood === i ? { scale: 1.35 } : { scale: 1 }} className={`text-3xl transition-opacity ${selectedMood !== null && selectedMood !== i ? "opacity-40" : ""}`}>{m.emoji}</motion.span>
                    <span className={`text-[10px] ${selectedMood === i ? "font-semibold text-foreground" : "text-muted-foreground"}`}>{m.label}</span>
                  </button>
                ))}
              </div>
              <AnimatePresence>
                {selectedMood !== null && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <div className="mt-4 pt-4 border-t border-border/30">
                      <p className="mb-2 text-[11px] text-muted-foreground">Describe it in a word</p>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {QUICK_WORDS.map((w) => (
                          <button key={w} onClick={() => setMoodWord(w)} className={`rounded-full px-3 py-1 text-xs transition-colors ${moodWord === w ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground border border-border/40"}`}>{w}</button>
                        ))}
                      </div>
                      <input value={moodWord} onChange={(e) => setMoodWord(e.target.value)} placeholder="Or type your own…" maxLength={10} className="w-full rounded-xl border border-border/50 bg-muted/30 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20" />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <div className="rounded-2xl bg-card p-4 shadow-card">
              <p className="mb-3 text-[11px] text-muted-foreground">💡 Want to say more? Write a note or upload a photo for a more personalized whisper</p>
              <div className="flex items-start gap-3">
                <div className="mt-1 shrink-0 rounded-lg bg-secondary/10 p-1.5"><PenLine className="h-4 w-4 text-secondary" /></div>
                <div className="flex-1 relative">
                  <textarea value={inputText} onChange={(e) => setInputText(e.target.value)} placeholder="The weather is nice today, feeling good…" maxLength={200} className="w-full resize-none rounded-xl border border-border/50 bg-muted/30 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all" rows={2} />
                  <span className="absolute bottom-1.5 right-2.5 text-[10px] text-muted-foreground/40">{inputText.length}/200</span>
                </div>
              </div>
              <div className="mt-3">
                {imagePreview ? (
                  <div className="relative inline-block">
                    <img src={imagePreview} alt="Preview" className="h-20 w-20 rounded-xl object-cover shadow-card" />
                    <button onClick={() => { setImagePreview(null); if (fileInputRef.current) fileInputRef.current.value = ""; }} className="absolute -right-2 -top-2 rounded-full bg-destructive p-1 shadow-sm"><X className="h-3 w-3 text-destructive-foreground" /></button>
                  </div>
                ) : (
                  <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 rounded-xl border border-dashed border-border/60 bg-muted/20 px-3 py-2.5 text-xs text-muted-foreground transition-colors active:bg-muted/40">
                    <Camera className="h-4 w-4 text-secondary" /> Upload Photo <ImagePlus className="ml-auto h-3.5 w-3.5 text-muted-foreground/30" />
                  </button>
                )}
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
              </div>
            </div>
            <motion.button whileTap={{ scale: 0.97 }} onClick={handleGenerate} disabled={isGenerating || (selectedMood === null && !inputText.trim() && !imagePreview)} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-mystic py-3.5 text-base font-semibold text-primary-foreground shadow-soft disabled:opacity-40 transition-opacity">
              <Sparkles className="h-5 w-5" /> Generate My Whisper
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
      {!isGenerating && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="px-6 mt-2">
          <div className="rounded-2xl bg-card p-4 shadow-card">
            <h3 className="mb-1 font-display text-sm font-semibold text-foreground">📈 14-Day Mood Curve</h3>
            <p className="mb-3 text-[10px] text-muted-foreground">Tap a dot to revisit that day</p>
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
                    <span className="text-2xl">{selectedNode.mood_emoji || "📝"}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground">
                        {selectedNode.mood_word || selectedNode.input_text?.slice(0, 20) || "No keyword"}
                        <span className="ml-2 text-muted-foreground font-normal">{new Date(selectedNode.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
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
      {!isGenerating && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="px-6 mt-4">
          <div className="rounded-2xl bg-card p-5 shadow-card">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-golden"><BookOpen className="h-5 w-5 text-primary-foreground" /></div>
              <div>
                <h3 className="font-display text-sm font-semibold text-foreground">Monthly Wellness Report</h3>
                <p className="text-[10px] text-muted-foreground">
                  {thisMonthCount} check-ins this month {thisMonthCount < 3 ? "· A few more to unlock report" : "· Report available!"}
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
                    <button onClick={async () => { if (navigator.share) { await navigator.share({ text: monthlyReport }); } else { await navigator.clipboard.writeText(monthlyReport); toast.success("Copied to clipboard"); } }}
                      className="rounded-full bg-card px-3 py-1.5 text-xs text-muted-foreground border border-border/40">
                      <Share2 className="inline h-3 w-3 mr-1" /> Share
                    </button>
                  </div>
                )}
              </motion.div>
            ) : (
              <button onClick={handleGenerateReport} disabled={isReportLoading || thisMonthCount < 3} className="w-full rounded-xl bg-gradient-golden py-3 text-sm font-semibold text-white shadow-soft disabled:opacity-40 transition-opacity">
                {isReportLoading ? "Writing your report…" : "Generate Monthly Report"}
              </button>
            )}
          </div>
        </motion.div>
      )}
      {!isGenerating && history.length > 0 && (
        <div className="px-6 mt-4 pb-4">
          <h3 className="mb-3 font-display text-sm font-semibold text-foreground flex items-center gap-2">
            📜 History <span className="text-[10px] font-normal text-muted-foreground">{history.length} entries</span>
          </h3>
          <div className="space-y-2.5">
            {history.slice(0, 10).map((record, i) => (
              <motion.div key={record.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                className="flex items-start gap-3 rounded-2xl bg-card/70 p-3 shadow-card backdrop-blur-sm cursor-pointer active:scale-[0.98] transition-transform"
                onClick={() => setResult({ whisper: record.whisper, imageUrl: record.image_url, whisperId: record.id })}>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted/40 text-xl">{record.mood_emoji || "✨"}</div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground line-clamp-1 leading-relaxed">"{record.whisper}"</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {new Date(record.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    {record.mood_word && <span className="ml-1.5 text-muted-foreground/60">· {record.mood_word}</span>}
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
