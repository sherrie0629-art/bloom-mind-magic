## 让心灵体检题目更生动有趣

只改一个文件：`supabase/functions/assessment-emotion/index.ts` 里 `batch-questions` 的 system prompt 和 tool schema 描述。结果生成、quota、前端都不动。

### 风格定位

把题目从"打分式量表"（"你最近常感到疲惫吗？A 经常 B 有时…"）改成**生活切片小剧场**——中文像小红书 emo 博主 + 损友递水，英文像 Co-Star 推送。每题一个具体场景，让用户秒对号入座。

### 题目要求（写进 prompt）

- **题干 ≥25 字（中）/ ≥20 词（英）**：必须是一个具体生活瞬间，不是抽象提问
  - 反例：「你最近睡眠如何？」
  - 正例：「凌晨 1 点你已经躺下了，但还在刷手机看完全不感兴趣的短视频，这一刻你心里在想…」
  - 正例：「同事在群里 @你"在吗"，距离下班还有 10 分钟，你的第一反应是…」
- **选项 4 个，每个 10–22 字（中）/ 8–18 词（英）**：写具体动作 / 内心独白，不要"经常 / 有时 / 很少 / 从不"这种程度副词
  - 正例：「假装没看见，先去倒杯水拖 5 分钟」
- **维度覆盖 10 题**：burnout 3 / energy 2 / boundaries 2 / sleep 2 / regulation 1
- **语气**：像懂你的朋友，不像问卷；最多 1 个 emoji / 题；禁止"你是否…""您觉得…"开头超过 2 题
- **加 1 段中文 few-shot**（boundaries 维度）把风格钉死

### Tool schema 描述补充

- `question.description`：「具体生活场景，第一人称视角，≥25 字，要有时间 / 地点 / 动作细节」
- `options[].text.description`：「具体动作或内心独白，10–22 字，禁止程度副词」

### 缓存失效

加 `QUESTIONS_PROMPT_VERSION = "v2"` 拼进 system prompt，让 Lovable AI gateway 缓存自然失效（和 bazi 同样做法）。

### 参数

`temperature: 0.7 → 0.9`，`max_tokens: 2048` 保持。

### 不动

结果生成 prompt、tool 字段名、维度名、前端渲染、配额、其他测评。
