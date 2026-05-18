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

// --- Phrase extraction for dynamic hook ---

// Single CJK chars that are too generic to anchor a phrase
const ZH_STOPWORDS = new Set([
  "我", "你", "他", "她", "它", "的", "了", "是", "在", "和", "与", "也", "都", "就", "还", "但", "因",
  "为", "所", "以", "如", "果", "什", "么", "怎", "样", "这", "那", "个", "些", "一", "二", "没", "有",
  "不", "会", "可", "应", "该", "好", "像", "感", "觉", "得", "知", "道", "想", "要", "把", "被", "让",
  "给", "对", "于", "之", "啊", "呢", "吧", "吗", "呀", "哦", "嗯", "唉", "其", "实", "真", "很", "太",
  "最", "更", "再", "又", "已", "经", "现", "今", "昨", "明", "天", "近", "特", "别", "地", "里", "上",
  "下", "去", "来", "做", "说", "看", "听", "种", "次", "件", "样", "件", "点", "时", "候", "或",
]);

const EN_STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "but", "if", "in", "on", "at", "to", "for", "of", "with", "by", "from",
  "is", "am", "are", "was", "were", "be", "been", "being", "have", "has", "had", "do", "does", "did",
  "will", "would", "could", "should", "can", "may", "might", "must", "i", "you", "he", "she", "it", "we",
  "they", "me", "him", "her", "us", "them", "my", "your", "his", "its", "our", "their", "this", "that",
  "these", "those", "what", "which", "who", "when", "where", "why", "how", "all", "some", "any", "no",
  "not", "just", "really", "very", "so", "too", "also", "only", "feel", "think", "know", "want", "like",
  "get", "go", "going", "make", "made", "kind", "thing", "things", "way", "now", "today",
]);

/**
 * Extract a 2-6 char Chinese phrase (or 1-2 English word phrase) from user text.
 * Heuristic: split by punctuation/whitespace, drop stopwords, prefer the longest remaining run.
 */
function extractKeyPhrase(text: string): string | null {
  const cleaned = text
    .replace(/[【】\[\]（）()「」『』"'`~!@#$%^&*+=<>{}|\\\/?,.，。、；;：:！？\n\r\t]+/g, " ")
    .trim();
  if (!cleaned) return null;

  // Chinese path: split each CJK segment by stopword chars, keep 2-6 char runs
  const cjkSegs = cleaned.match(/[\u4e00-\u9fff]+/g) || [];
  const candidates: string[] = [];
  for (const seg of cjkSegs) {
    let buf = "";
    const flush = () => {
      if (buf.length >= 2 && buf.length <= 6 && !ZH_STOPWORDS.has(buf)) {
        candidates.push(buf);
      }
      buf = "";
    };
    for (const ch of seg) {
      if (ZH_STOPWORDS.has(ch)) {
        flush();
      } else {
        buf += ch;
        if (buf.length === 6) flush();
      }
    }
    flush();
  }
  if (candidates.length > 0) {
    // Prefer longest; ties broken by recency (later in text = more salient)
    candidates.sort((a, b) => (b.length - a.length) || (candidates.lastIndexOf(b) - candidates.lastIndexOf(a)));
    return candidates[0];
  }

  // English path
  const words = cleaned.toLowerCase().split(/\s+/).filter((w) => w.length >= 3 && !EN_STOPWORDS.has(w));
  if (words.length === 0) return null;
  if (words.length >= 2) return words.slice(-2).join(" ");
  return words[0];
}

const HOOK_EMOTIONS: BranchOption["emotion"][] = ["curious", "gentle", "rational"];

function pickRandom<T>(arr: T[], n: number): T[] {
  const copy = [...arr];
  const out: T[] = [];
  while (copy.length > 0 && out.length < n) {
    const idx = Math.floor(Math.random() * copy.length);
    out.push(copy.splice(idx, 1)[0]);
  }
  return out;
}

export function generateFallbackOptions(
  agentId: string,
  recentMessages: { role: string; content: string }[],
  t: TFunction,
  recentlyShown: string[] = []
): BranchOption[] {
  const recentText = recentMessages
    .slice(-4)
    .map((m) => m.content.toLowerCase())
    .join(" ");

  const lastUserMsg = [...recentMessages].reverse().find((m) => m.role === "user")?.content || "";

  const shownSet = new Set(recentlyShown.map((s) => s.trim()));

  const pools = agentOptionPools[agentId] || [];

  const render = (opts: KeyedOption[]): BranchOption[] =>
    opts
      .map((o) => ({
        text: t(`branchFallback.${o.key}`, { defaultValue: o.key }),
        emotion: o.emotion,
      }))
      .filter((o) => !shownSet.has(o.text.trim()));

  // Find matching pool
  let matched: KeyedOption[] | null = null;
  for (const pool of pools) {
    if (pool.keywords.some((kw) => recentText.includes(kw))) {
      matched = pool.options;
      break;
    }
  }
  if (!matched) {
    matched = genericPools[Math.floor(Math.random() * genericPools.length)];
  }

  // Pick up to 2 unseen static options (shuffled)
  let statics = pickRandom(render(matched), 2);

  // If all matched options are already shown, fall back to other pools' lines
  if (statics.length < 2) {
    const allOther: KeyedOption[] = [
      ...pools.flatMap((p) => p.options),
      ...genericPools.flat(),
    ].filter((o) => !matched!.includes(o));
    statics = [...statics, ...pickRandom(render(allOther), 2 - statics.length)];
  }

  // Build dynamic hook from user's last phrase
  const phrase = extractKeyPhrase(lastUserMsg);
  let hook: BranchOption | null = null;
  if (phrase) {
    const hookIdx = Math.floor(Math.random() * 5);
    const hookText = t(`branchFallback.hooks.${hookIdx}`, {
      phrase,
      defaultValue: `'${phrase}'`,
    });
    if (!shownSet.has(hookText.trim())) {
      hook = {
        text: hookText,
        emotion: HOOK_EMOTIONS[Math.floor(Math.random() * HOOK_EMOTIONS.length)],
      };
    }
  }

  const out: BranchOption[] = hook ? [hook, ...statics] : statics;

  // Final safety: if we have <2 options, just return original 3 unfiltered to avoid empty UI
  if (out.length < 2) {
    return matched.map((o) => ({
      text: t(`branchFallback.${o.key}`, { defaultValue: o.key }),
      emotion: o.emotion,
    }));
  }

  // Shuffle final order so hook isn't always first
  return pickRandom(out, out.length).slice(0, 3);
}
