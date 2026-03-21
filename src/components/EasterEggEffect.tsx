import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface EasterEggEffectProps {
  show: boolean;
  onComplete: () => void;
}

function makeOrbs(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: 50 + (Math.random() - 0.5) * 30,
    y: 50 + (Math.random() - 0.5) * 20,
    angle: (i / count) * 360,
    distance: 80 + Math.random() * 120,
    size: 4 + Math.random() * 8,
    delay: Math.random() * 0.4,
    hue: 250 + Math.random() * 60,
  }));
}

export default function EasterEggEffect({ show, onComplete }: EasterEggEffectProps) {
  const orbs = useMemo(() => makeOrbs(24), []);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (show) {
      setVisible(true);
      const t = setTimeout(() => {
        setVisible(false);
        onComplete();
      }, 3500);
      return () => clearTimeout(t);
    }
  }, [show, onComplete]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center"
        >
          {/* Overlay tint */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.45 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="absolute inset-0"
            style={{ background: "radial-gradient(ellipse at center, hsl(260 50% 20% / 0.7), hsl(220 40% 8% / 0.85))" }}
          />

          {/* Central glow pulse */}
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: [0, 1.8, 1.2], opacity: [0, 0.9, 0.6] }}
            exit={{ scale: 2.5, opacity: 0 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            className="absolute rounded-full"
            style={{
              width: 120,
              height: 120,
              background: "radial-gradient(circle, hsl(280 60% 70% / 0.6), hsl(260 50% 50% / 0.2), transparent)",
              filter: "blur(20px)",
            }}
          />

          {/* Particle burst */}
          {orbs.map((orb) => {
            const rad = (orb.angle * Math.PI) / 180;
            const tx = Math.cos(rad) * orb.distance;
            const ty = Math.sin(rad) * orb.distance;
            return (
              <motion.div
                key={orb.id}
                initial={{ x: 0, y: 0, scale: 0, opacity: 0 }}
                animate={{
                  x: [0, tx * 0.4, tx],
                  y: [0, ty * 0.4, ty],
                  scale: [0, 1.5, 0],
                  opacity: [0, 1, 0],
                }}
                transition={{
                  duration: 2,
                  delay: 0.3 + orb.delay,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="absolute rounded-full"
                style={{
                  width: orb.size,
                  height: orb.size,
                  background: `hsl(${orb.hue} 55% 70%)`,
                  boxShadow: `0 0 ${orb.size * 2}px hsl(${orb.hue} 55% 70% / 0.6)`,
                }}
              />
            );
          })}

          {/* Central icon */}
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: [0, 1.3, 1], rotate: 0 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 flex flex-col items-center gap-3"
          >
            <span className="text-5xl drop-shadow-lg">🔮</span>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.5 }}
              className="text-sm font-medium tracking-wide"
              style={{ color: "hsl(280 60% 85%)", textShadow: "0 0 16px hsl(280 60% 70% / 0.5)" }}
            >
              隐藏记忆已解锁
            </motion.p>
          </motion.div>

          {/* Ripple rings */}
          {[0, 0.3, 0.6].map((delay, i) => (
            <motion.div
              key={i}
              initial={{ scale: 0.3, opacity: 0.6 }}
              animate={{ scale: 3, opacity: 0 }}
              transition={{ duration: 2, delay: 0.2 + delay, ease: "easeOut" }}
              className="absolute rounded-full border"
              style={{
                width: 80,
                height: 80,
                borderColor: `hsl(270 50% 70% / 0.3)`,
              }}
            />
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
