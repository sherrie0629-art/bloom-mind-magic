## 目标

让对话气泡下方的 3 个引导选项更像"此刻心里冒出的声音"，而不是固定模板。核心策略：**尽量让 AI 自己产出，fallback 只在万不得已时出现，且出现时不重复、带动态钩子**。保留情绪图标。

## 调整范围

仅改动：
- `supabase/functions/chat/index.ts`（prompt 强化）
- `src/lib/generateFallbackOptions.ts`（去重、动态钩子）
- `src/pages/Chat.tsx`（fallback 触发逻辑、调用签名）
- `src/i18n/locales/zh.json` / `en.json`（每个池子从 3 句扩到 6 句备选；新增"引用钩子"模板）

不动 `BranchSelector` 视觉，不动情绪图标。

## 具体改动

### 1. Prompt 加强（chat/index.ts）

把"Branch Options"那段改写为：
- **强约束**："当且仅当出现情感转折、内心冲突、需要深入引导时给选项；其余一律不给"。
- **明确节奏**："本轮如已给出选项，下一轮 *禁止* 再给；连续 2 轮没给可再考虑"。
- **必须紧扣当下**："3 句必须明显呼应用户上一句的具体词汇或意象，禁止说教式金句"。
- **格式硬约束**：保留 `【💫Options】a{emotion}|b{emotion}|c{emotion}` 与 8-20 字限制；新增"反例"列表（包含当前 fallback 里那 3 句被用户标注为机械的句子）让模型学习避雷。

### 2. Fallback 触发收紧（Chat.tsx）

当前逻辑：AI 没给选项就立刻 fallback。改为：
- 维护"最近 N 轮选项出现历史"（沿用现有 `assistantMsgsWithOptions` 判断）。
- **若最近 2 轮已经出现过选项 → 本轮不调用 fallback**（即使 AI 也没给）。
- **若用户消息极短（<8 字）或为纯提问 → 不 fallback**。
- 只有在 AI 多轮没给、且当前确实是"开放性回合"时，才进 fallback。

### 3. Fallback 内容去机械（generateFallbackOptions.ts + 文案）

- 每个池子文案从 3 句扩到 **6 句**（zh + en 都补），运行时随机抽 2 句。
- 新增 `recentlyShown: string[]` 入参（Chat.tsx 传入最近 6 条已展示过的选项文本），抽样时**排除**已出现过的句子。
- 第 3 句改为 **动态钩子模板**：从用户最近一条消息抽取 1 个 2-6 字短语（简单中文分词：去停用词 + 取最长名词性 token，英文取最长非停用词），代入模板如 `"再说说'{phrase}'那一刻的感觉"` / `"'{phrase}'背后藏着什么？"`。提取失败则退回静态第 3 句。
- 池子粒度细化：把 `mystic.stuck` 拆为 `stuck.energy`（能量/堵）、`stuck.direction`（迷茫/方向）、`stuck.selfDoubt`（自我怀疑）三个子池，关键词分别归位。
- 保留 `emotion` 标签 → 图标不变。

### 4. 数据流（示意）

```text
AI 回复 ──► parseGameMarkers
                │
        ┌───────┴────────┐
   有 Options          无 Options
        │                │
        │       最近2轮已有? ─yes─► 不显示
        │           │no
        │       用户消息太短? ─yes─► 不显示
        │           │no
        │   generateFallbackOptions(
        │       agentId,
        │       recentMessages,
        │       recentlyShownTexts,  ← 新
        │       t)
        │           │
        └───────────┴──► <BranchSelector />
```

## 不做的事

- 不改 `BranchSelector` 组件外观、不改情绪图标体系。
- 不改其他角色的池子结构（barista / jax / bestie 同样扩 3→6 句 + 动态钩子，但不再细分子池——避免一次改太多）。
- 不引入服务端二次调用 AI 来"再生成"选项（成本/延迟考虑）。

## 验证

- 在 Luna 对话里连续聊 5 轮含"堵/卡/迷茫"主题，确认：每次出现的 3 句都不同；至少 1 句包含用户原话短语；中间至少 1-2 轮没有出现选项。
- AI 主动给出选项时 fallback 不触发（看 console `fromAI: true`）。
- 切到 barista / jax / bestie 各跑一轮，确认池子扩充没破坏命中。
