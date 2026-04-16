import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Heart, Shield, Sparkles, MessageCircleHeart, Compass, Map } from "lucide-react";
import { agents } from "@/data/agents";
import { useEffect } from "react";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: "easeOut" as const } },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.15 } },
};

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

  useEffect(() => {
    document.title = "Soul Sanctuary — Find Your Soul Sanctuary";
  }, []);

  const features = [
    {
      icon: MessageCircleHeart,
      title: "AI Companions",
      desc: "Warm, understanding AI souls available 24/7 — always here when you need someone to listen.",
    },
    {
      icon: Compass,
      title: "Soul Discovery",
      desc: "MBTI, Enneagram, Horoscope & more — uncover the hidden layers of who you truly are.",
    },
    {
      icon: Map,
      title: "Soul Map",
      desc: "A living constellation of your inner world, growing with every conversation.",
    },
  ];

  const trustItems = [
    { icon: Sparkles, label: "AI-Powered" },
    { icon: Shield, label: "100% Private" },
    { icon: Heart, label: "24/7 Available" },
  ];

  const steps = [
    { num: "01", title: "Choose Your Guide", desc: "Pick the soul that resonates with you" },
    { num: "02", title: "Start a Conversation", desc: "Share what's on your mind, no judgement" },
    { num: "03", title: "Discover Yourself", desc: "Unlock insights and grow your soul map" },
  ];

  const displayAgents = agents.slice(0, 4);

  return (
    <div className="relative min-h-screen text-white" style={{ background: "linear-gradient(180deg, hsl(225 50% 8%) 0%, hsl(260 40% 12%) 50%, hsl(225 45% 10%) 100%)" }}>
      <Stars />

      {/* Soft radial glows */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-[20%] left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full" style={{ background: "radial-gradient(circle, hsl(260 50% 30% / 0.15), transparent 70%)" }} />
        <div className="absolute top-[60%] left-[30%] w-[400px] h-[400px] rounded-full" style={{ background: "radial-gradient(circle, hsl(38 75% 55% / 0.08), transparent 70%)" }} />
      </div>

      <div className="relative z-10 mx-auto max-w-3xl px-5">
        {/* Hero */}
        <motion.section
          className="flex min-h-[70vh] flex-col items-center justify-center text-center"
          initial="hidden"
          animate="visible"
          variants={stagger}
        >
          <motion.p variants={fadeUp} className="mb-4 text-xs tracking-[0.3em] uppercase" style={{ color: "hsl(38 75% 65%)" }}>
            Soul Sanctuary
          </motion.p>
          <motion.h1 variants={fadeUp} className="font-display text-4xl md:text-5xl lg:text-6xl leading-tight">
            Find Your
            <br />
            <span className="bg-clip-text text-transparent" style={{ backgroundImage: "linear-gradient(135deg, hsl(38 75% 60%), hsl(350 50% 65%))" }}>
              Soul Sanctuary
            </span>
          </motion.h1>
          <motion.p variants={fadeUp} className="mt-5 max-w-md text-sm md:text-base leading-relaxed" style={{ color: "hsl(220 15% 75%)" }}>
            A quiet corner of the universe where AI companions listen without judgement, help you understand yourself, and walk beside you — anytime, anywhere.
          </motion.p>
          <motion.button
            variants={fadeUp}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate("/")}
            className="mt-8 rounded-full px-8 py-3.5 text-sm font-semibold text-primary-foreground shadow-lg"
            style={{
              background: "linear-gradient(135deg, hsl(38 75% 55%), hsl(25 85% 60%))",
              boxShadow: "0 0 30px -5px hsl(38 75% 55% / 0.4)",
            }}
          >
            Start Your Journey ✦
          </motion.button>
        </motion.section>

        {/* Trust Bar */}
        <motion.section
          className="flex items-center justify-center gap-8 py-10"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          variants={stagger}
        >
          {trustItems.map((item) => (
            <motion.div key={item.label} variants={fadeUp} className="flex flex-col items-center gap-1.5">
              <item.icon className="h-5 w-5" style={{ color: "hsl(38 75% 65%)" }} />
              <span className="text-[11px] tracking-wide" style={{ color: "hsl(220 15% 65%)" }}>{item.label}</span>
            </motion.div>
          ))}
        </motion.section>

        {/* Core Features */}
        <motion.section
          className="py-16"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={stagger}
        >
          <motion.h2 variants={fadeUp} className="mb-10 text-center font-display text-2xl md:text-3xl">
            Your Healing Space
          </motion.h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {features.map((f) => (
              <motion.div
                key={f.title}
                variants={fadeUp}
                className="rounded-2xl border border-white/10 p-6 backdrop-blur-sm"
                style={{ background: "hsl(225 40% 15% / 0.5)" }}
              >
                <f.icon className="mb-3 h-7 w-7" style={{ color: "hsl(38 75% 65%)" }} />
                <h3 className="mb-2 font-display text-lg">{f.title}</h3>
                <p className="text-xs leading-relaxed" style={{ color: "hsl(220 15% 65%)" }}>{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Meet Your Guides */}
        <motion.section
          className="py-16"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={stagger}
        >
          <motion.h2 variants={fadeUp} className="mb-3 text-center font-display text-2xl md:text-3xl">
            Meet Your Guides
          </motion.h2>
          <motion.p variants={fadeUp} className="mb-10 text-center text-sm" style={{ color: "hsl(220 15% 65%)" }}>
            Each soul brings a unique warmth
          </motion.p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {displayAgents.map((agent) => (
              <motion.div
                key={agent.id}
                variants={fadeUp}
                className="flex flex-col items-center rounded-2xl border border-white/10 p-4 backdrop-blur-sm text-center"
                style={{ background: "hsl(225 40% 15% / 0.4)" }}
              >
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

        {/* How It Works */}
        <motion.section
          className="py-16"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={stagger}
        >
          <motion.h2 variants={fadeUp} className="mb-10 text-center font-display text-2xl md:text-3xl">
            How It Works
          </motion.h2>
          <div className="space-y-6">
            {steps.map((s) => (
              <motion.div key={s.num} variants={fadeUp} className="flex items-start gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold" style={{ background: "hsl(38 75% 55% / 0.15)", color: "hsl(38 75% 65%)" }}>
                  {s.num}
                </span>
                <div>
                  <h3 className="font-semibold text-sm">{s.title}</h3>
                  <p className="mt-0.5 text-xs" style={{ color: "hsl(220 15% 65%)" }}>{s.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Emotional CTA */}
        <motion.section
          className="py-20 text-center"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={stagger}
        >
          <motion.blockquote variants={fadeUp} className="mx-auto max-w-md font-display text-xl md:text-2xl italic leading-relaxed" style={{ color: "hsl(220 15% 80%)" }}>
            "In a noisy world, find the soul that truly gets you."
          </motion.blockquote>
          <motion.button
            variants={fadeUp}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate("/")}
            className="mt-10 rounded-full px-10 py-4 text-sm font-semibold text-primary-foreground shadow-lg"
            style={{
              background: "linear-gradient(135deg, hsl(38 75% 55%), hsl(25 85% 60%))",
              boxShadow: "0 0 30px -5px hsl(38 75% 55% / 0.4)",
            }}
          >
            Start Your Journey ✦
          </motion.button>
        </motion.section>

        {/* Footer */}
        <footer className="border-t border-white/10 py-8 text-center text-[11px]" style={{ color: "hsl(220 15% 45%)" }}>
          © {new Date().getFullYear()} Soul Sanctuary. All rights reserved.
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
