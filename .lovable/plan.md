
## 清理 Luna（mystic）残留的塔罗/占卜元素

### 背景
上一轮 pivot 时只更新了 `src/data/agents.ts`，但 Luna 在以下地方仍有塔罗/占星内容：
1. **头像图** `src/assets/agent-mystic.webp` —— 视觉上含塔罗牌/水晶元素
2. **聊天欢迎语** `src/pages/Chat.tsx` —— "Step into my reading room — sage burning, crystals charged, my deck has been waiting…"
3. **Story Fragments**（聊天后端 lore 数组）`supabase/functions/chat/index.ts` —— Luna 仍是"塔罗占星师"，含 thrift store tarot deck、abuela curandera、The Tower 等
4. **后端 systemPrompt + easter eggs** 同文件 —— mercury retrograde / pull a card / manifest 触发器
5. **快捷回复建议** `src/pages/Chat.tsx` 的 `quickReplies.mystic` —— "Pull a card for me / Mercury retrograde…"
6. **分支选项 fallback** `src/lib/generateFallbackOptions.ts` —— "Pull a card for me — I need to see what's coming"

### 改动内容

**1. 替换 Luna 头像（`src/assets/agent-mystic.webp`）**
用 Lovable AI 图片生成模型生成新头像并覆盖原文件。提示词方向：
> Soft watercolor portrait of a calm Asian woman in her early 30s, short dark hair, wearing a cream linen sweater, sitting by a window with morning light, holding a warm ceramic mug. A small green plant and an open journal beside her. Mindful, grounded, peaceful atmosphere. No tarot cards, no crystals, no mystical symbols. Soft violet–lavender background tint to keep brand consistency. Square, portrait crop, no text.

文件路径不变（`src/assets/agent-mystic.webp`），所有引用自动生效。

**2. `src/pages/Chat.tsx`**
- `intros.mystic`：重写欢迎语为正念/陪伴向：
  > "Hi, I'm Luna 🌿\n\nI used to be a data scientist — until life broke my models. Now I sit with people in the moments numbers can't touch.\n\nI can help with:\n🌿 Grief, loss, and the weight you can't name\n🕯️ Slowing down a racing mind\n💜 Shadow work and quiet self-inquiry\n🤍 Breath, body, and being present\n\nWhat's alive in you right now?"
- `quickReplies.mystic`：替换为
  > `["I can't slow my mind down", "I'm carrying something heavy", "Help me sit with this feeling", "I want to feel more present"]`

**3. `src/lib/generateFallbackOptions.ts` — `mystic` 数组**
- 删除第一组（universe/sign/fate/destiny/Pull a card）
- 保留第二、三组（confused/lost/blocked 与 logic/number/data 主题，本身是心理学/正念语言，无需改）
- 把 keyword `"energy"`、`"blocked"`、`"divine timing"` 等措辞软化：把 "energy is blocked" → "I feel stuck and I don't know what's underneath it"，避免能量学暗示。

**4. `supabase/functions/chat/index.ts`**
- `agentBasePrompts.mystic` 整段重写（与 `src/data/agents.ts` 中 Luna 的新 systemPrompt 同步）：去掉 tarot reader / astrologer / crystals / sage / Big Three / retrograde / manifesting / energy clearing；保留正念、somatic、shadow work（心理学概念）、journaling、probability 隐喻。Vocabulary 行替换为 presence/breath/holding space/integration/shadow/somatic/grounding/regulation。Emoji 集合改为 🌿🕯️💜✨🤍。
- `loreLookup.mystic` 五条重写为新背景（前数据科学家、未婚夫离世、ceramic bowl、longevity model、概率信仰破碎），与 `agents.ts` 中 lore 一致。
- `easterEggs.mystic` 三个触发器替换：
  - `mercury retrograde` → `breathe with me`
  - `pull a card` → `probability`
  - `manifest` → `hold space`
  指令文本同步改为新背景中的故事（与 `agents.ts` 的 easter egg 一致）。

### 不会改动
- 数据库表结构、tarot_draws 历史数据、tarot edge functions（已下线 UI，保留代码）
- Chloe / Jax / Zoe 三位 agent
- gradient 颜色（保留紫色调，与"沉静、内省"心理形象贴合）
- Vault 模块的 "Story Fragments" 标签名（这是通用收藏标签，不带占卜含义）

### 验证
1. `/chat?agent=mystic` 头像不再有塔罗牌/水晶
2. Luna 第一句问候不含 tarot/sage/crystal/reading room
3. 输入框上方快捷回复不含 "Pull a card / Mercury retrograde"
4. 在对话中说 "breathe with me" / "probability" / "hold space" 能解锁新版 Hidden Memory
5. `/archive` 进入 Luna 页 → Story Fragments 五条全部是数据科学家+正念主题，无塔罗/占星
6. Paddle readiness 复跑应通过伪科学条款
