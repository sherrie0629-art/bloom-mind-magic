# 修复：测评结果进入聊天后上下文为英文的问题

## 问题
`src/pages/Chat.tsx` 中，所有测评（MBTI / Enneagram / Emotion / Zodiac / Tarot / Compatibility）跳转聊天后：
1. 注入到 AI 的 `memoryContext`（`[Just assessed] User completed ...`）为硬编码英文。
2. 自动发送的第一条用户消息（"I just took the MBTI quiz..."、"Luna, I just drew..."、"I just ran a compatibility report..." 等）也是硬编码英文。

当用户语言为中文时，AI 收到英文上下文 + 用户身份说着英文消息，导致回复的语气/语境不自然，且角色对测评内容的理解被英文锚定。缘分配对（bestie）只是其中一个表现最明显的场景，**6 个测评入口都有同样问题**。

## 方案
仅修改前端 `src/pages/Chat.tsx`：根据已有的 `locale`（`zh` / `en`）分支生成两套文案。不动 edge function（`chat` 已有 `langLine` 强制语言）。

### 改动点
1. **`memoryContext` 注入（约 158–190 行）**：每个 `if (xxxResult)` 分支按 `locale` 选择中/英模板：
   - zh 例：`[刚刚完成测评] 用户完成了 MBTI 测评：${type}（${title}）。描述：${description}。平行宇宙：奇幻—${...}，赛博朋克—${...}`
   - en 保持现有英文文案
   - 6 个分支：mbti / emotion / enneagram / zodiac / tarot / compatibility
2. **自动首条消息（约 270–318 行）**：每个 `useEffect` 中的 `handleSend("...")` 改为按 `locale` 切换：
   - mbti（barista）：「我刚做完 MBTI 测试，结果是 ${type}（${title}）${平行宇宙}—想聊聊我的性格吗？✨」
   - emotion（jax）：「我刚做完心灵体验，得到「${level}」—${title}。倦怠 ${x}%、能量 ${y}%。能聊聊我现在的状态吗？🌈」
   - enneagram（bestie）：「我刚做完九型人格测评—我是 ${type}号（${title}）。核心恐惧：${...}；核心渴望：${...}。陪我一起聊聊吧 💭」
   - zodiac（mystic/Luna）：「Luna，我刚抽到 ${sign} 的解读——「${title}」。你能帮我看看这对我现在意味着什么吗？✨🌙」
   - tarot（mystic/Luna）：「Luna，我今天抽到了 ${cardName}（${正位/逆位}）。这张牌对我到底意味着什么？🔮」
   - compatibility（bestie）：「我刚做了和 ${partnerName} 的缘分配对——我们匹配度 ${score}%（${title}）。说点实话，我接下来到底该怎么办？💕」
3. 由于 `useEffect` 依赖中已包含 `historyLoaded` / `xxxResult` / `user`，自动发送只触发一次的逻辑不变；新增依赖 `locale` 不必要（首次发送时 `locale` 已就绪）。

### 不在范围
- 不改 `Chat.tsx` 其它行为、不动 edge function、不动测评页跳转代码。
- 不新增 i18n key（这些是一次性 prompt 文案，内联分支更直观；如后续需要再抽取）。

## 文件
- `src/pages/Chat.tsx`（仅本地化两段：memoryContext 构建、6 个自动首条消息 useEffect）
