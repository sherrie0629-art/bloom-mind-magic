import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Flame, Heart, Brain, Zap, Sparkles, CloudRain, Sun, Angry } from "lucide-react";
import type { BranchOption } from "@/lib/parseGameMarkers";

const emotionMap: Record<string, { icon: typeof Flame; bg: string; border: string; text: string; glow: string }> = {
  勇敢: { icon: Flame,    bg: "hsl(25 90% 96%)",  border: "hsl(25 80% 70%)",  text: "hsl(25 70% 40%)",  glow: "hsl(25 80% 70% / 0.3)" },
  温柔: { icon: Heart,    bg: "hsl(340 60% 96%)", border: "hsl(340 50% 72%)", text: "hsl(340 45% 42%)", glow: "hsl(340 50% 72% / 0.3)" },
  理性: { icon: Brain,    bg: "hsl(210 60% 96%)", border: "hsl(210 50% 65%)", text: "hsl(210 45% 38%)", glow: "hsl(210 50% 65% / 0.3)" },
  叛逆: { icon: Zap,      bg: "hsl(270 55% 96%)", border: "hsl(270 45% 65%)", text: "hsl(270 40% 38%)", glow: "hsl(270 45% 65% / 0.3)" },
  好奇: { icon: Sparkles, bg: "hsl(38 75% 96%)",  border: "hsl(38 65% 60%)",  text: "hsl(38 55% 35%)",  glow: "hsl(38 65% 60% / 0.3)" },
  悲伤: { icon: CloudRain, bg: "hsl(200 40% 96%)", border: "hsl(200 35% 65%)", text: "hsl(200 30% 40%)", glow: "hsl(200 35% 65% / 0.3)" },
  希望: { icon: Sun,      bg: "hsl(45 80% 96%)",  border: "hsl(45 70% 58%)",  text: "hsl(45 60% 32%)",  glow: "hsl(45 70% 58% / 0.3)" },
  愤怒: { icon: Angry,    bg: "hsl(0 65% 96%)",   border: "hsl(0 55% 60%)",   text: "hsl(0 50% 38%)",   glow: "hsl(0 55% 60% / 0.3)" },
};

const fallback = emotionMap["好奇"];

interface BranchSelectorProps {
  options: BranchOption[];
  onSelect: (text: string) => void;
}

export default function BranchSelector({ options, onSelect }: BranchSelectorProps) {
  const [selected, setSelected] = useState<number | null>(null);

  const handleClick = (idx: number, text: string) => {
    if (selected !== null) return;
    setSelected(idx);
    setTimeout(() => onSelect(text), 600);
  };

  return (
    <div className="mt-3 flex flex-col gap-2">
      <AnimatePresence>
        {options.map((opt, i) => {
          const style = emotionMap[opt.emotion] || fallback;
          const Icon = style.icon;
          const isSelected = selected === i;
          const isDimmed = selected !== null && !isSelected;

          return (
            <motion.button
              key={i}
              initial={{ opacity: 0, y: 16 }}
              animate={{
                opacity: isDimmed ? 0.35 : 1,
                y: 0,
                scale: isSelected ? 1.03 : 1,
              }}
              transition={{
                delay: i * 0.08,
                duration: 0.4,
                ease: [0.16, 1, 0.3, 1],
              }}
              onClick={() => handleClick(i, opt.text)}
              disabled={selected !== null}
              className="group relative flex items-start gap-3 rounded-2xl px-4 py-3 text-left text-sm transition-shadow"
              style={{
                backgroundColor: style.bg,
                borderWidth: 1,
                borderColor: isSelected ? style.border : `${style.border}50`,
                boxShadow: isSelected ? `0 0 16px ${style.glow}` : "none",
              }}
            >
              <span
                className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg"
                style={{ backgroundColor: `${style.border}25` }}
              >
                <Icon className="h-3.5 w-3.5" style={{ color: style.text }} />
              </span>
              <span className="leading-relaxed" style={{ color: style.text }}>
                {opt.text}
              </span>
              {isSelected && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs"
                >
                  ✓
                </motion.span>
              )}
            </motion.button>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
