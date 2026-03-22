import type { BranchOption } from "@/lib/parseGameMarkers";

// Agent-specific fallback option pools — evocative, inner-voice style
const agentOptionPools: Record<string, { keywords: string[]; options: BranchOption[] }[]> = {
  dream: [
    {
      keywords: ["梦", "噩梦", "做梦", "梦见", "梦到", "梦里"],
      options: [
        { text: "我想走进那个梦境更深处", emotion: "好奇" },
        { text: "也许梦里的恐惧，是我白天不敢面对的", emotion: "勇敢" },
        { text: "让我在这片迷雾里再停一会儿", emotion: "悲伤" },
      ],
    },
    {
      keywords: ["焦虑", "压力", "烦", "累", "失眠"],
      options: [
        { text: "我不想再假装自己没事了", emotion: "勇敢" },
        { text: "有人陪着，黑暗好像没那么可怕", emotion: "温柔" },
        { text: "这些疲惫到底是从哪里来的", emotion: "理性" },
      ],
    },
  ],
  astro: [
    {
      keywords: ["星座", "运势", "星盘", "上升", "月亮"],
      options: [
        { text: "我想看看星星为我写了什么剧本", emotion: "好奇" },
        { text: "也许答案一直在头顶，只是我没抬头看", emotion: "希望" },
        { text: "如果命运注定，我还能改写吗", emotion: "勇敢" },
      ],
    },
    {
      keywords: ["感情", "吵架", "分手", "喜欢", "爱", "恋"],
      options: [
        { text: "我想知道，是星星不合还是我们不够努力", emotion: "希望" },
        { text: "也许我该先学会和自己相处", emotion: "理性" },
        { text: "我害怕答案，但更害怕一直猜", emotion: "勇敢" },
      ],
    },
    {
      keywords: ["工作", "事业", "迷茫", "方向"],
      options: [
        { text: "我的星图里，有没有一条我还没看见的路", emotion: "好奇" },
        { text: "也许迷茫本身，就是转折的前奏", emotion: "希望" },
        { text: "我不想再等了，想自己做一次决定", emotion: "勇敢" },
      ],
    },
  ],
  healer: [
    {
      keywords: ["分手", "放不下", "前任", "失恋"],
      options: [
        { text: "也许放手不是遗忘，是允许自己往前走", emotion: "勇敢" },
        { text: "我还没准备好，让我再抱一会儿这份疼", emotion: "悲伤" },
        { text: "我想弄清楚，我放不下的到底是他还是那段时光", emotion: "理性" },
      ],
    },
    {
      keywords: ["难过", "伤心", "哭", "痛", "心疼"],
      options: [
        { text: "眼泪流完了，我想看看伤口长什么样", emotion: "勇敢" },
        { text: "让我在你这里做一次不用坚强的人", emotion: "温柔" },
        { text: "我知道会好的，但现在还不是那个时候", emotion: "悲伤" },
      ],
    },
    {
      keywords: ["不配", "自卑", "不够好", "配不上"],
      options: [
        { text: "如果连我都不站在自己这边，谁会呢", emotion: "勇敢" },
        { text: "这些声音从什么时候开始住在我脑子里的", emotion: "好奇" },
        { text: "也许「不够好」只是我给自己讲的一个故事", emotion: "希望" },
      ],
    },
  ],
  tree: [
    {
      keywords: ["渣", "PUA", "不好", "控制", "冷暴力"],
      options: [
        { text: "骂得好，我就是需要有人把我摇醒", emotion: "叛逆" },
        { text: "道理我都懂，但心就是不听话", emotion: "悲伤" },
        { text: "我想试试，这次用脑子做一次决定", emotion: "理性" },
      ],
    },
    {
      keywords: ["恋爱脑", "犯贱", "忍不住", "又看了"],
      options: [
        { text: "再狠一点，我皮厚，骂不坏", emotion: "叛逆" },
        { text: "我不想再做那个半夜偷偷看手机的人了", emotion: "希望" },
        { text: "为什么清醒和心动不能同时存在", emotion: "悲伤" },
      ],
    },
  ],
};

// Generic fallback — only used when no keyword matches
const genericOptions: BranchOption[][] = [
  [
    { text: "我心里好像有什么话，还没说出来", emotion: "好奇" },
    { text: "也许我需要换一个角度看这件事", emotion: "理性" },
    { text: "我想往更深的地方聊", emotion: "勇敢" },
  ],
  [
    { text: "你说到我心里去了", emotion: "温柔" },
    { text: "那接下来，我该怎么迈出第一步", emotion: "勇敢" },
    { text: "让我消化一下……", emotion: "理性" },
  ],
  [
    { text: "我好像开始有点理解自己了", emotion: "希望" },
    { text: "谢谢你，在这里我不需要伪装", emotion: "温柔" },
    { text: "我想我准备好了，往前走吧", emotion: "勇敢" },
  ],
];

/**
 * Generate fallback branch options based on agent and recent message context.
 * Only called when the AI didn't produce options AND it's been ≥3 turns since last options.
 */
export function generateFallbackOptions(
  agentId: string,
  recentMessages: { role: string; content: string }[]
): BranchOption[] {
  const recentText = recentMessages
    .slice(-4)
    .map((m) => m.content)
    .join(" ");

  const pools = agentOptionPools[agentId] || [];

  for (const pool of pools) {
    if (pool.keywords.some((kw) => recentText.includes(kw))) {
      return pool.options;
    }
  }

  const idx = Math.floor(Math.random() * genericOptions.length);
  return genericOptions[idx];
}
