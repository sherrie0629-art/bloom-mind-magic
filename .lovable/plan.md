# 方案：MBTI 测评题目"剧情化 / 趣味化"升级

## 目标
把 10 道传统量表题（"你更喜欢… A/B"）改造成像短篇互动小说一样的体验，让用户每一题都想点下一题。

## 核心思路：三层升级

### 1. 题目生成 prompt 升级（核心改动）
文件：`supabase/functions/assessment/index.ts` → `batch-questions` 分支的 system prompt。

把当前"scenario-based"这种泛泛要求，替换成强约束的趣味化模板，要求 AI：

- **统一叙事框架**：10 题串成一次"心灵漫游"——用户穿越 10 个奇幻 / 日常 / 未来场景（深夜便利店、平行世界派对、被神秘短信叫醒、合租房凌晨 3 点、外星观察员降临等），每题一个独立小场景。
- **题干风格**：
  - 每题 ≤ 60 字，第二人称("你…")，带画面感和一个钩子（一个谜、一个尴尬、一个突发事件）。
  - 开头可带 1 个 emoji 作为"场景标识"（🌙☕🛸🪞🎭…）。
  - 禁止出现"你更倾向于"、"通常情况下"、"在工作中"等问卷腔。
- **选项风格**：
  - 每个选项是一句"我会这样做"的具体行动 / 念头，10–20 字，自带性格色彩。
  - 不要让 4 个选项明显对应 4 个维度——保持"哪个都像我"的诱惑感（实际由 AI 内部映射 dimension）。
  - 允许选项里有 1 个略"叛逆 / 反套路"的彩蛋选项。
- **维度覆盖**：仍然覆盖 E/I、S/N、T/F、J/P 各约 2–3 题，由 AI 在 tool 返回的 `dimension` 字段标注（已存在）。
- **语言**：保留现有 `langInstr`，中文场景就要用中文网络语感（"破防了"、"emo"等可适度用，但不过度）。

新增 prompt 里给 2 个示例（few-shot）锁定风格，例如：

```
🌙 凌晨两点，你刷到一条三年没联系的朋友发的"在吗"。
A. 立刻回："在，怎么了？"
B. 截图发到群里问大家怎么看
C. 划走，假装没看见
D. 回一个"嗯"，然后等对方说完再决定
```

### 2. 加载文案 & 进度反馈（轻改动）
文件：`src/i18n/locales/zh.json` & `en.json` → `assessmentFlow.common.loadingMessages` / `analyzing` / `starting`。

补充 6–10 条更俏皮的中文 loading 文案（"正在偷看你的潜意识…""把你的选择丢进灵魂搅拌机…"），让等待也变趣味。

### 3. 介绍页文案微调（轻改动）
`assessmentFlow.mbti.introTitle` / `introDesc`：从"专业 MBTI 测评"改成"10 个场景，看看你是哪种人格"，强调"像玩游戏一样"。

## 不改的东西（保持稳定）
- 题目数量仍 10 题、tool schema、dimension 映射、结果页、分享海报、平行宇宙、配额逻辑——全部不动。
- 前端 `AssessmentFlow.tsx` / `AssessmentQuestionLayout.tsx` 结构不变，只是题面文案由 AI 出得更带感。
- 不引入新依赖、不改数据库。

## 风险与回退
- AI 偶尔会"放飞"过头：保留 10 题硬约束 + dimension 字段必填，结果分析准确度不受影响。
- 若用户反馈 emoji 太多，只需在 prompt 里调一行约束即可回退。

## 落地步骤（实施时）
1. 改 `supabase/functions/assessment/index.ts` 的 `batch-questions` system / user prompt（中英双版指令 + 1–2 条 few-shot）。
2. 追加 zh/en loading 文案条目。
3. 微调 `mbti.introTitle` / `introDesc` 中英文。

预计改动：1 个边缘函数 + 2 个 i18n 文件，无数据库迁移。