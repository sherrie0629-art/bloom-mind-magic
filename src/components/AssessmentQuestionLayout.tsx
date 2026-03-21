import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface AssessmentQuestionLayoutProps {
  title: string;
  backPath: string;
  questionNumber: number;
  totalQuestions: number;
  loading: boolean;
  loadingMessage?: string;
  question: {
    question: string;
    options: { label: string; text: string }[];
  } | null;
  onAnswer: (option: { label: string; text: string }) => void;
  gradientClass?: string;
}

const defaultLoadingMessages = [
  "正在解读你的选择...",
  "AI 正在深入分析...",
  "为你量身定制下一题...",
  "你的回答很有意思...",
  "让我想想该问你什么...",
];

const AssessmentQuestionLayout = ({
  title,
  backPath,
  questionNumber,
  totalQuestions,
  loading,
  loadingMessage,
  question,
  onAnswer,
  gradientClass = "bg-gradient-golden",
}: AssessmentQuestionLayoutProps) => {
  const navigate = useNavigate();

  const displayLoadingMsg =
    loadingMessage || defaultLoadingMessages[Math.floor(Math.random() * defaultLoadingMessages.length)];

  return (
    <div className="min-h-screen bg-gradient-calm flex flex-col">
      <div className="flex items-center gap-3 px-4 py-3">
        <button onClick={() => navigate(backPath)} className="text-muted-foreground">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        <span className="ml-auto text-xs text-muted-foreground">
          {Math.min(questionNumber, totalQuestions)} / {totalQuestions}
        </span>
      </div>

      {/* Progress */}
      <div className="px-6 mb-4">
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${gradientClass}`}
            animate={{ width: `${Math.min((questionNumber / totalQuestions) * 100, 100)}%` }}
          />
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-center px-6">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col items-center gap-4"
            >
              <Loader2 className="h-8 w-8 animate-spin text-secondary" />
              <p className="text-sm text-muted-foreground text-center leading-relaxed">{displayLoadingMsg}</p>
            </motion.div>
          ) : (
            question && (
              <motion.div
                key={`q-${questionNumber}`}
                initial={{ opacity: 0, x: 40, scale: 0.97 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -30, scale: 0.97 }}
                transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
              >
                <h3 className="font-display text-lg font-semibold text-foreground leading-relaxed mb-6">
                  {question.question}
                </h3>
                <div className="space-y-3">
                  {question.options.map((opt, i) => (
                    <motion.button
                      key={opt.label}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25, delay: i * 0.06 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => onAnswer(opt)}
                      className="flex w-full items-start gap-3 rounded-xl bg-card p-4 text-left shadow-card transition-colors hover:bg-card/80"
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-mystic text-xs font-bold text-primary-foreground">
                        {opt.label}
                      </span>
                      <span className="text-sm text-foreground leading-relaxed pt-0.5">{opt.text}</span>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default AssessmentQuestionLayout;
