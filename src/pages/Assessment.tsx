import { motion } from "framer-motion";
import { Brain, Stars, Compass, Flame } from "lucide-react";
import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/BottomNav";

const tests = [
  {
    id: "mbti",
    icon: Brain,
    title: "MBTI 人格测评",
    desc: "AI 动态出题，精准解读你的性格密码",
    tag: "热门",
    gradient: "bg-gradient-to-br from-indigo to-indigo-light",
    path: "/assessment/mbti",
  },
  {
    id: "bazi",
    icon: Compass,
    title: "八字命理分析",
    desc: "输入出生时辰，解锁你的先天命盘",
    tag: "经典",
    gradient: "bg-gradient-to-br from-secondary to-gold",
    path: "/assessment/bazi",
  },
  {
    id: "zodiac",
    icon: Stars,
    title: "星座运势解读",
    desc: "今日/本周/本月运势全方位解读",
    tag: "每日更新",
    gradient: "bg-gradient-to-br from-lavender to-rose-warm",
    path: "/assessment/zodiac",
  },
  {
    id: "emotion",
    icon: Flame,
    title: "情绪状态评估",
    desc: "快速了解当前情绪健康度",
    tag: "推荐",
    gradient: "bg-gradient-to-br from-rose-warm to-gold",
    path: "/assessment/emotion",
  },
];

const Assessment = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-calm pb-24">
      <div className="px-6 pt-14">
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-display text-2xl font-bold text-foreground"
        >
          心理测评
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mt-1 text-sm text-muted-foreground"
        >
          AI 驱动的智能测评，探索更真实的自己
        </motion.p>
      </div>

      <div className="mt-6 space-y-4 px-6">
        {tests.map((test, i) => (
          <motion.button
            key={test.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 + i * 0.08 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => test.path && navigate(test.path)}
            className="flex w-full items-center gap-4 rounded-2xl bg-card p-4 shadow-card text-left"
          >
            <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl ${test.gradient}`}>
              <test.icon className="h-7 w-7 text-primary-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-display text-sm font-semibold text-foreground">{test.title}</h3>
                <span className="rounded-full bg-secondary/20 px-2 py-0.5 text-[10px] font-medium text-secondary">
                  {test.tag}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">{test.desc}</p>
            </div>
          </motion.button>
        ))}
      </div>

      <BottomNav />
    </div>
  );
};

export default Assessment;
