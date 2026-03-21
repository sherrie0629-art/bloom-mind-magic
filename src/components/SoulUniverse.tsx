import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { ACHIEVEMENTS } from "@/data/achievements";

interface SoulFragment {
  id: string;
  name: string;
  icon: string;
  color: string;
}

interface Props {
  fragments: SoulFragment[];
  unlockedIds: string[];
}

const SoulUniverse = ({ fragments, unlockedIds }: Props) => {
  const navigate = useNavigate();
  const constellationCount = unlockedIds.length;
  const starCount = fragments.length;

  // Find next closest constellation
  const locked = ACHIEVEMENTS.filter((a) => !unlockedIds.includes(a.id));
  const nextGoal = locked.length > 0 ? locked[0] : null;

  // Show up to 5 recent fragment emojis
  const previewFragments = fragments.slice(0, 5);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
      className="mt-4 px-6"
    >
      <button
        onClick={() => navigate("/soul-map")}
        className="w-full rounded-2xl bg-card shadow-card p-4 flex items-center gap-3 text-left active:scale-[0.98] transition-transform"
      >
        {/* Mini star field */}
        <div className="relative flex-shrink-0 h-14 w-14 rounded-xl overflow-hidden"
          style={{ background: "linear-gradient(135deg, hsl(225 50% 12%), hsl(260 40% 18%))" }}
        >
          {previewFragments.length > 0 ? (
            previewFragments.map((f, i) => {
              const positions = [
                { top: "15%", left: "20%" },
                { top: "55%", left: "60%" },
                { top: "25%", left: "65%" },
                { top: "60%", left: "15%" },
                { top: "40%", left: "40%" },
              ];
              const pos = positions[i];
              return (
                <motion.span
                  key={f.id}
                  animate={{ opacity: [0.6, 1, 0.6] }}
                  transition={{ duration: 2 + i * 0.5, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute text-xs"
                  style={{ top: pos.top, left: pos.left }}
                >
                  {f.icon}
                </motion.span>
              );
            })
          ) : (
            <div className="flex items-center justify-center h-full">
              <span className="text-lg opacity-40">🌌</span>
            </div>
          )}
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <h4 className="font-display text-sm font-semibold text-foreground">灵魂星图</h4>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {starCount > 0
              ? `${starCount} 颗星 · ${constellationCount} 个星座`
              : "开启探索，收集你的第一颗星"}
          </p>
          {nextGoal && starCount > 0 && (
            <p className="text-[10px] text-secondary mt-0.5 truncate">
              下一个星座：{nextGoal.constellation.name}
            </p>
          )}
        </div>

        <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
      </button>
    </motion.div>
  );
};

export default SoulUniverse;
