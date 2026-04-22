
## 移除/隐藏伪科学 UI，重塑为 AI-Native Emotional Sanctuary

### 背景
Paddle 可接受政策禁止"通灵、星座、算命、塔罗"类数字服务。当前应用包含：每日塔罗（DailyTarot）、星座测评（ZodiacFlow）、八字（BaziFlow）、Luna 这位"塔罗+占星师"agent，以及多处 mystic/cosmic/🔮 文案与图标。需要把这些隐藏掉，并把首页定位重塑为"情绪追踪 + 深度对话 + 心理学洞察"。

### 改动范围

**1. 路由与页面下线（`src/App.tsx`）**
- 删除/重定向 `/daily-tarot`、`/daily-whisper`、`/assessment/zodiac`、`/assessment/bazi` 路由 → 全部 `Navigate` 到 `/`。
- 移除 `DailyTarot`、`ZodiacFlow`、`BaziFlow` 的 import（保留文件以便日后复用，但不再挂载）。

**2. 首页重塑（`src/pages/Index.tsx`）**
- 副标题改为："Your AI-native emotional sanctuary — track moods, talk deeply, grow with psychology-backed insights."
- 顶部双卡片 grid：
  - 左卡：**Daily Mood Check-in**（🌤 图标，跳转 `/assessment/emotion`）替换原"Daily Tarot"
  - 右卡：**Deep Talk**（💬 图标，跳转 `/chat`）替换原"Relationship Chemistry"（情侣速配偏娱乐性，淡化）
- Self-Discovery 4 宫格：移除 `zodiac`（Horoscope），替换为 **Values**（Schwartz Values Survey 占位，跳转 `/assessment` 提示 coming soon）或直接做成 3 列（MBTI / Enneagram / Wellness）。**默认采用 3 列**，更干净。
- 去掉所有 🔮 emoji、"untold secrets / lore / unlock" 神秘叙事卡片，改为温和的"Build your circle — companions remember and grow with you."

**3. 测评页（`src/pages/Assessment.tsx`）**
- 从 `tests` 数组移除 `zodiac`（Horoscope Reading）。
- SEO title 改为 "Self-Discovery — Island AI"（顺手修复旧 Soul Sanctuary 文案）。

**4. Agent 重塑（`src/data/agents.ts`）— Luna**
保留 Luna 的"前数据科学家"背景但移除塔罗/占星身份：
- title：`The Mathematician Who Chose Stars` → `The Scientist Who Chose Stillness`
- description / quote：删除"cosmos / stars / 塔罗"，改为"用数据无法解释痛苦后，她转向了正念与内在觉察"。
- systemPrompt：把"intuitive tarot reader and astrologer / 水晶 / sage / 月相 / retrograde / 占星元素"全部替换为"mindfulness practitioner, somatic awareness, shadow work（保留作为心理学概念）, journaling, meditation"。保留她的丧偶背景与"概率破碎"的核心叙事——这是心理学合理的存在主义议题。
- lore 与 easter eggs：把"pull a card / mercury retrograde"等触发器改为"breathe with me / probability / hold space"等心理学/正念词条；保留情感深度。
- gradient 与图片资源不变。

**5. SoulMap（`src/pages/SoulMap.tsx`）**
- `sourceLabels`、`SOURCE_GROUPS` 中移除 `zodiac` 项，并把"Stars / Constellation / 灵魂星图"措辞软化：仍可保留"Soul Map"和星座视觉隐喻（这是 UI 装饰，不属于占卜服务，但为安全起见把面向用户的 copy 弱化为"Insight Map / Growth Constellations"）。**保留视觉，只改 copy。**

**6. 计费页（`src/pages/Pricing.tsx`）**
- Free 套餐特性列表里把 `Daily tarot draw` 改为 `Daily mood check-in`。

**7. Terms / SEO / 文案清理**
- `src/pages/TermsOfService.tsx` 第 2 节："daily tarot draws" → "daily mood check-ins"。删除"relationship insights"中的算命暗示，保留"AI companion chat, personality assessments, emotion tracking, and psychology-based self-reflection reports"。
- `index.html`、`SEO.tsx`、`Auth.tsx`、`useSharePoster.ts`：把残留的"Soul Sanctuary"统一替换为"Island AI"；描述文案里去掉"cosmic / mystical / tarot"等词。

**8. 底部导航 & Archive**
- `BottomNav.tsx` 不变（Home/Archive/Assess/Me）。
- `AgentArchive`：Luna 卡片按 #4 改动自动更新，不需要单独改文件。

### 不会改动
- 数据库表（`tarot_draws`、`assessment_results.zodiac` 历史数据保留，只是 UI 不再产出新数据）
- Edge functions（`tarot-draw`、`assessment-zodiac` 等保留，未来若 pivot 可复用）
- 品牌色、agent 图片、Chloe/Jax/Zoe 三位 agent
- 数据库 migrations、Paddle 集成

### 验证清单
1. 访问 `/` → 副标题是 "AI-native emotional sanctuary..."；不再看到"Daily Tarot / Horoscope / 🔮 untold secrets"。
2. 访问 `/assessment` → 只看到 MBTI / Enneagram / Wellness Check 三项，无 Horoscope。
3. 直接输入 `/daily-tarot`、`/assessment/zodiac` → 重定向回首页。
4. 进入 Luna 聊天 → 自我介绍不含塔罗/占星，仍是温柔深刻的心理学陪伴风格。
5. 访问 `/terms` → 第 2 节服务描述不含 tarot。
6. `/pricing` Free 卡里看不到 "Daily tarot draw"。
7. 重新跑 Paddle readiness check 应通过伪科学条款。
