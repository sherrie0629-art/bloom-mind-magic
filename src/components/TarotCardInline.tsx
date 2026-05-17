import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { useLocale } from "@/hooks/useLocale";

export interface InlineTarotCard {
  cardName: string;
  cardNameCn: string;
  emoji: string;
  isReversed: boolean;
  keywords: string[];
  imageUrl: string | null;
  imageStatus: "ready" | "pending" | "failed";
}

interface Props {
  card: InlineTarotCard | null; // null while loading
}

const TarotCardInline = ({ card }: Props) => {
  const { locale } = useLocale();
  const isZh = locale === "zh";

  // Loading state
  if (!card) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="my-1 w-[200px]"
      >
        <div className="relative aspect-[3/5] rounded-2xl border border-secondary/30 bg-gradient-to-br from-secondary/10 via-primary/5 to-secondary/10 overflow-hidden">
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2.4, repeat: Infinity, ease: "linear" }}
            >
              <Sparkles className="h-8 w-8 text-secondary/70" />
            </motion.div>
            <p className="text-[11px] text-muted-foreground tracking-wide">
              {isZh ? "Luna 正在洗牌…" : "Shuffling the deck…"}
            </p>
          </div>
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent animate-pulse" />
        </div>
      </motion.div>
    );
  }

  const displayName = isZh ? card.cardNameCn : card.cardName;
  const positionLabel = card.isReversed
    ? (isZh ? "逆位" : "Reversed")
    : (isZh ? "正位" : "Upright");

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, rotateY: 90 }}
      animate={{ opacity: 1, scale: 1, rotateY: 0 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className="my-1 w-[200px]"
      style={{ perspective: 1000 }}
    >
      <div className="relative rounded-2xl border-2 border-secondary/40 bg-gradient-to-br from-secondary/15 via-primary/5 to-secondary/15 p-2 shadow-glow">
        {/* Card art */}
        <div className="relative aspect-[3/5] rounded-xl overflow-hidden bg-gradient-to-br from-secondary/20 to-primary/20">
          {card.imageStatus === "ready" && card.imageUrl ? (
            <img
              src={card.imageUrl}
              alt={displayName}
              className={`h-full w-full object-cover transition-transform ${card.isReversed ? "rotate-180" : ""}`}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-5xl">
              <span className={card.isReversed ? "rotate-180 inline-block" : ""}>{card.emoji}</span>
            </div>
          )}
          {/* Position chip */}
          <div className="absolute top-1.5 left-1.5 rounded-full bg-background/85 backdrop-blur px-2 py-0.5">
            <span className={`text-[9px] font-medium ${card.isReversed ? "text-destructive" : "text-secondary"}`}>
              {positionLabel}
            </span>
          </div>
        </div>

        {/* Name */}
        <div className="px-1 pt-2 pb-1 text-center">
          <p className="font-display text-sm font-semibold text-foreground leading-tight">
            {displayName}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5 italic">
            {card.keywords.slice(0, 3).join(" · ")}
          </p>
        </div>
      </div>
    </motion.div>
  );
};

export default TarotCardInline;
