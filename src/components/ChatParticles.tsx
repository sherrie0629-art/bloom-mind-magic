import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Atmosphere } from "@/lib/parseGameMarkers";

interface Particle {
  id: number;
  x: number;       // start x %
  delay: number;
  duration: number;
  size: number;
  opacity: number;
  drift: number;    // horizontal sway px
}

const PARTICLE_COUNT = 18;

function makeParticles(): Particle[] {
  return Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    delay: Math.random() * 6,
    duration: 4 + Math.random() * 5,
    size: 6 + Math.random() * 10,
    opacity: 0.25 + Math.random() * 0.35,
    drift: -30 + Math.random() * 60,
  }));
}

const atmosphereConfig: Record<
  string,
  { emoji: string; bg: string; glowColor: string }
> = {
  snow: {
    emoji: "❄",
    bg: "linear-gradient(180deg, hsl(210 30% 94%), hsl(220 25% 90%))",
    glowColor: "hsl(210 40% 85% / 0.4)",
  },
  rain: {
    emoji: "💧",
    bg: "linear-gradient(180deg, hsl(215 25% 92%), hsl(220 20% 88%))",
    glowColor: "hsl(215 35% 78% / 0.35)",
  },
  starry: {
    emoji: "✦",
    bg: "linear-gradient(180deg, hsl(240 20% 95%), hsl(260 18% 91%))",
    glowColor: "hsl(260 40% 80% / 0.35)",
  },
  warm: {
    emoji: "✿",
    bg: "linear-gradient(180deg, hsl(38 40% 96%), hsl(35 35% 92%))",
    glowColor: "hsl(38 55% 78% / 0.35)",
  },
  sakura: {
    emoji: "🌸",
    bg: "linear-gradient(180deg, hsl(340 30% 96%), hsl(335 25% 92%))",
    glowColor: "hsl(340 45% 82% / 0.3)",
  },
  storm: {
    emoji: "⚡",
    bg: "linear-gradient(180deg, hsl(250 18% 92%), hsl(260 15% 87%))",
    glowColor: "hsl(250 35% 72% / 0.3)",
  },
};

interface ChatParticlesProps {
  atmosphere: Atmosphere;
  onBgChange?: (bg: string) => void;
}

export default function ChatParticles({ atmosphere, onBgChange }: ChatParticlesProps) {
  const particles = useMemo(makeParticles, []);
  const [active, setActive] = useState<Atmosphere>(null);

  // Debounce atmosphere changes to avoid rapid flicker
  useEffect(() => {
    if (!atmosphere) {
      setActive(null);
      onBgChange?.("");
      return;
    }
    const showTimer = setTimeout(() => {
      setActive(atmosphere);
      const cfg = atmosphereConfig[atmosphere];
      if (cfg) onBgChange?.(cfg.bg);
    }, 300);
    // Auto-hide particles after 5s
    const hideTimer = setTimeout(() => {
      setActive(null);
    }, 5300);
    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, [atmosphere, onBgChange]);

  if (!active) return null;

  const cfg = atmosphereConfig[active];
  if (!cfg) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-10 overflow-hidden">
      {/* Subtle ambient glow */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 1.2 }}
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse 60% 40% at 50% 20%, ${cfg.glowColor}, transparent)`,
        }}
      />

      {/* Particles */}
      <AnimatePresence>
        {particles.map((p) => (
          <motion.span
            key={p.id}
            initial={{ opacity: 0, y: -20, x: `${p.x}vw` }}
            animate={{
              opacity: [0, p.opacity, p.opacity, 0],
              y: ["0vh", "100vh"],
              x: [`${p.x}vw`, `${p.x + p.drift * 0.3}vw`],
            }}
            transition={{
              duration: p.duration,
              delay: p.delay,
              repeat: Infinity,
              ease: "linear",
            }}
            className="absolute top-0 select-none"
            style={{ fontSize: p.size }}
          >
            {cfg.emoji}
          </motion.span>
        ))}
      </AnimatePresence>
    </div>
  );
}
