

## 方案：每日塔罗抽牌（Daily Tarot Draw）

将现有「选心情 → 生成 whisper」升级为「抽塔罗牌 → 心理学解读」，保留原有心情曲线和月报功能。

### 用户体验流程

```text
进入页面 → 今日已抽？显示结果 : 显示抽牌界面
                                    ↓
              点击"抽一张牌" → 翻牌动画（3D 翻转）
                                    ↓
              显示牌面 + AI 心理学解读 + 情绪启示
                                    ↓
              保存/分享海报 + 情绪曲线照常记录
```

### 核心玩法设计

- **78 张塔罗牌数据**：前端静态数据文件，含牌名、序号、正/逆位关键词、对应 emoji
- **随机抽牌**：随机抽 1 张 + 正/逆位，带翻牌动画
- **AI 解读**：Edge Function 用心理学视角解读这张牌对今日情绪的启示（~200 字），包含：
  - 牌面含义（心理学角度）
  - 今日情绪启示
  - 一句行动建议
- **AI 生成牌面插图**：用图片模型生成对应牌面的艺术插图
- **每日限抽一次**：已抽过则直接展示结果，增强"仪式感"

### 修改清单（4 个文件）

#### 1. 新建 `src/data/tarotCards.ts`
- 78 张塔罗牌的静态数据（大阿卡纳 22 张 + 小阿卡纳 56 张）
- 每张含：`id`、`name`（中英）、`emoji`、`keywords`（正/逆位）

#### 2. 重写 `src/pages/DailyWhisper.tsx`
- 页面标题改为"每日塔罗"
- **抽牌界面**：牌背图案 + "抽取今日塔罗牌" 按钮
- **翻牌动画**：framer-motion 3D 翻转效果
- **结果展示**：牌名 + 正/逆位标签 + AI 插图 + 解读文字 + 行动建议
- **保留**：14 天情绪曲线（mood_score 由 AI 根据牌面自动评分 1-5）、月报功能、历史记录
- **每日一次逻辑**：检查 `todayWhisper`，已存在则跳过抽牌直接展示

#### 3. 重写 `supabase/functions/daily-whisper/index.ts`
- 接收 `{ cardId, cardName, isReversed }` 参数
- AI prompt 改为心理学塔罗解读风格
- 返回 `{ whisper (解读文字), moodScore (1-5), actionTip (行动建议) }`
- 图片生成 prompt 改为塔罗牌艺术风格
- 月报功能保持不变

#### 4. 数据库兼容
- 复用现有 `daily_whispers` 表，无需迁移
- `content` 字段存牌面信息（如 `"The Star (正位)"`）
- `whisper` 存 AI 解读
- `mood_score` 由 AI 根据牌面含义自动打分
- `input_text` 存额外信息（如 `"card:17,reversed:false"`）

### 技术要点

- 牌面插图仍用 `google/gemini-3.1-flash-image-preview` 异步生成
- 翻牌动画用 `framer-motion` 的 `rotateY` 实现 3D 翻转
- 所有文案中文显示

