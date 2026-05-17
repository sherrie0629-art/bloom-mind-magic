## 目标

用户在 Chat 里对 Luna 说"帮我抽张牌"这类话时，AI 回复中应该出现一张**可视化的塔罗牌卡片**（带牌面图 + 牌名 + 正/逆位），而不是只有纯文字。

## 整体思路

复用已有的 `tarotCards` 数据 + `tarot-card-art` storage bucket + AI 出图能力，但**不复用** `tarot-draw` 那个"每日只能抽一次"的端点（聊天里应该可以多次抽）。

流程：

```
用户："Luna，帮我抽张牌看看接下来会发生什么"
   │
   ▼
[Chat.tsx 发送前] 轻量意图检测（zh/en 关键词正则）
   │  命中 → 先调用新端点 chat-tarot-draw 抽牌
   │         返回 { card, isReversed, imageUrl|null, imageStatus }
   │  未命中 → 走原有流程
   ▼
[前端] 在用户气泡后立即插入一条 "card" 类型的助手消息
   渲染 <TarotCardInline />（牌图 + 牌名 + 正/逆位 + 关键词）
   图未就绪时显示骨架 + 轮询
   ▼
[发给 chat 函数] 在 user message 上附加上下文：
   "[用户刚在牌阵中抽到 X（正位）。请围绕这张牌给出 80-120 字温暖、直觉式的解读，
    末尾问一个开放性问题。不要重复牌名描述，直接进入解读。]"
   ▼
Luna 用她的口吻解读这张牌（普通文字回复）
```

## 改动清单

### 1. 新建 Edge Function `chat-tarot-draw`
- `supabase/functions/chat-tarot-draw/index.ts`
- 鉴权：要求登录用户
- 配额：每日上限（如 free 5 次 / plus 30 次），写入 `usage_tracking`（复用现有表或新增一列 `tarot_chat_count`）
- 逻辑：
  - 从 `tarotCards` 同步的卡牌池中随机一张 + 随机正/逆位
  - 检查 `tarot-card-art` bucket 是否已有该卡牌图（按 `card-{id}-{upright|reversed}.png` 命名缓存，全局共享，不绑用户）
  - 已有 → 返回 signed URL
  - 没有 → 调用 Lovable AI `google/gemini-2.5-flash-image` 生成，上传 bucket，返回 URL；失败返回 `imageStatus: "failed"` 让前端 fallback 到 emoji
- 返回 `{ id, cardId, cardName, nameCn, isReversed, keywords, imageUrl, imageStatus }`

### 2. 前端意图检测 + 注入
- `src/pages/Chat.tsx`：在 `handleSend` 内，**仅当 `agent.id === "mystic"`** 时，对用户输入跑正则：
  - zh：`/(抽|帮我抽|来一张|给我抽|看一下|看看).{0,6}(牌|塔罗)/`
  - en：`/(draw|pull|give me).{0,12}(card|tarot)/i`
- 命中后：
  1. 调用 `chat-tarot-draw`
  2. 把 card 信息存入新建的 message 类型 `{ role: "assistant", kind: "tarot-card", card: {...} }`，加入消息列表
  3. 在传给 chat 函数的 user content 末尾拼一段 `[系统提示：用户刚抽到 …]`
  4. AI 回复正常追加在卡片下方

### 3. 卡片渲染组件
- `src/components/TarotCardInline.tsx`
  - 240×360 卡牌容器，渐变描边，悬浮发光
  - 图未就绪：骨架 + 闪烁；失败：fallback 显示 emoji + 牌名
  - 显示牌名（中/英按 locale）、正/逆位 chip、3 个关键词
  - 逆位时图片 `rotate-180`
- `Chat.tsx` 的消息列表渲染分支里加 `if (m.kind === "tarot-card") return <TarotCardInline />`

### 4. 持久化（可选，本期可不做）
- 当前聊天历史表存的是纯文本。卡片消息要存表，需要给 `chat_messages` 增加 `metadata jsonb` 列。
- **本期方案**：卡片只在会话期间显示，刷新后由 AI 文字回复保留上下文，不持久化卡片图。后续如需持久化再加列。

## 技术细节

- 图片缓存粒度：按 `card_id + 朝向` 共享所有用户，单卡 78×2=156 张，跑满后零成本。
- 模型：`google/gemini-2.5-flash-image`，prompt 走 "塔罗插画风、神秘主义、暗紫金"，与现有 DailyTarot 保持一致风格。
- 流式：抽牌端点是非流式 JSON；调用完后再发起原有 chat 的 SSE 流。用户看到的顺序是：卡片秒出 → Luna 文字流式打字。
- 不修改 `chat` Edge Function 的 system prompt 主体，只通过用户消息附加上下文，避免影响其他角色。

## 不在范围内

- 多张牌阵（三牌阵 / 凯尔特十字）—— 后续可扩展
- 卡片消息的历史持久化 —— 需 schema 变更，下个迭代
- 非 Luna 角色的抽牌 —— 仅 mystic 触发
