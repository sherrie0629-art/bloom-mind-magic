

## 更新计划：测评体系北美本地化改造

### 测评适配分析

| 现有测评 | 北美适配度 | 建议 |
|----------|-----------|------|
| **MBTI 人格测评** | ⭐⭐⭐⭐⭐ 极高 | 保留，MBTI 在北美极其流行（尤其 Gen Z），无需替换，仅英文化 |
| **八字命理** | ❌ 零 | **替换为 Enneagram（九型人格）**——北美 therapy 文化中的热门工具，与 MBTI 互补 |
| **星座运势** | ⭐⭐⭐⭐ 高 | 保留，北美年轻女性群体对 Astrology 非常热衷（Co-Star、The Pattern 等 app 验证了市场），但需去掉"五行/元素"等中式概念，改用西方占星术语（Rising sign, Moon sign 等） |
| **情绪状态评估** | ⭐⭐⭐ 中 | **改造为 "Burnout & Wellness Check"**——"情绪评估"在北美过于临床化，Burnout 是北美职场最热话题，维度改为 Burnout/Energy/Boundaries/Sleep |
| **关系合盘** | ⭐⭐⭐⭐ 高 | 保留，改名 "Relationship Chemistry"，加入 **Attachment Style（依恋类型）** 维度——这是北美 therapy-speak 最火的概念之一 |
| **每日情绪签到** | ⭐⭐⭐⭐ 高 | 保留，改名 "Daily Check-in"，心情词改为英文（Exhausted, Anxious, Grateful, Lost 等） |

### 新增测评建议（可选，第二期）

| 测评 | 理由 |
|------|------|
| **Attachment Style Quiz（依恋类型）** | 北美约会文化中最热门的心理学概念，Anxious/Avoidant/Secure 三种类型几乎人人知道 |
| **Love Language Quiz（爱的语言）** | Gary Chapman 的五种爱的语言在北美家喻户晓，非常适合社交分享 |

*建议第一期先做核心 4+1 改造，第二期再新增。*

---

### 具体改造方案

#### 1. 八字 → Enneagram（九型人格）

**替换理由**：八字是纯中华文化产物，北美用户完全无感。Enneagram 在北美 therapy/spiritual 圈极其流行，与 MBTI 互补（MBTI 看"你怎么做"，Enneagram 看"你为什么这样做"）。

**改动**：
- `BaziFlow.tsx` → `EnneagramFlow.tsx`
- 出生信息表单 → 移除，改为 5 道情境题（与 MBTI 流程一致）
- Edge Function `assessment-bazi` → 重写提示词为 Enneagram 分析
- 结果维度：Type 1-9 + Wing + Growth/Stress arrows
- 结果卡片：`dayMaster/fiveElements` → `type/wing/coreFear/coreDesire`
- 路由：`/assessment/bazi` → `/assessment/enneagram`
- 图标：`Compass` → `Fingerprint` 或 `Target`

#### 2. 情绪评估 → Burnout & Wellness Check

**改动**：
- 标题："Burnout & Wellness Check"
- 维度从 `stress/energy/social/sleep` → `burnout/energy/boundaries/sleep`
- "Boundaries" 维度是北美 therapy 文化核心概念
- 建议文案风格从"改善建议"改为 "Self-care action plan"
- Edge Function `assessment-emotion` 提示词英文化 + 加入 boundaries 概念

#### 3. 星座运势 → Horoscope Reading

**改动**：
- 星座名称英文化（Aries, Taurus...）
- 去掉"X象守护"改为 Element（Fire/Earth/Air/Water）
- 幸运指南保留（Lucky color/number 在北美也很流行）
- 加入 "Mercury Retrograde" 等北美占星热词
- Edge Function `assessment-zodiac` 提示词英文化

#### 4. 关系合盘 → Relationship Chemistry

**改动**：
- 标题："Relationship Chemistry"
- 五维从 `情感共鸣/沟通默契/价值观契合/成长互助/化学反应` → `Emotional Resonance/Communication/Values/Growth/Chemistry`
- 新增 Attachment Style 分析（在 loveLanguage 字段旁）
- 星座选择器英文化
- Edge Function `assessment-compatibility` 提示词英文化 + 加入 attachment theory

#### 5. 每日情绪签到 → Daily Check-in

**改动**：
- 心情词：`疲惫/焦虑/平静...` → `Exhausted/Anxious/Calm/Happy/Excited/Lonely/Grateful/Lost`
- 心情等级：`很差/低落/一般/不错/很棒` → `Awful/Low/Meh/Good/Great`
- 月报生成提示词英文化
- 保存图片文案从"心灵密语"改为 "MindGarden"

#### 6. Assessment 入口页

```text
┌─────────────────────────────────┐
│  Self-Discovery                 │
│  AI-powered quizzes to explore  │
│  the real you                   │
├─────────────────────────────────┤
│ 🧠 Personality (MBTI)    Hot   │
│ 🎯 Enneagram           Classic │
│ ⭐ Horoscope        Daily Sync │
│ 🔥 Wellness Check   Recommend  │
├─────────────────────────────────┤
│  (Relationship Chemistry 入口   │
│   移至 CompatibilityFlow 独立)  │
└─────────────────────────────────┘
```

---

### 改动文件汇总

| 文件 | 改动类型 |
|------|----------|
| `src/pages/Assessment.tsx` | 全英文化，测评列表更新 |
| `src/pages/BaziFlow.tsx` → `EnneagramFlow.tsx` | 重写为 Enneagram 流程 |
| `src/pages/ZodiacFlow.tsx` | 星座名英文化，结果页英文化 |
| `src/pages/EmotionFlow.tsx` | 改为 Burnout & Wellness，维度更新 |
| `src/pages/CompatibilityFlow.tsx` | 英文化 + Attachment Style |
| `src/pages/AssessmentFlow.tsx` | MBTI 页面英文化 |
| `src/pages/DailyWhisper.tsx` | 心情词/UI 英文化 |
| `src/App.tsx` | 路由更新（bazi → enneagram） |
| `supabase/functions/assessment-bazi/index.ts` | 重写为 Enneagram 提示词 |
| `supabase/functions/assessment-zodiac/index.ts` | 英文化提示词 |
| `supabase/functions/assessment-emotion/index.ts` | Burnout/Boundaries 提示词 |
| `supabase/functions/assessment-compatibility/index.ts` | 英文化 + Attachment |
| `supabase/functions/assessment/index.ts` | MBTI 提示词英文化 |
| `supabase/functions/daily-whisper/index.ts` | 英文化提示词 |

### 与上一份计划的关系

本方案作为上一份"北美本地化总计划"的**测评子系统详细设计**，应合并执行。执行顺序建议：先完成角色系统（agents.ts + chat），再做测评体系改造。

