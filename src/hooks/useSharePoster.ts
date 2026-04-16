import { useRef, useCallback, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const POSTER_WIDTH = 750;
const POSTER_PADDING = 75;
const CONTENT_WIDTH = POSTER_WIDTH - POSTER_PADDING * 2;

interface PosterConfig {
  title: string;
  subtitle: string;
  description: string;
  bars: { label1: string; label2: string; value: number }[];
  accentColor: string;
  accentColorLight: string;
  icon: string;
  caption: string;
  extraLines?: string[];
  appName?: string;
  imagePrompt?: string;
  preloadedImageUrl?: string;
}

const imageCache = new Map<string, string>();

export function useSharePoster() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [posterDataUrl, setPosterDataUrl] = useState<string | null>(null);
  const [showPosterPreview, setShowPosterPreview] = useState(false);

  const fetchAIImage = useCallback(async (prompt: string): Promise<HTMLImageElement | null> => {
    try {
      const cached = imageCache.get(prompt);
      if (cached) {
        return new Promise((resolve) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = () => resolve(null);
          img.src = cached;
        });
      }

      const { data, error } = await supabase.functions.invoke("generate-poster-image", {
        body: { prompt },
      });
      if (error || !data?.imageUrl) return null;

      imageCache.set(prompt, data.imageUrl);

      return loadImageViaBlobUrl(data.imageUrl);
    } catch {
      return null;
    }
  }, []);

  const generatePoster = useCallback(async (config: PosterConfig) => {
    const aiImagePromise = config.preloadedImageUrl
      ? loadImageViaBlobUrl(config.preloadedImageUrl)
      : config.imagePrompt ? fetchAIImage(config.imagePrompt) : Promise.resolve(null);

    const measureCanvas = document.createElement("canvas");
    measureCanvas.width = POSTER_WIDTH;
    measureCanvas.height = 100;
    const mCtx = measureCanvas.getContext("2d")!;

    mCtx.font = "24px sans-serif";
    const descLineHeight = 38;
    const descMaxWidth = CONTENT_WIDTH - 60;
    const descLines = getWrappedLines(mCtx, config.description, descMaxWidth);
    const descTextHeight = descLines.length * descLineHeight;
    const descCardPadding = 50;
    const descCardHeight = descTextHeight + descCardPadding;

    const barItemHeight = 70;
    const barSectionHeight = 40 + config.bars.length * barItemHeight;

    let extraSectionHeight = 0;
    if (config.extraLines && config.extraLines.length > 0) {
      extraSectionHeight = 30 + config.extraLines.length * 40 + 30;
    }

    const imageSize = 260;
    const imageSectionHeight = config.imagePrompt || config.preloadedImageUrl ? imageSize + 40 : 0;

    const headerHeight = 330;
    const footerHeight = 160;
    const sectionGap = 30;

    const totalHeight = headerHeight
      + imageSectionHeight
      + descCardHeight + sectionGap
      + barSectionHeight + sectionGap
      + extraSectionHeight + (extraSectionHeight > 0 ? sectionGap : 0)
      + footerHeight;

    const POSTER_HEIGHT = Math.max(totalHeight, 1100);

    const canvas = document.createElement("canvas");
    canvas.width = POSTER_WIDTH;
    canvas.height = POSTER_HEIGHT;
    const ctx = canvas.getContext("2d")!;
    canvasRef.current = canvas;

    // Background
    const bgGrad = ctx.createLinearGradient(0, 0, 0, POSTER_HEIGHT);
    bgGrad.addColorStop(0, "#1a1625");
    bgGrad.addColorStop(0.5, "#1e1a2e");
    bgGrad.addColorStop(1, "#12101c");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, POSTER_WIDTH, POSTER_HEIGHT);

    ctx.globalAlpha = 0.06;
    ctx.fillStyle = config.accentColor;
    ctx.beginPath(); ctx.arc(620, 180, 280, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(130, POSTER_HEIGHT * 0.65, 200, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;

    drawGradientLine(ctx, config.accentColor, POSTER_PADDING, 675, 75);

    let y = 100;

    // Icon
    ctx.font = "64px serif";
    ctx.textAlign = "center";
    ctx.fillStyle = "#ffffff";
    ctx.fillText(config.icon, POSTER_WIDTH / 2, y + 60);
    y += 90;

    // Title
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 48px 'DM Serif Display', serif";
    ctx.textAlign = "center";
    const titleText = config.title.length > 12 ? config.title.slice(0, 12) + "…" : config.title;
    ctx.fillText(titleText, POSTER_WIDTH / 2, y + 50);
    y += 70;

    // Subtitle
    ctx.fillStyle = config.accentColor;
    ctx.font = "26px 'Inter', sans-serif";
    ctx.fillText(config.subtitle, POSTER_WIDTH / 2, y + 30);
    y += 50;

    // Divider
    ctx.strokeStyle = config.accentColor;
    ctx.globalAlpha = 0.3;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(220, y); ctx.lineTo(530, y); ctx.stroke();
    ctx.globalAlpha = 1;
    y += 20;

    // AI Image
    const aiImage = await aiImagePromise;
    if (aiImage) {
      const imgX = (POSTER_WIDTH - imageSize) / 2;
      const imgY = y;
      ctx.save();
      roundRect(ctx, imgX, imgY, imageSize, imageSize, 20);
      ctx.clip();
      ctx.drawImage(aiImage, imgX, imgY, imageSize, imageSize);
      ctx.restore();
      ctx.strokeStyle = config.accentColor;
      ctx.globalAlpha = 0.3;
      ctx.lineWidth = 2;
      roundRect(ctx, imgX, imgY, imageSize, imageSize, 20);
      ctx.stroke();
      ctx.globalAlpha = 1;
      y += imageSize + 30;
    }

    // Description Card
    const cardX = 60;
    const cardWidth = POSTER_WIDTH - 120;
    ctx.fillStyle = "rgba(255,255,255,0.05)";
    roundRect(ctx, cardX, y, cardWidth, descCardHeight, 18);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 1;
    roundRect(ctx, cardX, y, cardWidth, descCardHeight, 18);
    ctx.stroke();

    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.font = "24px 'Inter', sans-serif";
    ctx.textAlign = "left";
    let textY = y + 35;
    for (const line of descLines) {
      ctx.fillText(line, cardX + 30, textY);
      textY += descLineHeight;
    }
    y += descCardHeight + sectionGap;

    // Bars Section
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 26px 'DM Serif Display', serif";
    ctx.textAlign = "left";
    ctx.fillText("Dimensions", POSTER_PADDING, y + 20);
    y += 40;

    for (const bar of config.bars) {
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.font = "20px 'Inter', sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(bar.label1, POSTER_PADDING, y + 16);
      if (bar.label2) {
        ctx.textAlign = "right";
        ctx.fillText(bar.label2, POSTER_WIDTH - POSTER_PADDING, y + 16);
      }
      ctx.textAlign = "right";
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.font = "18px 'Inter', sans-serif";
      ctx.fillText(`${bar.value}%`, POSTER_WIDTH - POSTER_PADDING, y + 16);
      y += 26;

      const barWidth = CONTENT_WIDTH;
      ctx.fillStyle = "rgba(255,255,255,0.08)";
      roundRect(ctx, POSTER_PADDING, y, barWidth, 14, 7);
      ctx.fill();

      const fillWidth = barWidth * (bar.value / 100);
      if (fillWidth > 0) {
        const barGrad = ctx.createLinearGradient(POSTER_PADDING, 0, POSTER_PADDING + fillWidth, 0);
        barGrad.addColorStop(0, config.accentColor);
        barGrad.addColorStop(1, config.accentColorLight);
        ctx.fillStyle = barGrad;
        roundRect(ctx, POSTER_PADDING, y, fillWidth, 14, 7);
        ctx.fill();
      }
      y += 14 + 30;
    }

    // Extra Lines
    if (config.extraLines && config.extraLines.length > 0) {
      y += 10;
      const extraCardH = config.extraLines.length * 40 + 30;
      ctx.fillStyle = "rgba(255,255,255,0.04)";
      roundRect(ctx, 60, y, cardWidth, extraCardH, 18);
      ctx.fill();

      ctx.fillStyle = "rgba(255,255,255,0.8)";
      ctx.font = "22px 'Inter', sans-serif";
      ctx.textAlign = "left";
      for (let i = 0; i < config.extraLines.length; i++) {
        const lineText = config.extraLines[i];
        const maxW = cardWidth - 60;
        let displayText = lineText;
        if (ctx.measureText(displayText).width > maxW) {
          while (ctx.measureText(displayText + "…").width > maxW && displayText.length > 0) {
            displayText = displayText.slice(0, -1);
          }
          displayText += "…";
        }
        ctx.fillText(displayText, 90, y + 35 + i * 40);
      }
      y += extraCardH + sectionGap;
    }

    // Caption
    const captionY = Math.max(y + 20, POSTER_HEIGHT - 130);
    ctx.fillStyle = config.accentColor;
    ctx.font = "italic 22px 'DM Serif Display', serif";
    ctx.textAlign = "center";
    const captionText = `"${config.caption}"`;
    let displayCaption = captionText;
    if (ctx.measureText(displayCaption).width > CONTENT_WIDTH) {
      const inner = config.caption.slice(0, 25) + "…";
      displayCaption = `"${inner}"`;
    }
    ctx.fillText(displayCaption, POSTER_WIDTH / 2, captionY);

    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.font = "18px 'Inter', sans-serif";
    ctx.fillText(config.appName || "Soul Sanctuary", POSTER_WIDTH / 2, captionY + 45);

    // Brand CTA
    ctx.fillStyle = "rgba(255,255,255,0.2)";
    ctx.font = "15px 'Inter', sans-serif";
    ctx.fillText("Discover yours \u2192 soulsanctuary.app", POSTER_WIDTH / 2, captionY + 75);

    drawGradientLine(ctx, config.accentColor, POSTER_PADDING, 675, POSTER_HEIGHT - 40);

    return canvas;
  }, [fetchAIImage]);

  const sharePoster = useCallback(async (config: PosterConfig) => {
    try {
      toast.info("Generating your poster…", { duration: 3000 });
      const canvas = await generatePoster(config);

      const dataUrl = canvas.toDataURL("image/png");

      try {
        if (navigator.share && navigator.canShare) {
          const blob = await new Promise<Blob>((resolve) =>
            canvas.toBlob((b) => resolve(b!), "image/png")
          );
          const file = new File([blob], "assessment-result.png", { type: "image/png" });
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              title: config.title,
              text: config.caption,
              files: [file],
            });
            return;
          }
        }
      } catch (shareErr) {
        if ((shareErr as Error).name === "AbortError") return;
      }

      setPosterDataUrl(dataUrl);
      setShowPosterPreview(true);
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        toast.error("Save failed, please try again");
      }
    }
  }, [generatePoster]);

  const closePosterPreview = useCallback(() => {
    setShowPosterPreview(false);
    setPosterDataUrl(null);
  }, []);

  const downloadPoster = useCallback(() => {
    if (!posterDataUrl) return;
    const a = document.createElement("a");
    a.href = posterDataUrl;
    a.download = "assessment-result.png";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success("Poster saved ✨");
  }, [posterDataUrl]);

  return {
    sharePoster,
    generatePoster,
    fetchAIImage,
    posterDataUrl,
    showPosterPreview,
    closePosterPreview,
    downloadPoster,
  };
}

// Helpers

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

function drawGradientLine(ctx: CanvasRenderingContext2D, color: string, x1: number, x2: number, y: number) {
  const grad = ctx.createLinearGradient(x1, 0, x2, 0);
  grad.addColorStop(0, "transparent");
  grad.addColorStop(0.5, color);
  grad.addColorStop(1, "transparent");
  ctx.strokeStyle = grad;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x1, y);
  ctx.lineTo(x2, y);
  ctx.stroke();
}

function getWrappedLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  const chars = text.split("");
  let line = "";
  for (const char of chars) {
    const testLine = line + char;
    if (ctx.measureText(testLine).width > maxWidth && line) {
      lines.push(line);
      line = char;
    } else {
      line = testLine;
    }
  }
  if (line) lines.push(line);
  return lines;
}
