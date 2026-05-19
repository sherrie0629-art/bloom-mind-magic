# 修复角色彩蛋触发后输出英文的问题

## 目标
用户语言为中文时，Luna（及其他角色）触发 Hidden Memory / Easter Egg 后，整段回复必须使用中文，不再泄漏英文原句。

## 根因
`supabase/functions/chat/index.ts` 的 `easterEggs` 配置里，每条 `instruction` 都写死了大段英文引文（例如 "Retrograde doesn't cause chaos..."），并要求模型「End with "..."」、「say "..."」。模型遵循 instruction 的优先级高于末尾那一行 `langLine`，于是即便用户用中文，依然吐出英文段落。同时 `agents.ts` 里的 `lore` 与 `easterEggs[].response` 也是纯英文。

## 修复方案（聚焦语言一致性，不改玩法）

### 1. 改造 `supabase/functions/chat/index.ts`
- 把 `langLine` 从「附在末尾的一句」升级为**强约束块**，提前到 system prompt 顶部附近，并明确：
  - 用户语言为中文时，**所有叙述、引文、回忆、内心独白、引号内的句子都必须翻译为简体中文**；
  - 不得保留英文原句（专有名词如人名 "Adam / Daniel" 可保留，其余如品牌/地名按中文习惯本地化或音译）；
  - `【🔮 Hidden Memory Unlocked】` 标记本身保留原样（前端依赖它做匹配）。
- 重写 `easterEggs` 中 instruction 的写法：
  - 改为**情节大纲**而非「逐字输出」的引文，例如 "share the memory about Adam liking her LinkedIn post during Mercury Rx... convey the line that retrograde doesn't cause chaos but surfaces ignored messages — **render the entire memory in the user's current language**"。
  - 所有 `End with "..."` / `say exactly "..."` 之类的硬编码句子全部去掉，改为「以这层意思收尾」。

### 2. 改造 `src/data/agents.ts`
- `easterEggs[].response`：当前是英文 fallback。保留英文作为默认，但前端不依赖这段文案显示给用户（实际显示的是流式 AI 输出），仅作为 i18n key 的兜底。确认 `localizeAgent` 已经支持 `agents.{id}.eggs.{trigger}` 翻译键。
- 在 `src/i18n/locales/zh.json` 中为 Luna / Maya / Bestie 的 lore 与 eggs 添加中文翻译键（若已存在则补齐缺失项），确保系统提示中注入的 lore 片段也走中文。
- 在 chat edge function 中，lore 片段当前直接用英文塞进 prompt：要么让前端把已经本地化的 lore 文本作为 `memoryContext` 之一传入，要么在 edge function 里依据 `locale` 选不同语言版本。最小改动：在 edge function 里给每个 agent 维护一份 `loreByLocale.zh`，与英文版一一对应。

### 3. 二次保险
- 在 `fullSystemPrompt` 末尾再追加一条「最终检查」：若检测到自己即将输出非用户语言的整句，必须先翻译。
- 把 `langLine` 同时拼到 prompt 头部和尾部（双重约束），实测对 Gemini 效果较好。

## 涉及文件
- `supabase/functions/chat/index.ts`（重写 easterEggs instruction、强化 langLine、按 locale 选 lore）
- `src/data/agents.ts`（保持结构，无需大改）
- `src/i18n/locales/zh.json`（补齐 lore / eggs 中文键）
- 必要时 `src/lib/localizeAgent.ts`（确认覆盖路径）

## 验证步骤
1. 中文用户与 Luna 对话，输入「mercury retrograde」「pull a card」「probability」「#0114」分别触发三个彩蛋 → 回复整段中文，仍带 `【🔮 Hidden Memory Unlocked】` 标记。
2. 切到英文 locale 重复一次 → 回复保持英文，体验不退化。
3. 中文模式下与 Maya / Bestie 触发各自彩蛋（oat milk / burnout / main character / imposter syndrome / I'm scared）→ 均为中文。
4. 普通中文对话不受影响，lore 片段被自然引用时也是中文。
