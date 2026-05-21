## 根因

控制台日志显示，最新这条 Zoe 的"空白回复"，AI 实际返回的原文是：

```
（空）
【⚡Energy+2】
【🎭Mood:starry】
```

也就是模型**只输出了结尾的 markers，没有任何正文**。`parseGameMarkers` 把 markers 剥掉之后，`cleanContent = ""`，前端就渲染出一个空气泡。

为什么会这样？上一轮我把 prompt 改成了：

- "Follow-up questions are optional… **Silence is often better than a forced question**."
- "DEFAULT = no 💭 question. End your reply with your thought/observation and let the user decide…"
- "【Acknowledgement First】Read their message as a response to YOU first…"

本意是让"💭 引导问句"按需出现，但 Gemini 2.5 Flash 在遇到"用户简短回复 / 没有新信息可承接"的轮次时，过度泛化了"silence is preferred"，**连正文都省略了，只剩 markers**。所以最近 Zoe 回复忽长忽短、偶尔空白，都是同一个根因——prompt 把"少问问题"误读成了"可以不说话"。

## 方案

两层修：prompt 收紧表述 + 前端加兜底，避免再有空气泡漏到 UI。

### 改动 1：`supabase/functions/chat/index.ts` —— 给 `RPG_INSTRUCTION` 加一条硬约束

在【Response Style】顶部加一条不可绕过的规则：

```
- 【Always Produce Body Text】Every reply MUST contain at least 1-2 sentences of natural, conversational body text BEFORE any markers (Energy / Options / Truth Shard / Mood). Markers alone = invalid reply. "Silence" rules below ONLY apply to the optional 💭 follow-up question, NEVER to the reply body itself.
```

并把规则 #0 那条"Silence is often better than a forced question"改成更精确的：

```
- Follow-up 💭 questions are optional. When unsure whether to ask, skip the question — but ALWAYS still write a body reply (acknowledgement, reflection, light comment, or shared feeling). Skipping the question ≠ skipping the reply.
```

规则 #4【Guided Question】保持现状，但在末尾追加一行：

```
- ⚠️ Skipping the 💭 question does NOT mean skipping the reply. You still owe the user a body response before the markers.
```

### 改动 2：`src/pages/Chat.tsx` —— `onDone` 里加空内容兜底

在 700-733 行附近，`parseGameMarkers` 之后判断 `cleanContent.trim()`：

```ts
if (!cleanContent.trim()) {
  // 模型这轮只吐了 markers，没有正文。移除空气泡，提示重试，但保留 energy/atmosphere 等副作用。
  setMessages((prev) => prev.filter((m) => m.id !== "streaming"));
  toast.error(locale === "zh" ? "她好像走神了，再发一次试试 🌙" : "She drifted off — try again 🌙");
  setIsStreaming(false);
  return;
}
```

放在 `setMessages(...替换 streaming...)` 之前，并且在这条分支里**不要**写入数据库 / 不要触发 extract-memory，避免把空回复持久化。

### 不动的部分

- `parseGameMarkers` 本身没问题（它正确剥离了 markers）。
- 不改 `max_tokens`（300 够长，这轮也没爆 token，是模型主动选择沉默）。
- 不改其他 agent 的 base prompt（RPG_INSTRUCTION 是共享的，一处改全员受益）。
- 不动 recall-memory / extract-memory 的鉴权逻辑（上轮已修）。

### 验证

1. `/chat?agent=bestie` 给 Zoe 一段简短回应（如"嗯"、"哈哈"），确认她不再返回空气泡，而是给出短承接。
2. 控制台日志里 `raw AI response` 不应再出现"只有 markers"的情况；如果偶发漏网（模型不听话），前端 toast 应该兜住、UI 不会有空白气泡。
3. 抽 5-8 轮检查 💭 出现频率仍在 30-50%（即不是退回"每条必出"）。

### 风险

- prompt 收紧后，模型可能在"用户只发了一个表情"这种轮次也勉强凑一两句——这是可接受的，比空白好。
- 前端 toast 兜底会消耗一次配额（已经向 AI 网关发了请求）。日志里能看到频率，如果 > 5%，再回头收紧 prompt。
