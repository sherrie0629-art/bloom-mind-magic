## 让九型人格结果更生动 + 修复聊天跳转

只改两个文件。

### 1. `supabase/functions/assessment-bazi/index.ts`（结果生成 prompt + schema 描述）

**人设升级**：把 system prompt 从"九型专家"改成"懂九型的损友 / 心理博主"，结果要像小红书 / Co-Star 风格 —— 有梗、有画面、有自嘲，但仍然准。

**字段描述重写**（强制风格）：
- `description`：~200 字，第二人称，前两句必须戳中"你大概率有过这个瞬间"的具体场景，避免教科书定义
- `coreFear` / `coreDesire`：10–20 字，用画面化短句，不要"害怕被否定"这种干巴定义，改成例如"被人发现你其实没那么完美的一秒"
- `growthPath`：60–100 字，给出 1 个可执行小动作 + 1 句温柔提醒，禁止"你应该学会..."句式
- `stressArrow`：60–100 字，描述压力下会做出的具体行为（拉黑、熬夜刷手机、突然清空购物车之类），带一点自嘲
- `advice`：50–80 字，像朋友递杯咖啡说的话，可带 1 个 emoji；禁止"建议你..."开头
- `socialCaption`：≤30 字，小红书标题感，可以带 hashtag 或反转

**Prompt 加规则**：
- 中文像小红书 MBTI 博主 + 损友吐槽；英文像 Co-Star
- 全文最多 2 个 emoji，禁止排比说教
- 禁止"你是一个 XX 的人"这种盖章式开头
- 加 1 段中文 few-shot 示例（type 4 的 description / advice），把风格钉死
- `PROMPT_VERSION` bump 到 `v3`

**参数**：`temperature: 0.7 → 0.95`，`max_tokens: 1024 → 1536`（字段变长）

### 2. `src/pages/EnneagramFlow.tsx`（修聊天跳转）

第 187 行 `navigate(\`/chat?agent=mentor\`)` → `navigate(\`/chat?agent=barista\`)`。
按钮文案 key `assessmentFlow.enneagram.discussWith` 当前是"和 Arthur 聊"之类，需要在 `zh.json` / `en.json` 同步改为"找咖啡师聊聊 ☕" / "Chat with the Barista ☕"。

### 不动
- 题目生成（v2 保留）、tool schema 字段名、`traits` 数值、前端结果渲染结构、配额、其他测评
