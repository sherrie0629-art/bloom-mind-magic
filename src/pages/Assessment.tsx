import { motion } from "framer-motion";
import { Brain, Stars, Target, Flame } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import BottomNav from "@/components/BottomNav";
import DesktopLayout from "@/components/DesktopLayout";
import SEO from "@/components/SEO";

const tests = [
  { id: "mbti", icon: Brain, gradient: "bg-gradient-to-br from-indigo to-indigo-light", path: "/assessment/mbti" },
  { id: "enneagram", icon: Target, gradient: "bg-gradient-to-br from-secondary to-gold", path: "/assessment/enneagram" },
  { id: "zodiac", icon: Stars, gradient: "bg-gradient-to-br from-lavender to-rose-warm", path: "/assessment/zodiac" },
  { id: "emotion", icon: Flame, gradient: "bg-gradient-to-br from-rose-warm to-gold", path: "/assessment/emotion" },
] as const;

const Assessment = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <DesktopLayout>
      <div className="min-h-screen bg-gradient-calm pb-24 md:pb-8">
        <SEO title="Soul Discovery — Soul Sanctuary" description="Discover yourself through MBTI, Enneagram, Horoscope & Emotion assessments powered by AI." />
        <div className="px-6 pt-14 md:pt-10">
          <motion.h1 initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="font-display text-2xl font-bold text-foreground">{t("assessmentList.title")}</motion.h1>
          <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="mt-1 text-sm text-muted-foreground">{t("assessmentList.subtitle")}</motion.p>
        </div>
        <div className="mt-6 space-y-4 px-6 md:grid md:grid-cols-2 md:gap-4 md:space-y-0">
          {tests.map((test, i) => (
            <motion.button key={test.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + i * 0.08 }} whileTap={{ scale: 0.98 }} onClick={() => test.path && navigate(test.path)} className="flex w-full items-center gap-4 rounded-2xl bg-card p-4 shadow-card text-left">
              <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl ${test.gradient}`}><test.icon className="h-7 w-7 text-primary-foreground" /></div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2"><h3 className="font-display text-sm font-semibold text-foreground">{t(`assessmentList.items.${test.id}.title`)}</h3><span className="rounded-full bg-secondary/20 px-2 py-0.5 text-[10px] font-medium text-secondary">{t(`assessmentList.items.${test.id}.tag`)}</span></div>
                <p className="mt-0.5 text-xs text-muted-foreground">{t(`assessmentList.items.${test.id}.desc`)}</p>
              </div>
            </motion.button>
          ))}
        </div>
        <BottomNav />
      </div>
    </DesktopLayout>
  );
};

export default Assessment;
