
## 目标

每个测评/抽卡结果页可一键进入对应 AI 角色聊天，并把刚完成的测评结果作为本次会话的"刚发生事件"传给该角色。

| 入口 | 跳转角色 | 当前状态 |
|---|---|---|
| MBTI 性格测评 | barista（咖啡师） | ✅ 已实现 |
| 心灵体检 Emotion | jax | ✅ 已实现 |
| 九型人格 Enneagram | bestie（闺蜜） | ❌ 当前→barista，无上下文 |
| 星座测评 Zodiac | mystic（Luna） | ❌ 当前→barista，无上下文 |
| 每日塔罗 DailyTarot | mystic（Luna） | ❌ 无聊天入口 |
| 关系合盘 Compatibility | bestie（闺蜜） | ❌ 无聊天入口 |

## 改动清单

### 1. `src/pages/EnneagramFlow.tsx`
- 跳转改为 `/chat?agent=bestie`，state 传 `enneagramResult`：`type`、`title`、`description`、`coreFear`、`coreDesire`、`growthPath`、`stressArrow`、`advice`。
- 按钮文案 i18n key 改为 `assessmentFlow.enneagram.talkToBestie`。

### 2. `src/pages/ZodiacFlow.tsx`
- 跳转改为 `/chat?agent=mystic`，state 传 `zodiacResult`：`sign`、`title`、`description`、`traits`、`advice`（含 ritual/crystal）。
- 按钮文案 key 改为 `assessmentFlow.zodiac.talkToLuna`。

### 3. `src/pages/DailyTarot.tsx`（result 状态区）
- 在「保存海报」按钮下方新增次级按钮「找 Luna 解牌」，跳转 `/chat?agent=mystic`，state 传 `tarotResult`：`cardName`、`isReversed`、`energyScore`、`interpretation`、`actionTip`、`drawDate`。
- 新增 i18n key `dailyTarot.talkToLuna`。

### 4. `src/pages/CompatibilityFlow.tsx`（result 步骤）
- 在底部按钮组新增第三个按钮「找闺蜜聊聊」，跳转 `/chat?agent=bestie`，state 传 `compatibilityResult`：`overallScore`、`title`、`summary`、`dimensions`、`strengths`、`conflicts`、`loveLanguage`、`partnerName`、`partnerMbti`/`partnerZodiac`，以及已生成的 `deepAnalysis`（若 ready）。
- 新增 i18n key `assessmentFlow.compatibility.talkToBestie`。

### 5. `src/pages/Chat.tsx`（核心改动）
- `location.state` 解析新增四个上下文：`enneagramResult`、`zodiacResult`、`tarotResult`、`compatibilityResult`。
- `hasAssessmentContext` 扩展为六种之一即为 true。
- 在记忆上下文构建处，为每一种新增 `[Just assessed] …` 摘要字符串注入 `memCtx`，与现有 mbti/emotion 相同风格（英文摘要供模型读取）。
- 新增四个 `useRef` 防重发标志和对应的 `useEffect`：在 `historyLoaded && user` 后自动发送一条用户口吻的开场消息：
  - 九型 → bestie：「我刚做完九型人格，结果是 X 号 …，咱聊聊？」
  - 星座 → Luna：「我刚测了星座（XX 座）…」
  - 塔罗 → Luna：「我今天抽到 XXX（正/逆位）…」
  - 合盘 → bestie：「我刚跟 [伙伴名] 测了关系合盘，匹配 X% …，给点建议？」
- 自动开场消息每次 mount 只触发一次，并 `setConversationId(null)` 起新会话，避免污染历史。

### 6. i18n（`src/i18n/locales/zh.json` & `en.json`）
新增 4 个 key：
- `assessmentFlow.enneagram.talkToBestie`：「找闺蜜聊聊」/ "Chat with Bestie"
- `assessmentFlow.zodiac.talkToLuna`：「找 Luna 解读」/ "Talk to Luna"
- `dailyTarot.talkToLuna`：「找 Luna 解牌」/ "Ask Luna about this card"
- `assessmentFlow.compatibility.talkToBestie`：「找闺蜜聊聊」/ "Chat with Bestie"

## 不改动
- 角色数据 `src/data/agents.ts`（mystic=Luna，bestie=闺蜜，已存在）。
- 数据库结构、agent_bonds、user_memories：测评结果只随 `location.state` 内存传递、不持久化（与现有 mbti/emotion 行为保持一致）。
- MBTI/Emotion 流程已正确，不动。

## 关键约束
- 所有自动开场消息只发一次（`useRef` 防重）。
- 跳转后 Chat 页 agentId 取自 URL `?agent=`，状态里的 result 与对应 agent 解耦渲染——若用户手动改 URL 跳到别的角色，对应 result 仍会注入（不强校验，简化逻辑），与现有 mbti/emotion 一致。
