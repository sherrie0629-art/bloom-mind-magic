## 根因复盘

上一轮把 `max_tokens` 从 300 抬到 1024 后，控制台仍抓到：

```
[Chat] raw AI response:
【🎭Mood:warm】
```

时间戳 13:12:47，函数 booted 在 13:12:24 —— 也就是说**新版本已经生效，但 1024 依然不够**。

原因还是 Gemini 2.5 Flash 的 **thinking token 黑洞**：

- system prompt 体量非常大：RPG_INSTRUCTION（百余行硬规则）+ 角色 lore + memoryContext + unlockedShards 回忆 + easter eggs + 中文 langLine
- 当前轮上下文还要叠加历史 messages
- 模型在思考阶段就能烧掉 800-1000+ token，导致正文阶段被 `length` 截断，前端只收到末尾的 `【🎭Mood:warm】`

光抬 `max_tokens` 是治标，治本要**关掉 thinking** 或 **换掉 thinking model**。

## 方案

主修一处文件：`supabase/functions/chat/index.ts`

### 改动 1：关闭 thinking（首选）

Lovable AI Gateway 是 OpenAI 兼容协议，对 Gemini 2.5 family 支持通过 `reasoning_effort: "none"` 关闭思考阶段。把请求体改成：

```ts
const requestBody = JSON.stringify({
  model: MODEL,
  max_tokens: 1024,
  reasoning_effort: "none",   // ← 新增，关闭 thinking
  messages: [...],
  stream: true,
});
```

效果：模型直接进入输出阶段，1024 token 全部用于正文（中文 ~500 字），完全够覆盖 prompt 里"最多 150 词"的硬约束。质量损失对闲聊场景几乎不可感知（thinking 主要帮助复杂推理，闲聊角色扮演用不到）。

### 改动 2：兜底再抬一档

把 `max_tokens` 从 1024 抬到 **2048**，万一某些模型版本不识别 `reasoning_effort` 也能容纳一次完整思考 + 输出。

### 改动 3：finish_reason 日志（诊断）

流式末尾若上游下发 `finish_reason: "length"`，目前是静默吞掉的。加一行打印：

```ts
if (parsed.choices?.[0]?.finish_reason) {
  console.log("[chat] finish_reason:", parsed.choices[0].finish_reason);
}
```

方便后续如果还出现空回复，直接在 edge function 日志里看到是 `length`（被截断）还是 `stop`（模型真的没说话）。

### 不动的部分

- 不换模型（gemini-2.5-flash 关掉 thinking 后等价于纯输出模型，足够闲聊用）
- 不改 prompt（"Always Produce Body Text" 硬约束保留）
- 不动前端兜底（toast + 不计 quota 的逻辑保留作最后一层防线）
- 不动 RLS / 鉴权 / 其他 agent

## 验证

1. `/chat?agent=barista` 与 `/chat?agent=*` 任意 Zoe/Chloe 角色连发 10 条，控制台 `raw AI response` 不应再出现"只有 markers / 完全空白"。
2. 边缘函数日志查 `finish_reason`，应稳定为 `stop`，不再有 `length`。
3. 回复长度仍受 prompt 的"最多 150 词"约束，不会因为放开 max_tokens 变得啰嗦。

## 风险与回滚

- 若 AI Gateway 不识别 `reasoning_effort` 参数，会被忽略（兼容协议惯例），最坏退化为只靠 max_tokens=2048，仍比现在好。
- 若出现兼容性报错（极小概率），删掉 `reasoning_effort` 字段即可回滚，max_tokens=2048 单独也能改善。
