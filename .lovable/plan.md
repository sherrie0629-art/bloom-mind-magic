

## 方案：用 Luna（直觉系塔罗师）替换 Arthur（智者导师）

### 新角色：Luna

| 字段 | 内容 |
|------|------|
| ID | `mystic` |
| 名字 | Luna |
| 头衔 | Intuitive Tarot Reader |
| 描述 | 住在布鲁克林的现代神秘主义者，用塔罗牌、水晶和鼠尾草引导你的灵魂旅程 |
| 渐变色 | `from-violet-500 to-purple-300`（紫色/薰衣草色调） |
| 表情符号 | 🔮🌙✨🃏💜🕯️ |

**性格核心**：Luna 是一个住在布鲁克林/洛杉矶的"现代女巫"。她房间里点着鼠尾草，摆满水晶和塔罗牌。她从不下定论，而是通过"抽牌"来引导对话。

**经典台词**："Let me pull a card for you... Three of Swords reversed. You're deep in your shadow work right now, love. The universe doesn't give you what you can't handle 🔮"

**常用词汇**：Manifesting（显化）、Retrograde（水逆）、Big Three（太阳/月亮/上升）、Shadow work（阴影疗愈）、Energy clearing（清理能量）

---

### 需要修改的文件

#### 1. 生成头像图片
- 用 AI 生成 `src/assets/agent-mystic.webp`
- 风格：波西米亚风、水晶/塔罗元素、紫色调、布鲁克林公寓背景

#### 2. `src/data/agents.ts`
- 移除 Arthur（`mentor`）的整个条目
- 新增 Luna（`mystic`），包含：
  - 完整的 `systemPrompt`（塔罗/占星对话风格，用"抽牌"代替直接建议）
  - 5 条 `lore`（她如何接触塔罗、改变她人生的一次占卜、家人的怀疑、一个她无法帮助的求助者、给自己的占卜）
  - 3 个 `easterEggs`（触发词："mercury retrograde"、"pull a card"、"manifest"）
- 更新 import：`agentMentor` → `agentMystic`

#### 3. `supabase/functions/chat/index.ts`
- `agentBasePrompts`：移除 `mentor`，新增 `mystic`（塔罗/占星主题的对话提示词）
- `loreLookup`：移除 `mentor`，新增 `mystic`（5 条故事碎片）
- `easterEggs`：移除 `mentor`，新增 `mystic`（3 个彩蛋触发指令）

#### 4. `src/pages/Chat.tsx`
- `getWelcomeMessage`：移除 `mentor` 欢迎语，新增 `mystic`（Luna 介绍她的塔罗阅读室）
- `quickReplies`：移除 `mentor`，新增 `mystic`：
  - "Pull a card for me"
  - "Is Mercury in retrograde?"
  - "I need a sign from the universe"
  - "Help me manifest something"
- 修复第 34 行：`EASTER_EGG_MARKER` 从中文 `"【🔮 隐藏记忆解锁】"` 改为 `"【🔮 Hidden Memory Unlocked】"`

#### 5. `src/lib/generateFallbackOptions.ts`
- 移除 `mentor` 选项池
- 新增 `mystic` 选项池，关键词：`universe`, `sign`, `fate`, `meant to be`, `confused`, `energy`
- 对应选项用灵性/占星风格的语句

#### 6. 数据库兼容性
- 已有的 `agent_bonds` 中 `agent_id = 'mentor'` 的记录会失效但不会报错
- 无需数据库迁移

### 执行顺序
1. 生成 Luna 头像图片
2. 更新 `agents.ts`
3. 更新 `chat/index.ts` Edge Function
4. 更新 `Chat.tsx`
5. 更新 `generateFallbackOptions.ts`
6. 部署 Edge Function

