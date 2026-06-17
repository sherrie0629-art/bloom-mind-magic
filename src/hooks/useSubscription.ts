import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

// NOTE: Payments have been removed from this project (open / remix-friendly build).
// Every signed-in user is treated as "plus" with unlimited usage.
// `user_subscriptions` and `usage_tracking` tables still exist in the database,
// but they are no longer used to gate features. We keep the public hook shape
// so existing callers (Profile, DeepReportUnlock, etc.) don't need to change.

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

const INF = Number.POSITIVE_INFINITY;

export function useSubscription(userId: string | undefined, _createdAt?: string) {
  const [state, setState] = useState<SubscriptionState>({
    plan: "plus",
    billingPeriod: "monthly",
    expiresAt: null,
    chatCount: 0,
    assessmentCount: 0,
    deepReportCount: 0,
    chatLimit: INF,
    assessmentLimit: INF,
    deepReportLimit: INF,
    freeTrialExpired: false,
    freeTrialDaysLeft: 9999,
    isLoading: false,
  });

  const load = useCallback(async () => {
    if (!userId) return;
    const today = new Date().toISOString().split("T")[0];
    const { data: usage } = await (supabase as any)
      .from("usage_tracking")
      .select("chat_count, assessment_count, deep_report_count")
      .eq("user_id", userId)
      .eq("track_date", today)
      .single();
    setState((s) => ({
      ...s,
      chatCount: usage?.chat_count || 0,
      assessmentCount: usage?.assessment_count || 0,
      deepReportCount: usage?.deep_report_count || 0,
    }));
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const bumpUsage = useCallback(
    async (column: "chat_count" | "assessment_count" | "deep_report_count") => {
      if (!userId) return false;
      const today = new Date().toISOString().split("T")[0];
      const { data: existing } = await (supabase as any)
        .from("usage_tracking")
        .select(`id, ${column}`)
        .eq("user_id", userId)
        .eq("track_date", today)
        .single();

      if (existing) {
        const next = (existing[column] || 0) + 1;
        await (supabase as any)
          .from("usage_tracking")
          .update({ [column]: next })
          .eq("id", existing.id);
        setState((s) => ({
          ...s,
          chatCount: column === "chat_count" ? next : s.chatCount,
          assessmentCount: column === "assessment_count" ? next : s.assessmentCount,
          deepReportCount: column === "deep_report_count" ? next : s.deepReportCount,
        }));
      } else {
        await (supabase as any).from("usage_tracking").insert({
          user_id: userId,
          track_date: today,
          chat_count: column === "chat_count" ? 1 : 0,
          assessment_count: column === "assessment_count" ? 1 : 0,
          deep_report_count: column === "deep_report_count" ? 1 : 0,
        });
        setState((s) => ({
          ...s,
          chatCount: column === "chat_count" ? 1 : s.chatCount,
          assessmentCount: column === "assessment_count" ? 1 : s.assessmentCount,
          deepReportCount: column === "deep_report_count" ? 1 : s.deepReportCount,
        }));
      }
      return true;
    },
    [userId]
  );

  const incrementChat = useCallback(() => bumpUsage("chat_count"), [bumpUsage]);
  const incrementAssessment = useCallback(() => bumpUsage("assessment_count"), [bumpUsage]);
  const incrementDeepReport = useCallback(() => bumpUsage("deep_report_count"), [bumpUsage]);

  return {
    ...state,
    canChat: true,
    canAssess: true,
    canDeepReport: true,
    incrementChat,
    incrementAssessment,
    incrementDeepReport,
    refresh: load,
  };
}
