import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface SubscriptionState {
  plan: "free" | "plus";
  billingPeriod: "monthly" | "yearly";
  expiresAt: string | null;
  chatCount: number;
  assessmentCount: number;
  deepReportCount: number;
  chatLimit: number;
  assessmentLimit: number;
  deepReportLimit: number;
  isLoading: boolean;
}

const LIMITS = {
  free: { chat: 20, assessment: 5, deepReport: 0 },
  plus: { chat: 9999, assessment: 9999, deepReport: 1 },
};

export function useSubscription(userId: string | undefined) {
  const [state, setState] = useState<SubscriptionState>({
    plan: "free",
    billingPeriod: "monthly",
    expiresAt: null,
    chatCount: 0,
    assessmentCount: 0,
    deepReportCount: 0,
    chatLimit: LIMITS.free.chat,
    assessmentLimit: LIMITS.free.assessment,
    deepReportLimit: LIMITS.free.deepReport,
    isLoading: true,
  });

  const load = useCallback(async () => {
    if (!userId) {
      setState((s) => ({ ...s, isLoading: false }));
      return;
    }

    const today = new Date().toISOString().split("T")[0];

    const [subRes, usageRes] = await Promise.all([
      (supabase as any)
        .from("user_subscriptions")
        .select("plan, expires_at, billing_period")
        .eq("user_id", userId)
        .single(),
      (supabase as any)
        .from("usage_tracking")
        .select("chat_count, assessment_count, deep_report_count")
        .eq("user_id", userId)
        .eq("track_date", today)
        .single(),
    ]);

    const sub = subRes.data;
    const usage = usageRes.data;
    const now = new Date();
    const isActive =
      sub?.plan === "plus" && sub?.expires_at && new Date(sub.expires_at) > now;
    const plan: "free" | "plus" = isActive ? "plus" : "free";
    const limits = LIMITS[plan];
    setState({
      plan,
      billingPeriod: sub?.billing_period || "monthly",
      expiresAt: sub?.expires_at || null,
      chatCount: usage?.chat_count || 0,
      assessmentCount: usage?.assessment_count || 0,
      deepReportCount: usage?.deep_report_count || 0,
      chatLimit: limits.chat,
      assessmentLimit: limits.assessment,
      deepReportLimit: limits.deepReport,
      isLoading: false,
    });
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const incrementChat = useCallback(async () => {
    if (!userId) return false;
    const today = new Date().toISOString().split("T")[0];

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
        .insert({ user_id: userId, track_date: today, chat_count: 1, assessment_count: 0, deep_report_count: 0 });
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
        .insert({ user_id: userId, track_date: today, chat_count: 0, assessment_count: 1, deep_report_count: 0 });
      setState((s) => ({ ...s, assessmentCount: 1 }));
    }
    return true;
  }, [userId]);

  const incrementDeepReport = useCallback(async () => {
    if (!userId) return false;
    const today = new Date().toISOString().split("T")[0];

    const { data: existing } = await (supabase as any)
      .from("usage_tracking")
      .select("id, deep_report_count")
      .eq("user_id", userId)
      .eq("track_date", today)
      .single();

    if (existing) {
      await (supabase as any)
        .from("usage_tracking")
        .update({ deep_report_count: existing.deep_report_count + 1 })
        .eq("id", existing.id);
      setState((s) => ({ ...s, deepReportCount: existing.deep_report_count + 1 }));
    } else {
      await (supabase as any)
        .from("usage_tracking")
        .insert({ user_id: userId, track_date: today, chat_count: 0, assessment_count: 0, deep_report_count: 1 });
      setState((s) => ({ ...s, deepReportCount: 1 }));
    }
    return true;
  }, [userId]);

  const canChat = state.chatCount < state.chatLimit;
  const canAssess = state.assessmentCount < state.assessmentLimit;
  const canDeepReport = state.plan === "plus" && state.deepReportCount < state.deepReportLimit;

  return {
    ...state,
    canChat,
    canAssess,
    canDeepReport,
    incrementChat,
    incrementAssessment,
    incrementDeepReport,
    refresh: load,
  };
}
