import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PLAN_LIMITS as LIMITS } from "@/lib/limits";

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
  freeTrialExpired: boolean;
  freeTrialDaysLeft: number;
  isLoading: boolean;
}

const FREE_TRIAL_DAYS = 30;

export function useSubscription(userId: string | undefined, createdAt?: string) {
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
    freeTrialExpired: false,
    freeTrialDaysLeft: FREE_TRIAL_DAYS,
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

    // Calculate free trial status
    let freeTrialExpired = false;
    let freeTrialDaysLeft = FREE_TRIAL_DAYS;
    if (plan === "free" && createdAt) {
      const daysSinceCreation = Math.floor(
        (now.getTime() - new Date(createdAt).getTime()) / 86400000
      );
      freeTrialDaysLeft = Math.max(0, FREE_TRIAL_DAYS - daysSinceCreation);
      freeTrialExpired = freeTrialDaysLeft <= 0;
    }

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
      freeTrialExpired,
      freeTrialDaysLeft,
      isLoading: false,
    });
  }, [userId, createdAt]);

  useEffect(() => {
    load();
  }, [load]);

  // Realtime: refresh when this user's subscription row changes (e.g. after webhook)
  const loadRef = useRef(load);
  useEffect(() => {
    loadRef.current = load;
  }, [load]);

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`user_subscriptions:${userId}:${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes" as any,
        {
          event: "*",
          schema: "public",
          table: "user_subscriptions",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          loadRef.current();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

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

  const canChat = !state.freeTrialExpired && state.chatCount < state.chatLimit;
  const canAssess = !state.freeTrialExpired && state.assessmentCount < state.assessmentLimit;
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
