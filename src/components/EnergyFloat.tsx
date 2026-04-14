import { motion, AnimatePresence } from "framer-motion";
import { Zap } from "lucide-react";

interface EnergyFloatProps {
  gain: number | null;
  show: boolean;
}

const EnergyFloat = ({ gain, show }: EnergyFloatProps) => (
  <AnimatePresence>
    {show && gain && (
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.8 }}
        animate={{ opacity: 1, y: -20, scale: 1 }}
        exit={{ opacity: 0, y: -40 }}
        transition={{ duration: 1.2, ease: "easeOut" }}
        className="pointer-events-none fixed top-24 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1.5 rounded-2xl bg-secondary/90 px-4 py-2 shadow-glow"
      >
        <Zap className="h-4 w-4 text-primary-foreground" />
        <span className="text-sm font-bold text-primary-foreground">+{gain} Vibes</span>
      </motion.div>
    )}
  </AnimatePresence>
);

export default EnergyFloat;
