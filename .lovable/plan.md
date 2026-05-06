# 角色文案中文化（跟随用户 locale）

## 现状

- `src/data/agents.ts` 中四位角色（Chloe/Jax/Luna/Zoe）的 `title / description / quote / lore[] / easterEggs[].response` 全部硬编码英文。
- `src/pages/Chat.tsx` 内的 `getWelcomeMessage` 与 `quickReplies` 也是英文常量。
- `src/components/AgentProfileDrawer.tsx` 还残留 "Bond:" / "Lv.X · N turns" / "Story Fragments" / "Deepen your bond..." / "There's a secret..." / "Continue Chatting" 等英文，未走 `agentDrawer` 翻译键。
- 涉及消费方：`Index`（首页）、`AgentCard`、`Welcome`、`AgentArchive`、`Vault`、`ConversationHistory`、`Chat`、`AgentProfileDrawer`。

`systemPrompt` 不动 —— 它发送给后端模型，已通过 LANG 指令让 AI 跟随 locale 输出。

## 方案

1. **i18n 数据**：在 `zh.json` / `en.json` 末尾新增 `agents` 块。结构：
   ```
   agents.<id>.title / description / quote / welcome
   agents.<id>.quickReplies   -> string[4]
   agents.<id>.lore           -> string[5]    (按 level 顺序)
   agents.<id>.eggs.<safeTrigger> -> string   (trigger 中非字母数字替换为 _)
   ```
   英文键 = 当前 `agents.ts` 原文；中文键 = 风格化中文翻译，保留 emoji。

2. **新增 `src/lib/localizeAgent.ts`**：
   - `localizeAgent(agent, t)` → 返回 agent 副本，把 `title/description/quote/lore/easterEggs.response` 替换为本地化文案，缺失键回退原值。
   - `getAgentWelcome(agent, t)` → 读取 `agents.<id>.welcome`，回退到通用模板。
   - `getAgentQuickReplies(agent, t)` → 读取 `agents.<id>.quickReplies` 数组。

3. **更新消费方**（统一调用 `localizeAgent`）：
   - `Index.tsx` / `AgentCard.tsx`：渲染前先 localize。
   - `Welcome.tsx`：列表 map 中 localize。
   - `AgentArchive.tsx`：localize 单个 agent + 列表。
   - `Chat.tsx`：替换 `getWelcomeMessage` / `quickReplies` 为新 helper；`agent` 变量也走 localize。
   - `AgentProfileDrawer.tsx`：使用 localize；同时把硬编码英文改为 `agentDrawer.*` 翻译键，"Lv.X · N turns" 用 `agentDrawer.lvTurns`。
   - `Vault.tsx` / `ConversationHistory.tsx`：仅展示 `agent.name`（专有名词），无需翻译，但顺手保持一致调用。

4. **Easter egg trigger key 转义**：触发词如 `"i need a coffee"` → `i_need_a_coffee`；在 `localizeAgent` 与翻译键中保持一致。

## 范围

- 新增：`src/lib/localizeAgent.ts`
- 修改：`src/i18n/locales/{zh,en}.json`、`src/pages/{Chat,Index,Welcome,AgentArchive}.tsx`、`src/components/{AgentCard,AgentProfileDrawer}.tsx`
- 不动：`src/data/agents.ts`（保留英文兜底）、edge functions（已有 LANG 指令）

## 验证

- 切换语言到中文：首页角色卡、抽屉、Chat 欢迎语、快捷回复、归档页 lore、彩蛋记忆均显示中文。
- 切回英文：所有文案恢复英文（与当前一致）。
