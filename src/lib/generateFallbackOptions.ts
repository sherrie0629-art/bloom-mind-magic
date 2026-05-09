import type { TFunction } from "i18next";
import type { BranchOption } from "@/lib/parseGameMarkers";

interface KeyedOption {
  key: string;
  emotion: BranchOption["emotion"];
}

const agentOptionPools: Record<string, { keywords: string[]; pool: string; options: KeyedOption[] }[]> = {
  barista: [
    {
      pool: "stress",
      keywords: ["stress", "overwhelm", "tired", "exhaust", "burn", "压力", "累", "疲惫", "倦"],
      options: [
        { key: "barista.stress.0", emotion: "brave" },
        { key: "barista.stress.1", emotion: "gentle" },
        { key: "barista.stress.2", emotion: "rational" },
      ],
    },
    {
      pool: "breakup",
      keywords: ["breakup", "ex", "miss", "relationship", "love", "dating", "分手", "前任", "想念", "恋爱"],
      options: [
        { key: "barista.breakup.0", emotion: "brave" },
        { key: "barista.breakup.1", emotion: "sad" },
        { key: "barista.breakup.2", emotion: "rational" },
      ],
    },
    {
      pool: "family",
      keywords: ["brother", "sibling", "family", "advice", "弟弟", "哥哥", "家人", "建议"],
      options: [
        { key: "barista.family.0", emotion: "gentle" },
        { key: "barista.family.1", emotion: "brave" },
        { key: "barista.family.2", emotion: "curious" },
      ],
    },
  ],
  jax: [
    {
      pool: "anxiety",
      keywords: ["anxiety", "panic", "worry", "scared", "fear", "焦虑", "恐慌", "害怕", "担心"],
      options: [
        { key: "jax.anxiety.0", emotion: "curious" },
        { key: "jax.anxiety.1", emotion: "gentle" },
        { key: "jax.anxiety.2", emotion: "brave" },
      ],
    },
    {
      pool: "boundary",
      keywords: ["boundary", "boundaries", "toxic", "people-pleas", "say no", "边界", "讨好", "拒绝"],
      options: [
        { key: "jax.boundary.0", emotion: "brave" },
        { key: "jax.boundary.1", emotion: "curious" },
        { key: "jax.boundary.2", emotion: "rational" },
      ],
    },
    {
      pool: "work",
      keywords: ["work", "career", "burnout", "boss", "job", "工作", "职业", "老板"],
      options: [
        { key: "jax.work.0", emotion: "hopeful" },
        { key: "jax.work.1", emotion: "rational" },
        { key: "jax.work.2", emotion: "brave" },
      ],
    },
    {
      pool: "fire",
      keywords: ["fire", "burn", "smoke", "breathe", "suffocate", "火", "烟", "窒息", "喘"],
      options: [
        { key: "jax.fire.0", emotion: "brave" },
        { key: "jax.fire.1", emotion: "sad" },
        { key: "jax.fire.2", emotion: "curious" },
      ],
    },
  ],
  mystic: [
    {
      pool: "universe",
      keywords: ["universe", "sign", "fate", "meant to be", "destiny", "宇宙", "命运", "信号", "注定"],
      options: [
        { key: "mystic.universe.0", emotion: "brave" },
        { key: "mystic.universe.1", emotion: "curious" },
        { key: "mystic.universe.2", emotion: "hopeful" },
      ],
    },
    {
      pool: "stuck",
      keywords: ["confused", "lost", "stuck", "energy", "blocked", "迷茫", "卡住", "能量", "堵"],
      options: [
        { key: "mystic.stuck.0", emotion: "sad" },
        { key: "mystic.stuck.1", emotion: "brave" },
        { key: "mystic.stuck.2", emotion: "gentle" },
      ],
    },
    {
      pool: "logic",
      keywords: ["logic", "number", "data", "calculate", "probability", "逻辑", "数据", "概率", "计算"],
      options: [
        { key: "mystic.logic.0", emotion: "gentle" },
        { key: "mystic.logic.1", emotion: "curious" },
        { key: "mystic.logic.2", emotion: "brave" },
      ],
    },
  ],
  bestie: [
    {
      pool: "selfWorth",
      keywords: ["ugly", "fat", "hate myself", "insecure", "not enough", "confident", "丑", "胖", "自卑", "不够好"],
      options: [
        { key: "bestie.selfWorth.0", emotion: "rebellious" },
        { key: "bestie.selfWorth.1", emotion: "sad" },
        { key: "bestie.selfWorth.2", emotion: "hopeful" },
      ],
    },
    {
      pool: "nervous",
      keywords: ["interview", "date", "nervous", "presentation", "scared", "面试", "约会", "紧张", "演讲"],
      options: [
        { key: "bestie.nervous.0", emotion: "rebellious" },
        { key: "bestie.nervous.1", emotion: "hopeful" },
        { key: "bestie.nervous.2", emotion: "sad" },
      ],
    },
    {
      pool: "invisible",
      keywords: ["invisible", "ignored", "unseen", "nobody", "alone", "隐形", "忽视", "孤独", "没人"],
      options: [
        { key: "bestie.invisible.0", emotion: "sad" },
        { key: "bestie.invisible.1", emotion: "curious" },
        { key: "bestie.invisible.2", emotion: "brave" },
      ],
    },
  ],
};

const genericPools: KeyedOption[][] = [
  [
    { key: "generic.0.0", emotion: "curious" },
    { key: "generic.0.1", emotion: "rational" },
    { key: "generic.0.2", emotion: "brave" },
  ],
  [
    { key: "generic.1.0", emotion: "gentle" },
    { key: "generic.1.1", emotion: "brave" },
    { key: "generic.1.2", emotion: "rational" },
  ],
  [
    { key: "generic.2.0", emotion: "hopeful" },
    { key: "generic.2.1", emotion: "gentle" },
    { key: "generic.2.2", emotion: "brave" },
  ],
];

export function generateFallbackOptions(
  agentId: string,
  recentMessages: { role: string; content: string }[],
  t: TFunction
): BranchOption[] {
  const recentText = recentMessages
    .slice(-4)
    .map((m) => m.content.toLowerCase())
    .join(" ");

  const pools = agentOptionPools[agentId] || [];

  const render = (opts: KeyedOption[]): BranchOption[] =>
    opts.map((o) => ({
      text: t(`branchFallback.${o.key}`, { defaultValue: o.key }),
      emotion: o.emotion,
    }));

  for (const pool of pools) {
    if (pool.keywords.some((kw) => recentText.includes(kw))) {
      return render(pool.options);
    }
  }

  const idx = Math.floor(Math.random() * genericPools.length);
  return render(genericPools[idx]);
}
