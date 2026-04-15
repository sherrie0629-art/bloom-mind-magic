import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import AuthPromptDialog from "@/components/AuthPromptDialog";

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

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [loginPrompt, setLoginPrompt] = useState({ open: false, reason: "" });

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      // Close login prompt on successful auth
      if (session?.user) {
        setLoginPrompt({ open: false, reason: "" });
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
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
