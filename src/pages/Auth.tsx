import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Mail, Lock, User, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Auth = () => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("登录成功 ✨");
        navigate("/");
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: displayName || "旅行者" },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        toast.success("注册成功，请查看邮箱确认 📧");
      }
    } catch (error: any) {
      toast.error(error.message || "操作失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-calm flex flex-col items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl font-bold text-gradient-mystic">心灵密语</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {isLogin ? "欢迎回来，继续你的心灵旅程" : "开启你的心灵探索之旅"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="relative"
            >
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="你的名字"
                className="w-full rounded-xl border border-border bg-card pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-secondary/30"
              />
            </motion.div>
          )}

          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="邮箱地址"
              required
              className="w-full rounded-xl border border-border bg-card pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-secondary/30"
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="密码"
              required
              minLength={6}
              className="w-full rounded-xl border border-border bg-card pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-secondary/30"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-golden py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50 transition-opacity"
          >
            {loading ? "请稍候..." : isLogin ? "登录" : "注册"}
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>

        <button
          onClick={() => setIsLogin(!isLogin)}
          className="mt-6 w-full text-center text-sm text-muted-foreground"
        >
          {isLogin ? "还没有账号？点击注册" : "已有账号？点击登录"}
        </button>
      </motion.div>
    </div>
  );
};

export default Auth;
