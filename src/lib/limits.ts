export const PLAN_LIMITS = {
  free: { chat: 20, assessment: 5, deepReport: 0 },
  plus: { chat: 9999, assessment: 9999, deepReport: 1 },
} as const;

export type PlanKey = keyof typeof PLAN_LIMITS;
