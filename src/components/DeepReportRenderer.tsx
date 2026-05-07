import { useMemo, useRef, useState } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Sparkles, BookOpen, Clock, Camera, Link as LinkIcon, Share2, Loader2 } from "lucide-react";
import { toPng } from "html-to-image";
import { toast } from "sonner";
import { useSharePoster } from "@/hooks/useSharePoster";
import ShareSheet from "@/components/ShareSheet";

interface Section {
  emoji: string;
  title: string;
  body: string;
}

// Split full markdown into H2 sections + a possible preface
function parseSections(md: string): { preface: string; sections: Section[] } {
  const lines = md.split("\n");
  const sections: Section[] = [];
  let preface = "";
  let current: Section | null = null;
  const buf: string[] = [];

  const flush = () => {
    if (current) {
      current.body = buf.join("\n").trim();
      sections.push(current);
    } else {
      preface = buf.join("\n").trim();
    }
    buf.length = 0;
  };

  for (const line of lines) {
    const m = line.match(/^##\s+(.+)$/);
    if (m) {
      flush();
      const headingRaw = m[1].trim();
      // Extract leading emoji (any non-alphanumeric prefix grapheme cluster)
      const em = headingRaw.match(/^(\p{Extended_Pictographic}\uFE0F?)\s*(.*)$/u);
      current = em
        ? { emoji: em[1], title: em[2].trim(), body: "" }
        : { emoji: "✨", title: headingRaw, body: "" };
    } else {
      buf.push(line);
    }
  }
  flush();
  return { preface, sections };
}

// Shared markdown components for body text within each section
const bodyComponents: Components = {
  h1: ({ children }) => (
    <h3 className="font-display text-base font-semibold text-foreground mt-4 mb-2">{children}</h3>
  ),
  h2: ({ children }) => (
    <h3 className="font-display text-base font-semibold text-foreground mt-4 mb-2">{children}</h3>
  ),
  h3: ({ children }) => (
    <h4 className="font-display text-sm font-semibold text-foreground/90 mt-3 mb-1.5">{children}</h4>
  ),
  h4: ({ children }) => (
    <h5 className="text-sm font-semibold text-foreground/90 mt-3 mb-1">{children}</h5>
  ),
  p: ({ children }) => (
    <p className="text-[14px] text-foreground/90 leading-[1.85] my-2.5">{children}</p>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-foreground bg-gold/15 px-1 rounded-sm">{children}</strong>
  ),
  em: ({ children }) => (
    <em className="italic text-secondary/90 underline decoration-dotted decoration-secondary/40 underline-offset-2">
      {children}
    </em>
  ),
  ul: ({ children }) => <ul className="my-2.5 space-y-1.5 pl-1">{children}</ul>,
  ol: ({ children }) => <ol className="my-2.5 space-y-1.5 pl-5 list-decimal marker:text-secondary">{children}</ol>,
  li: ({ children }) => (
    <li className="flex items-start gap-2 text-[14px] text-foreground/90 leading-[1.8]">
      <span className="text-secondary mt-[7px] text-[10px] shrink-0">✦</span>
      <span className="flex-1">{children}</span>
    </li>
  ),
  blockquote: ({ children }) => {
    // Detect a "highlight" quote: starts with 💎 → render as gradient highlight card
    const text = String((Array.isArray(children) ? children : [children])
      .map((c: any) => (typeof c === "string" ? c : c?.props?.children ?? ""))
      .join(""))
      .trim();
    const isHighlight = /^💎/.test(text);
    if (isHighlight) {
      return (
        <div className="my-4 rounded-xl bg-gradient-golden p-[1px] shadow-glow">
          <div className="rounded-[11px] bg-card/95 px-4 py-3 backdrop-blur">
            <p className="font-display text-[15px] leading-snug text-gradient-golden font-semibold">
              {text.replace(/^💎\s*/, "")}
            </p>
          </div>
        </div>
      );
    }
    return (
      <blockquote className="my-3 border-l-2 border-gold/60 bg-muted/40 rounded-r-lg pl-3 pr-2 py-2 text-[13.5px] italic text-foreground/85 leading-relaxed">
        {children}
      </blockquote>
    );
  },
  hr: () => (
    <div className="my-5 flex items-center gap-2">
      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent" />
      <span className="text-gold/70 text-xs">⋄</span>
      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent" />
    </div>
  ),
  code: ({ children }) => (
    <code className="px-1.5 py-0.5 rounded bg-muted text-[12.5px] text-foreground">{children}</code>
  ),
};

interface Props {
  markdown: string;
  typeLabel?: string;
  generatedAt?: string;
}

export default function DeepReportRenderer({ markdown, typeLabel, generatedAt }: Props) {
  const { t, i18n } = useTranslation();
  const { preface, sections } = useMemo(() => parseSections(markdown || ""), [markdown]);
  const { generatePoster } = useSharePoster();

  const sectionRefs = useRef<Array<HTMLDivElement | null>>([]);
  const [savingIdx, setSavingIdx] = useState<number | null>(null);
  const [posterLoading, setPosterLoading] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareImageUrl, setShareImageUrl] = useState<string | null>(null);
  const [shareTitle, setShareTitle] = useState("");

  const topQuotes = useMemo(() => {
    const out: string[] = [];
    const re = /^>\s*💎\s*(.+)$/gm;
    let m: RegExpExecArray | null;
    while ((m = re.exec(markdown || "")) && out.length < 3) {
      out.push(m[1].trim().replace(/[（(]≤?\d+\s*字[）)]/g, ""));
    }
    return out;
  }, [markdown]);

  const wordCount = useMemo(() => {
    const text = (markdown || "").replace(/[#>*\-_`]/g, "");
    const cjk = (text.match(/[\u4e00-\u9fff]/g) || []).length;
    const words = (text.match(/[A-Za-z]+/g) || []).length;
    return cjk + words;
  }, [markdown]);

  const readMin = Math.max(1, Math.round(wordCount / 350));

  const fmtDate = (s?: string) => {
    if (!s) return "";
    const dt = new Date(s);
    const lang = (i18n.resolvedLanguage || i18n.language || "en").startsWith("zh") ? "zh-CN" : "en-US";
    return dt.toLocaleDateString(lang, { year: "numeric", month: "short", day: "numeric" });
  };

  const handleSaveSection = async (idx: number, sectionTitle: string) => {
    const node = sectionRefs.current[idx];
    if (!node) return;
    setSavingIdx(idx);
    try {
      const dataUrl = await toPng(node, {
        pixelRatio: 2,
        backgroundColor: "#faf6ee",
        filter: (n) => !(n instanceof HTMLElement && n.dataset?.exclude === "true"),
      });
      setShareImageUrl(dataUrl);
      setShareTitle(`${typeLabel || ""} · ${sectionTitle}`);
      setShareOpen(true);
    } catch (e) {
      console.error(e);
      toast.error(t("assessmentDetail.deepSaveFail"));
    } finally {
      setSavingIdx(null);
    }
  };

  const handleCopyLink = async (idx: number) => {
    try {
      const url = `${location.origin}${location.pathname}#deep-section-${idx}`;
      await navigator.clipboard.writeText(url);
      toast.success(t("assessmentDetail.deepLinkCopied"));
    } catch {
      toast.error(t("assessmentDetail.deepSaveFail"));
    }
  };

  const handleSharePoster = async () => {
    setPosterLoading(true);
    try {
      const canvas = await generatePoster({
        title: typeLabel || t("assessmentDetail.deepTitle"),
        subtitle: t("assessmentDetail.deepCoverTag", { defaultValue: t("assessmentDetail.deepTitle") }),
        description: topQuotes[0] || t("assessmentDetail.deepCoverSub", { defaultValue: "为你专属生成的深度内在地图" }),
        bars: [],
        accentColor: "#8b5cf6",
        accentColorLight: "#c4b5fd",
        icon: "📜",
        caption: t("assessmentDetail.deepShareCaption"),
        extraLines: topQuotes.slice(1, 3),
      });
      setShareImageUrl(canvas.toDataURL("image/png"));
      setShareTitle(typeLabel || t("assessmentDetail.deepTitle"));
      setShareOpen(true);
    } catch (e) {
      console.error(e);
      toast.error(t("assessmentDetail.deepSaveFail"));
    } finally {
      setPosterLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Cover */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-mystic p-6 text-primary-foreground shadow-card">
        <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-gold/30 blur-2xl" />
        <div className="absolute -bottom-12 -left-8 h-28 w-28 rounded-full bg-rose-warm/30 blur-2xl" />
        <div className="relative">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] opacity-80">
            <Sparkles className="h-3 w-3" />
            <span>{t("assessmentDetail.deepCoverTag", { defaultValue: t("assessmentDetail.deepTitle") })}</span>
          </div>
          <h2 className="font-display text-2xl font-bold mt-2 leading-tight">
            {typeLabel || t("assessmentDetail.deepTitle")}
          </h2>
          <p className="mt-1.5 text-[12.5px] opacity-85 leading-relaxed">
            {t("assessmentDetail.deepCoverSub", { defaultValue: "为你专属生成的深度内在地图" })}
          </p>
          <div className="mt-4 flex flex-wrap gap-2 text-[11px]">
            <span className="inline-flex items-center gap-1 rounded-full bg-white/15 backdrop-blur px-2.5 py-1">
              <BookOpen className="h-3 w-3" /> {wordCount.toLocaleString()} {t("assessmentDetail.deepWords", { defaultValue: "字" })}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-white/15 backdrop-blur px-2.5 py-1">
              <Clock className="h-3 w-3" /> {readMin} {t("assessmentDetail.deepMinRead", { defaultValue: "分钟" })}
            </span>
            {generatedAt && (
              <span className="inline-flex items-center gap-1 rounded-full bg-white/15 backdrop-blur px-2.5 py-1">
                {fmtDate(generatedAt)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* TOC */}
      {sections.length > 1 && (
        <div className="rounded-2xl bg-card p-4 shadow-card">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
            {t("assessmentDetail.deepToc", { defaultValue: "目录" })}
          </p>
          <div className="flex flex-wrap gap-2">
            {sections.map((s, i) => (
              <a
                key={i}
                href={`#deep-section-${i}`}
                className="inline-flex items-center gap-1.5 rounded-full bg-muted/60 hover:bg-secondary/15 transition-colors px-3 py-1.5 text-[12px] text-foreground/85"
              >
                <span>{s.emoji}</span>
                <span>{s.title}</span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Preface (rare) */}
      {preface && (
        <div className="rounded-2xl bg-card p-5 shadow-card">
          <ReactMarkdown components={bodyComponents}>{preface}</ReactMarkdown>
        </div>
      )}

      {/* Sections */}
      {sections.map((s, i) => (
        <motion.div
          key={i}
          id={`deep-section-${i}`}
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.35 }}
          className="rounded-2xl bg-card p-5 shadow-card scroll-mt-20"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-golden text-lg shadow-glow">
              <span>{s.emoji}</span>
            </div>
            <h3 className="font-display text-base font-bold text-foreground leading-tight">
              {s.title}
            </h3>
          </div>
          <div className="h-px bg-gradient-to-r from-gold/40 via-transparent to-transparent mb-2" />
          <ReactMarkdown components={bodyComponents}>{s.body}</ReactMarkdown>
        </motion.div>
      ))}

      {/* Footer signature */}
      <div className="text-center pt-2 pb-1">
        <p className="text-[11px] text-muted-foreground italic">
          {t("assessmentDetail.deepSignature", { defaultValue: "—— 心灵密语 · 为你而写" })}
        </p>
      </div>
    </div>
  );
}
