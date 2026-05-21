## 问题诊断

截图里那三个选项（"我好像开始更懂自己了 / 我准备好了，我们继续 / 如果『解决方案带』会说话，它会说什么"）和 AI 上一句"夸你超棒的解决方案"的语境完全脱节。

根因：这些选项不是 AI 生成的，而是前端 `generateFallbackOptions()` 兜底产出的。逻辑在 `Chat.tsx` 700-746 行：

- 系统提示已经明确要求 AI **默认不出** 【💫Options】，只在用户出现内心冲突/转折时才出。
- 但客户端额外加了一层兜底：只要"连续 4 个 assistant 回合没出选项"且用户消息不太短/不是纯问句，就**强行**用 `generateFallbackOptions` 从 i18n 静态池里挑 2 条 + 1 条带关键词 hook 凑齐。
- 静态池是按 agent + 主题（stress/breakup/anxiety…）预写的固定句子，根本不读上下文情绪，所以在"被夸奖"这种正向场景里就出戏了。
- 第三条 hook 用 `extractKeyPhrase` 暴力抠用户最后一句的 2-6 字短语塞进模板（"如果『X』会说话…"），更容易尴尬。

用户的方向是对的：**不合适就别强出**。

## 方案

采用最小改动 + 尊重用户意图：**移除前端的兜底强出逻辑**，完全信任 AI 的判断。

### 改动

1. **`src/pages/Chat.tsx`（700-747 行）**：
   - 删掉"4 回合冷却 → 调 `generateFallbackOptions`"那段。
   - 改成：`finalBranchOptions = parsedOptions && parsedOptions.length > 0 ? parsedOptions : null;`
   - 即：AI 自己输出 【💫Options】才显示，否则就是普通对话，鼓励用户自由打字。

2. **`supabase/functions/chat/index.ts`（80-94 行，prompt 强化）**：
   - 当前规则已经很克制，但保险起见再补一条具体反例：
     - "用户在被夸奖、闲聊、表达开心/感激/兴奋等正向情绪时，**禁止**输出 Options——这种时刻应该让 ta 自由回应。"
   - 把"aim for 1 per 3-4 turns"删掉（这会诱导模型凑节奏），改为"only when genuinely needed; long gaps are normal"。

3. **`src/lib/generateFallbackOptions.ts`**：
   - 暂时保留文件（万一以后想加"用户主动点击'给我几个选项'按钮"的入口），但从 `Chat.tsx` 删掉 import，让它变成 dead code。后续清理可单独做。

### 不做的事

- 不动 `BranchSelector` 组件本身。
- 不动 i18n 文案。
- 不加新的"按需生成"AI 调用（成本/延迟不划算，且 AI 主动判断已经够用）。

### 验证

- 在 `/chat?agent=bestie` 给出当前这种夸奖型回复，确认下方**不再出现**三条引导选项。
- 在"我想换工作但不敢辞职"这种真冲突场景，确认 AI 仍会自己出 Options。
- 观察 3-5 轮对话，确认 Options 出现频率自然降低而非完全消失。

## 风险

- 若某些 agent 的 prompt 对 Options 规则理解不到位，可能整段对话都不出选项 → 用户失去"分支感"。
  - 缓解：保留 prompt 里的 Options 规则，只是更克制；并保留 `generateFallbackOptions.ts` 文件供以后做"手动呼出"入口。
