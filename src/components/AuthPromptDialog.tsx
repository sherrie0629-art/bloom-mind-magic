import { useState } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { X, Mail, Lock, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { toast } from "sonner";

interface AuthPromptDialogProps {
  open: boolean;
  reason: string;
  onClose: () => void;
}

const AuthPromptDialog = ({ open, reason, onClose }: AuthPromptDialogProps) => {
  const { t } = useTranslation();
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        const msg = (result.error as any)?.message || String(result.error);
        if (/not supported|not enabled|disabled/i.test(msg)) {
          toast.error(t("auth.googleSignInUnavailable"));
        } else {
          toast.error(msg || t("auth.googleSignInFailed"));
        }
        return;
      }
      if (result.redirected) return;
      onClose();
    } catch (err: any) {
      toast.error(err?.message || t("auth.googleSignInFailed"));
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success(t("auth.welcomeBack"));
        onClose();
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success(t("auth.accountCreated"));
      }
    } catch (error: any) {
      toast.error(error.message || t("auth.actionFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
        >
          <div className="absolute inset-0 bg-black/60" onClick={onClose} />
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="relative z-10 w-full max-w-sm rounded-t-3xl sm:rounded-3xl bg-card p-6 shadow-xl"
          >
            <button onClick={onClose} className="absolute right-4 top-4 text-muted-foreground">
              <X className="h-5 w-5" />
            </button>

            <div className="text-center mb-6">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary/10">
                <span className="text-2xl">✨</span>
              </div>
              <h3 className="font-display text-lg font-bold text-foreground">{t("auth.signInToContinue")}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{reason}</p>
            </div>

            <button
              onClick={handleGoogleLogin}
              className="flex w-full items-center justify-center gap-3 rounded-xl border border-border bg-background py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              {t("auth.googleAccount")}
            </button>

            {!showEmailForm ? (
              <button
                onClick={() => setShowEmailForm(true)}
                className="mt-3 w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {t("auth.useEmailSignIn")}
              </button>
            ) : (
              <motion.form
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                onSubmit={handleEmailSubmit}
                className="mt-4 space-y-3"
              >
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder={t("auth.emailPlaceholder")} required
                    className="w-full rounded-xl border border-border bg-background pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-secondary/30"
                  />
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                    placeholder={t("auth.passwordPlaceholder")} required minLength={6}
                    className="w-full rounded-xl border border-border bg-background pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-secondary/30"
                  />
                </div>
                <button type="submit" disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-golden py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50">
                  {loading ? t("common.pleaseWait") : isLogin ? t("auth.signIn") : t("auth.signUp")}
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => setIsLogin(!isLogin)} className="w-full text-center text-xs text-muted-foreground">
                  {isLogin ? t("auth.noAccountShort") : t("auth.haveAccountShort")}
                </button>
              </motion.form>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AuthPromptDialog;
