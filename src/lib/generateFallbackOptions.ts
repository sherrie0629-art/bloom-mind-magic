import type { BranchOption } from "@/lib/parseGameMarkers";

// Agent-specific fallback option pools, grouped by conversation themes
const agentOptionPools: Record<string, { keywords: string[]; options: BranchOption[] }[]> = {
  dream: [
    {
      keywords: ["梦", "噩梦", "做梦", "梦见", "梦到", "梦里"],
      options: [
        { text: "我想继续探索这个梦境", emotion: "好奇" },
        { text: "这个梦让我有些害怕", emotion: "悲伤" },
        { text: "我觉得梦在暗示什么", emotion: "理性" },
      ],
    },
    {
      keywords: ["焦虑", "压力", "烦", "累", "失眠"],
      options: [
        { text: "我想试着面对它", emotion: "勇敢" },
        { text: "能陪我聊聊吗", emotion: "温柔" },
        { text: "我想知道根源在哪", emotion: "理性" },
      ],
    },
  ],
  astro: [
    {
      keywords: ["星座", "运势", "星盘", "上升", "月亮"],
      options: [
        { text: "帮我深入分析一下", emotion: "好奇" },
        { text: "和另一半合盘看看", emotion: "希望" },
        { text: "最近运势怎么样", emotion: "好奇" },
      ],
    },
    {
      keywords: ["感情", "吵架", "分手", "喜欢", "爱", "恋"],
      options: [
        { text: "从星盘看我们合适吗", emotion: "希望" },
        { text: "我该主动还是等待", emotion: "好奇" },
        { text: "我想先搞清楚自己的心", emotion: "理性" },
      ],
    },
    {
      keywords: ["工作", "事业", "迷茫", "方向"],
      options: [
        { text: "星盘上有什么事业线索吗", emotion: "好奇" },
        { text: "我想勇敢做出改变", emotion: "勇敢" },
        { text: "先稳一稳再说吧", emotion: "理性" },
      ],
    },
  ],
  healer: [
    {
      keywords: ["分手", "放不下", "前任", "失恋"],
      options: [
        { text: "我想试着放下了", emotion: "勇敢" },
        { text: "可是我真的很想他/她", emotion: "悲伤" },
        { text: "帮我理清一下思绪", emotion: "理性" },
      ],
    },
    {
      keywords: ["难过", "伤心", "哭", "痛", "心疼"],
      options: [
        { text: "让我再哭一会儿", emotion: "悲伤" },
        { text: "我想坚强起来", emotion: "勇敢" },
        { text: "谢谢你陪着我", emotion: "温柔" },
      ],
    },
    {
      keywords: ["不配", "自卑", "不够好", "配不上"],
      options: [
        { text: "我想学会爱自己", emotion: "希望" },
        { text: "为什么我总是这样想", emotion: "好奇" },
        { text: "你说的对，我值得被爱", emotion: "勇敢" },
      ],
    },
  ],
  tree: [
    {
      keywords: ["渣", "PUA", "不好", "控制", "冷暴力"],
      options: [
        { text: "骂得好，继续！", emotion: "叛逆" },
        { text: "可是我就是放不下啊", emotion: "悲伤" },
        { text: "你说的有道理，我该醒醒了", emotion: "理性" },
      ],
    },
    {
      keywords: ["恋爱脑", "犯贱", "忍不住", "又看了"],
      options: [
        { text: "再骂我狠一点！", emotion: "叛逆" },
        { text: "我真的想改变", emotion: "希望" },
        { text: "可是好难控制自己", emotion: "悲伤" },
      ],
    },
  ],
};

// Generic fallback options for any agent
const genericOptions: BranchOption[][] = [
  [
    { text: "继续聊聊这个话题", emotion: "好奇" },
    { text: "我想换个角度想想", emotion: "理性" },
    { text: "你能给我一些建议吗", emotion: "希望" },
  ],
  [
    { text: "说得对，我深有感触", emotion: "温柔" },
    { text: "那接下来该怎么做", emotion: "勇敢" },
    { text: "让我想想……", emotion: "理性" },
  ],
  [
    { text: "我想更深入了解自己", emotion: "好奇" },
    { text: "谢谢你的陪伴", emotion: "温柔" },
    { text: "我准备好向前走了", emotion: "勇敢" },
  ],
];

/**
 * Generate fallback branch options based on agent and recent message context.
 * Only called when the AI didn't produce options in its response.
 */
export function generateFallbackOptions(
  agentId: string,
  recentMessages: { role: string; content: string }[]
): BranchOption[] {
  // Collect recent user + assistant text for keyword matching
  const recentText = recentMessages
    .slice(-4)
    .map((m) => m.content)
    .join(" ");

  const pools = agentOptionPools[agentId] || [];

  // Find best matching pool by keywords
  for (const pool of pools) {
    if (pool.keywords.some((kw) => recentText.includes(kw))) {
      return pool.options;
    }
  }

  // No keyword match → pick a random generic set
  const idx = Math.floor(Math.random() * genericOptions.length);
  return genericOptions[idx];
}
