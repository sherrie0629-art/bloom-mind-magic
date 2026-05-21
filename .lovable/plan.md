## 问题诊断

每条 AI 回复结尾都甩一个 💭 新问题，是 prompt 强行规定的，不是模型自由发挥。

根因在 `supabase/functions/chat/index.ts` 的 `RPG_INSTRUCTION`：

- 规则 #4【Guided Question】：**"At end of reply (before markers), add 1 guided question starting with 💭"** —— 用了 "add"，等于每条必出。
- 规则 #0【Response Style】："Ask only 1 follow-up question" —— 限制了数量，但默认必有。
- 两条叠加：模型每轮都必须以"💭新问题"收尾，且这个问题往往会跳开当前话题，因为前面已经说完了一个完整的"观点 + 共情"，再问就只能换角度。

所以你看到的"割裂感"不是 Zoe 的问题，是系统级硬性指令。用户想接 Zoe 的观点 vs 答 Zoe 的新问题，确实没地方放。

## 方案

把"必出 💭 问题"改成"按需出，且必须承接上文"，并显式给模型留出"用户可能想回应我刚说的话"这个空间。

### 改动 1：`supabase/functions/chat/index.ts` —— `RPG_INSTRUCTION` 规则 #4 重写

由

```
4.【Guided Question】At end of reply (before markers), add 1 guided question starting with "💭", short and natural.
```

改为：

```
4.【Guided Question — Optional, context-aware】
- DEFAULT = no 💭 question. End your reply with your thought/observation and let the user decide what to do with it.
- Only add a 💭 question when ALL true:
  · You just shared an opinion/observation/story, AND it naturally invites the user to react to THAT specific thing (not a topic pivot).
  · You did NOT end the previous 2 assistant turns with a 💭 question.
  · The question must echo the exact thing you just said, e.g. "💭 哪一句最戳你？" / "💭 这个画面你认得吗？" — never introduce a new topic.
- ❌ Forbidden: pivoting to an unrelated new question ("那你最近工作怎么样？" after sharing an emotional insight), generic openers ("💭 你怎么看？" without anchoring), stacking a 💭 after Options.
- ✅ Leaving space (no question) is the preferred default. The user will respond to what moved them.
```

### 改动 2：`RPG_INSTRUCTION` 规则 #0【Response Style】微调

把 `- Ask only 1 follow-up question, short and natural` 改成：

```
- Follow-up questions are optional, not required. When you do ask, anchor it to the user's exact words from THIS turn — never pivot to a new topic. Silence/space is often better than a forced question.
```

### 改动 3（可选，推荐）：补一条"承接优先"的总则

在【Response Style】末尾加：

```
- 【Acknowledgement First】If your previous reply made a point, the user's next message is often a reaction to it. Read their message as a response to YOU first, not as a new prompt. Reflect back what you heard from them before adding anything new.
```

### 不做的事

- 不动 Options 规则（上一轮刚改过，独立机制）。
- 不动 Energy / Truth Shard / Mood 标记。
- 不动前端 `BranchSelector` 或 `parseGameMarkers`（💭 行不带 marker，本来就只是文本）。
- 不动其他 agent 的 base prompt（RPG_INSTRUCTION 是全员共享的，一处改全员受益）。

### 验证

1. 在 `/chat?agent=bestie` 给 Zoe 一段她"说得挺好"的肯定回应，验证她下一条**不再**自动甩 💭 新问题，而是承接你刚说的话。
2. 在用户真正卡住的场景（如"我不知道接下来该怎么办"），验证 Zoe 仍可能给出一个紧贴上下文的 💭 问题。
3. 抽 5-8 轮对话，统计 💭 出现频率应明显下降（目测从 ~100% 降到 30-50%），且每个 💭 都能在上文找到锚点。

## 风险

- 模型可能矫枉过正，连真正该追问的场景也沉默 → 通过保留"按需出"条款 + 给出 ✅ 正例缓解。
- 其他 agent（Chloe / Jax / Luna）也会同步变得更"留白" → 这其实是符合人设的（Chloe 本来就主打"不给建议只陪伴"），属于正向副作用。

