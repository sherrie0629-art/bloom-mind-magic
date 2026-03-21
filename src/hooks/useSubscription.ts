import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface SubscriptionState {
  plan: "free" | "premium";
  expiresAt: string | null;
  chatCount: number;
  assessmentCount: number;
  chatLimit: number;
  assessmentLimit: number;
  isLoading: boolean;
}

const LIMITS = {
  free: { chat: 20, assessment: 5 },
  premium: { chat: 1000, assessment: 30 },
};

export function useSubscription(userId: string | undefined) {
  const [state, setState] = useState<SubscriptionState>({
    plan: "free",
    expiresAt: null,
    chatCount: 0,
    assessmentCount: 0,
    chatLimit: LIMITS.free.chat,
    assessmentLimit: LIMITS.free.assessment,
    isLoading: true,
  });

  const load = useCallback(async () => {
    if (!userId) {
      setState((s) => ({ ...s, isLoading: false }));
      return;
    }

    const today = new Date().toISOString().split("T")[0];

    // Load subscription and usage in parallel
    const [subRes, usageRes] = await Promise.all([
      (supabase as any)
        .from("user_subscriptions")
        .select("plan, expires_at")
        .eq("user_id", userId)
        .single(),
      (supabase as any)
        .from("usage_tracking")
        .select("chat_count, assessment_count")
        .eq("user_id", userId)
        .eq("track_date", today)
        .single(),
    ]);

    const sub = subRes.data;
    const usage = usageRes.data;
    const now = new Date();
    const isActive =
      sub?.plan === "premium" && sub?.expires_at && new Date(sub.expires_at) > now;
    const plan: "free" | "premium" = isActive ? "premium" : "free";
    const limits = LIMITS[plan];
    setState({
      plan,
      expiresAt: sub?.expires_at || null,
      chatCount: usage?.chat_count || 0,
      assessmentCount: usage?.assessment_count || 0,
      chatLimit: limits.chat,
      assessmentLimit: limits.assessment,
      isLoading: false,
    });
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const incrementChat = useCallback(async () => {
    if (!userId) return false;
    const today = new Date().toISOString().split("T")[0];

    // Upsert usage
    const { data: existing } = await (supabase as any)
      .from("usage_tracking")
      .select("id, chat_count")
      .eq("user_id", userId)
      .eq("track_date", today)
      .single();

    if (existing) {
      await (supabase as any)
        .from("usage_tracking")
        .update({ chat_count: existing.chat_count + 1 })
        .eq("id", existing.id);
      setState((s) => ({ ...s, chatCount: existing.chat_count + 1 }));
    } else {
      await (supabase as any)
        .from("usage_tracking")
        .insert({ user_id: userId, track_date: today, chat_count: 1, assessment_count: 0 });
      setState((s) => ({ ...s, chatCount: 1 }));
    }
    return true;
  }, [userId]);

  const incrementAssessment = useCallback(async () => {
    if (!userId) return false;
    const today = new Date().toISOString().split("T")[0];

    const { data: existing } = await (supabase as any)
      .from("usage_tracking")
      .select("id, assessment_count")
      .eq("user_id", userId)
      .eq("track_date", today)
      .single();

    if (existing) {
      await (supabase as any)
        .from("usage_tracking")
        .update({ assessment_count: existing.assessment_count + 1 })
        .eq("id", existing.id);
      setState((s) => ({ ...s, assessmentCount: existing.assessment_count + 1 }));
    } else {
      await (supabase as any)
        .from("usage_tracking")
        .insert({ user_id: userId, track_date: today, chat_count: 0, assessment_count: 1 });
      setState((s) => ({ ...s, assessmentCount: 1 }));
    }
    return true;
  }, [userId]);

  const canChat = state.chatCount < state.chatLimit;
  const canAssess = state.assessmentCount < state.assessmentLimit;

  return {
    ...state,
    canChat,
    canAssess,
    incrementChat,
    incrementAssessment,
    refresh: load,
  };
}
