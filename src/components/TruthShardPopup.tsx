import { motion, AnimatePresence } from "framer-motion";

interface TruthShardPopupProps {
  shard: { title: string; description: string } | null;
  show: boolean;
  onClose: () => void;
}

const TruthShardPopup = ({ shard, show, onClose }: TruthShardPopupProps) => (
  <AnimatePresence>
    {show && shard && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.6, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="mx-6 max-w-sm rounded-3xl bg-card border border-secondary/30 p-6 text-center shadow-glow"
          onClick={(e) => e.stopPropagation()}
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 400 }}
            className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-mystic"
          >
            <span className="text-3xl">🔮</span>
          </motion.div>
          <h3 className="font-display text-lg font-bold text-foreground">Truth Shard Found!</h3>
          <p className="mt-2 text-base font-semibold text-secondary">{shard.title}</p>
          <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{shard.description}</p>
          <button
            onClick={onClose}
            className="mt-5 rounded-2xl bg-gradient-golden px-6 py-2.5 text-sm font-medium text-primary-foreground active:scale-95 transition-transform"
          >
            Add to Collection ✨
          </button>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

export default TruthShardPopup;
