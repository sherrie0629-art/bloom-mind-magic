import { useCallback } from "react";

interface QuoteCardConfig {
  quote: string;
  agentName: string;
  agentTitle: string;
  agentImage: string;
  accentColor: string;
}

const CARD_WIDTH = 750;
const CARD_HEIGHT = 1000;
const PADDING = 60;

export function useQuoteCard() {
  const generateQuoteCard = useCallback(async (config: QuoteCardConfig): Promise<string> => {
    const canvas = document.createElement("canvas");
    canvas.width = CARD_WIDTH;
    canvas.height = CARD_HEIGHT;
    const ctx = canvas.getContext("2d")!;

    // Background
    const bg = ctx.createLinearGradient(0, 0, 0, CARD_HEIGHT);
    bg.addColorStop(0, "#1a1625");
    bg.addColorStop(0.5, "#1e1a2e");
    bg.addColorStop(1, "#12101c");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

    // Accent glow
    ctx.globalAlpha = 0.08;
    ctx.fillStyle = config.accentColor;
    ctx.beginPath();
    ctx.arc(600, 200, 300, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(150, 700, 250, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Big opening quote mark
    ctx.fillStyle = config.accentColor;
    ctx.globalAlpha = 0.15;
    ctx.font = "bold 200px 'DM Serif Display', serif";
    ctx.textAlign = "left";
    ctx.fillText(""", PADDING - 10, 220);
    ctx.globalAlpha = 1;

    // Quote text
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.font = "italic 32px 'DM Serif Display', serif";
    ctx.textAlign = "left";
    const maxWidth = CARD_WIDTH - PADDING * 2;
    const lines = wrapText(ctx, config.quote, maxWidth);
    const lineHeight = 48;
    const textStartY = 300;

    for (let i = 0; i < Math.min(lines.length, 10); i++) {
      ctx.fillText(lines[i], PADDING, textStartY + i * lineHeight);
    }

    // Agent avatar (circle)
    const avatarSize = 56;
    const avatarY = CARD_HEIGHT - 200;
    const avatarX = PADDING;

    try {
      const img = await loadImage(config.agentImage);
      ctx.save();
      ctx.beginPath();
      ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(img, avatarX, avatarY, avatarSize, avatarSize);
      ctx.restore();
    } catch {
      // fallback: colored circle
      ctx.fillStyle = config.accentColor;
      ctx.beginPath();
      ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Agent name + title
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 22px 'Inter', sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`— ${config.agentName}`, avatarX + avatarSize + 16, avatarY + 24);

    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.font = "16px 'Inter', sans-serif";
    ctx.fillText(config.agentTitle, avatarX + avatarSize + 16, avatarY + 48);

    // Divider line
    const divY = CARD_HEIGHT - 120;
    const grad = ctx.createLinearGradient(PADDING, 0, CARD_WIDTH - PADDING, 0);
    grad.addColorStop(0, "transparent");
    grad.addColorStop(0.5, config.accentColor);
    grad.addColorStop(1, "transparent");
    ctx.strokeStyle = grad;
    ctx.globalAlpha = 0.3;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(PADDING, divY);
    ctx.lineTo(CARD_WIDTH - PADDING, divY);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Brand footer
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.font = "16px 'Inter', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Soul Sanctuary · soulsanctuary.app", CARD_WIDTH / 2, CARD_HEIGHT - 50);

    return canvas.toDataURL("image/png");
  }, []);

  return { generateQuoteCard };
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";

  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
