import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import type { AchievementDef } from "@/data/achievements";

interface Props {
  achievement: AchievementDef | null;
  onClose: () => void;
}

const AchievementUnlock = ({ achievement, onClose }: Props) => {
  const { t } = useTranslation();
  return (
  <AnimatePresence>
    {achievement && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.5, opacity: 0, y: 50 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ type: "spring", damping: 18, stiffness: 280 }}
          onClick={(e) => e.stopPropagation()}
          className="mx-6 max-w-xs w-full rounded-3xl bg-card p-6 shadow-glow text-center"
        >
          {/* Icon burst */}
          <motion.div
            initial={{ scale: 0, rotate: -30 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.15, type: "spring", stiffness: 300 }}
            className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-golden"
          >
            <span className="text-4xl">{achievement.icon}</span>
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="text-xs font-medium text-secondary"
          >
            🏆 {t("achievements.unlocked")}
          </motion.p>

          <motion.h2
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="mt-1 font-display text-xl font-bold text-foreground"
          >
            {t(`achievements.items.${achievement.id}.name`, { defaultValue: achievement.name })}
          </motion.h2>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.45 }}
            className="mt-2 text-sm text-muted-foreground"
          >
            {achievement.description}
          </motion.p>

          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            onClick={onClose}
            className="mt-5 rounded-xl bg-gradient-golden px-6 py-2.5 text-sm font-medium text-primary-foreground active:scale-[0.97]"
          >
            Amazing!
          </motion.button>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

export default AchievementUnlock;
