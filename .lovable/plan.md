# 让星座运势题目更有趣

## 单一文件改动：`supabase/functions/assessment-zodiac/index.ts`

### 1. 缓存立即失效（最简方案）
在 `cachePath` 拼接里加一个 `PROMPT_VERSION = "v2"` 常量：

```ts
const PROMPT_VERSION = "v2"; // bump to invalidate stale cached questions
const cachePath = `zodiac-questions/${sign}-${locale}-${weekKey}-${PROMPT_VERSION}.json`;
```

旧 key 自然走不到，无需手动清 storage。后续再调 prompt 只要 bump 版本号。

### 2. 重写 batch-questions 的 system prompt
人设从"占星师出题"改成"会占卜的损友在玩心理小测验"。要求：

- **场景化提问**：给具体小场景让用户选反应，例如"周五晚上手机突然弹出前任的朋友圈，你的第一反应是…"、"老板群里发了个意味不明的'嗯'，你脑内小剧场是…"、"下班路上挡路的橘猫盯着你，你觉得它在说…"。
- **选项有戏**：每条 8–20 字，带画面感/情绪/自嘲或玄学梗（如"装作没看见，但已经截图发闺蜜"），杜绝"开心/难过"式纯形容词。
- **覆盖维度**：综合 / 爱情 / 事业 / 财运 各 2–3 题，但用生活场景包装，不直白点题。
- **语气**：中文像小红书占卜博主，英文像 Co-Star；emoji 克制使用。
- **明确禁止**："你认为/你觉得/你的…如何"句式开头不超过 2 题；不要纯形容词选项。
- 在 prompt 里塞 1–2 个中英 few-shot 示例，稳住输出风格。

### 3. tool schema 加描述
给 `question` 和 `options[].text` 字段加 description，强调"场景化、具体、有画面感"。

### 4. 调参数
`temperature: 0.5 → 0.85`，`max_tokens: 1200 → 1500`，给场景化措辞留空间。

## 不动
- 题目数量（10）、选项数（4）
- `zodiac_result`（结果生成）逻辑
- 配额、缓存读写流程
- 其他 edge function
