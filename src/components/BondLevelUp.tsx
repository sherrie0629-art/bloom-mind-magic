import { motion, AnimatePresence } from "framer-motion";
import { BOND_LABELS } from "@/data/agents";

interface BondLevelUpProps {
  show: boolean;
  level: number;
  agentName: string;
  loreText: string;
  onClose: () => void;
}

const BondLevelUp = ({ show, level, agentName, loreText, onClose }: BondLevelUpProps) => {
  const label = BOND_LABELS[level - 1] || "";

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.6, opacity: 0, y: 40 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="mx-6 max-w-sm rounded-3xl bg-card p-6 shadow-glow text-center"
          >
            {/* Stars animation */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
              className="mb-4 text-4xl"
            >
              {"⭐".repeat(level)}
            </motion.div>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-xs font-medium text-secondary"
            >
              羁绊升级
            </motion.p>

            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="mt-1 font-display text-xl font-bold text-foreground"
            >
              {agentName} · {label}
            </motion.h2>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="mt-4 rounded-2xl bg-muted/50 p-4"
            >
              <p className="text-xs text-muted-foreground mb-1">🔓 解锁新故事碎片</p>
              <p className="text-sm italic leading-relaxed text-foreground">
                「{loreText}」
              </p>
            </motion.div>

            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              onClick={onClose}
              className="mt-5 rounded-xl bg-gradient-golden px-6 py-2.5 text-sm font-medium text-primary-foreground"
            >
              继续对话
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default BondLevelUp;
