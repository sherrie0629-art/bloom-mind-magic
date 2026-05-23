## 根因

`src/pages/Chat.tsx` 已登录用户的发送分支里有一个严重 bug，导致 AI "答非所问"：

```ts
// 行 582-583：把新用户消息加入 React state（异步）
const userMsg = { id, role: "user", content: text };
setMessages((prev) => [...prev, userMsg]);

// 行 648-650：构造发给后端的消息历史 —— 但这里读的是闭包里的旧 messages！
const apiMessages = messages
  .filter((m) => m.id !== "welcome" && m.kind !== "tarot-card")
  .map((m) => ({ role: m.role, content: m.content }));

// ❌ 缺一行：apiMessages.push({ role: "user", content: userMsg.content });

await streamChat({ messages: apiMessages, ... });
```

匿名分支（行 522-525）做对了：

```ts
const apiMessages = messages.filter(...).map(...);
apiMessages.push({ role: "user", content: userMsg.content });  // ✅
```

但已登录分支漏掉了 `apiMessages.push(userMsg)`。

### 后果

后端收到的对话历史**永远缺少用户最新一句**：

- 历史最后一条变成上一轮 assistant 的回复（图中"上帝裁剪出来的海岸线"那段）
- 模型把那段当成"上轮你说过的话，请继续说"
- 于是它接着自己上次的话题继续抒情，完全不看用户问的"说说你的厌食症"

也解释了之前反复出现的"她好像走神了"：

- 历史最后一条是 assistant，模型有时直接返回 marker-only 或空正文
- 此前以为是 prompt 冲突 / token 截断，其实根因是用户消息根本没送进去

匿名（未登录）模式不会复现，因为那条分支是对的。这与"用户感觉登录后才严重"吻合。

## 修复方案

在 `src/pages/Chat.tsx` 已登录分支构造 `apiMessages` 后，与匿名分支保持一致，显式把当前 `userMsg` 追加进去；同时把可选的 `drawnCardContext` / `pastCardContext` 拼到最新一条用户消息末尾（如果有），让 tarot 上下文继续生效。

伪代码：

```ts
const apiMessages = messages
  .filter((m) => m.id !== "welcome" && m.kind !== "tarot-card")
  .map((m) => ({ role: m.role, content: m.content }));

const cardCtx = drawnCardContext || pastCardContext || "";
apiMessages.push({
  role: "user",
  content: cardCtx ? `${userMsg.content}${cardCtx}` : userMsg.content,
});
```

（需要先确认 `drawnCardContext` / `pastCardContext` 当前是否被消费 —— 看起来声明了但没被使用，可以在同一处一起补好，避免再次遗漏。）

## 同步清理

- 回退/简化之前为这个"幻觉问题"加的兜底逻辑可以保留，但应在 PR 描述里说明真正根因，避免后续误判。
- 不需要改 `supabase/functions/chat/index.ts` 来修这个问题；后端是无辜的。

## 验证

1. 已登录用户在 `/chat?agent=bestie` 连发两轮："你好" → "说说你的厌食症是怎么回事？"，第二轮应针对厌食症作答，不再延续上一轮主题。
2. Mystic 抽牌流程：抽牌后再问问题，AI 仍应围绕该牌作答（验证 cardContext 没被丢）。
3. 后端日志 `messages` 最后一条 role 应稳定为 `user`，不再是 `assistant`。

## 风险

- 极低。改动只补一条历史缺失的消息，匿名分支已用同一写法稳定运行。
