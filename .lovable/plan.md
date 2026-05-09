## 问题
聊天里 AI 回复后出现的 3 个引导提示词（情绪分支按钮）在切换中文后仍显示英文。

根因：`src/lib/generateFallbackOptions.ts` 里所有 fallback 分支文案都是硬编码英文字符串，未走 i18n。它在 `Chat.tsx:547` 被调用，但只传了 `agentId`，没有 `t`。

## 修复方案

### 1. `src/lib/generateFallbackOptions.ts`
- 把每条 option 的 `text` 改为 i18n key（保留 `emotion` 和 `keywords` 在代码里）。
- 函数签名加一个 `t: TFunction` 参数；返回前用 `t(key)` 渲染。
- 结构示例：
  ```ts
  { textKey: "branchFallback.barista.stress.0", emotion: "brave" }
  ```
- 4 个角色 × ~3 个池 + 3 组 generic，每组 3 句，总共约 42 个 key。

### 2. `src/i18n/locales/en.json` 与 `zh.json`
- 新增 `branchFallback` 节点，按 `agentId.poolName.index` 组织；
- en 沿用现有英文原文，zh 翻译为自然口语化中文（保持"勇敢/温柔/理性/好奇/悲伤/希望/叛逆"的情绪基调）。

### 3. `src/pages/Chat.tsx`
- 调用处改为 `generateFallbackOptions(agentId, [...], t)`，`t` 已在组件作用域内。

### 验证
- 切换语言 → 触发 fallback（让 AI 回复后短促结束触发分支）→ 检查 3 个按钮文案随 i18n 切换。
- 不改业务逻辑，仅文案/i18n。
