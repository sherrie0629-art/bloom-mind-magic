import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import AuthPromptDialog from "@/components/AuthPromptDialog";
import { toast } from "sonner";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAnonymous: boolean;
  signOut: () => Promise<void>;
  promptLogin: (reason: string) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  isAnonymous: true,
  signOut: async () => {},
  promptLogin: () => {},
});

export const useAuth = () => useContext(AuthContext);

/**
 * Consume OAuth callback parameters from the URL (if present).
 * Handles both PKCE (?code=...) and implicit (#access_token=...) flows,
 * as well as error returns. Returns true if a callback was processed
 * (regardless of success), so the caller can skip the initial getSession race.
 */
const consumeOAuthCallback = async (): Promise<boolean> => {
  if (typeof window === "undefined") return false;

  const url = new URL(window.location.href);
  const hash = window.location.hash.startsWith("#")
    ? window.location.hash.slice(1)
    : window.location.hash;
  const hashParams = new URLSearchParams(hash);

  const code = url.searchParams.get("code");
  const errorParam = url.searchParams.get("error") || hashParams.get("error");
  const errorDescription =
    url.searchParams.get("error_description") || hashParams.get("error_description");
  const accessToken = hashParams.get("access_token");
  const refreshToken = hashParams.get("refresh_token");

  const cleanUrl = () => {
    const cleaned = new URL(window.location.href);
    ["code", "state", "error", "error_description", "provider_token", "scope"].forEach((k) =>
      cleaned.searchParams.delete(k)
    );
    cleaned.hash = "";
    window.history.replaceState({}, document.title, cleaned.pathname + cleaned.search);
  };

  // Error return from provider
  if (errorParam) {
    toast.error(errorDescription || `登录失败：${errorParam}`);
    cleanUrl();
    return true;
  }

  // PKCE flow: exchange code for session
  if (code) {
    try {
      const { error } = await supabase.auth.exchangeCodeForSession(window.location.href);
      if (error) throw error;
      toast.success("登录成功 ✨");
    } catch (err: any) {
      toast.error(err?.message || "Google 登录回调处理失败，请重试");
    } finally {
      cleanUrl();
    }
    return true;
  }

  // Implicit flow: tokens directly in hash
  if (accessToken && refreshToken) {
    try {
      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (error) throw error;
      toast.success("登录成功 ✨");
    } catch (err: any) {
      toast.error(err?.message || "Google 登录回调处理失败，请重试");
    } finally {
      cleanUrl();
    }
    return true;
  }

  return false;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [loginPrompt, setLoginPrompt] = useState({ open: false, reason: "" });

  useEffect(() => {
    let mounted = true;

    // Set up listener BEFORE any async work, per Supabase guidance.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      if (session?.user) {
        setLoginPrompt({ open: false, reason: "" });
      }
    });

    // Bootstrap: consume any OAuth callback params first, then read session.
    (async () => {
      try {
        await consumeOAuthCallback();
      } catch {
        // swallow — already toasted inside
      }
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    })();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const promptLogin = useCallback((reason: string) => {
    setLoginPrompt({ open: true, reason });
  }, []);

  const isAnonymous = !user;

  return (
    <AuthContext.Provider value={{ user, session, loading, isAnonymous, signOut, promptLogin }}>
      {children}
      <AuthPromptDialog
        open={loginPrompt.open}
        reason={loginPrompt.reason}
        onClose={() => setLoginPrompt({ open: false, reason: "" })}
      />
    </AuthContext.Provider>
  );
};
