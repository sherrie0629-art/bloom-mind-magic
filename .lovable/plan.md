## 根因

控制台抓到的 `raw AI response`：

- 一条正常长回复（有正文 + markers）
- 一条只有 `【🎭Mood:warm】`
- 一条完全空

也就是模型**经常只输出 markers 甚至完全空**——上轮加的前端兜底（"她好像走神了…"）只是把空气泡换成 toast，治标不治本，所以你每条都看到它。

为什么会空？`supabase/functions/chat/index.ts` 里：

```ts
model: "google/gemini-2.5-flash",
max_tokens: 300,
```

Gemini 2.5 Flash 是 **thinking model**——它会先消耗一段"思考 token"再产出正文，而 `max_tokens` 是**思考 + 输出的总和**。300 在以下场景必然不够：

1. system prompt 越来越长（base prompt + RPG_INSTRUCTION + lore + memoryContext + 中文 langHeader/Footer + easter eggs）
2. 用户消息或上下文里有复杂情绪 → 模型多思考几步
3. 中文输出本身 token 效率低于英文

结果：思考阶段就把 300 token 烧光，输出阶段还没开始就被 `stop: length` 截断，前端只收到末尾几个 marker 字符（流式情况下偶尔会有 marker 模板从上下文里漏出来）或者干脆 0 字符。

这是 Gemini 2.5 family 的已知陷阱，knowledge base 里也专门点名。

## 方案

### 改动 1：`supabase/functions/chat/index.ts` —— 抬高输出预算

```ts
- max_tokens: 300,
+ max_tokens: 1024,
```

1024 给思考留 ~700、正文 ~300（中文约 150 字），匹配 prompt 里"60-120 词、最多 150 词"的设定，且远低于 Gemini 2.5 Flash 单次上限，不会增加显著成本（只按实际产生 token 计费）。

### 改动 2：保留前端兜底，但调成只对"真·空"提示，并自动清掉副作用记账

`src/pages/Chat.tsx` 现在的兜底已经能正确移除空气泡，保留即可。额外做一点：**空回复时不要 incrementTurn / 不要写 DB / 不要触发 extract-memory**（避免空轮也算用户的 daily quota 配额——目前 quota 是在 edge function 里 increment 的，无法回退，所以这条只能"尽量减少副作用"，主要靠 max_tokens 修好不再出现）。

具体：把现有 fallback 分支调整为 `return` 之前**不调用** `incrementTurn / checkAchievements / saveMessage / extract-memory-incremental`（确认 717-725 行那段早 return 路径已经天然跳过了这些，已是正确状态，无需再改）。

### 改动 3：（可选诊断）日志加 finish_reason

边缘函数当前是把上游 stream 透传，看不到 `finish_reason`。本次不动，等 max_tokens 抬高后观察是否还出现空回复；如果还有，再加一层非流式探测。

### 不动的部分

- 不切模型（`gemini-2.5-flash` 在正常 token 预算下质量足够，切 pro 成本翻倍）。
- 不改 prompt（上轮的 "Always Produce Body Text" 硬约束保留，配合 token 预算，模型才真的写得出正文）。
- 不动 RLS / 鉴权 / 其他 agent。

### 验证

1. `/chat?agent=bestie` 连发 5 条消息，观察控制台 `raw AI response` 不再出现"只有 markers / 完全空"。
2. toast"她好像走神了"不应再频繁出现（< 1/20 才算正常）。
3. 检查回复长度仍在 60-150 字之间，没有因为 max_tokens 抬高而变冗长（prompt 里的字数约束会压住）。

### 风险

- 抬高 max_tokens 会让真正失控的轮次产生更长回复 → prompt 已有"never exceed 150 words"硬约束兜底。
- 如果 1024 还不够（极少数超长 lore + memory context），可以再抬到 2048；但先用 1024 验证再决定。
