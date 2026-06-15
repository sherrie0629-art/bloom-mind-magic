import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface SoulMirrorPerspective {
  agentId: string;
  displayName: string;
  emoji: string;
  portrait: string;
  signature: string;
  keywords: string[];
}

export interface SoulMirrorSnapshot {
  nickname: string;
  mbti: string | null;
  zodiac: string | null;
  locale: "zh" | "en";
  generatedAt: string;
}

export interface SoulMirror {
  id: string;
  created_at: string;
  perspectives: SoulMirrorPerspective[];
  user_snapshot: SoulMirrorSnapshot | null;
  poster_url: string | null;
}

export function useSoulMirror(userId: string | undefined) {
  const [mirrors, setMirrors] = useState<SoulMirror[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) {
      setMirrors([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await (supabase as any)
      .from("soul_mirrors")
      .select("id, created_at, perspectives, user_snapshot, poster_url")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    setMirrors((data as SoulMirror[]) || []);
    setLoading(false);
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const generate = useCallback(async (): Promise<
    | { ok: true; mirror: SoulMirror }
    | { ok: false; reason: "requires_pro" | "throttled" | "error"; hoursLeft?: number; message?: string }
  > => {
    try {
      const { data, error } = await supabase.functions.invoke("generate-soul-mirror", { body: {} });
      if (error) {
        // Edge function 4xx/429 errors come through as FunctionsHttpError with the body
        const ctx: any = (error as any).context;
        try {
          const body = ctx?.body ? await ctx.text() : null;
          if (body) {
            const parsed = JSON.parse(body);
            if (parsed?.error === "requires_pro") return { ok: false, reason: "requires_pro" };
            if (parsed?.error === "throttled") return { ok: false, reason: "throttled", hoursLeft: parsed.hoursLeft };
          }
        } catch { /* noop */ }
        return { ok: false, reason: "error", message: error.message };
      }
      if (data?.error === "requires_pro") return { ok: false, reason: "requires_pro" };
      if (data?.error === "throttled") return { ok: false, reason: "throttled", hoursLeft: data.hoursLeft };
      if (!data?.id) return { ok: false, reason: "error" };

      const mirror: SoulMirror = {
        id: data.id,
        created_at: data.createdAt,
        perspectives: data.perspectives,
        user_snapshot: data.userSnapshot,
        poster_url: null,
      };
      setMirrors((prev) => [mirror, ...prev]);
      return { ok: true, mirror };
    } catch (e: any) {
      return { ok: false, reason: "error", message: e?.message };
    }
  }, []);

  const attachPosterUrl = useCallback(async (mirrorId: string, posterUrl: string) => {
    await (supabase as any).from("soul_mirrors").update({ poster_url: posterUrl }).eq("id", mirrorId);
    setMirrors((prev) => prev.map((m) => (m.id === mirrorId ? { ...m, poster_url: posterUrl } : m)));
  }, []);

  return { mirrors, loading, reload: load, generate, attachPosterUrl };
}
