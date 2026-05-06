import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Heart, Shield, Sparkles, MessageCircleHeart, Compass, Map } from "lucide-react";
import { useTranslation } from "react-i18next";
import { agents } from "@/data/agents";
import SEO from "@/components/SEO";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: "easeOut" as const } },
};

const stagger = { visible: { transition: { staggerChildren: 0.15 } } };

const Stars = () => (
  <div className="pointer-events-none absolute inset-0 overflow-hidden">
    {Array.from({ length: 14 }).map((_, i) => (
      <div
        key={i}
        className="absolute rounded-full bg-white/60"
        style={{
          width: `${1.5 + Math.random() * 2}px`,
          height: `${1.5 + Math.random() * 2}px`,
          top: `${Math.random() * 100}%`,
          left: `${Math.random() * 100}%`,
          animation: `twinkle ${2 + Math.random() * 3}s ease-in-out infinite`,
          animationDelay: `${Math.random() * 3}s`,
        }}
      />
    ))}
  </div>
);

const Welcome = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const features = [
    { icon: MessageCircleHeart, title: t("welcome.features.companion.title"), desc: t("welcome.features.companion.desc") },
    { icon: Compass, title: t("welcome.features.discovery.title"), desc: t("welcome.features.discovery.desc") },
    { icon: Map, title: t("welcome.features.map.title"), desc: t("welcome.features.map.desc") },
  ];

  const trustItems = [
    { icon: Sparkles, label: t("welcome.trust.ai") },
    { icon: Shield, label: t("welcome.trust.private") },
    { icon: Heart, label: t("welcome.trust.always") },
  ];

  const steps = (t("welcome.steps", { returnObjects: true }) as Array<{ title: string; desc: string }>)
    .map((s, i) => ({ num: `0${i + 1}`, ...s }));

  const displayAgents = agents.slice(0, 4);

  return (
    <div className="relative min-h-screen text-white" style={{ background: "linear-gradient(180deg, hsl(225 50% 8%) 0%, hsl(260 40% 12%) 50%, hsl(225 45% 10%) 100%)" }}>
      <SEO
        title={`${t("home.appName")} — ${t("home.tagline")}`}
        description={t("welcome.subline")}
      />
      <Stars />

      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-[20%] left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full" style={{ background: "radial-gradient(circle, hsl(260 50% 30% / 0.15), transparent 70%)" }} />
        <div className="absolute top-[60%] left-[30%] w-[400px] h-[400px] rounded-full" style={{ background: "radial-gradient(circle, hsl(38 75% 55% / 0.08), transparent 70%)" }} />
      </div>

      <div className="relative z-10 mx-auto max-w-3xl px-5">
        <motion.section className="flex min-h-[70vh] flex-col items-center justify-center text-center" initial="hidden" animate="visible" variants={stagger}>
          <motion.p variants={fadeUp} className="mb-4 text-xs tracking-[0.3em] uppercase" style={{ color: "hsl(38 75% 65%)" }}>
            {t("welcome.tag")}
          </motion.p>
          <motion.h1 variants={fadeUp} className="font-display text-4xl md:text-5xl lg:text-6xl leading-tight">
            {t("welcome.headline1")}
            <br />
            <span className="bg-clip-text text-transparent" style={{ backgroundImage: "linear-gradient(135deg, hsl(38 75% 60%), hsl(350 50% 65%))" }}>
              {t("welcome.headline2")}
            </span>
          </motion.h1>
          <motion.p variants={fadeUp} className="mt-5 max-w-md text-sm md:text-base leading-relaxed" style={{ color: "hsl(220 15% 75%)" }}>
            {t("welcome.subline")}
          </motion.p>
          <motion.button variants={fadeUp} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} onClick={() => navigate("/")}
            className="mt-8 rounded-full px-8 py-3.5 text-sm font-semibold text-primary-foreground shadow-lg"
            style={{ background: "linear-gradient(135deg, hsl(38 75% 55%), hsl(25 85% 60%))", boxShadow: "0 0 30px -5px hsl(38 75% 55% / 0.4)" }}>
            {t("welcome.startJourney")}
          </motion.button>
        </motion.section>

        <motion.section className="flex items-center justify-center gap-8 py-10" initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} variants={stagger}>
          {trustItems.map((item) => (
            <motion.div key={item.label} variants={fadeUp} className="flex flex-col items-center gap-1.5">
              <item.icon className="h-5 w-5" style={{ color: "hsl(38 75% 65%)" }} />
              <span className="text-[11px] tracking-wide" style={{ color: "hsl(220 15% 65%)" }}>{item.label}</span>
            </motion.div>
          ))}
        </motion.section>

        <motion.section className="py-16" initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={stagger}>
          <motion.h2 variants={fadeUp} className="mb-10 text-center font-display text-2xl md:text-3xl">{t("welcome.spaceTitle")}</motion.h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {features.map((f) => (
              <motion.div key={f.title} variants={fadeUp} className="rounded-2xl border border-white/10 p-6 backdrop-blur-sm" style={{ background: "hsl(225 40% 15% / 0.5)" }}>
                <f.icon className="mb-3 h-7 w-7" style={{ color: "hsl(38 75% 65%)" }} />
                <h3 className="mb-2 font-display text-lg">{f.title}</h3>
                <p className="text-xs leading-relaxed" style={{ color: "hsl(220 15% 65%)" }}>{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.section>

        <motion.section className="py-16" initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={stagger}>
          <motion.h2 variants={fadeUp} className="mb-3 text-center font-display text-2xl md:text-3xl">{t("welcome.guidesTitle")}</motion.h2>
          <motion.p variants={fadeUp} className="mb-10 text-center text-sm" style={{ color: "hsl(220 15% 65%)" }}>{t("welcome.guidesSub")}</motion.p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {displayAgents.map((agent) => (
              <motion.div key={agent.id} variants={fadeUp} className="flex flex-col items-center rounded-2xl border border-white/10 p-4 backdrop-blur-sm text-center" style={{ background: "hsl(225 40% 15% / 0.4)" }}>
                <div className={`mb-3 h-16 w-16 overflow-hidden rounded-full ${agent.gradient} p-0.5`}>
                  <img src={agent.image} alt={agent.name} className="h-full w-full rounded-full object-cover" style={{ background: "hsl(225 40% 15%)" }} loading="lazy" />
                </div>
                <h3 className="text-sm font-semibold">{agent.name}</h3>
                <p className="mt-0.5 text-[10px]" style={{ color: "hsl(38 75% 65%)" }}>{agent.title}</p>
                <p className="mt-2 text-[11px] leading-relaxed line-clamp-2" style={{ color: "hsl(220 15% 65%)" }}>{agent.description}</p>
              </motion.div>
            ))}
          </div>
        </motion.section>

        <motion.section className="py-16" initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={stagger}>
          <motion.h2 variants={fadeUp} className="mb-10 text-center font-display text-2xl md:text-3xl">{t("welcome.howItWorks")}</motion.h2>
          <div className="space-y-6">
            {steps.map((s) => (
              <motion.div key={s.num} variants={fadeUp} className="flex items-start gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold" style={{ background: "hsl(38 75% 55% / 0.15)", color: "hsl(38 75% 65%)" }}>{s.num}</span>
                <div>
                  <h3 className="font-semibold text-sm">{s.title}</h3>
                  <p className="mt-0.5 text-xs" style={{ color: "hsl(220 15% 65%)" }}>{s.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>

        <motion.section className="py-20 text-center" initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={stagger}>
          <motion.blockquote variants={fadeUp} className="mx-auto max-w-md font-display text-xl md:text-2xl italic leading-relaxed" style={{ color: "hsl(220 15% 80%)" }}>
            {t("welcome.ctaQuote")}
          </motion.blockquote>
          <motion.button variants={fadeUp} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} onClick={() => navigate("/")}
            className="mt-10 rounded-full px-10 py-4 text-sm font-semibold text-primary-foreground shadow-lg"
            style={{ background: "linear-gradient(135deg, hsl(38 75% 55%), hsl(25 85% 60%))", boxShadow: "0 0 30px -5px hsl(38 75% 55% / 0.4)" }}>
            {t("welcome.startJourney")}
          </motion.button>
        </motion.section>

        <footer className="border-t border-white/10 py-8 text-center text-[11px]" style={{ color: "hsl(220 15% 45%)" }}>
          {t("welcome.footer", { y: new Date().getFullYear() })}
        </footer>
      </div>

      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 0.9; }
        }
      `}</style>
    </div>
  );
};

export default Welcome;
