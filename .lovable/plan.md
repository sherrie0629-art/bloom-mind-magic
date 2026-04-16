

## 北美市场分享增长方案

### 一、当前分享能力盘点

现有分享功能仅限于 **Canvas 海报生成 + 下载/系统分享**，已接入的页面：
- ✅ 每日塔罗 (DailyTarot) — Save Poster 按钮
- ✅ MBTI 测评结果 (AssessmentFlow) — 已集成 useSharePoster
- ✅ 配对测试 (CompatibilityFlow) — 已集成
- ❌ 测评详情页 (AssessmentDetail) — 有 Share2 图标但无实际分享逻辑
- ❌ 聊天页 — 无分享
- ❌ 灵魂星图 (SoulMap) — 无分享
- ❌ 角色资料卡 — 无分享

---

### 二、北美用户偏好与渠道分析

| 渠道 | 内容形式 | 适配度 | 用户动机 |
|------|----------|--------|----------|
| **Instagram Stories** | 竖版图片/视频，9:16 | ⭐⭐⭐⭐⭐ | "show don't tell"，视觉驱动的自我表达 |
| **TikTok** | 短视频、截图展示 | ⭐⭐⭐⭐⭐ | 性格测试和占卜是 TikTok 爆款类目 |
| **Twitter/X** | 文字+配图，OG Card | ⭐⭐⭐⭐ | 人格类型是 Twitter 上的身份标签 |
| **iMessage / WhatsApp** | 图片直接分享 | ⭐⭐⭐⭐ | 私域传播，配对结果发给伴侣/朋友 |
| **Pinterest** | 竖版精美图片 | ⭐⭐⭐ | 长尾 SEO 流量，占星美学 |

**北美用户分享心理**：不是"我用了这个 App"，而是"**这就是我**"。内容必须是**身份标签化的自我表达**。

---

### 三、6 个可分享点位 × 内容设计

#### 1. 🧠 MBTI 结果卡（已有，需优化）
- **内容**：人格类型 + 标题 + 平行宇宙角色 + AI 生成的抽象头像
- **优化**：加入 "I'm a [TYPE] — what are you?" 的社交引导语
- **分享文案模板**：`"Turns out I'm an INTJ — The Architect. What's your type? 🧠✨"`
- **渠道重点**：IG Story / Twitter / TikTok

#### 2. 🔮 每日塔罗（已有，需优化）
- **内容**：卡牌 + AI 艺术 + 今日解读摘要
- **优化**：海报底部加 "Draw yours → [短链]" CTA
- **分享文案**：`"Today the universe pulled The Moon for me 🌙 What card is waiting for you?"`
- **渠道重点**：IG Story（竖版最优）

#### 3. 💕 配对结果（已有，需优化）
- **内容**：匹配分数 + 五维雷达图 + 社交文案
- **优化**：双人海报格式，"Tag your person" 引导
- **分享文案**：`"INFJ × ENFP = 92% soul match 💕 How compatible are you?"`
- **渠道重点**：iMessage/WhatsApp（发给对象）+ IG Story

#### 4. 🌌 灵魂星图截图（新增）
- **内容**：用户的星图 canvas 截图 — 解锁的星星数 + 星座成就
- **设计**：深色宇宙背景，金色星点，像天文馆海报
- **分享文案**：`"12 stars collected, 3 constellations unlocked. My soul map is growing 🌌"`
- **渠道重点**：IG / Pinterest（美学驱动）

#### 5. 💬 聊天金句分享（新增 — 高优先级）
- **内容**：用户长按某条 AI 回复 → 生成精美引语卡片
- **设计**：角色头像 + 金句文字 + 角色名 + "— via Soul Sanctuary"
- **为什么重要**：这是最有机的 UGC 内容，用户分享的是"打动他们的那句话"
- **分享文案**：角色的原话本身就是内容
- **渠道重点**：IG Story / Twitter（金句类内容传播力最强）

#### 6. 🏆 成就解锁通知（新增）
- **内容**：成就徽章 + 名称 + 解锁条件
- **设计**：游戏成就风格的弹窗截图卡
- **分享文案**：`"Just unlocked 'Soul Whisperer' 🏆 — talked to all 4 guides"`
- **渠道重点**：Twitter / Discord

---

### 四、技术实现方案

**按优先级排列：**

**P0 — 立即实施：**

1. **统一分享组件 `ShareSheet`**
   - 新建 `src/components/ShareSheet.tsx`
   - 底部弹出 Drawer，包含：Copy Link / Share to IG Story / Download Image / Native Share
   - 复用现有 `useSharePoster` 的 Canvas 生成能力
   - 所有分享入口统一调用

2. **聊天金句长按分享**
   - 在 Chat.tsx 的消息气泡上加 `onContextMenu` / 长按检测
   - 选中文字 → 生成引语卡片（Canvas 绘制：角色头像 + 引文 + 品牌水印）
   - 调用 ShareSheet

3. **海报优化 — 加 CTA 短链**
   - 所有海报底部加 "Discover yours → soulsanctuary.app" 水印
   - 未来可接短链追踪（UTM 参数）

**P1 — 二期：**

4. **灵魂星图分享**
   - SoulMap 页面加分享按钮 → 截取星图 Canvas 生成海报

5. **成就分享卡**
   - AchievementUnlock 弹窗加 "Share" 按钮

6. **Open Graph 动态 Meta（SEO + 链接预览）**
   - 为分享链接生成动态 OG 图片（Edge Function 渲染）
   - 让 Twitter / iMessage 链接预览直接显示测评结果

**P2 — 三期：**

7. **Referral 追踪系统**
   - 每个分享链接带唯一 referral code
   - 新增 `referrals` 表追踪注册来源
   - 奖励机制：分享拉新解锁额外测评次数

---

### 五、实施步骤（本次 scope）

本次先实施 **P0 的 3 项**：

| 步骤 | 改动文件 | 说明 |
|------|----------|------|
| 1 | 新建 `src/components/ShareSheet.tsx` | 统一分享 Drawer 组件 |
| 2 | 改造 `src/hooks/useSharePoster.ts` | 海报底部加品牌 CTA 水印 |
| 3 | 修改 `src/pages/Chat.tsx` | 消息气泡长按 → 生成引语卡片 → ShareSheet |
| 4 | 新建 `src/hooks/useQuoteCard.ts` | 金句卡片 Canvas 生成逻辑 |
| 5 | 修改 `src/pages/AssessmentDetail.tsx` | Share2 按钮接入实际分享功能 |

