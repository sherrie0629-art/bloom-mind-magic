## 目标

把星座结果页"本周建议"从单句优化为有趣、丰富的多卡片内容，让用户更有探索感与仪式感。

## 新内容结构

将 `advice` 从 string 升级为对象，AI 一次性返回以下 5 个字段：

- `mantra`：本周能量箴言（一句诗意短语，≤20 字）
- `doThis`：3 条"做这些事"建议（每条带 emoji 图标，约 15-25 字，覆盖行动/社交/自我关怀）
- `avoidThis`：2 条"避开这些"提示（带 emoji，简短俏皮）
- `luckyMoment`：本周幸运时刻（如"周三傍晚 5-7 点"+ 一句解读）
- `crystalOrRitual`：推荐的小仪式或水晶 / 香薰（带一句使用方法）

## 实施步骤

### 1. Edge Function：`supabase/functions/assessment-zodiac/index.ts`

- 在 `zodiac_result` tool schema 中将 `advice` 由 string 改为 object，包含上述 5 个字段（全部 required）。
- 更新 system prompt，要求"本周建议"丰富、俏皮、像神秘学闺蜜的口吻，并强调字数与 emoji 要求；保持 LANG 多语言指令。
- `max_tokens` 从 1024 提升到 1400，避免被截断。

### 2. 前端：`src/pages/ZodiacFlow.tsx`

- 更新 `Result` 类型中 `advice` 为对象。
- 替换 277 行的"本周建议"卡片为新的视觉布局：
  - 顶部：箴言（`mantra`），居中、带渐变金色字体与引号装饰
  - "Do This"列表：图标 + 文案，带轻微 hover 动画
  - "Avoid This"列表：以柔和警示色呈现
  - 底部两个小 chip：`luckyMoment` 与 `crystalOrRitual`，左右排列
- 海报分享文案 (`generatePoster` 第 194 行) 改为使用 `result.advice.mantra`。
- 保持现有渐变 / shadow-card 风格，避免新增依赖。

### 3. i18n：`src/i18n/locales/{zh,en}.json`

新增以下 key（在 `assessmentFlow.zodiac` 下）：
- `mantraTitle`：本周箴言 / Weekly Mantra
- `doThis`：试试这些 / Try This
- `avoidThis`：暂避锋芒 / Avoid This
- `luckyMoment`：幸运时刻 / Lucky Moment
- `ritualTitle`：今周小仪式 / Weekly Ritual

### 4. 兼容旧数据

历史 `advice` 可能是字符串。在渲染处加判断：若为 string 则按旧 UI 渲染单段文案，避免老结果页崩溃（仅前端兜底，无需迁移数据库）。

## 涉及文件

- `supabase/functions/assessment-zodiac/index.ts`
- `src/pages/ZodiacFlow.tsx`
- `src/i18n/locales/zh.json`
- `src/i18n/locales/en.json`
