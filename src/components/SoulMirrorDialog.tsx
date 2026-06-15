import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, Download, Share2, Crown, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSoulMirror, type SoulMirror, type SoulMirrorPerspective } from "@/hooks/useSoulMirror";
import { useNavigate } from "react-router-dom";

interface Props {
  open: boolean;
  userId: string | undefined;
  onClose: () => void;
  /** Existing mirror to show instead of triggering generation. */
  existingMirror?: SoulMirror | null;
}

type Phase = "intro" | "generating" | "result" | "pro_required" | "throttled" | "error";

const POSTER_W = 1080;
const POSTER_H = 1350;

const AGENT_BG: Record<string, [string, string]> = {
  barista: ["#5a3a2a", "#a06a3f"],
  jax:     ["#5a2a18", "#d97b3a"],
  mystic:  ["#3a2a5a", "#9b6bd9"],
  bestie:  ["#5a2a4a", "#e07ab5"],
};

export default function SoulMirrorDialog({ open, userId, onClose, existingMirror }: Props) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { generate, attachPosterUrl } = useSoulMirror(userId);
  const [phase, setPhase] = useState<Phase>(existingMirror ? "result" : "intro");
  const [mirror, setMirror] = useState<SoulMirror | null>(existingMirror || null);
  const [posterUrl, setPosterUrl] = useState<string | null>(existingMirror?.poster_url || null);
  const [hoursLeft, setHoursLeft] = useState<number | undefined>(undefined);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!open) return;
    if (existingMirror) {
      setMirror(existingMirror);
      setPosterUrl(existingMirror.poster_url);
      setPhase("result");
    } else {
      setPhase("intro");
      setMirror(null);
      setPosterUrl(null);
    }
  }, [open, existingMirror]);

  const handleGenerate = useCallback(async () => {
    setPhase("generating");
    const res = await generate();
    if (res.ok) {
      setMirror(res.mirror);
      setPhase("result");
    } else if (res.reason === "requires_pro") {
      setPhase("pro_required");
    } else if (res.reason === "throttled") {
      setHoursLeft(res.hoursLeft);
      setPhase("throttled");
    } else {
      setPhase("error");
    }
  }, [generate]);

  // Render poster onto canvas once mirror appears
  useEffect(() => {
    if (phase !== "result" || !mirror) return;
    let cancelled = false;
    (async () => {
      const dataUrl = await renderPoster(mirror);
      if (cancelled) return;
      setPosterUrl(dataUrl);
      // Upload to storage in background
      try {
        const blob = await (await fetch(dataUrl)).blob();
        const fileName = `soul-mirror_${mirror.id}.png`;
        const { error } = await supabase.storage
          .from("shared-posters")
          .upload(fileName, blob, { contentType: "image/png", upsert: true });
        if (!error) {
          const { data } = supabase.storage.from("shared-posters").getPublicUrl(fileName);
          if (data?.publicUrl) await attachPosterUrl(mirror.id, data.publicUrl);
        }
      } catch { /* silent */ }
    })();
    return () => { cancelled = true; };
  }, [phase, mirror, attachPosterUrl]);

  const handleShare = useCallback(async () => {
    if (!posterUrl) return;
    try {
      const blob = await (await fetch(posterUrl)).blob();
      const file = new File([blob], "soul-mirror.png", { type: "image/png" });
      if (navigator.share && (navigator as any).canShare?.({ files: [file] })) {
        await navigator.share({
          title: t("soulMirror.shareTitle"),
          text: t("soulMirror.shareText"),
          files: [file],
        });
        return;
      }
      // fallback: download
      handleDownload();
    } catch (e: any) {
      if (e?.name !== "AbortError") toast.error(t("common.somethingWrong"));
    }
  }, [posterUrl, t]);

  const handleDownload = useCallback(() => {
    if (!posterUrl) return;
    const a = document.createElement("a");
    a.href = posterUrl;
    a.download = "soul-mirror.png";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success(t("soulMirror.savedToast"));
  }, [posterUrl, t]);

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 overflow-y-auto"
        onClick={(e) => { if (e.target === e.currentTarget && phase !== "generating") onClose(); }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96 }}
          className="relative w-full max-w-md rounded-3xl bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-950 shadow-2xl my-8"
        >
          {phase !== "generating" && (
            <button
              onClick={onClose}
              className="absolute right-4 top-4 z-10 rounded-full bg-white/10 p-1.5 text-white/80 hover:bg-white/20"
              aria-label="close"
            >
              <X className="h-4 w-4" />
            </button>
          )}

          {phase === "intro" && (
            <div className="p-8 text-center text-white">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 shadow-glow">
                <Sparkles className="h-8 w-8 text-white" />
              </div>
              <h2 className="font-display text-2xl font-bold mb-2">{t("soulMirror.unlockedTitle")}</h2>
              <p className="text-sm text-white/80 mb-6 leading-relaxed whitespace-pre-line">{t("soulMirror.unlockedDesc")}</p>
              <div className="grid grid-cols-2 gap-2 mb-6 text-left">
                {[
                  { e: "☕", n: "Chloe", d: t("soulMirror.lens.barista") },
                  { e: "🔥", n: "Jax", d: t("soulMirror.lens.jax") },
                  { e: "🔮", n: "Luna", d: t("soulMirror.lens.mystic") },
                  { e: "💖", n: "Aria", d: t("soulMirror.lens.bestie") },
                ].map((a) => (
                  <div key={a.n} className="rounded-xl bg-white/5 border border-white/10 p-2.5">
                    <div className="text-lg">{a.e}</div>
                    <div className="text-xs font-semibold">{a.n}</div>
                    <div className="text-[10px] text-white/60 leading-snug">{a.d}</div>
                  </div>
                ))}
              </div>
              <button
                onClick={handleGenerate}
                className="w-full rounded-2xl bg-gradient-to-r from-pink-500 to-purple-500 py-3 font-semibold text-white shadow-lg active:scale-[0.98] transition"
              >
                {t("soulMirror.cta")}
              </button>
              <button onClick={onClose} className="mt-3 text-xs text-white/60 hover:text-white/80">{t("soulMirror.later")}</button>
            </div>
          )}

          {phase === "generating" && (
            <div className="p-10 text-center text-white">
              <Loader2 className="h-10 w-10 animate-spin text-pink-400 mx-auto mb-4" />
              <h2 className="font-display text-xl font-bold mb-2">{t("soulMirror.generatingTitle")}</h2>
              <p className="text-sm text-white/70 leading-relaxed">{t("soulMirror.generatingDesc")}</p>
            </div>
          )}

          {phase === "result" && (
            <div className="p-5">
              {posterUrl ? (
                <img src={posterUrl} alt="Soul Mirror" className="w-full rounded-2xl shadow-2xl" />
              ) : (
                <div className="aspect-[4/5] rounded-2xl bg-white/5 flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-white/60" />
                </div>
              )}
              <div className="mt-4 flex gap-2">
                <button
                  onClick={handleShare}
                  disabled={!posterUrl}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-500 py-3 text-sm font-semibold text-white disabled:opacity-50"
                >
                  <Share2 className="h-4 w-4" /> {t("soulMirror.share")}
                </button>
                <button
                  onClick={handleDownload}
                  disabled={!posterUrl}
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-white/10 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
                >
                  <Download className="h-4 w-4" />
                </button>
              </div>
              <canvas ref={canvasRef} className="hidden" />
            </div>
          )}

          {phase === "pro_required" && (
            <div className="p-8 text-center text-white">
              <Crown className="h-10 w-10 text-amber-400 mx-auto mb-4" />
              <h2 className="font-display text-xl font-bold mb-2">{t("soulMirror.proTitle")}</h2>
              <p className="text-sm text-white/70 mb-6">{t("soulMirror.proDesc")}</p>
              <button
                onClick={() => { onClose(); navigate("/pricing"); }}
                className="w-full rounded-2xl bg-gradient-to-r from-amber-400 to-pink-500 py-3 font-semibold text-white"
              >
                {t("soulMirror.upgradeCta")}
              </button>
              <button onClick={onClose} className="mt-3 text-xs text-white/60">{t("common.close")}</button>
            </div>
          )}

          {phase === "throttled" && (
            <div className="p-8 text-center text-white">
              <h2 className="font-display text-xl font-bold mb-2">{t("soulMirror.throttledTitle")}</h2>
              <p className="text-sm text-white/70 mb-6">{t("soulMirror.throttledDesc", { hours: hoursLeft ?? 1 })}</p>
              <button onClick={onClose} className="w-full rounded-2xl bg-white/10 py-3 text-sm font-semibold">{t("common.close")}</button>
            </div>
          )}

          {phase === "error" && (
            <div className="p-8 text-center text-white">
              <h2 className="font-display text-xl font-bold mb-2">{t("common.somethingWrong")}</h2>
              <button onClick={handleGenerate} className="mt-3 w-full rounded-2xl bg-white/10 py-3 text-sm font-semibold">{t("common.retry")}</button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// =============== Canvas rendering ===============

async function renderPoster(mirror: SoulMirror): Promise<string> {
  const canvas = document.createElement("canvas");
  canvas.width = POSTER_W;
  canvas.height = POSTER_H;
  const ctx = canvas.getContext("2d")!;

  // Background gradient
  const bg = ctx.createLinearGradient(0, 0, POSTER_W, POSTER_H);
  bg.addColorStop(0, "#1a1230");
  bg.addColorStop(0.5, "#2a1648");
  bg.addColorStop(1, "#0f0a1f");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, POSTER_W, POSTER_H);

  // Subtle stars
  for (let i = 0; i < 80; i++) {
    ctx.fillStyle = `rgba(255,255,255,${0.1 + Math.random() * 0.3})`;
    ctx.beginPath();
    ctx.arc(Math.random() * POSTER_W, Math.random() * POSTER_H, Math.random() * 1.6, 0, Math.PI * 2);
    ctx.fill();
  }

  // Header
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.font = "700 56px 'DM Serif Display', serif";
  ctx.fillText("Soul Mirror · 灵魂镜像", POSTER_W / 2, 100);

  const snap = mirror.user_snapshot;
  if (snap) {
    ctx.font = "26px 'Inter', sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    const sub = [`@${snap.nickname}`, snap.mbti, snap.zodiac].filter(Boolean).join(" · ");
    ctx.fillText(sub, POSTER_W / 2, 140);
  }

  // Four quadrants
  const gridTop = 190;
  const gridBottom = POSTER_H - 130;
  const gridLeft = 50;
  const gridRight = POSTER_W - 50;
  const gridW = gridRight - gridLeft;
  const gridH = gridBottom - gridTop;
  const cellW = gridW / 2;
  const cellH = gridH / 2;
  const gap = 18;

  for (let i = 0; i < 4 && i < mirror.perspectives.length; i++) {
    const p = mirror.perspectives[i];
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = gridLeft + col * cellW + (col === 0 ? 0 : gap / 2);
    const y = gridTop + row * cellH + (row === 0 ? 0 : gap / 2);
    const w = cellW - gap / 2;
    const h = cellH - gap / 2;
    drawQuadrant(ctx, x, y, w, h, p);
  }

  // Footer
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.font = "italic 24px 'DM Serif Display', serif";
  ctx.textAlign = "center";
  ctx.fillText("islandai.life · 心灵镜像", POSTER_W / 2, POSTER_H - 60);

  return canvas.toDataURL("image/png");
}

function drawQuadrant(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  p: SoulMirrorPerspective,
) {
  const colors = AGENT_BG[p.agentId] || ["#3a2a5a", "#7a5ab8"];
  // Card background gradient
  const grad = ctx.createLinearGradient(x, y, x + w, y + h);
  grad.addColorStop(0, hexToRgba(colors[0], 0.85));
  grad.addColorStop(1, hexToRgba(colors[1], 0.7));
  roundRect(ctx, x, y, w, h, 24);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.15)";
  ctx.lineWidth = 1.5;
  roundRect(ctx, x, y, w, h, 24);
  ctx.stroke();

  const padding = 28;
  let cy = y + padding + 36;

  // Header: emoji + name
  ctx.textAlign = "left";
  ctx.font = "44px sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.fillText(p.emoji, x + padding, cy);
  ctx.font = "700 28px 'DM Serif Display', serif";
  ctx.fillText(p.displayName, x + padding + 56, cy - 6);
  cy += 32;

  // Signature
  ctx.font = "italic 22px 'DM Serif Display', serif";
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  const sigLines = wrapText(ctx, p.signature, w - padding * 2);
  for (const line of sigLines.slice(0, 2)) {
    ctx.fillText(line, x + padding, cy);
    cy += 28;
  }
  cy += 6;

  // Divider
  ctx.strokeStyle = "rgba(255,255,255,0.25)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + padding, cy);
  ctx.lineTo(x + w - padding, cy);
  ctx.stroke();
  cy += 22;

  // Portrait body
  ctx.font = "21px 'Inter', sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.88)";
  const maxBodyHeight = h - (cy - y) - 80; // leave room for keywords
  const lineHeight = 30;
  const maxLines = Math.floor(maxBodyHeight / lineHeight);
  const bodyLines = wrapText(ctx, p.portrait, w - padding * 2);
  const shown = bodyLines.slice(0, maxLines);
  if (bodyLines.length > maxLines && shown.length > 0) {
    const last = shown[shown.length - 1];
    shown[shown.length - 1] = truncateToWidth(ctx, last + "…", w - padding * 2);
  }
  for (const line of shown) {
    ctx.fillText(line, x + padding, cy);
    cy += lineHeight;
  }

  // Keywords at bottom
  const kwY = y + h - padding - 18;
  let kwX = x + padding;
  ctx.font = "18px 'Inter', sans-serif";
  for (const kw of p.keywords.slice(0, 3)) {
    const text = `#${kw}`;
    const wText = ctx.measureText(text).width;
    if (kwX + wText + 24 > x + w - padding) break;
    roundRect(ctx, kwX - 8, kwY - 20, wText + 18, 28, 14);
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.fillText(text, kwX + 1, kwY);
    kwX += wText + 28;
  }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  // Mixed CN/EN: try whitespace split first; if a "word" is wider than maxWidth, fall back to per-char.
  const lines: string[] = [];
  const paras = text.split(/\n+/);
  for (const para of paras) {
    if (!para) continue;
    let line = "";
    const tokens = para.split(/(\s+)/);
    for (const tok of tokens) {
      if (ctx.measureText(line + tok).width <= maxWidth) {
        line += tok;
      } else {
        if (ctx.measureText(tok).width > maxWidth) {
          // per-char wrap
          if (line) { lines.push(line); line = ""; }
          for (const ch of tok) {
            if (ctx.measureText(line + ch).width > maxWidth && line) {
              lines.push(line);
              line = ch;
            } else {
              line += ch;
            }
          }
        } else {
          lines.push(line.trimEnd());
          line = tok.trimStart();
        }
      }
    }
    if (line) lines.push(line);
  }
  return lines;
}

function truncateToWidth(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  let t = text;
  while (t.length > 1 && ctx.measureText(t).width > maxWidth) t = t.slice(0, -2) + "…";
  return t;
}

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
