# 修复跨角色记忆"冒认对话"问题

## 问题根因

`recall-memory` 返回两类数据：

- **memories**（按 agent 隔离）：每个角色只看到自己的对话记忆 ✅
- **facts**（跨角色共享）：所有角色都能看到全部用户档案事实（如"想环游世界""想去挪威"）

目前注入到 prompt 里时，facts 被打上标签 `[关于用户 · 跨角色记得] …value… (from zoey)`，但：

1. "跨角色记得" 听起来还像"我记得"，模型容易当成自己的记忆
2. `(from zoey)` 是英文小尾巴，模型几乎忽略
3. 系统提示里只有一句通用的 "Reference them naturally"，没区分"我亲历的"和"别人转告的"，于是 Jax 直接说出"我们聊过你想去探索这个世界"——而用户其实只跟 Zoey 说过

## 解决方案

分三层来处理：**数据分类 → 标签清晰 → 提示词约束**。

### 1. 在 `src/pages/Chat.tsx` 的 `formatRecall` 与转折 recall（约 161-188、662-680 行）

把 facts 按 `source_agent_id` 拆成两组：

- **own facts**（source 缺失，或 source === 当前 agentId）→ 标签：`[你自己了解过] …`
- **cross-agent facts**（source 是别的角色）→ 标签：`[别的朋友告诉你的 · 来自 {AgentName}] …`

把"来自谁"翻译成角色中文名（Chloe/Jax/Luna/Zoe → 通过 agents.ts 查 name），而不是裸 id。

### 2. 在 `supabase/functions/chat/index.ts`（约 470 行）扩写 Long-term Memory 说明

将原本一句话扩成两段明确规则：

```
【Long-term Memory】
- 以 [你自己了解过] 或 [Today]/[Yesterday]/[Xd ago] 开头的条目，是你和用户的真实对话，可以自然地说"上次你提过…""我们聊过…"。
- 以 [别的朋友告诉你的 · 来自 X] 开头的条目，是用户告诉别的角色的事，你并未亲历。绝对不能说"我们聊过""你跟我说过"。可以用这些表达：
    · "我有种感觉你…"
    · "X 跟我念叨过你…"（X 是来源角色名）
    · "听说你…对吧？"
- 如果不确定来源，宁可问一句，也不要假装记得。
```

并在 system prompt 顶部加一条硬约束："Never fabricate shared history. If a fact didn't come from your own chat, attribute it or ask."

### 3. （可选轻量增强）让角色互相"认识"

`agents.ts` 里 Chloe/Jax/Luna/Zoe 的 lore 本来就互相提及（Jax 是 Zoe 的"godfather figure"、Luna 住 Chloe 楼上）。当 Jax 看到来自 Zoey 的事实，可以自然说"Zoey 跟我提过你想去挪威"——既保留连续感，又不破坏逻辑。第 2 步的提示词已经为此铺好路。

## 技术细节

**文件改动**

- `src/pages/Chat.tsx`：`formatRecall` 与第二次 recall 块；从 `agents` 数组按 id 取 name 做来源映射；中英两套文案
- `supabase/functions/chat/index.ts`：第 470-471 行的 Long-term Memory 段落改写，加跨角色规则
- 不动 DB、不动 recall-memory edge function

**验证**

1. 用 Zoey 聊一段"想去挪威环游世界" → 等待 `extract-memory-incremental` 写入 facts
2. 切到 Jax 问"我最近想坚持跑步" → Jax 不应说"我们聊过"，应说类似"Zoey 跟我念叨过你想去挪威吧"或"我有种感觉你心里装着远方"
3. 查 edge function 日志确认 system prompt 里 cross-agent facts 带正确前缀

## 不做的事

- 不改 facts 表结构、不改 RLS
- 不关闭跨角色 facts 共享（这是产品特性，关掉就失去"一个灵魂宇宙"的感觉）
- 不动 memories 的 agent 隔离逻辑（已经正确）
