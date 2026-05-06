import { useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { LOCALE_STORAGE_KEY, type Locale, SUPPORTED_LOCALES } from "@/i18n";

export function useLocale() {
  const { i18n } = useTranslation();
  const { user } = useAuth();

  // Sync from profile on login
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("locale")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      const remote = (data as any)?.locale as string | undefined;
      if (remote && SUPPORTED_LOCALES.includes(remote as Locale) && remote !== i18n.language) {
        await i18n.changeLanguage(remote);
        try { localStorage.setItem(LOCALE_STORAGE_KEY, remote); } catch {}
      }
    })();
    return () => { cancelled = true; };
  }, [user, i18n]);

  const setLocale = useCallback(async (lng: Locale) => {
    await i18n.changeLanguage(lng);
    try { localStorage.setItem(LOCALE_STORAGE_KEY, lng); } catch {}
    if (user) {
      await supabase.from("profiles").update({ locale: lng } as any).eq("user_id", user.id);
    }
  }, [i18n, user]);

  const current = (i18n.resolvedLanguage || i18n.language || "en").startsWith("zh") ? "zh" : "en";
  return { locale: current as Locale, setLocale };
}
