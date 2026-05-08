# 修复 AI 输出语言不跟随用户语言设置的问题

## 根因

排查所有 edge function 调用 AI 的地方：

| Function | 是否接收 locale | 是否在 prompt 强制语言 | 状态 |
|---|---|---|---|
| chat | ✅ | ✅ 中文/英文均有 | OK |
| assessment / assessment-* (mbti/enneagram/zodiac/emotion/compatibility) | ✅ | ✅ 都有 `langInstr` | OK |
| generate-deep-report | ✅ | ✅ | OK |
| generate-soul-fragment | ✅ | ✅ | OK |
| **tarot-draw** | ❌ 完全不接收 | ❌ system + user prompt 全英文 | **本次修复** |
| **summarize-conversation** | ❌ 不接收 | ❌ 全英文 | **本次修复** |
| generate-poster-image | n/a（图片，无文字） | — | OK |

塔罗"今日解读"全英文的根因就是 `tarot-draw` 的 prompt 完全是英文，且没有把用户 locale 传过去——AI 默认输出英文。

`summarize-conversation` 虽然总结只用于后续 chat 的 memory context（不直接给用户看），但中文用户的对话被强制总结成英文后再喂回，会出现 memory 与对话语言不一致、人名 / 情绪词丢味等问题，顺手一起修。

## 修复方案

### 1. `supabase/functions/tarot-draw/index.ts`
- 从 body 解析 `locale`（默认 `"en"`）。
- 系统 prompt + 用户 prompt 改为按 locale 分两套：中文版要求"用简体中文输出"，英文版保持现在的英文版本。
- 中文版示例（结构对齐英文版）：
  - system：「你是一位融合荣格心理学和塔罗智慧的灵魂向导，解读温暖、洞察、有心理依据。请始终用简体中文输出。」
  - user：「我抽到了"${cardName}"（${正位/逆位}）。关键词：${keywordsStr}。请用中文给我今天的心理解读：1) 简述这张牌的心理象征(2-3 句)；2) 基于${正位/逆位}含义，给今日情绪洞察(3-4 句)；3) 整体不超过 200 字，温暖且有深度；4) 另起一行，以"💡 "开头给一条 15 字内的可执行小行动。直接输出解读，不要标题或分隔符。」
- `position` 标签按 locale 本地化（`正位 / 逆位`）。
- 兜底文案 `interpretation` / `actionTip` / `cardName` 同样按 locale 给中文兜底。
- `existing` 分支也兼容旧记录：如果用户语言是中文但 `existing.interpretation` 看上去是英文（简易判断：不含中文字符），不影响存量数据，原样返回——不主动改写已写入的历史。

### 2. `src/pages/DailyTarot.tsx`
- 在 `handleDraw` 调用 `supabase.functions.invoke("tarot-draw", …)` 时，把 `locale` 一起带上：从 `useLocale()` 取（与其他测评流程一致）。
- 轮询用的 `tarot-draw-status` 不需要改（它只读取已写入的字段）。

### 3. `supabase/functions/summarize-conversation/index.ts`
- 从 body 接收 `locale`（默认 `"en"`）。
- 在 system prompt 末尾追加：中文 → 「所有 summary、key_topics、memory content 都必须用简体中文输出。」；英文 → 「All summary, key_topics, memory content must be in natural English.」
- 不改 schema、不改 tool 名。

### 4. `src/pages/Chat.tsx`
- 两处 `supabase.functions.invoke("summarize-conversation", { body: … })`（约 359、615 行）都补上 `locale`，从现有 `useLocale()` 取。

## 不做的事
- 不回填历史 `tarot_draws.interpretation`（用户每天只能抽一张，老数据保持原样，新一天起就是中文）。
- 不动 `chat` / `assessment-*` 等已正确处理 locale 的函数。
- 不动数据库 schema。

## 验证
塔罗修复后：切到中文设置 → 重新登录的当日如果已抽过会看到旧英文（缓存），第二天首次抽牌应直接出中文解读 + 中文 💡 行动建议。
