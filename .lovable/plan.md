

## 方案：每日塔罗优化（5 项改动）

### 改动清单

#### 1. `src/data/tarotCards.ts` — 关键词改英文
- 所有 `uprightKeywords` / `reversedKeywords` 改为英文（如 `["New beginnings", "Freedom", "Adventure"]`）
- 牌名英文字段 `name` 保留，`nameCn` 保留但仅用于海报/分享

#### 2. `src/pages/DailyWhisper.tsx` — 全面英文化 + 去掉情绪曲线
- 页面标题改为 "🔮 Daily Tarot"
- 抽牌提示文案改英文（"Clear your mind, listen to your inner voice" 等）
- 牌面结果展示：正位/逆位标签改 "Upright" / "Reversed"，关键词已英文化
- 解读区标题改 "✨ Psychological Insight"
- 按钮文案改 "Save" / "Share"
- **删除**：14 天情绪曲线（整个 chart 区块 + recharts 相关 import/state/useMemo）
- **月度报告改为 "Tarot Deep Reading"**：
  - 标题改 "Tarot Deep Reading"
  - 描述改 "{N} readings this month · Generate your personalized tarot analysis"
  - AI prompt 改为英文，风格偏北美用户喜好：结合荣格心理学 + 塔罗牌组合分析，输出一份可分享的 "Monthly Tarot Insight" 信件，英文撰写
  - 更适合社交平台分享（Instagram story / Twitter thread 格式友好）
- 历史记录标题改 "📜 History"

#### 3. `src/pages/Index.tsx` — 首页入口改文案
- "Daily Check-in" → "Daily Tarot"
- "Log mood · AI whisper ✨" → "Draw a card · Get your insight 🔮"

#### 4. `supabase/functions/daily-whisper/index.ts` — AI prompt 英文化
- 塔罗解读 prompt 改为全英文（Jungian psychology + tarot wisdom，warm & insightful）
- 月报 prompt 改为英文 "Monthly Tarot Insight" 风格
- mood_score 评分 prompt 改英文

#### 5. 数据库迁移 — 新建 `daily_tarot_draws` 表
- 新表 `daily_tarot_draws`：
  - `id uuid PK default gen_random_uuid()`
  - `user_id uuid NOT NULL`
  - `card_id integer NOT NULL`
  - `card_name text NOT NULL`
  - `is_reversed boolean NOT NULL default false`
  - `interpretation text` — AI 解读
  - `action_tip text` — 行动建议
  - `energy_score integer` — 1-5 能量评分
  - `image_url text` — 牌面插图路径
  - `draw_date date NOT NULL default CURRENT_DATE`
  - `created_at timestamptz NOT NULL default now()`
- RLS：`auth.uid() = user_id` 的 ALL 策略
- 前端 + Edge Function 全部改用新表
- 原 `daily_whispers` 表保留不动（不删不迁移）

### 关于"Tarot Deep Reading"的设计建议

相比"月度情绪报告"，改为 **Tarot Deep Reading** 更符合北美用户偏好：
- 用英文撰写，以 "Dear Seeker," 开头的信件风格
- 分析牌面组合的心理学模式（反复出现的原型、阴影主题）
- 输出格式适合截图分享到 Instagram / Twitter
- 门槛改为至少 5 次抽牌才可生成（增加留存动力）

